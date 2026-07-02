"use client";

import { useState, useEffect, useMemo } from 'react';
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
import CompanySelector from './company-selector';
import { calculateSummations } from '@/lib/seveso';
import { useSupabase, useIsAdmin } from '@/supabase/provider';
import { useRealtimeQuery } from '@/supabase/hooks';
import { createNewCompany, updateCompanyDetails, addSubstanceToDb, deleteSubstanceFromDb, updateSubstanceQuantityInDb, clearInventoryFromDb, deleteCompanyFromDb, snakeToCamelCompany } from '@/lib/companies';
import { exportCompanyData, importCompanyData } from '@/lib/backup';
import { Loader2, UserX } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import SdsViewerDialog from './sds-viewer-dialog';
import PasswordChangeDialog from './password-change-dialog';
import HistoryDialog from './history-dialog';
import { v4 as uuidv4 } from 'uuid';

export default function SevesoApp() {
  const { supabase, user, isUserLoading: isAuthLoading } = useSupabase();
  const isAdmin = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) router.push('/');
  }, [isAuthLoading, user, router]);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState(true);

  useEffect(() => {
    if (!user) { setUserProfile(null); setIsLoadingUserProfile(false); return; }
    setIsLoadingUserProfile(true);
    supabase.from('user_profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setUserProfile({ uid: data.id, email: data.email, displayName: data.display_name ?? undefined, customerId: data.customer_id ?? '', customerName: data.customer_name ?? '', disabled: data.disabled, role: data.role, createdAt: data.created_at });
        setIsLoadingUserProfile(false);
      });
  }, [user, supabase]);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const { data: companiesRaw, isLoading: isLoadingCompanies } = useRealtimeQuery<any>(
    'companies',
    userProfile?.customerId && !userProfile?.disabled
      ? (sb) => sb.from('companies').select('*').eq('customer_id', userProfile.customerId).order('name')
      : null,
    [userProfile?.customerId, userProfile?.disabled]
  );
  const companies: Company[] = useMemo(() => (companiesRaw ?? []).map(snakeToCamelCompany), [companiesRaw]);

  const { data: inventoryRaw, isLoading: isLoadingInventory } = useRealtimeQuery<any>(
    'inventory',
    selectedCompanyId ? (sb) => sb.from('inventory').select('*').eq('company_id', selectedCompanyId) : null,
    [selectedCompanyId]
  );
  const firestoreInventory: Substance[] = useMemo(() => (inventoryRaw ?? []).map((row: any) => ({
    id: row.id, productName: row.product_name, casNumber: row.cas_number ?? null,
    hStatements: row.h_statements ?? [], sevesoCategoryIds: row.seveso_category_ids ?? [],
    arieCategoryIds: row.arie_category_ids ?? [], isNamedSubstance: row.is_named_substance ?? false,
    namedSubstanceName: row.named_substance_name ?? null, quantity: Number(row.quantity) ?? 0, sdsUri: row.sds_uri ?? undefined,
  })), [inventoryRaw]);

  const [localInventory, setLocalInventory] = useState<Substance[]>([]);
  useEffect(() => { setLocalInventory(firestoreInventory || []); }, [firestoreInventory]);

  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('low');
  const [isSdsUploadOpen, setIsSdsUploadOpen] = useState(false);
  const [isReferenceGuideOpen, setIsReferenceGuideOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [isDeleteCompanyAlertOpen, setIsDeleteCompanyAlertOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [viewerSubstance, setViewerSubstance] = useState<Substance | null>(null);
  const [historySubstance, setHistorySubstance] = useState<Substance | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [explanationData, setExplanationData] = useState<{ substance: Substance | null; categoryId: string | null; type: 'seveso' | 'arie' | null }>({ substance: null, categoryId: null, type: null });
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const { toast } = useToast();

  const handleSaveAsPdf = async (type: 'full' | 'seveso') => {
    if (!selectedCompanyId) return;
    const company = companies.find(c => c.id === selectedCompanyId);
    setIsSavingPdf(true);
    try {
      const { data: dbTemplates } = await supabase
        .from('report_templates')
        .select('*')
        .eq('report_type', type);

      const getTpl = (key: string, def: string) => dbTemplates?.find(t => t.section_key === key)?.content || def;

      const doc = new jsPDF('p', 'mm', 'a4');
      const teal = [22, 80, 91];
      const { summationGroups, arieSummationGroups, overallStatus, arieExceeded } = calculateSummations(localInventory, thresholdMode);
      let currentY = 0;
      const checkPage = (h: number) => { if (currentY + h > 275) { doc.addPage(); currentY = 20; } };
      const addH1 = (text: string) => { checkPage(22); doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(teal[0], teal[1], teal[2]); doc.text(text, 20, currentY); currentY += 12; };
      const addH2 = (text: string) => { checkPage(18); doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(50, 50, 50); doc.text(text, 20, currentY); currentY += 8; };
      const addP = (text: string) => { doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(80, 80, 80); const lines = doc.splitTextToSize(text, 170); checkPage(lines.length * 5 + 6); doc.text(lines, 20, currentY); currentY += lines.length * 5 + 6; };

      doc.setFillColor(teal[0], teal[1], teal[2]).rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255).setFontSize(24).setFont('helvetica', 'bold').text('SevesoTool', 20, 25);
      doc.setFontSize(10).setFont('helvetica', 'normal').text('GEVAARLIJKE STOFFEN ANALYSE', 20, 32);
      currentY = 80;
      doc.setTextColor(teal[0], teal[1], teal[2]).setFontSize(32).setFont('helvetica', 'bold').text(getTpl('title', type === 'full' ? 'Seveso III & ARIE' : 'Seveso III Beoordeling'), 20, currentY); currentY += 12;
      doc.text(getTpl('subtitle', type === 'full' ? 'Beoordelingsrapport' : 'Samenvatting drempelwaarden'), 20, currentY); currentY = 140;
      doc.setTextColor(50, 50, 50).setFontSize(14).setFont('helvetica', 'bold').text('Bedrijfsgegevens:', 20, currentY); currentY += 10;
      doc.setFont('helvetica', 'normal').text(`Bedrijf: ${company?.name || 'Onbekend'}`, 20, currentY); currentY += 8;
      doc.text(`Locatie: ${company?.address || 'Niet opgegeven'}`, 20, currentY);
      doc.setFontSize(9).setTextColor(150, 150, 150).text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, 20, 280);

      if (type === 'full') {
        doc.addPage(); currentY = 25;
        addH1('1. Introductie');
        addP(getTpl('intro', 'Dit rapport is opgesteld conform de Seveso III Richtlijn (2012/18/EU) en de ARIE-regeling (Aanvullende Risico-Inventarisatie en -Evaluatie). Het geeft inzicht in de drempelwaarde-overschrijdingen voor gevaarlijke stoffen.'));
      }

      doc.addPage(); currentY = 25;
      addH1(type === 'full' ? '3. Resultaten van de Analyse' : 'Resultaten van de Analyse');

      // Status badges
      const statusColor = overallStatus === 'Geen' ? [46, 125, 50] : [198, 40, 40];
      const arieColor = arieExceeded ? [198, 40, 40] : [46, 125, 50];
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]).roundedRect(20, currentY, 80, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255).setFontSize(10).setFont('helvetica', 'bold').text(`Seveso: ${overallStatus === 'Geen' ? 'Geen inrichting' : overallStatus + '-inrichting'}`, 24, currentY + 8);
      doc.setFillColor(arieColor[0], arieColor[1], arieColor[2]).roundedRect(108, currentY, 80, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255).text(`ARIE: ${arieExceeded ? 'ARIE-plichtig' : 'Niet ARIE-plichtig'}`, 112, currentY + 8);
      currentY += 22;

      // Seveso sommatie voortgangsbalken
      addH2('Seveso Sommatie');
      const drawProgressBar = (label: string, percentage: number, exceeded: boolean, y: number) => {
        const barX = 20, barY = y, barW = 170, barH = 6;
        const fillW = Math.min(percentage / 100, 1) * barW;
        const fillColor: [number, number, number] = exceeded ? [198, 40, 40] : [22, 80, 91];
        // Label en percentage
        doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(50, 50, 50);
        doc.text(label, barX, barY - 1);
        doc.setFont('helvetica', 'bold').setTextColor(exceeded ? 198 : 50, exceeded ? 40 : 50, exceeded ? 40 : 50);
        doc.text(`${percentage.toFixed(1)}%`, barX + barW - doc.getTextWidth(`${percentage.toFixed(1)}%`), barY - 1);
        // Achtergrond balk
        doc.setFillColor(220, 220, 220).rect(barX, barY + 1, barW, barH, 'F');
        // Gekleurde balk
        if (fillW > 0) doc.setFillColor(...fillColor).rect(barX, barY + 1, fillW, barH, 'F');
        return barY + barH + 8;
      };

      for (const g of summationGroups) {
        checkPage(18);
        currentY = drawProgressBar(g.name, g.totalRatio * 100, g.isExceeded, currentY);
      }
      currentY += 4;

      // ARIE sommatie voortgangsbalken
      addH2('ARIE Sommatie');
      for (let i = 0; i < arieSummationGroups.length; i++) {
        const g = arieSummationGroups[i];
        checkPage(18);
        currentY = drawProgressBar(g.name, g.totalRatio * 100, g.isExceeded, currentY);
      }
      currentY += 8;

      doc.addPage(); currentY = 25;
      addH1(type === 'full' ? '4. Juridische Conclusie' : 'Juridische Conclusie');
      addH2('4.1 Seveso-conclusie');
      if (overallStatus === 'Geen') { 
        addP(getTpl('seveso_conclusion_none', 'Op basis van de huidige inventarisatie wordt de drempelwaarde niet overschreden. De inrichting is geen Seveso-inrichting.')); 
      }
      else { 
        const crit = summationGroups.find(g => g.isExceeded); 
        addP(`De groep '${crit?.name}' overschrijdt de drempelwaarde (${crit?.totalRatio.toFixed(2)}). De inrichting is een ${overallStatus}-inrichting.`); 
      }
      addH2('4.2 ARIE-conclusie');
      if (arieExceeded) {
        addP(getTpl('arie_conclusion_exceeded', 'De inrichting valt onder de ARIE-regeling.'));
      } else {
        addP(getTpl('arie_conclusion_none', 'De drempelwaarde wordt niet bereikt. De inrichting valt niet onder de ARIE-regeling.'));
      }

      if (type === 'full') {
        doc.addPage(); currentY = 25;
        addH1('5. Inventarislijst');
        autoTable(doc, { startY: currentY, head: [['Product', 'CAS', 'H-zinnen', 'Hoeveelheid (kg)']], body: localInventory.map(s => [s.productName, s.casNumber || '-', s.hStatements.join(', '), s.quantity.toLocaleString('nl-NL')]), headStyles: { fillColor: teal as any }, margin: { left: 20 } });
      }

      doc.save(`SevesoTool-${company?.name || 'rapport'}-${new Date().toISOString().split('T')[0]}.pdf`);
    } finally { setIsSavingPdf(false); }
  };

  const handleAddSubstance = async (substanceData: Omit<Substance, 'id' | 'quantity'>) => {
    if (!selectedCompanyId) return;
    const newSubstance: Substance = { ...substanceData, id: uuidv4(), quantity: 0 };
    setLocalInventory(prev => [...prev, newSubstance]);
    await addSubstanceToDb(supabase, selectedCompanyId, newSubstance);
  };

  const handleDeleteSubstance = async (substanceId: string) => {
    if (!selectedCompanyId) return;
    setLocalInventory(prev => prev.filter(s => s.id !== substanceId));
    await deleteSubstanceFromDb(supabase, selectedCompanyId, substanceId);
  };

  const handleQuantityChange = (substanceId: string, newQuantity: number) => {
    if (!selectedCompanyId) return;
    setLocalInventory(prev => prev.map(s => s.id === substanceId ? { ...s, quantity: newQuantity } : s));
    updateSubstanceQuantityInDb(supabase, selectedCompanyId, substanceId, newQuantity);
  };

  const handleClearAll = async () => {
    if (!selectedCompanyId) return;
    setLocalInventory([]);
    await clearInventoryFromDb(supabase, selectedCompanyId);
    setIsClearAlertOpen(false);
    toast({ title: 'Inventaris geleegd' });
  };

  const handleCreateCompany = async () => {
    if (!user || !userProfile?.customerId) return;
    const newCompany = await createNewCompany(supabase, user.id, userProfile.customerId);
    if (newCompany) setSelectedCompanyId(newCompany.id);
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompanyId) return;
    await deleteCompanyFromDb(supabase, selectedCompanyId);
    setSelectedCompanyId(null);
    setIsDeleteCompanyAlertOpen(false);
    toast({ title: 'Bedrijf verwijderd' });
  };

  const handleCompanyNameChange = (name: string) => {
    if (!selectedCompanyId) return;
    updateCompanyDetails(supabase, selectedCompanyId, { name });
  };

  const handleCompanyAddressChange = (address: string) => {
    if (!selectedCompanyId) return;
    updateCompanyDetails(supabase, selectedCompanyId, { address });
  };

  const handleExport = async () => {
    if (!selectedCompanyId) return;
    const company = companies.find(c => c.id === selectedCompanyId);
    if (!company) return;
    const json = await exportCompanyData(supabase, company);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${company.name}-backup.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !userProfile?.customerId) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const json = await file.text();
    const newId = await importCompanyData(supabase, user.id, userProfile.customerId, json);
    if (newId) { setSelectedCompanyId(newId); toast({ title: 'Back-up hersteld' }); }
    else toast({ variant: 'destructive', title: 'Fout bij herstellen' });
  };

  const handleShowHistory = (substance: Substance) => {
    setHistorySubstance(substance);
    setIsHistoryOpen(true);
  };

  const isLoading = isAuthLoading || isLoadingUserProfile;

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  // Tijdelijk: disabled check uitgeschakeld voor debugging
  // if (userProfile?.disabled) return (...);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        <SevesoHeader
          onUpload={() => setIsSdsUploadOpen(true)}
          onClearAll={() => setIsClearAlertOpen(true)}
          onShowReference={() => setIsReferenceGuideOpen(true)}
          onExport={handleExport}
          onImport={handleImport}
          onSaveAsPdf={handleSaveAsPdf}
          onPasswordChange={() => setIsPasswordDialogOpen(true)}
          onGoToAdmin={() => router.push('/admin')}
          isSavingPdf={isSavingPdf}
          disabled={!selectedCompanyId}
          isAdmin={isAdmin}
        />

        <CompanySelector
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onSelectCompany={setSelectedCompanyId}
          onCreateNew={handleCreateCompany}
          onDeleteCompany={() => setIsDeleteCompanyAlertOpen(true)}
          onDetailsChange={({ name, address }) => {
            if (name !== undefined) handleCompanyNameChange(name);
            if (address !== undefined) handleCompanyAddressChange(address);
          }}
          disabled={isLoadingCompanies}
        />

        {selectedCompanyId && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0">
              <InventoryTable
                inventory={localInventory}
                thresholdMode={thresholdMode}
                onUpload={() => setIsSdsUploadOpen(true)}
                onDelete={handleDeleteSubstance}
                onUpdateQuantity={handleQuantityChange}
                onViewSds={setViewerSubstance}
                onShowHistory={handleShowHistory}
                onShowExplanation={(substanceId, categoryId, type) => {
                  const substance = localInventory.find(s => s.id === substanceId) || null;
                  if (substance) setExplanationData({ substance, categoryId, type });
                }}
              />
            </div>
            <div className="w-full lg:w-[400px] shrink-0">
              <Dashboard
                inventory={localInventory}
                thresholdMode={thresholdMode}
                setThresholdMode={setThresholdMode}
              />
            </div>
          </div>
        )}

        <SdsUploadDialog isOpen={isSdsUploadOpen} onOpenChange={setIsSdsUploadOpen} onAddSubstance={handleAddSubstance} />
        <ReferenceGuideDialog isOpen={isReferenceGuideOpen} onOpenChange={setIsReferenceGuideOpen} />
        <PasswordChangeDialog isOpen={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} />
        <SdsViewerDialog
          isOpen={!!viewerSubstance}
          onOpenChange={(open) => { if (!open) setViewerSubstance(null); }}
          substance={viewerSubstance}
        />
        <HistoryDialog isOpen={isHistoryOpen} onOpenChange={setIsHistoryOpen} substance={historySubstance} companyId={selectedCompanyId} />
        <CategoryExplanationDialog
          isOpen={!!explanationData.substance && !!explanationData.categoryId && !!explanationData.type}
          onOpenChange={(open) => { if (!open) setExplanationData({ substance: null, categoryId: null, type: null }); }}
          substance={explanationData.substance}
          categoryId={explanationData.categoryId}
          categoryType={explanationData.type}
        />

        <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Inventaris wissen?</AlertDialogTitle><AlertDialogDescription>Alle stoffen worden verwijderd. Dit kan niet ongedaan worden gemaakt.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Wissen</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isDeleteCompanyAlertOpen} onOpenChange={setIsDeleteCompanyAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Bedrijf verwijderen?</AlertDialogTitle><AlertDialogDescription>Het bedrijf en alle bijbehorende data worden permanent verwijderd.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction onClick={handleDeleteCompany} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Verwijderen</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
