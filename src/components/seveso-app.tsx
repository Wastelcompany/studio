
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Substance, ThresholdMode, Company, UserProfile, Customer } from '@/lib/types';
import SevesoHeader from '@/components/seveso-header';
import InventoryTable from '@/components/inventory-table';
import Dashboard from '@/components/dashboard';
import SdsUploadDialog from './sds-upload-dialog';
import ReferenceGuideDialog from './reference-guide-dialog';
import PasswordChangeDialog from './password-change-dialog';
import HistoryDialog from './history-dialog';
import ReportOptionsDialog from './report-options-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import CategoryExplanationDialog from './category-explanation-dialog';
import jspdf from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';
import CompanySelector from './company-selector';
import { calculateSummations } from '@/lib/seveso';
import * as XLSX from 'xlsx';
import { useUser, useCollection, useMemoFirebase, useFirestore, useDoc, useAuth } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { createNewCompany, updateCompanyDetails, addSubstanceToDb, deleteSubstanceFromDb, updateSubstanceQuantityInDb, clearInventoryFromDb, deleteCompanyFromDb } from '@/lib/companies';
import { Loader2, UserX, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

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

  const customerRef = useMemoFirebase(() => {
    if (!userProfile?.customerId) return null;
    return doc(db, 'customers', userProfile.customerId);
  }, [userProfile, db]);
  const { data: customerData, isLoading: isLoadingCustomer } = useDoc<Customer>(customerRef);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const companiesQuery = useMemoFirebase(() => {
    if (!userProfile?.customerId || userProfile?.disabled) return null;
    return query(collection(db, 'companies'), where('customerId', '==', userProfile.customerId));
  }, [userProfile, db]);

  const { data: companiesData, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const companies = useMemo(() => companiesData?.sort((a, b) => a.name.localeCompare(b.name)) ?? [], [companiesData]);

  const inventoryQuery = useMemoFirebase(() => {
    if (!selectedCompanyId) return null;
    return collection(db, 'companies', selectedCompanyId, 'inventory');
  }, [selectedCompanyId, db]);

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
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [isDeleteCompanyAlertOpen, setIsDeleteCompanyAlertOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isReportOptionsOpen, setIsReportOptionsOpen] = useState(false);
  
  const [historySubstance, setHistorySubstance] = useState<Substance | null>(null);

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

  const handleShowHistory = (substanceId: string) => {
    const substance = localInventory.find(sub => sub.id === substanceId);
    if (substance) {
        setHistorySubstance(substance);
        setIsHistoryDialogOpen(true);
    }
  };

  const generateFileName = (extension: string) => {
    const date = new Date();
    const YYYYMMDD = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    const sanitizedName = (selectedCompany?.name || 'Naamloos').replace(/[^a-z0-9]/gi, '_');
    return `${sanitizedName}.${YYYYMMDD}.${extension}`;
  };

  // Helper for browser base64 to Uint8Array
  const base64ToUint8 = (base64: string): Uint8Array => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const handleGenerateReport = async (options: { type: 'full' | 'seveso'; includeSds: boolean }) => {
    if (!selectedCompany) return;
    setIsSavingPdf(true);
    const { id: toastId } = toast({ title: "Rapport genereren...", description: "PDF wordt samengesteld." });

    try {
        const doc = new jspdf('p', 'mm', 'a4');
        const stats = calculateSummations(localInventory, thresholdMode);
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(22, 80, 91); // #16505B
        doc.text(options.type === 'full' ? "Seveso & ARIE Rapport" : "Seveso Rapport", 20, 30);
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Bedrijf: ${selectedCompany.name}`, 20, 40);
        doc.text(`Locatie: ${selectedCompany.address}`, 20, 45);
        doc.text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, 20, 50);

        // Seveso Summation Table
        doc.setFontSize(14);
        doc.setTextColor(22, 80, 91);
        doc.text("Seveso III Sommatieoverzicht", 20, 65);
        autoTable(doc, {
            startY: 70,
            head: [['Gevarengroep', 'Ratio (%)', 'Status']],
            body: stats.summationGroups.map(g => [
                g.name,
                `${Math.round(g.totalRatio * 100)}%`,
                g.totalRatio >= 1 ? 'DREMPEL OVERSCHREDEN' : 'Binnen drempel'
            ]),
            headStyles: { fillColor: [22, 80, 91] },
        });

        // ARIE Summation Table (only if full report)
        if (options.type === 'full') {
            const lastY = (doc as any).lastAutoTable.cursor.y;
            doc.setFontSize(14);
            doc.setTextColor(22, 80, 91);
            doc.text("ARIE Sommatieoverzicht", 20, lastY + 15);
            autoTable(doc, {
                startY: lastY + 20,
                head: [['Gevarengroep', 'Ratio (%)', 'Status']],
                body: stats.arieSummationGroups.map(g => [
                    g.name,
                    `${Math.round(g.totalRatio * 100)}%`,
                    g.totalRatio >= 1 ? 'ARIE PLICHTIG' : 'Niet ARIE plichtig'
                ]),
                headStyles: { fillColor: [50, 50, 50] },
            });
        }

        // Inventory Table
        const finalY = (doc as any).lastAutoTable.cursor.y;
        doc.setFontSize(14);
        doc.setTextColor(22, 80, 91);
        doc.text("Stoffenoverzicht", 20, finalY + 15);
        autoTable(doc, {
            startY: finalY + 20,
            head: [['Stof', 'CAS', 'Voorraad (t)', 'Seveso Cat.', 'ARIE Cat.']],
            body: localInventory.map(s => [
                s.productName,
                s.casNumber || '-',
                s.quantity.toFixed(2),
                s.sevesoCategoryIds.join(', '),
                s.arieCategoryIds.join(', ')
            ]),
            headStyles: { fillColor: [22, 80, 91] },
        });

        // Get Main Report Bytes
        const mainReportBytes = doc.output('arraybuffer');
        
        let finalPdfBytes: Uint8Array;

        // Append SDS Documents if requested
        if (options.includeSds) {
            const mergedPdf = await PDFDocument.create();
            
            // 1. Add Main Report pages
            const mainDoc = await PDFDocument.load(mainReportBytes);
            const mainPages = await mergedPdf.copyPages(mainDoc, mainDoc.getPageIndices());
            mainPages.forEach(p => mergedPdf.addPage(p));

            // 2. Add each SDS
            for (const substance of localInventory) {
                if (substance.sdsUri) {
                    try {
                        const parts = substance.sdsUri.split(';');
                        const mimeType = parts[0].split(':')[1];
                        const base64Data = parts[1].split(',')[1];
                        
                        if (mimeType === 'application/pdf') {
                            const sdsDoc = await PDFDocument.load(base64ToUint8(base64Data));
                            const sdsPages = await mergedPdf.copyPages(sdsDoc, sdsDoc.getPageIndices());
                            
                            const sepPage = mergedPdf.addPage();
                            sepPage.drawText(`SDS BIJLAGE: ${substance.productName}`, { x: 50, y: 750, size: 18 });
                            
                            sPages.forEach(p => mergedPdf.addPage(p));
                        } else if (mimeType.startsWith('image/')) {
                            const imgPage = mergedPdf.addPage();
                            imgPage.drawText(`SDS BIJLAGE (Afbeelding): ${substance.productName}`, { x: 50, y: 750, size: 18 });
                            
                            const bytes = base64ToUint8(base64Data);
                            const image = mimeType === 'image/jpeg' 
                                ? await mergedPdf.embedJpg(bytes)
                                : await mergedPdf.embedPng(bytes);
                            
                            const dims = image.scaleToFit(imgPage.getWidth() - 100, imgPage.getHeight() - 150);
                            imgPage.drawImage(image, {
                                x: 50,
                                y: imgPage.getHeight() - 100 - dims.height,
                                width: dims.width,
                                height: dims.height,
                            });
                        }
                    } catch (e) {
                        console.error(`Error adding SDS for ${substance.productName}:`, e);
                    }
                }
            }
            finalPdfBytes = await mergedPdf.save();
        } else {
            finalPdfBytes = new Uint8Array(mainReportBytes);
        }

        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = generateFileName('pdf');
        link.click();

        dismiss(toastId);
        toast({ title: "Rapport opgeslagen" });
        setIsReportOptionsOpen(false);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        dismiss(toastId);
        toast({ variant: "destructive", title: "Fout bij PDF maken", description: "Kon het rapport niet bundelen." });
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
    const newQuantity = isNaN(quantity) ? 0 : quantity;
    setLocalInventory(prev => prev.map(sub => sub.id === id ? { ...sub, quantity: newQuantity } : sub));
    updateSubstanceQuantityInDb(db, selectedCompanyId, id, newQuantity);
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
    if (!selectedCompany) return;
    if (type === 'json') {
        const dataStr = JSON.stringify({ company: selectedCompany, inventory: localInventory }, null, 2);
        const url = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = generateFileName('json');
        link.click();
    } else {
        const ws = XLSX.utils.json_to_sheet(localInventory);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventaris");
        XLSX.writeFile(wb, generateFileName('xlsx'));
    }
  };

  if (isAuthLoading || isLoadingUserProfile || isLoadingCustomer || !user) {
    return (<div className="flex items-center justify-center h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>);
  }

  if (userProfile?.disabled) {
    return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4">
            <Building2 className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Account Gedeactiveerd</h1>
            <p className="text-muted-foreground mt-2">Neem contact op met de beheerder.</p>
            <Button variant="outline" className="mt-8" onClick={() => signOut(auth)}>Uitloggen</Button>
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
        onSaveAsPdf={() => setIsReportOptionsOpen(true)}
        onPasswordChange={() => setIsPasswordChangeOpen(true)}
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
            {isLoadingInventory ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
                <InventoryTable
                    inventory={localInventory}
                    onUpdateQuantity={handleUpdateSubstanceQuantity}
                    onDelete={handleDeleteSubstance}
                    thresholdMode={thresholdMode}
                    onUpload={() => setIsSdsUploadOpen(true)}
                    onShowExplanation={handleShowExplanation}
                    onShowHistory={handleShowHistory}
                />
            )}
            </div>
            <aside className="lg:w-1/3">
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
              <h2 className="text-xl font-bold">Selecteer een bedrijf</h2>
              <p className="text-muted-foreground">Kies een vestiging of maak een nieuwe aan om te beginnen.</p>
          </div>
      )}

      <SdsUploadDialog isOpen={isSdsUploadOpen} onOpenChange={setIsSdsUploadOpen} onAddSubstance={handleAddSubstance} />
      <ReferenceGuideDialog isOpen={isReferenceGuideOpen} onOpenChange={setIsReferenceGuideOpen} />
      <PasswordChangeDialog isOpen={isPasswordChangeOpen} onOpenChange={setIsPasswordChangeOpen} />
      <ReportOptionsDialog 
        isOpen={isReportOptionsOpen} 
        onOpenChange={setIsReportOptionsOpen} 
        onGenerate={handleGenerateReport} 
        isGenerating={isSavingPdf} 
      />
      <HistoryDialog 
        isOpen={isHistoryDialogOpen} 
        onOpenChange={setIsHistoryDialogOpen} 
        substance={historySubstance} 
        companyId={selectedCompanyId} 
      />
      
      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Inventaris wissen?</AlertDialogTitle><AlertDialogDescription>Dit verwijdert alle stoffen van dit bedrijf.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction onClick={handleClearAll}>Wissen</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteCompanyAlertOpen} onOpenChange={setIsDeleteCompanyAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Bedrijf verwijderen?</AlertDialogTitle><AlertDialogDescription>Dit verwijdert het bedrijf en de volledige inventaris.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction onClick={handleDeleteCompany} className="bg-destructive">Verwijderen</AlertDialogAction></AlertDialogFooter>
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
