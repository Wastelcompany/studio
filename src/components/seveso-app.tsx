
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Substance, ThresholdMode, Company, UserProfile } from '@/lib/types';
import SevesoHeader from '@/components/seveso-header';
import InventoryTable from '@/components/inventory-table';
import Dashboard from '@/components/dashboard';
import SdsUploadDialog from './sds-upload-dialog';
import ReferenceGuideDialog from './reference-guide-dialog';
import PasswordChangeDialog from './password-change-dialog';
import HistoryDialog from './history-dialog';
import SdsViewerDialog from './sds-viewer-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import CategoryExplanationDialog from './category-explanation-dialog';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import CompanySelector from './company-selector';
import { calculateSummations } from '@/lib/seveso';
import * as XLSX from 'xlsx';
import { useUser, useCollection, useMemoFirebase, useFirestore, useDoc, useAuth } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { createNewCompany, updateCompanyDetails, addSubstanceToDb, deleteSubstanceFromDb, updateSubstanceQuantityInDb, clearInventoryFromDb, deleteCompanyFromDb } from '@/lib/companies';
import { Loader2, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

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
  const companiesQuery = useMemoFirebase(() => (userProfile?.customerId && !userProfile?.disabled) ? query(collection(db, 'companies'), where('customerId', '==', userProfile.customerId)) : null, [userProfile, db]);
  const { data: companiesData, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const companies = useMemo(() => companiesData?.sort((a, b) => a.name.localeCompare(b.name)) ?? [], [companiesData]);

  const inventoryQuery = useMemoFirebase(() => selectedCompanyId ? collection(db, 'companies', selectedCompanyId, 'inventory') : null, [selectedCompanyId, db]);
  const { data: firestoreInventory, isLoading: isLoadingInventory } = useCollection<Substance>(inventoryQuery);
  const [localInventory, setLocalInventory] = useState<Substance[]>([]);
  
  useEffect(() => {
    setLocalInventory(firestoreInventory || []);
  }, [firestoreInventory, selectedCompanyId]);

  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('low');
  const [isSdsUploadOpen, setIsSdsUploadOpen] = useState(false);
  const [isReferenceGuideOpen, setIsReferenceGuideOpen] = useState(false);
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [isDeleteCompanyAlertOpen, setIsDeleteCompanyAlertOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isSdsViewerOpen, setIsSdsViewerOpen] = useState(false);
  const [historySubstance, setHistorySubstance] = useState<Substance | null>(null);
  const [viewerSubstance, setViewerSubstance] = useState<Substance | null>(null);
  const { toast } = useToast();
  const [explanationData, setExplanationData] = useState<{ substance: Substance | null; categoryId: string | null; type: 'seveso' | 'arie' | null }>({ substance: null, categoryId: null, type: null });
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const generateFileName = (extension: string) => {
    const date = new Date();
    const YYYYMMDD = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    return `${(selectedCompany?.name || 'Naamloos').replace(/[^a-z0-9]/gi, '_')}.${YYYYMMDD}.${extension}`;
  };

  const handleGenerateReport = (type: 'full' | 'seveso') => {
    if (!selectedCompany || !user) return;
    setIsSavingPdf(true);
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const stats = calculateSummations(localInventory, thresholdMode);
        const primaryColor = [22, 80, 91]; // Deep Teal (#16505B)
        const dateStr = format(new Date(), 'd-M-yyyy');
        const rapportNummer = `${user.uid.substring(0, 10)}.${type === 'full' ? 'SERIE' : 'SEV'}.${format(new Date(), 'yyMMdd')}`;

        // --- PAGINA 1: VOORBLAD ---
        doc.setFillColor(22, 80, 91);
        doc.rect(0, 0, 210, 55, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.setTextColor(255, 255, 255);
        doc.text("ChemStats", 20, 25);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text("Gevaarlijke Stoffen Analyse", 20, 33);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(32);
        doc.setTextColor(22, 80, 91);
        doc.text("Seveso III & ARIE Rapportage", 20, 90);
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text("Bedrijf:", 20, 115);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedCompany.name, 45, 115);
        doc.setFont('helvetica', 'normal');
        doc.text("Locatie:", 20, 123);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedCompany.address || 'Geen adres opgegeven', 45, 123);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Datum: ${dateStr}`, 20, 275);
        doc.text(`Rapportnummer: ${rapportNummer}`, 20, 282);

        // --- PAGINA 2: HOOFDSTUK 1 & 2 (Inleiding) ---
        doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(22, 80, 91);
        doc.text("1. Inleiding en Kaderstelling", 20, 30);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const introText = `Binnen de bedrijfsvoering van ${selectedCompany.name} wordt gewerkt met diverse gevaarlijke stoffen. Deze rapportage toetst de status aan de Seveso-richtlijn en (indien van toepassing) de ARIE-regeling.`;
        doc.text(doc.splitTextToSize(introText, 170), 20, 40);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text("1.1 De Seveso-richtlijn", 20, 55);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const sevesoIntro = "De Seveso-III richtlijn is gericht op het voorkomen van zware ongevallen waarbij gevaarlijke stoffen betrokken zijn en het beperken van de gevolgen daarvan voor de mens en het milieu. De richtlijn onderscheidt lagedrempel- en hogedrempelinrichtingen.";
        doc.text(doc.splitTextToSize(sevesoIntro, 170), 20, 62);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text("1.2 De ARIE-regeling", 20, 80);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const arieIntro = "De regeling Aanvullende Risico-Inventarisatie en -Evaluatie (ARIE) is verankerd in het Arbeidsomstandighedenbesluit en richt zich op de interne veiligheid en de bescherming van werknemers op de werkvloer tegen de gevolgen van zware ongevallen.";
        doc.text(doc.splitTextToSize(arieIntro, 170), 20, 87);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(22, 80, 91);
        doc.text("2. De Beoordelingssystematiek", 20, 115);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        doc.text("2.1 Indeling op basis van H-zinnen", 20, 125);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const hZinnenIntro = "De basis voor de indeling zijn de gevarenaanduidingen (H-zinnen) zoals vermeld op het Veiligheidsinformatieblad (SDS). Deze bepalen de gevarengroep conform de Seveso-richtlijn. De drempelwaardecheck in deze module toetst of de sommatie van stoffen binnen een gevarencategorie de kritieke grens van 1,0 overschrijdt.";
        doc.text(doc.splitTextToSize(hZinnenIntro, 170), 20, 132);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text("2.2 De Sommatieregeling", 20, 155);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const sommatieIntro = "Per gevarengroep wordt de aanwezige hoeveelheid vergeleken met de wettelijke drempelwaarde. Indien de som de waarde 1,0 (100%) bereikt of overschrijdt, is het betreffende wettelijke regime van kracht.\n\nSpecifiek voor de ARIE-toetsing zijn de afwijkende drempelwaarden en categorieën (o.a. Huidcorrosie H4) toegepast die verschillen van de Seveso-systematiek.";
        doc.text(doc.splitTextToSize(sommatieIntro, 170), 20, 162);

        // --- PAGINA 3: SEVESO ANALYSE ---
        doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(22, 80, 91);
        doc.text("3. Seveso III Sommatieoverzicht", 20, 30);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Drempelwaarde-modus: ${thresholdMode === 'high' ? 'Hoge drempels' : 'Lage drempels'}`, 20, 38);
        autoTable(doc, {
            startY: 45,
            head: [['Gevarengroep', 'Sommatie Ratio (%)', 'Status']],
            body: stats.summationGroups.map(g => [g.name, `${g.totalRatio.toFixed(2)} / ${Math.round(g.totalRatio * 100)}%`, g.totalRatio >= 1 ? 'DREMPEL OVERSCHREDEN' : 'Binnen drempel']),
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 4 },
            columnStyles: { 2: { fontStyle: 'bold' } },
            didParseCell: (data) => { if (data.section === 'body' && data.column.index === 2 && data.cell.text[0] === 'DREMPEL OVERSCHREDEN') data.cell.styles.textColor = [190, 0, 0]; }
        });

        // --- PAGINA 4: ARIE ANALYSE ---
        if (type === 'full') {
            doc.addPage();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(22, 80, 91);
            doc.text("4. ARIE Sommatieoverzicht", 20, 30);
            autoTable(doc, {
                startY: 45,
                head: [['Gevarengroep', 'Ratio (%)', 'Status']],
                body: stats.arieSummationGroups.map(g => [g.name, `${g.totalRatio.toFixed(2)} / ${Math.round(g.totalRatio * 100)}%`, g.totalRatio >= 1 ? 'ARIE PLICHTIG' : 'Niet ARIE plichtig']),
                headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 4 },
                columnStyles: { 2: { fontStyle: 'bold' } },
                didParseCell: (data) => { if (data.section === 'body' && data.column.index === 2 && data.cell.text[0] === 'ARIE PLICHTIG') data.cell.styles.textColor = [190, 0, 0]; }
            });
        }

        // --- PAGINA 5: RESULTATEN ---
        doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(22, 80, 91);
        doc.text("5. Resultaten", 20, 30);
        const cardWidth = 85; const cardHeight = 35;
        doc.setDrawColor(230, 230, 230); doc.roundedRect(20, 45, cardWidth, cardHeight, 3, 3, 'S');
        doc.setFontSize(10); doc.setTextColor(120, 120, 120); doc.text("Seveso Status", 30, 55);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        const sevColor = stats.overallStatus === 'Geen' ? [22, 80, 91] : [190, 0, 0];
        doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
        doc.text(stats.overallStatus === 'Geen' ? 'Geen Seveso-inrichting' : `${stats.overallStatus}-inrichting`, 30, 68);
        doc.setDrawColor(230, 230, 230); doc.roundedRect(20 + cardWidth + 10, 45, cardWidth, cardHeight, 3, 3, 'S');
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120); doc.text("ARIE Status", 20 + cardWidth + 20, 55);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        const arieColor = stats.arieExceeded ? [190, 0, 0] : [22, 80, 91];
        doc.setTextColor(arieColor[0], arieColor[1], arieColor[2]);
        doc.text(stats.arieExceeded ? 'ARIE-plichtig' : 'Niet ARIE-plichtig', 20 + cardWidth + 20, 68);
        doc.setFontSize(14); doc.setTextColor(22, 80, 91); doc.text("Seveso Sommatie", 20, 95); doc.text("ARIE Sommatie", 115, 95);
        const drawProgress = (x: number, y: number, label: string, ratio: number, isArie = false) => {
            doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80); doc.text(label, x, y);
            doc.setFont('helvetica', 'bold'); const exceeded = ratio >= 1; doc.setTextColor(exceeded ? 190 : 80, exceeded ? 0 : 80, exceeded ? 0 : 80);
            doc.text(`${ratio.toFixed(2)} / ${Math.round(ratio * 100)}%`, x + 65, y, { align: 'right' });
            doc.setFillColor(245, 245, 245); doc.rect(x, y + 2, 75, 2, 'F');
            const color = exceeded ? [190, 0, 0] : (isArie ? [50, 50, 50] : [22, 80, 91]);
            doc.setFillColor(color[0], color[1], color[2]); doc.rect(x, y + 2, Math.min(ratio * 75, 75), 2, 'F');
        };
        stats.summationGroups.forEach((g, i) => drawProgress(20, 105 + (i * 15), g.name, g.totalRatio));
        stats.arieSummationGroups.forEach((g, i) => drawProgress(115, 105 + (i * 15), g.name, g.totalRatio, true));

        // --- PAGINA 6: CONCLUSIE ---
        doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(22, 80, 91);
        doc.text("6. Conclusie", 20, 30);
        doc.setFontSize(12); doc.text("6.1 Seveso", 20, 45);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
        let sevText = stats.overallStatus === 'Geen' ? "De inrichting wordt niet aangemerkt als een Seveso-inrichting. De sommatie van de gevaarlijke stoffen blijft voor alle categorieën onder de drempelwaarden." : `De inrichting wordt op basis van de vigerende Seveso III-richtlijn aangemerkt als een ${stats.overallStatus}-inrichting. Voor de gevarengroep ${stats.criticalGroup} bedraagt het resultaat van de sommatie ${stats.summationGroups.find(g => g.name === stats.criticalGroup)?.totalRatio.toFixed(2)} (${Math.round((stats.summationGroups.find(g => g.name === stats.criticalGroup)?.totalRatio || 0) * 100)}%), waarmee de wettelijke drempelwaarde van 1.00 wordt overschreden.\n\nOmdat de Seveso-regeling primair is ontworpen om zware ongevallen met gevaarlijke stoffen te voorkomen en de gevolgen daarvan voor de menselijke gezondheid en het milieu te beperken, impliceert deze overschrijding dat aanvullende specifieke beheersmaatregelen en rapportageverplichtingen wettelijk verplicht zijn.`;
        doc.text(doc.splitTextToSize(sevText, 170), 20, 55);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(22, 80, 91); doc.text("6.2 ARIE", 20, 105);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
        let arieText = !stats.arieExceeded ? "De inrichting wordt niet aangemerkt als ARIE-plichtig op basis van de vigerende Arbo-wetgeving. De sommatie van de gevaarlijke stoffen blijft voor alle categorieën onder de drempelwaarden." : `De inrichting wordt op basis van de vigerende Arbo-wetgeving aangemerkt als ARIE-plichtig. Voor de gevarengroep ${stats.criticalArieGroup} bedraagt het resultaat van de sommatie ${stats.arieSummationGroups.find(g => g.name === stats.criticalArieGroup)?.totalRatio.toFixed(2)} (${Math.round((stats.arieSummationGroups.find(g => g.name === stats.criticalArieGroup)?.totalRatio || 0) * 100)}%), waarmee de wettelijke drempelwaarde van 1.00 wordt overschreden.\n\nOmdat de ARIE-regeling primair is ontworpen om werknemers te beschermen tegen de gevolgen van zware ongevallen met gevaarlijke stoffen, impliceert deze overschrijding dat aanvullende specifieke beheersmaatregelen wettelijk verplicht zijn conform het Arbobesluit.`;
        doc.text(doc.splitTextToSize(arieText, 170), 20, 115);

        // --- PAGINA 7: STOFFENLIJST ---
        doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(22, 80, 91);
        doc.text("7. Gedetailleerd Stoffenoverzicht", 20, 30);
        autoTable(doc, {
            startY: 40,
            head: [['Stofnaam', 'CAS', 'Voorraad (t)', 'Seveso Cat.', 'ARIE Cat.']],
            body: localInventory.map(s => [s.productName, s.casNumber || '-', s.quantity.toFixed(2), s.sevesoCategoryIds.join(', '), s.arieCategoryIds.join(', ')]),
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30 }, 2: { cellWidth: 25, halign: 'right' } }
        });

        doc.save(generateFileName('pdf'));
        toast({ title: "Rapport succesvol opgeslagen" });
    } catch (error) {
        console.error("PDF generation failed:", error);
        toast({ variant: "destructive", title: "Fout bij genereren van rapport" });
    } finally {
        setIsSavingPdf(false);
    }
  };

  const handleAddSubstance = (newSub: Omit<Substance, 'id' | 'quantity'>) => {
    if (!selectedCompanyId) return;
    const sub = { ...newSub, id: `sub-${Date.now()}`, quantity: 0 };
    setLocalInventory(prev => [...prev, sub]);
    addSubstanceToDb(db, selectedCompanyId, sub);
  };
  
  const handleUpdateSubstanceQuantity = (id: string, qty: number) => {
    if (!selectedCompanyId) return;
    const nQty = isNaN(qty) ? 0 : qty;
    setLocalInventory(prev => prev.map(s => s.id === id ? { ...s, quantity: nQty } : s));
    updateSubstanceQuantityInDb(db, selectedCompanyId, id, nQty);
  };

  const handleExport = (type: 'json' | 'excel') => {
    if (!selectedCompany) return;
    if (type === 'json') {
        const url = URL.createObjectURL(new Blob([JSON.stringify({ company: selectedCompany, inventory: localInventory }, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = generateFileName('json'); link.click();
    } else {
        const ws = XLSX.utils.json_to_sheet(localInventory); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Inventaris"); XLSX.writeFile(wb, generateFileName('xlsx'));
    }
  };

  if (isAuthLoading || isLoadingUserProfile || !user) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
      <SevesoHeader onUpload={() => setIsSdsUploadOpen(true)} onClearAll={() => setIsClearAlertOpen(true)} onShowReference={() => setIsReferenceGuideOpen(true)} onImport={() => {}} onExport={handleExport} onSaveAsPdf={handleGenerateReport} onPasswordChange={() => setIsPasswordChangeOpen(true)} isSavingPdf={isSavingPdf} disabled={!selectedCompanyId} />
      <CompanySelector companies={companies} selectedCompanyId={selectedCompanyId} onSelectCompany={setSelectedCompanyId} onCreateNew={() => createNewCompany(db, user.uid, userProfile!.customerId).then(c => c && setSelectedCompanyId(c.id))} onDeleteCompany={() => setIsDeleteCompanyAlertOpen(true)} onDetailsChange={d => selectedCompanyId && updateCompanyDetails(db, selectedCompanyId, d)} disabled={isLoadingCompanies} />
      {selectedCompanyId ? (
        <div className="mt-8 flex flex-col lg:flex-row gap-8">
            <div className="flex-grow lg:w-2/3">{isLoadingInventory ? <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div> : <InventoryTable inventory={localInventory} onUpdateQuantity={handleUpdateSubstanceQuantity} onDelete={id => { setLocalInventory(p => p.filter(s => s.id !== id)); deleteSubstanceFromDb(db, selectedCompanyId, id); }} thresholdMode={thresholdMode} onUpload={() => setIsSdsUploadOpen(true)} onShowExplanation={(sid, cid, t) => setExplanationData({ substance: localInventory.find(s => s.id === sid)!, categoryId: cid, type: t })} onShowHistory={id => { setHistorySubstance(localInventory.find(s => s.id === id)!); setIsHistoryDialogOpen(true); }} onShowSds={id => { setViewerSubstance(localInventory.find(s => s.id === id)!); setIsSdsViewerOpen(true); }} />}</div>
            <aside className="lg:w-1/3"><Dashboard inventory={localInventory} thresholdMode={thresholdMode} setThresholdMode={setThresholdMode} /></aside>
        </div>
      ) : (
          <div className="mt-12 text-center p-12 border-2 border-dashed rounded-2xl bg-muted/10"><Building2 className="w-12 h-12 text-primary mx-auto mb-4" /><h2 className="text-xl font-bold">Selecteer een bedrijf</h2><p className="text-muted-foreground">Kies een vestiging om te beginnen.</p></div>
      )}
      <SdsUploadDialog isOpen={isSdsUploadOpen} onOpenChange={setIsSdsUploadOpen} onAddSubstance={handleAddSubstance} />
      <ReferenceGuideDialog isOpen={isReferenceGuideOpen} onOpenChange={setIsReferenceGuideOpen} />
      <PasswordChangeDialog isOpen={isPasswordChangeOpen} onOpenChange={setIsPasswordChangeOpen} />
      <HistoryDialog isOpen={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen} substance={historySubstance} companyId={selectedCompanyId} />
      <SdsViewerDialog isOpen={isSdsViewerOpen} onOpenChange={setIsSdsViewerOpen} substance={viewerSubstance} />
      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Inventaris wissen?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction onClick={() => { setLocalInventory([]); clearInventoryFromDb(db, selectedCompanyId!); setIsClearAlertOpen(false); }}>Wissen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={isDeleteCompanyAlertOpen} onOpenChange={setIsDeleteCompanyAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bedrijf verwijderen?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction onClick={async () => { await deleteCompanyFromDb(db, selectedCompanyId!); setSelectedCompanyId(null); setIsDeleteCompanyAlertOpen(false); }} className="bg-destructive">Verwijderen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <CategoryExplanationDialog isOpen={!!explanationData.substance} onOpenChange={o => !o && setExplanationData({ substance: null, categoryId: null, type: null })} substance={explanationData.substance} categoryId={explanationData.categoryId} categoryType={explanationData.type} />
    </div>
  );
}
