
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
  const [historySubstance, setHistorySubstance] = useState<Substance | null>(null);
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
    if (!selectedCompany) return;
    setIsSavingPdf(true);
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const stats = calculateSummations(localInventory, thresholdMode);
        
        doc.setFontSize(22);
        doc.setTextColor(22, 80, 91);
        doc.text(type === 'full' ? "Seveso & ARIE Rapport" : "Seveso Rapport", 20, 30);
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Bedrijf: ${selectedCompany.name}`, 20, 40);
        doc.text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, 20, 45);

        doc.setFontSize(14);
        doc.setTextColor(22, 80, 91);
        doc.text("Seveso III Sommatieoverzicht", 20, 60);
        autoTable(doc, {
            startY: 65,
            head: [['Gevarengroep', 'Ratio (%)', 'Status']],
            body: stats.summationGroups.map(g => [g.name, `${Math.round(g.totalRatio * 100)}%`, g.totalRatio >= 1 ? 'DREMPEL OVERSCHREDEN' : 'Binnen drempel']),
            headStyles: { fillColor: [22, 80, 91] },
        });

        if (type === 'full') {
            const lastY = (doc as any).lastAutoTable.finalY || 120;
            doc.text("ARIE Sommatieoverzicht", 20, lastY + 15);
            autoTable(doc, {
                startY: lastY + 20,
                head: [['Gevarengroep', 'Ratio (%)', 'Status']],
                body: stats.arieSummationGroups.map(g => [g.name, `${Math.round(g.totalRatio * 100)}%`, g.totalRatio >= 1 ? 'ARIE PLICHTIG' : 'Niet ARIE plichtig']),
                headStyles: { fillColor: [50, 50, 50] },
            });
        }

        doc.addPage();
        doc.text("Stoffenoverzicht", 20, 20);
        autoTable(doc, {
            startY: 25,
            head: [['Stof', 'CAS', 'Voorraad (t)', 'Seveso Cat.', 'ARIE Cat.']],
            body: localInventory.map(s => [s.productName, s.casNumber || '-', s.quantity.toFixed(2), s.sevesoCategoryIds.join(', '), s.arieCategoryIds.join(', ')]),
            headStyles: { fillColor: [22, 80, 91] },
        });

        doc.save(generateFileName('pdf'));
        toast({ title: "Rapport opgeslagen" });
    } catch (error) {
        console.error("PDF generation failed:", error);
        toast({ variant: "destructive", title: "Fout bij PDF maken" });
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
            <div className="flex-grow lg:w-2/3">{isLoadingInventory ? <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div> : <InventoryTable inventory={localInventory} onUpdateQuantity={handleUpdateSubstanceQuantity} onDelete={id => { setLocalInventory(p => p.filter(s => s.id !== id)); deleteSubstanceFromDb(db, selectedCompanyId, id); }} thresholdMode={thresholdMode} onUpload={() => setIsSdsUploadOpen(true)} onShowExplanation={(sid, cid, t) => setExplanationData({ substance: localInventory.find(s => s.id === sid)!, categoryId: cid, type: t })} onShowHistory={id => { setHistorySubstance(localInventory.find(s => s.id === id)!); setIsHistoryDialogOpen(true); }} />}</div>
            <aside className="lg:w-1/3"><Dashboard inventory={localInventory} thresholdMode={thresholdMode} setThresholdMode={setThresholdMode} /></aside>
        </div>
      ) : (
          <div className="mt-12 text-center p-12 border-2 border-dashed rounded-2xl bg-muted/10"><Building2 className="w-12 h-12 text-primary mx-auto mb-4" /><h2 className="text-xl font-bold">Selecteer een bedrijf</h2><p className="text-muted-foreground">Kies een vestiging om te beginnen.</p></div>
      )}
      <SdsUploadDialog isOpen={isSdsUploadOpen} onOpenChange={setIsSdsUploadOpen} onAddSubstance={handleAddSubstance} />
      <ReferenceGuideDialog isOpen={isReferenceGuideOpen} onOpenChange={setIsReferenceGuideOpen} />
      <PasswordChangeDialog isOpen={isPasswordChangeOpen} onOpenChange={setIsPasswordChangeOpen} />
      <HistoryDialog isOpen={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen} substance={historySubstance} companyId={selectedCompanyId} />
      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Inventaris wissen?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction onClick={() => { setLocalInventory([]); clearInventoryFromDb(db, selectedCompanyId!); setIsClearAlertOpen(false); }}>Wissen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={isDeleteCompanyAlertOpen} onOpenChange={setIsDeleteCompanyAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bedrijf verwijderen?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction onClick={async () => { await deleteCompanyFromDb(db, selectedCompanyId!); setSelectedCompanyId(null); setIsDeleteCompanyAlertOpen(false); }} className="bg-destructive">Verwijderen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <CategoryExplanationDialog isOpen={!!explanationData.substance} onOpenChange={o => !o && setExplanationData({ substance: null, categoryId: null, type: null })} substance={explanationData.substance} categoryId={explanationData.categoryId} categoryType={explanationData.type} />
    </div>
  );
}
