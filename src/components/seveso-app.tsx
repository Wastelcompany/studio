"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Substance, ThresholdMode, Company, UserProfile, Customer } from '@/lib/types';
import SevesoHeader from '@/components/seveso-header';
import InventoryTable from '@/components/inventory-table';
import Dashboard from '@/components/dashboard';
import SdsUploadDialog from './sds-upload-dialog';
import ReferenceGuideDialog from './reference-guide-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import CategoryExplanationDialog from './category-explanation-dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CompanySelector from './company-selector';
import { calculateSummations, ALL_CATEGORIES, NAMED_SUBSTANCES } from '@/lib/seveso';
import { useUser, useCollection, useMemoFirebase, useFirestore, useDoc, useAuth } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { createNewCompany, updateCompanyDetails, addSubstanceToDb, deleteSubstanceFromDb, updateSubstanceQuantityInDb, clearInventoryFromDb, deleteCompanyFromDb } from '@/lib/companies';
import { Loader2, UserX, LogOut, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import SdsViewerDialog from './sds-viewer-dialog';
import PasswordChangeDialog from './password-change-dialog';

export default function SevesoApp() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthLoading && !user) router.push('/');
  }, [isAuthLoading, user, router]);

  const userProfileRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [user, db]);
  const { data: userProfile, isLoading: isLoadingUserProfile } = useDoc<UserProfile>(userProfileRef);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const companiesQuery = useMemoFirebase(() => 
    userProfile?.customerId && !userProfile?.disabled 
    ? query(collection(db, 'companies'), where('customerId', '==', userProfile.customerId)) 
    : null, [userProfile, db]);

  const { data: companiesData, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const companies = useMemo(() => companiesData?.sort((a, b) => a.name.localeCompare(b.name)) ?? [], [companiesData]);

  const inventoryQuery = useMemoFirebase(() => selectedCompanyId ? collection(db, 'companies', selectedCompanyId, 'inventory') : null, [selectedCompanyId, db]);
  const { data: firestoreInventory, isLoading: isLoadingInventory } = useCollection<Substance>(inventoryQuery);

  const [localInventory, setLocalInventory] = useState<Substance[]>([]);
  useEffect(() => { setLocalInventory(firestoreInventory || []); }, [firestoreInventory]);

  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('low');
  const [isSdsUploadOpen, setIsSdsUploadOpen] = useState(false);
  const [isReferenceGuideOpen, setIsReferenceGuideOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [isDeleteCompanyAlertOpen, setIsDeleteCompanyAlertOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [viewerSubstance, setViewerSubstance] = useState<Substance | null>(null);
  const [explanationData, setExplanationData] = useState<{ substance: Substance | null; categoryId: string | null; type: 'seveso' | 'arie' | null }>({ substance: null, categoryId: null, type: null });
  
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const { toast } = useToast();

  const handleSaveAsPdf = async (type: 'full' | 'seveso') => {
    if (!selectedCompanyId) return;
    const company = companies.find(c => c.id === selectedCompanyId);
    setIsSavingPdf(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const teal = [22, 80, 91];
      const { summationGroups, arieSummationGroups, overallStatus, arieExceeded } = calculateSummations(localInventory, thresholdMode);

      // PDF Helpers with fixed spacing
      let currentY = 0;
      const h1Spacing = 12; const h2Spacing = 8; const pSpacing = 6; const lineH = 5;

      const checkPage = (h: number) => { if (currentY + h > 280) { doc.addPage(); currentY = 20; } };
      
      const addH1 = (text: string) => {
        checkPage(h1Spacing + 10);
        doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(teal[0], teal[1], teal[2]);
        doc.text(text, 20, currentY);
        currentY += h1Spacing;
      };

      const addH2 = (text: string) => {
        checkPage(h2Spacing + 10);
        doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(50, 50, 50);
        doc.text(text, 20, currentY);
        currentY += h2Spacing;
      };

      const addP = (text: string) => {
        doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(text, 170);
        checkPage(lines.length * lineH + pSpacing);
        doc.text(lines, 20, currentY);
        currentY += (lines.length * lineH) + pSpacing;
      };

      // --- PAGE 1: COVER ---
      doc.setFillColor(teal[0], teal[1], teal[2]).rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255).setFontSize(24).setFont('helvetica', 'bold').text('ChemStats', 20, 25);
      doc.setFontSize(10).setFont('helvetica', 'normal').text('GEVAARLIJKE STOFFEN ANALYSE', 20, 32);
      
      currentY = 80;
      doc.setTextColor(teal[0], teal[1], teal[2]).setFontSize(32).setFont('helvetica', 'bold').text('Seveso III & ARIE', 20, currentY);
      currentY += 12;
      doc.text('Beoordelingsrapport', 20, currentY);
      
      currentY = 140;
      doc.setTextColor(50, 50, 50).setFontSize(14).setFont('helvetica', 'bold').text('Bedrijfsgegevens:', 20, currentY);
      currentY += 10;
      doc.setFont('helvetica', 'normal').text(`Bedrijf: ${company?.name || 'Onbekend'}`, 20, currentY);
      currentY += 8;
      doc.text(`Locatie: ${company?.address || 'Niet opgegeven'}`, 20, currentY);
      
      doc.setFontSize(9).setTextColor(150, 150, 150).text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, 20, 280);
      doc.text(`Rapport ID: CS-${selectedCompanyId?.substring(0,6).toUpperCase()}`, 150, 280);

      // --- PAGE 2: CHAPTER 1 & 2 ---
      doc.addPage(); currentY = 25;
      addH1('1. Inleiding en Kaderstelling');
      addP(`Dit rapport bevat de resultaten van de gevaarlijke stoffen analyse voor ${company?.name}. De beoordeling is uitgevoerd conform de Europese Seveso-III richtlijn (2012/18/EU), in Nederland geïmplementeerd via de Omgevingswet en het Besluit activiteiten leefomgeving (Bal), alsmede de ARIE-regeling (Aanvullende Risico-Inventarisatie en -Evaluatie) uit het Arbeidsomstandighedenbesluit.`);
      addP('Het doel van deze toetsing is het identificeren van de risico-status van de inrichting om te bepalen of er aanvullende veiligheidsbeheersmaatregelen noodzakelijk zijn ter voorkoming van zware ongevallen.');
      
      addH1('2. De Beoordelingssystematiek');
      addP('De classificatie van stoffen vindt plaats op basis van de H-zinnen (Hazard statements) zoals vermeld in de Safety Data Sheets (SDS). Voor elke stof wordt getoetst of deze binnen een van de gedefinieerde gevarencategorieën valt.');
      addP('Conform de wettelijke systematiek wordt een inrichting als plichtig aangemerkt indien de sommatie van de aanwezige hoeveelheden, gedeeld door de geldende drempelwaarden voor een specifieke gevarengroep, een waarde van 1,0 of hoger bereikt.');

      // --- PAGE 3: RESULTS ---
      doc.addPage(); currentY = 25;
      addH1('3. Resultaten van de Analyse');
      addH2('3.1 Statusoverzicht');
      
      const statusColor = overallStatus === 'Geen' ? [46, 125, 50] : [198, 40, 40];
      doc.setFillColor(245, 245, 245).rect(20, currentY, 170, 30, 'F');
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]).setFontSize(16).setFont('helvetica', 'bold').text(`Seveso Status: ${overallStatus === 'Geen' ? 'Geen Seveso-inrichting' : overallStatus}`, 30, currentY + 12);
      doc.setTextColor(arieExceeded ? 198 : 46, arieExceeded ? 40 : 125, arieExceeded ? 40 : 50).text(`ARIE Status: ${arieExceeded ? 'ARIE-plichtig' : 'Niet ARIE-plichtig'}`, 30, currentY + 22);
      currentY += 40;

      addH2('3.2 Sommatie per Gevarengroep');
      autoTable(doc, {
        startY: currentY,
        head: [['Gevarengroep', 'Seveso Ratio', 'ARIE Ratio', 'Status']],
        body: summationGroups.map((g, i) => [
          g.name,
          (g.totalRatio * 100).toFixed(1) + '%',
          (arieSummationGroups[i].totalRatio * 100).toFixed(1) + '%',
          (g.isExceeded || arieSummationGroups[i].isExceeded) ? 'DREMPEL OVERSCHREDEN' : 'Binnen limiet'
        ]),
        headStyles: { fillColor: teal },
        margin: { left: 20 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;

      // --- PAGE 4: CONCLUSION ---
      addH1('4. Juridische Conclusie');
      addH2('4.1 Seveso-conclusie');
      if (overallStatus === 'Geen') {
        addP(`Op basis van de huidige inventarisatie en de toegepaste sommatieregels wordt de drempelwaarde van 1,0 niet overschreden. De inrichting wordt op dit moment niet aangemerkt als een Seveso-inrichting.`);
      } else {
        addP(`De analyse toont aan dat voor de groep '${summationGroups.find(g => g.isExceeded)?.name}' de drempelwaarde is overschreden. De inrichting wordt hiermee aangemerkt als een ${overallStatus}-inrichting.`);
      }

      addH2('4.2 ARIE-conclusie');
      if (!arieExceeded) {
        addP(`De sommatie voor de ARIE-regeling bedraagt ${(calculateSummations(localInventory, thresholdMode).arieTotal * 100).toFixed(1)}%. De drempelwaarde van 1,0 wordt niet bereikt.`);
      } else {
        addP(`De sommatie voor de ARIE-regeling bedraagt ${(calculateSummations(localInventory, thresholdMode).arieTotal * 100).toFixed(1)}%. Hiermee valt de inrichting onder de ARIE-regeling.`);
      }

      // --- PAGE 5: FOLLOW-UP (CONDITIONAL) ---
      if (overallStatus !== 'Geen' || arieExceeded) {
        doc.addPage(); currentY = 25;
        addH1('5. Wettelijke Vervolgstappen');
        addP('De vastgestelde status brengt dwingende wettelijke verplichtingen met zich mee om de risico\'s op zware ongevallen te beheersen.');
        
        if (overallStatus !== 'Geen') {
          addH2('5.1 Seveso: Verplichtingen');
          addP('- Formele Kennisgeving: Indiening bij de Omgevingsdienst en Veiligheidsregio.');
          addP('- PBZO: Schriftelijk Preventiebeleid Zware Ongevallen.');
          addP('- VBS: Implementatie van een Veiligheidsbeheerssysteem.');
        }
        if (arieExceeded) {
          addH2('5.2 ARIE-plicht: Actiepunten');
          addP('- Melding NLA: Aanmelding bij de Nederlandse Arbeidsinspectie.');
          addP('- Aanvullende RI&E: Specifieke scenario-analyse voor zware ongevallen.');
          addP('- Instructie: Aantoonbare training van medewerkers over risico\'s.');
        }
      }

      // --- FINAL PAGE: INVENTORY ---
      doc.addPage(); currentY = 25;
      addH1(`${overallStatus !== 'Geen' || arieExceeded ? '6' : '5'}. Stoffenoverzicht`);
      autoTable(doc, {
        startY: currentY,
        head: [['Product', 'CAS', 'Hoeveelheid', 'Seveso Cat', 'ARIE Cat']],
        body: localInventory.map(s => [
          s.productName,
          s.casNumber || '-',
          s.quantity.toFixed(2) + ' t',
          s.sevesoCategoryIds.join(', ') || '-',
          s.arieCategoryIds.join(', ') || '-'
        ]),
        headStyles: { fillColor: teal },
        margin: { left: 20 }
      });

      doc.save(`ChemStats_Rapport_${company?.name || 'Export'}.pdf`);
      toast({ title: "Rapport gegenereerd" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Fout bij PDF maken" });
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleCreateNewCompany = async () => {
    if (!user || !userProfile) return;
    const newCompany = await createNewCompany(db, user.uid, userProfile.customerId);
    if (newCompany) setSelectedCompanyId(newCompany.id);
  };

  const handleAddSubstance = (newSubstance: Omit<Substance, 'id' | 'quantity'>) => {
    if (!selectedCompanyId) return;
    const substanceWithId = { ...newSubstance, id: `sub-${Date.now()}`, quantity: 0 };
    setLocalInventory(prev => [...prev, substanceWithId]);
    addSubstanceToDb(db, selectedCompanyId, substanceWithId);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
      <SevesoHeader
        onUpload={() => setIsSdsUploadOpen(true)}
        onClearAll={() => setIsClearAlertOpen(true)}
        onShowReference={() => setIsReferenceGuideOpen(true)}
        onSaveAsPdf={handleSaveAsPdf}
        onPasswordChange={() => setIsPasswordDialogOpen(true)}
        isSavingPdf={isSavingPdf}
        disabled={!selectedCompanyId}
        onExport={() => {}}
        onImport={() => {}}
      />
      
      <CompanySelector 
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={setSelectedCompanyId}
        onCreateNew={handleCreateNewCompany}
        onDeleteCompany={() => setIsDeleteCompanyAlertOpen(true)}
        onDetailsChange={(details) => selectedCompanyId && updateCompanyDetails(db, selectedCompanyId, details)}
        disabled={isLoadingCompanies}
      />
      
      {selectedCompanyId ? (
        <div className="mt-8 flex flex-col lg:flex-row gap-8">
            <div className="flex-grow lg:w-2/3">
                <InventoryTable
                    inventory={localInventory}
                    onUpdateQuantity={(id, q) => selectedCompanyId && updateSubstanceQuantityInDb(db, selectedCompanyId, id, q)}
                    onDelete={(id) => selectedCompanyId && deleteSubstanceFromDb(db, selectedCompanyId, id)}
                    thresholdMode={thresholdMode}
                    onUpload={() => setIsSdsUploadOpen(true)}
                    onShowExplanation={(sId, cId, type) => setExplanationData({ substance: localInventory.find(s => s.id === sId)!, categoryId: cId, type })}
                />
            </div>
            <aside className="lg:w-1/3 lg:sticky lg:top-8 h-fit">
                <Dashboard inventory={localInventory} thresholdMode={thresholdMode} setThresholdMode={setThresholdMode} />
            </aside>
        </div>
      ) : (
          <div className="mt-12 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-2xl bg-muted/10">
              <Building2 className="w-12 h-12 text-primary mb-6" />
              <h2 className="text-2xl font-bold">Welkom bij ChemStats</h2>
              <p className="text-muted-foreground mt-2">Selecteer of maak een bedrijf om te beginnen.</p>
              <Button onClick={handleCreateNewCompany} variant="secondary" className="mt-8">Nieuw bedrijf</Button>
          </div>
      )}

      <SdsUploadDialog isOpen={isSdsUploadOpen} onOpenChange={setIsSdsUploadOpen} onAddSubstance={handleAddSubstance} />
      <ReferenceGuideDialog isOpen={isReferenceGuideOpen} onOpenChange={setIsReferenceGuideOpen} />
      <CategoryExplanationDialog
        isOpen={!!explanationData.substance}
        onOpenChange={(open) => !open && setExplanationData({ substance: null, categoryId: null, type: null })}
        {...explanationData}
      />
      <PasswordChangeDialog isOpen={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} />
    </div>
  );
}