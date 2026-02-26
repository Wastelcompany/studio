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
import CompanyDetails from './company-details';
import { calculateSummations, ALL_CATEGORIES, NAMED_SUBSTANCES, classifySubstance } from '@/lib/seveso';
import * as XLSX from 'xlsx';
import { useUser, useCollection, useMemoFirebase, useFirestore, useDoc, useAuth } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { createNewCompany, updateCompanyDetails, addSubstanceToDb, deleteSubstanceFromDb, updateSubstanceQuantityInDb, clearInventoryFromDb, deleteCompanyFromDb } from '@/lib/companies';
import { Loader2, UserX, LogOut, LayoutDashboard, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from './ui/card';
import CompanySelector from './company-selector';


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
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [isDeleteCompanyAlertOpen, setIsDeleteCompanyAlertOpen] = useState(false);
  
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
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

  // --- ACTIONS ---

  const handleShowExplanation = (substanceId: string, categoryId: string, type: 'seveso' | 'arie') => {
    const substance = localInventory.find(sub => sub.id === substanceId);
    if (substance) {
      setExplanationData({ substance, categoryId, type });
    }
  };

  const generateFileName = (extension: string) => {
    const date = new Date();
    const YYYYMMDD = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    const sanitizedName = (selectedCompany?.name || 'Naamloos').replace(/[^a-z0-9]/gi, '_');
    const sanitizedAddress = (selectedCompany?.address || 'Adresloos').replace(/[^a-z0-9]/gi, '_');
    return `${sanitizedName}.${sanitizedAddress}.${YYYYMMDD}.${extension}`;
  };

  const handleSaveAsPdf = async (reportType: 'full' | 'seveso_only') => {
    if (!selectedCompany) return;
    const includeArie = reportType === 'full';
    setIsSavingPdf(true);
    const toastTitle = includeArie ? "Volledig PDF rapport genereren..." : "Seveso PDF rapport genereren...";
    const { id: toastId } = toast({
        title: toastTitle,
        description: "Rapport wordt samengesteld.",
    });

    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let finalY = 18;

        const colors = {
            primary: [22, 80, 91], foreground: [58, 66, 78], destructive: [239, 68, 68], muted: [100, 116, 139], bgLight: [248, 250, 252], border: [226, 232, 240]
        };

        const addFooter = (pdfDoc: jsPDF) => {
            const totalPages = (pdfDoc as any).internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdfDoc.setPage(i);
                pdfDoc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                pdfDoc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
                pdfDoc.setFontSize(8);
                pdfDoc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
                pdfDoc.text(`Pagina ${i} van ${totalPages}`, margin, pageHeight - 12);
                pdfDoc.setFont('helvetica', 'bold');
                pdfDoc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                pdfDoc.text("ChemStats", pageWidth - margin, pageHeight - 12, { align: 'right' });
                pdfDoc.setFont('helvetica', 'normal');
                pdfDoc.setFontSize(7);
                const footerText = includeArie
                  ? "Gevaarlijke Stoffen Analyse - Seveso en ARIE drempelwaarde check"
                  : "Gevaarlijke Stoffen Analyse - Seveso drempelwaarde check";
                pdfDoc.text(footerText, pageWidth - margin, pageHeight - 8, { align: 'right' });
            }
        };

        doc.setFontSize(22);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(includeArie ? "Seveso en ARIE Rapportage" : "Seveso Rapportage", margin, finalY);
        finalY += 7;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
        const subTitle = includeArie
          ? "Gevaarlijke Stoffen Analyse - Seveso en ARIE drempelwaarde check"
          : "Gevaarlijke Stoffen Analyse - Seveso drempelwaarde check";
        doc.text(subTitle, margin, finalY);
        finalY += 6;
        doc.setFontSize(9);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text(`Gegenereerd op ${new Date().toLocaleDateString('nl-NL')}`, margin, finalY);
        finalY += 8;

        if (selectedCompany.name || selectedCompany.address) {
            doc.setFillColor(colors.bgLight[0], colors.bgLight[1], colors.bgLight[2]);
            doc.rect(margin, finalY, pageWidth - (margin * 2), 20, 'F');
            let detailsY = finalY + 6;
            doc.setFontSize(10);
            doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
            doc.setFont('helvetica', 'bold');
            doc.text("Bedrijfsgegevens", margin + 5, detailsY);
            doc.setFont('helvetica', 'normal');
            detailsY += 5;
            if (selectedCompany.name) { doc.text(selectedCompany.name, margin + 5, detailsY); detailsY += 4.5; }
            if (selectedCompany.address) { doc.text(selectedCompany.address, margin + 5, detailsY); }
            finalY += 30;
        }

        const stats = calculateSummations(localInventory, thresholdMode);

        doc.setFontSize(11); doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]); doc.setFont('helvetica', 'bold'); doc.text("1. Inleiding", margin, finalY); finalY += 5;
        doc.setFontSize(9.5); doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]); doc.setFont('helvetica', 'normal');
        const introText = includeArie 
            ? "Deze rapportage biedt een gedetailleerde analyse van de gevaarlijke stoffen aanwezig binnen de inrichting. Het doel is om vast te stellen of de opslag en het gebruik van deze stoffen de drempelwaarden overschrijden zoals vastgelegd in de Seveso-III richtlijn (2012/18/EU) en de regeling Aanvullende Risico-Inventarisatie en -Evaluatie (ARIE)."
            : "Deze rapportage biedt een gedetailleerde analyse van de gevaarlijke stoffen aanwezig binnen de inrichting. Het doel is om vast te stellen of de opslag en het gebruik van deze stoffen de drempelwaarden overschrijden zoals vastgelegd in de Seveso-III richtlijn (2012/18/EU).";
        const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2)); doc.text(splitIntro, margin, finalY); finalY += (splitIntro.length * 5) + 6;

        doc.setFontSize(11); doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]); doc.setFont('helvetica', 'bold'); doc.text("2. Methode", margin, finalY); finalY += 5;
        const methodeText = includeArie
            ? "De beoordeling is uitgevoerd door de gevarenaanduidingen (H-zinnen) uit de veiligheidsinformatiebladen (SDS) te vertalen naar specifieke gevarencategorieën. Conform de sommatieregels worden gevarengroepen (gezondheid, fysisch, overig, benoemd) onafhankelijk van elkaar getoetst. Zodra de sommatie van één groep de waarde 1 (100%) bereikt, is de inrichting respectievelijk Seveso- of ARIE-plichtig."
            : "De beoordeling is uitgevoerd door de gevarenaanduidingen (H-zinnen) uit de veiligheidsinformatiebladen (SDS) te vertalen naar specifieke Seveso-gevarencategorieën. Per gevarengroep wordt de meest kritieke categorie per stof bepaald en worden de bijdragen gesommeerd om te toetsen aan de drempelwaarden.";
        const splitMethode = doc.splitTextToSize(methodeText, pageWidth - (margin * 2)); doc.text(splitMethode, margin, finalY); finalY += (splitMethode.length * 5) + 8;

        doc.setFontSize(11); doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]); doc.setFont('helvetica', 'bold'); doc.text("3. Resultaten", margin, finalY); finalY += 6;
        const isSevesoExceeded = stats.overallStatus !== 'Geen';
        
        if (includeArie) {
            const boxWidth = (pageWidth - (margin * 2) - 8) / 2;
            doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]); doc.setFillColor(255, 255, 255); doc.roundedRect(margin, finalY, boxWidth, 20, 1.5, 1.5, 'FD');
            doc.setFontSize(9); doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]); doc.text("Seveso Status", margin + 5, finalY + 7);
            doc.setFontSize(11); doc.setTextColor(isSevesoExceeded ? colors.destructive[0] : colors.primary[0], isSevesoExceeded ? colors.destructive[1] : colors.primary[1], isSevesoExceeded ? colors.destructive[2] : colors.primary[2]); doc.setFont('helvetica', 'bold'); doc.text(stats.overallStatus === 'Geen' ? 'Geen Seveso-inrichting' : `${stats.overallStatus}-inrichting`, margin + 5, finalY + 14);
            doc.setFillColor(255, 255, 255); doc.roundedRect(margin + boxWidth + 8, finalY, boxWidth, 20, 1.5, 1.5, 'FD');
            doc.setFontSize(9); doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]); doc.text("ARIE Status", margin + boxWidth + 13, finalY + 7);
            doc.setFontSize(11); doc.setTextColor(stats.arieExceeded ? colors.destructive[0] : colors.foreground[0], stats.arieExceeded ? colors.destructive[1] : colors.foreground[1], stats.arieExceeded ? colors.destructive[2] : colors.foreground[2]); doc.setFont('helvetica', 'bold'); doc.text(stats.arieExceeded ? 'ARIE-plichtig' : 'Niet ARIE-plichtig', margin + boxWidth + 13, finalY + 14);
        } else {
            const boxWidth = (pageWidth - (margin * 2));
            doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]); doc.setFillColor(255, 255, 255); doc.roundedRect(margin, finalY, boxWidth, 20, 1.5, 1.5, 'FD');
            doc.setFontSize(9); doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]); doc.text("Seveso Status", margin + 5, finalY + 7);
            doc.setFontSize(11); doc.setTextColor(isSevesoExceeded ? colors.destructive[0] : colors.primary[0], isSevesoExceeded ? colors.destructive[1] : colors.primary[1], isSevesoExceeded ? colors.destructive[2] : colors.primary[2]); doc.setFont('helvetica', 'bold'); doc.text(stats.overallStatus === 'Geen' ? 'Geen Seveso-inrichting' : `${stats.overallStatus}-inrichting`, margin + 5, finalY + 14);
        }
        finalY += 28;

        const drawDashboardColumn = (title: string, groups: any[], isArie: boolean, x: number, y: number, width: number) => {
            let currentY = y; doc.setFontSize(12); doc.setTextColor(isArie ? colors.foreground[0] : colors.primary[0], isArie ? colors.foreground[1] : colors.primary[1], isArie ? colors.foreground[2] : colors.primary[2]); doc.setFont('helvetica', 'bold'); doc.text(title, x, currentY); currentY += 6;
            groups.forEach(group => {
                const ratio = group.totalRatio; const percentage = Math.round(ratio * 100); const isExceeded = ratio >= 1;
                doc.setFontSize(8.5); doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]); doc.setFont('helvetica', 'normal'); doc.text(group.name, x, currentY);
                doc.setFont('helvetica', 'bold'); doc.setTextColor(isExceeded ? colors.destructive[0] : colors.foreground[0], isExceeded ? colors.destructive[1] : colors.foreground[1], isExceeded ? colors.destructive[2] : colors.foreground[2]); doc.text(`${percentage}%`, x + width, currentY, { align: 'right' });
                currentY += 2.5; const barHeight = 2.2; doc.setFillColor(241, 245, 249); doc.roundedRect(x, currentY, width, barHeight, 0.5, 0.5, 'F');
                if (ratio > 0) {
                    const fillWidth = Math.min(ratio, 1) * width;
                    if (isExceeded) doc.setFillColor(colors.destructive[0], colors.destructive[1], colors.destructive[2]);
                    else if (isArie) doc.setFillColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
                    else doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                    doc.roundedRect(x, currentY, fillWidth, barHeight, 0.5, 0.5, 'F');
                }
                currentY += 8.5;
            });
            return currentY;
        };

        if (includeArie) {
            const colWidth = (pageWidth - (margin * 2) - 15) / 2;
            const startSommatieY = finalY;
            const endSevesoY = drawDashboardColumn("Seveso Sommatie", stats.summationGroups, false, margin, startSommatieY, colWidth);
            const endArieY = drawDashboardColumn("ARIE Sommatie", stats.arieSummationGroups, true, margin + colWidth + 15, startSommatieY, colWidth);
            finalY = Math.max(endSevesoY, endArieY) + 6;
        } else {
            const colWidth = (pageWidth - (margin * 2));
            finalY = drawDashboardColumn("Seveso Sommatie", stats.summationGroups, false, margin, finalY, colWidth) + 6;
        }

        doc.setFontSize(11); doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]); doc.setFont('helvetica', 'bold'); doc.text("4. Conclusie", margin, finalY); finalY += 5;
        const conclusieText = includeArie
            ? `Op basis van de huidige inventarisatie is de inrichting ${isSevesoExceeded ? 'wel' : 'niet'} aan te merken als een Seveso-inrichting (${stats.overallStatus === 'Geen' ? 'geen drempels overschreden' : stats.overallStatus}). Tevens is de inrichting ${stats.arieExceeded ? 'wel' : 'niet'} ARIE-plichtig. De hoogste sommatiewaarde binnen de ARIE-gevarengroepen bedraagt ${Math.round(stats.arieTotal * 100)}%.`
            : `Op basis van de huidige inventarisatie is de inrichting ${isSevesoExceeded ? 'wel' : 'niet'} aan te merken als een Seveso-inrichting (${stats.overallStatus === 'Geen' ? 'geen drempels overschreden' : stats.overallStatus}).`;
        const splitConclusie = doc.splitTextToSize(conclusieText, pageWidth - (margin * 2)); doc.text(splitConclusie, margin, finalY);

        doc.addPage();
        let invY = 20; doc.setFontSize(16); doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]); doc.setFont('helvetica', 'bold'); doc.text("Volledige Inventaris", margin, invY); invY += 8;
        
        const tableHead = includeArie ? [['Product / CAS', 'Seveso', 'ARIE', 'Voorraad']] : [['Product / CAS', 'Seveso', 'Voorraad']];
        const tableData = (localInventory || []).map(sub => {
            const sevesoCats = sub.sevesoCategoryIds.map(id => (ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))?.displayId || id).join(", ");
            let rowData: any[] = [
                { content: sub.productName + (sub.casNumber ? `\n(${sub.casNumber})` : ''), styles: { fontStyle: 'bold' } },
                sevesoCats
            ];
            if (includeArie) {
                const arieCats = sub.arieCategoryIds.map(id => (ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))?.displayId || id).join(", ");
                rowData.push(arieCats);
            }
            rowData.push({ content: `${sub.quantity} ton`, styles: { halign: 'right' } });
            return rowData;
        });

        const columnStyles = includeArie 
            ? { 0: { cellWidth: 50 }, 1: { cellWidth: 50 }, 2: { cellWidth: 50 }, 3: { cellWidth: 25 } }
            : { 0: { cellWidth: 85 }, 1: { cellWidth: 85 }, 2: { cellWidth: 25 } };

        autoTable(doc, {
            startY: invY,
            head: tableHead,
            body: tableData as any,
            theme: 'striped',
            headStyles: { fillColor: colors.primary, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9 },
            columnStyles: columnStyles,
            margin: { left: margin, right: margin }
        });

        addFooter(doc);
        const baseName = generateFileName('').slice(0, -1);
        const finalFileName = reportType === 'full' ? `${baseName}.pdf` : `${baseName}.seveso-only.pdf`;
        doc.save(finalFileName);
        dismiss(toastId);
        toast({ title: "PDF opgeslagen", description: "Het rapport is succesvol gedownload." });

    } catch (error) {
        console.error("PDF Generation Error:", error);
        dismiss(toastId);
        toast({ variant: "destructive", title: "PDF Generatie Mislukt", description: "Fout bij PDF maken." });
    } finally {
        setIsSavingPdf(false);
    }
  };


  const handleAddSubstance = (newSubstance: Omit<Substance, 'id' | 'quantity'>) => {
    if (!selectedCompanyId || !db) return;
    const substanceWithId = {
        ...newSubstance,
        id: `sub-${Date.now()}-${Math.random()}`,
        quantity: 0
    };
    // Update locally first for instant feedback
    setLocalInventory(prevInventory => [...prevInventory, substanceWithId]);
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
    
    const companyNameToDelete = selectedCompany?.name;
    await deleteCompanyFromDb(db, selectedCompanyId);
    
    setSelectedCompanyId(null);
    setIsDeleteCompanyAlertOpen(false);
    
    toast({
        title: "Bedrijf Verwijderd",
        description: `Het bedrijf "${companyNameToDelete}" en de inventaris zijn succesvol verwijderd.`
    });
  };
  
  const handleExport = (type: 'json' | 'excel') => {
    if (!selectedCompany) {
      toast({ variant: 'destructive', title: 'Export Mislukt', description: 'Selecteer eerst een bedrijf.' });
      return;
    }

    if (type === 'json') {
        const exportData = { companyDetails: selectedCompany, inventory: localInventory };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = generateFileName('json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        const wsData = [
            ["Bedrijfsgegevens", ""],
            ["Bedrijfsnaam", selectedCompany.name || "-"],
            ["Adres", selectedCompany.address || "-"],
            ["Datum", new Date().toLocaleDateString('nl-NL')],
            [],
            ["Inventarisatie Gevaarlijke Stoffen", "", "", "", ""],
            ["Productnaam", "CAS Nummer", "Seveso Categorieën", "ARIE Categorieën", "Voorraad (ton)", "H-zinnen"]
        ];

        (localInventory || []).forEach(sub => {
            const sevesoCats = sub.sevesoCategoryIds.map(id => (ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))?.displayId || id).join(", ");
            const arieCats = sub.arieCategoryIds.map(id => (ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))?.displayId || id).join(", ");
            wsData.push([
                sub.productName,
                sub.casNumber || "-",
                sevesoCats,
                arieCats,
                sub.quantity.toString(),
                sub.hStatements.join(", ")
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 40 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Seveso Inventaris");
        XLSX.writeFile(wb, generateFileName('xlsx'));
    }

    toast({ title: 'Export Succesvol', description: `Bestand opgeslagen als ${type.toUpperCase()}.` });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'json' | 'excel') => {
    toast({ title: 'Import (nog) niet beschikbaar', description: 'Deze functie wordt herzien voor gebruik met meerdere bedrijven.' });
    if (event.target) event.target.value = '';
  };

  const isActionDisabled = !selectedCompanyId || isLoadingInventory || isLoadingCompanies;

  if (isAuthLoading || isLoadingUserProfile || !user) {
    return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium animate-pulse text-muted-foreground">Applicatie laden...</p>
        </div>
    );
  }

  if (userProfile?.disabled) {
    return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4">
            <UserX className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-3xl font-bold">Account Gedeactiveerd</h1>
            <p className="text-muted-foreground mt-2 max-w-md">Uw account is gedeactiveerd door de beheerder. U heeft geen toegang meer tot de gegevens.</p>
            <Button variant="outline" className="mt-8" onClick={() => signOut(auth)}>
                <LogOut className="mr-2 h-4 w-4" />
                Uitloggen
            </Button>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
      <SevesoHeader
        onUpload={() => setIsSdsUploadOpen(true)}
        onClearAll={() => setIsClearAlertOpen(true)}
        onShowReference={() => setIsReferenceGuideOpen(true)}
        onImport={(type) => (type === 'json' ? jsonFileInputRef : excelFileInputRef).current?.click()}
        onExport={handleExport}
        onSaveAsPdf={handleSaveAsPdf}
        isSavingPdf={isSavingPdf}
        disabled={isActionDisabled}
      />
       <input
        type="file"
        ref={jsonFileInputRef}
        onChange={(e) => handleFileSelect(e, 'json')}
        className="hidden"
        accept="application/json"
        disabled 
      />
      <input
        type="file"
        ref={excelFileInputRef}
        onChange={(e) => handleFileSelect(e, 'excel')}
        className="hidden"
        accept=".xlsx, .xls"
        disabled 
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
                <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-xl bg-muted/20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 mt-4 text-muted-foreground">Inventaris voor {selectedCompany?.name} laden...</p>
                </div>
            ) : (
                <InventoryTable
                    inventory={localInventory}
                    onUpdateQuantity={handleUpdateSubstanceQuantity}
                    onDelete={handleDeleteSubstance}
                    thresholdMode={thresholdMode}
                    onUpload={() => setIsSdsUploadOpen(true)}
                    onShowExplanation={handleShowExplanation}
                />
            )}
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
          <div className="mt-12 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-2xl bg-muted/10">
              <div className="bg-primary/10 p-4 rounded-full mb-6">
                <Building2 className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Welkom bij ChemStats</h2>
              <p className="text-muted-foreground mt-2 max-w-lg">
                  Selecteer een bedrijf uit het keuzemenu hierboven om de inventaris en de drempelwaarde-analyse te bekijken, of voeg een nieuw bedrijf toe.
              </p>
              <div className="mt-8 flex gap-4">
                  <Button onClick={handleCreateNewCompany} variant="secondary">
                      Nieuw bedrijf aanmaken
                  </Button>
              </div>
          </div>
      )}

      <SdsUploadDialog
        isOpen={isSdsUploadOpen}
        onOpenChange={setIsSdsUploadOpen}
        onAddSubstance={handleAddSubstance}
      />

      <ReferenceGuideDialog
        isOpen={isReferenceGuideOpen}
        onOpenChange={setIsReferenceGuideOpen}
      />
      
      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. Dit zal de volledige inventaris voor het geselecteerde bedrijf <span className="font-bold">"{selectedCompany?.name}"</span> wissen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">
              Alles Wissen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteCompanyAlertOpen} onOpenChange={setIsDeleteCompanyAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bedrijf volledig verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u het bedrijf <span className="font-bold">"{selectedCompany?.name}"</span> en de volledige inventaris wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} className="bg-destructive hover:bg-destructive/90">
              Bedrijf Verwijderen
            </AlertDialogAction>
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
