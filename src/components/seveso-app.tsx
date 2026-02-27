
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Substance, ThresholdMode, Company, UserProfile } from '@/lib/types';
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
import { calculateSummations, ALL_CATEGORIES, NAMED_SUBSTANCES, SEVESO_THRESHOLDS, ARIE_THRESHOLDS } from '@/lib/seveso';
import * as XLSX from 'xlsx';
import { useUser, useCollection, useMemoFirebase, useFirestore, useDoc, useAuth } from '@/firebase';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { createNewCompany, updateCompanyDetails, addSubstanceToDb, deleteSubstanceFromDb, updateSubstanceQuantityInDb, clearInventoryFromDb, deleteCompanyFromDb } from '@/lib/companies';
import { Loader2, UserX, LogOut, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import CompanySelector from './company-selector';
import { getShortId } from '@/lib/utils';

export default function SevesoApp() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthLoading && !user) {
        router.push('/');
    }
  }, [isAuthLoading, user, router]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: isLoadingUserProfile } = useDoc<UserProfile>(userProfileRef);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const companiesQuery = useMemoFirebase(() => {
    if (!userProfile?.customerId || userProfile?.disabled) return null;
    return query(collection(db, 'companies'), where('customerId', '==', userProfile.customerId));
  }, [userProfile, db]);

  const { data: companiesData, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const companies = useMemo(() => companiesData?.sort((a, b) => a.name.localeCompare(b.name)) ?? [], [companiesData]);

  const inventoryQuery = useMemoFirebase(() => {
    if (!selectedCompanyId || !user || !userProfile) return null;
    return collection(db, 'companies', selectedCompanyId, 'inventory');
  }, [selectedCompanyId, db, user, userProfile]);

  const { data: firestoreInventory, isLoading: isLoadingInventory } = useCollection<Substance>(inventoryQuery);

  const [localInventory, setLocalInventory] = useState<Substance[]>([]);
  
  useEffect(() => {
    if (firestoreInventory) {
      setLocalInventory(firestoreInventory);
    } else {
      setLocalInventory([]);
    }
  }, [firestoreInventory, selectedCompanyId]);

  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('low');
  
  const [isSdsUploadOpen, setIsSdsUploadOpen] = useState(false);
  const [isReferenceGuideOpen, setIsReferenceGuideOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [isDeleteCompanyAlertOpen, setIsDeleteCompanyAlertOpen] = useState(false);
  
  const { toast, dismiss } = useToast();

  const [explanationData, setExplanationData] = useState<{ substance: Substance | null; categoryId: string | null; type: 'seveso' | 'arie' | null }>({ substance: null, categoryId: null, type: null });
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  const handleCreateNewCompany = () => {
    if (!user || !db || !userProfile) return;
    createNewCompany(db, user.uid, userProfile.customerId).then(newCompany => {
      if (newCompany) {
        setSelectedCompanyId(newCompany.id);
      }
    });
  };

  const handleCompanyDetailsChange = (details: Partial<Company>) => {
      if (!selectedCompanyId || !db) return;
      updateCompanyDetails(db, selectedCompanyId, details);
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const handleShowExplanation = (substanceId: string, categoryId: string, type: 'seveso' | 'arie') => {
    const substance = localInventory.find(sub => sub.id === substanceId);
    if (substance) {
      setExplanationData({ substance, categoryId, type });
    }
  };

  const generateFileName = (extension: string, type: string) => {
    const date = new Date();
    const YYYYMMDD = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    const sanitizedName = (selectedCompany?.name || 'Naamloos').replace(/[^a-z0-9]/gi, '_');
    const code = type === 'seveso' ? 'SEV' : 'SERIE';
    return `${sanitizedName}.${code}.${YYYYMMDD}.${extension}`;
  };

  const handleSaveAsPdf = async (reportType: 'full' | 'seveso' = 'full') => {
    if (!selectedCompany) return;
    setIsSavingPdf(true);
    const { id: toastId } = toast({ 
      title: reportType === 'full' ? "Volledig rapport genereren..." : "Seveso rapport genereren...", 
      description: "Document wordt samengesteld." 
    });

    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const fullContentWidth = pageWidth - (margin * 2);
        let finalY = 20;

        const colors = { 
          primary: [22, 80, 91], 
          foreground: [58, 66, 78], 
          destructive: [239, 68, 68], 
          muted: [100, 116, 139], 
          border: [226, 232, 240] 
        };
        
        const now = new Date();
        const YYYYMMDD = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
        const code = reportType === 'seveso' ? 'SEV' : 'SERIE';
        const reportNumber = `${getShortId(selectedCompany.id)}.${code}.${YYYYMMDD}`;

        const addHeaderAndFooter = (pdfDoc: jsPDF) => {
            const totalPages = (pdfDoc as any).internal.getNumberOfPages();
            for (let i = 2; i <= totalPages; i++) {
                pdfDoc.setPage(i);
                pdfDoc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                pdfDoc.line(margin, 15, pageWidth - margin, 15);
                pdfDoc.setFontSize(9);
                pdfDoc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
                pdfDoc.text(`Rapportnummer: ${reportNumber}`, pageWidth - margin, 11, { align: 'right' });
                pdfDoc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
                pdfDoc.text(`Pagina ${i} van ${totalPages}`, margin, pageHeight - 12);
                pdfDoc.setFont('helvetica', 'bold');
                pdfDoc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                pdfDoc.text("ChemStats", pageWidth - margin, pageHeight - 12, { align: 'right' });
            }
        };

        const checkPageBreak = (needed: number) => {
          if (finalY + needed > pageHeight - 25) {
            doc.addPage();
            finalY = 25; 
            return true;
          }
          return false;
        };

        const addSectionHeader = (text: string) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.text(text, margin, finalY);
            finalY += 10;
        };

        const addSubsectionHeader = (text: string) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
            doc.text(text, margin, finalY);
            finalY += 6;
        };

        const addBodyText = (text: string) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
            const splitText = doc.splitTextToSize(text, fullContentWidth);
            checkPageBreak(splitText.length * 5 + 6);
            doc.text(splitText, margin, finalY);
            finalY += (splitText.length * 5) + 6;
        };

        // --- TITELPAGINA ---
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, 0, pageWidth, 65, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text("ChemStats", margin, 38);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'normal');
        doc.text("Gevaarlijke Stoffen Analyse", margin, 48);

        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(30);
        doc.setFont('helvetica', 'bold');
        const mainTitle = reportType === 'seveso' ? "Seveso III\nRapportage" : "Seveso III & ARIE\nRapportage";
        doc.text(mainTitle, margin, 105);
        
        doc.setFontSize(16);
        doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
        doc.text(`Bedrijf: ${selectedCompany.name}`, margin, 140);
        doc.setFontSize(14);
        doc.text(`Locatie: ${selectedCompany.address}`, margin, 148);
        doc.setFontSize(11);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text(`Datum: ${now.toLocaleDateString('nl-NL')}`, margin, 175);
        doc.text(`Rapportnummer: ${reportNumber}`, margin, 182);

        // --- PAGINA 2: Inleiding en Systematiek (CONFORM VOORBEELD) ---
        doc.addPage();
        finalY = 35;
        
        // 1. Inleiding en Kaderstelling
        addSectionHeader("1. Inleiding en Kaderstelling");
        addBodyText(`Binnen de bedrijfsvoering van ${selectedCompany.name} wordt gewerkt met diverse gevaarlijke stoffen. Om de veiligheidsrisico's te beheersen, is de inrichting onderworpen aan specifieke wettelijke kaders. Deze rapportage toetst de actuele status aan de hand van de volgende regelgevingen:`);
        
        // 1.1 De Seveso-richtlijn
        addSubsectionHeader("1.1 De Seveso-richtlijn");
        addBodyText("De Seveso-III richtlijn is gericht op het voorkomen van zware ongevallen waarbij gevaarlijke stoffen betrokken zijn en het beperken van de gevolgen daarvan voor de mens en het milieu. De richtlijn onderscheidt lagedrempel- en hogedrempelinrichtingen.");

        // 1.2 De ARIE-regeling (Alleen in SERIE rapport)
        if (reportType === 'full') {
            addSubsectionHeader("1.2 De ARIE-regeling");
            addBodyText("De regeling Aanvullende Risico-Inventarisatie en -Evaluatie (ARIE) is verankerd in het Arbeidsomstandighedenbesluit en richt zich op de interne veiligheid en de bescherming van werknemers op de werkvloer tegen de gevolgen van zware ongevallen.");
        }

        finalY += 5;

        // 2. De Beoordelingssystematiek
        addSectionHeader("2. De Beoordelingssystematiek");
        
        // 2.1 Indeling op basis van H-zinnen
        addSubsectionHeader("2.1 Indeling op basis van H-zinnen");
        const hZinText = reportType === 'full' 
            ? "De basis voor de indeling zijn de gevarenaanduidingen (H-zinnen) zoals vermeld op het Veiligheidsinformatieblad (SDS). Deze bepalen de gevarengroep conform de Seveso-richtlijn en ARIE-regeling. De drempelwaardecheck in deze module toetst of de sommatie van stoffen binnen een gevarencategorie de kritieke grens van 1,0 overschrijdt."
            : "De basis voor de indeling zijn de gevarenaanduidingen (H-zinnen) zoals vermeld op het Veiligheidsinformatieblad (SDS). Deze bepalen de gevarengroep conform de Seveso-richtlijn. De drempelwaardecheck in deze module toetst of de sommatie van stoffen binnen een gevarencategorie de kritieke grens van 1,0 overschrijdt.";
        addBodyText(hZinText);

        // 2.2 De Sommatieregeling
        addSubsectionHeader("2.2 De Sommatieregeling");
        addBodyText("Per gevarengroep wordt de aanwezige hoeveelheid vergeleken met de wettelijke drempelwaarde. Indien de som de waarde 1,0 (100%) bereikt of overschrijdt, is het betreffende wettelijke regime van kracht.");

        // --- PAGINA 3: Resultaten ---
        doc.addPage();
        finalY = 25;
        addSectionHeader("3. Resultaten van de Sommatie");
        const stats = calculateSummations(localInventory, thresholdMode);
        
        addSubsectionHeader("3.1 Seveso Resultaten");
        autoTable(doc, {
          startY: finalY,
          head: [['Gevarengroep (Seveso)', 'Resultaat Sommatie', 'Status']],
          body: stats.summationGroups.map(g => [
            g.name,
            `${(g.totalRatio).toFixed(2)}`,
            g.isExceeded ? 'OVERSCHREDEN' : 'Voldoet'
          ]),
          theme: 'striped',
          headStyles: { fillColor: colors.primary as [number, number, number] },
        });
        
        finalY = (doc as any).lastAutoTable.finalY + 15;

        if (reportType === 'full') {
          checkPageBreak(50);
          addSubsectionHeader("3.2 ARIE Resultaten");
          autoTable(doc, {
            startY: finalY,
            head: [['Gevarengroep (ARIE)', 'Resultaat Sommatie', 'Status']],
            body: stats.arieSummationGroups.map(g => [
              g.name,
              `${(g.totalRatio).toFixed(2)}`,
              g.isExceeded ? 'OVERSCHREDEN' : 'Voldoet'
            ]),
            theme: 'striped',
            headStyles: { fillColor: colors.foreground as [number, number, number] },
          });
          finalY = (doc as any).lastAutoTable.finalY + 15;
        }

        // --- PAGINA 4: Conclusie ---
        checkPageBreak(50);
        addSectionHeader("4. Conclusie");
        const statusText = stats.overallStatus === 'Geen' ? 'niet' : 'wel';
        addBodyText(`Op basis van de ingevoerde inventaris is geconstateerd dat de inrichting ${statusText} voldoet aan de criteria voor een Seveso-inrichting (${thresholdMode === 'low' ? 'Lagedrempel' : 'Hogedrempel'}). De meest kritieke gevarengroep is ${stats.criticalGroup} met een sommatiewaarde van ${stats.summationGroups.find(g => g.name === stats.criticalGroup)?.totalRatio.toFixed(2)}.`);

        if (reportType === 'full') {
          checkPageBreak(40);
          addSubsectionHeader("4.2 ARIE Conclusie");
          const arieStatus = stats.arieExceeded ? 'wel' : 'niet';
          const arieText = `De inrichting wordt op basis van de vigerende Arbo-wetgeving beoordeeld op de ARIE-gevarengroepen. De inrichting is op basis van deze berekening ${arieStatus} ARIE-plichtig. Voor de meest kritieke groep ${stats.criticalArieGroup} bedraagt het resultaat van de sommatie ${stats.arieTotal.toFixed(2)}.`;
          addBodyText(arieText);
        }

        // --- BIJLAGE: Inventaris ---
        doc.addPage();
        finalY = 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text("Bijlage: Volledige Inventaris", margin, finalY);
        finalY += 10;

        autoTable(doc, {
            startY: finalY,
            head: [['Product / CAS', 'Seveso Cat.', 'Type', 'Voorraad']],
            body: localInventory.map(sub => [
                sub.productName, 
                sub.sevesoCategoryIds.join(", "), 
                sub.isNamedSubstance ? 'Benoemd' : 'Categorie', 
                `${sub.quantity} t`
            ]),
            theme: 'striped',
            headStyles: { fillColor: colors.primary as [number, number, number] },
            margin: { top: 25 }
        });

        addHeaderAndFooter(doc);
        doc.save(generateFileName('pdf', reportType));
        dismiss(toastId);
        toast({ title: "PDF opgeslagen" });
    } catch (error) {
        dismiss(toastId);
        console.error("PDF Error:", error);
        toast({ variant: "destructive", title: "Fout bij PDF maken" });
    } finally {
        setIsSavingPdf(false);
    }
  };

  const handleAddSubstance = (newSubstance: Omit<Substance, 'id' | 'quantity'>) => {
    if (!selectedCompanyId || !db) return;
    const substanceWithId = { ...newSubstance, id: `sub-${Date.now()}`, quantity: 0 };
    setLocalInventory(prev => [...prev, substanceWithId]);
    addSubstanceToDb(db, selectedCompanyId, substanceWithId);
  };
  
  const handleUpdateSubstanceQuantity = (id: string, quantity: number) => {
    if (!selectedCompanyId || !db) return;
    setLocalInventory(prev => prev.map(sub => sub.id === id ? { ...sub, quantity } : sub));
    updateSubstanceQuantityInDb(db, selectedCompanyId, id, quantity);
  };

  const handleDeleteSubstance = (id: string) => {
    if (!selectedCompanyId || !db) return;
    setLocalInventory(prev => prev.filter(sub => sub.id !== id));
    deleteSubstanceFromDb(db, selectedCompanyId, id);
  };

  const handleClearAll = () => {
    if (!selectedCompanyId || !db) return;
    setLocalInventory([]);
    clearInventoryFromDb(db, selectedCompanyId);
    setIsClearAlertOpen(false);
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompanyId || !db) return;
    await deleteCompanyFromDb(db, selectedCompanyId);
    setSelectedCompanyId(null);
    setIsDeleteCompanyAlertOpen(false);
  };
  
  const handleExport = (type: 'json' | 'excel') => {
    if (type === 'json') {
        const dataStr = JSON.stringify({ company: selectedCompany, inventory: localInventory }, null, 2);
        const url = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = generateFileName('json', 'full');
        link.click();
    } else {
        const ws = XLSX.utils.json_to_sheet(localInventory);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventaris");
        XLSX.writeFile(wb, generateFileName('xlsx', 'full'));
    }
  };

  if (isAuthLoading || isLoadingUserProfile || !user) {
    return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">Laden...</p>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
      <SevesoHeader
        onUpload={() => setIsSdsUploadOpen(true)}
        onClearAll={() => setIsClearAlertOpen(true)}
        onShowReference={() => setIsReferenceGuideOpen(true)}
        onImport={() => {}}
        onExport={handleExport}
        onSaveAsPdf={handleSaveAsPdf}
        isSavingPdf={isSavingPdf}
        disabled={!selectedCompanyId}
      />
      
      <CompanySelector 
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={handleSelectCompany}
        onCreateNew={handleCreateNewCompany}
        onDeleteCompany={() => setIsDeleteCompanyAlertOpen(true)}
        onDetailsChange={handleCompanyDetailsChange}
        disabled={isLoadingCompanies}
      />
      
      {selectedCompanyId ? (
        <div className="mt-8 flex flex-col lg:flex-row gap-8">
            <div className="flex-grow lg:w-2/3">
                <InventoryTable
                    inventory={localInventory}
                    onUpdateQuantity={handleUpdateSubstanceQuantity}
                    onDelete={handleDeleteSubstance}
                    thresholdMode={thresholdMode}
                    onUpload={() => setIsSdsUploadOpen(true)}
                    onShowExplanation={handleShowExplanation}
                />
            </div>
            <aside className="lg:w-1/3 lg:sticky lg:top-8 h-fit">
                <Dashboard
                    inventory={localInventory}
                    thresholdMode={thresholdMode}
                    setThresholdMode={setThresholdMode}
                />
            </aside>
        </div>
      ) : (
          <div className="mt-12 text-center p-12 border-2 border-dashed rounded-2xl bg-muted/10">
              <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Selecteer een vestiging</h2>
              <p className="text-muted-foreground mt-2">Kies een vestiging uit het menu hierboven om te beginnen.</p>
          </div>
      )}

      <SdsUploadDialog isOpen={isSdsUploadOpen} onOpenChange={setIsSdsUploadOpen} onAddSubstance={handleAddSubstance} />
      <ReferenceGuideDialog isOpen={isReferenceGuideOpen} onOpenChange={setIsReferenceGuideOpen} />
      
      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alles wissen?</AlertDialogTitle>
            <AlertDialogDescription>Dit verwijdert de volledige inventaris van "{selectedCompany?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive">Wissen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteCompanyAlertOpen} onOpenChange={setIsDeleteCompanyAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vestiging verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>Dit kan niet ongedaan worden gemaakt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} className="bg-destructive">Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryExplanationDialog
        isOpen={!!explanationData.substance}
        onOpenChange={(open) => !open && setExplanationData({ substance: null, categoryId: null, type: null })}
        substance={explanationData.substance}
        categoryId={explanationData.categoryId}
        categoryType={explanationData.type}
      />
    </div>
  );
}
