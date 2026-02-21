
"use client";

import { useState, useEffect, useRef, useTransition } from 'react';
import type { Substance, ThresholdMode, Company } from '@/lib/types';
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
import { calculateSummations, ALL_CATEGORIES, NAMED_SUBSTANCES, classifySubstance } from '@/lib/seveso';
import * as XLSX from 'xlsx';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getCompanies, createNewCompany, updateCompanyDetails, getCompanyData, addSubstanceToDb, deleteSubstanceFromDb, updateSubstanceQuantityInDb, clearInventoryFromDb } from '@/lib/companies';
import { Loader2 } from 'lucide-react';


export default function SevesoApp() {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [localInventory, setLocalInventory] = useState<Substance[]>([]);
  
  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('low');
  
  const [isSdsUploadOpen, setIsSdsUploadOpen] = useState(false);
  const [isReferenceGuideOpen, setIsReferenceGuideOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const { toast, dismiss } = useToast();

  const [explanationData, setExplanationData] = useState<{ substance: Substance | null; categoryId: string | null; type: 'seveso' | 'arie' | null }>({ substance: null, categoryId: null, type: null });
  
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [isDataLoading, startDataTransition] = useTransition();

  // --- AUTH & DATA LOADING ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
      } else {
        signInAnonymously(auth);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = getCompanies(user.uid, setCompanies);
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCompanyId) {
      startDataTransition(async () => {
        const data = await getCompanyData(selectedCompanyId);
        if (data) {
          setLocalInventory(data.inventory);
        } else {
          setLocalInventory([]);
        }
      });
    } else {
      setLocalInventory([]);
    }
  }, [selectedCompanyId]);


  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  const handleCreateNewCompany = async () => {
    if (!user) return;
    const newCompany = await createNewCompany(user.uid);
    // getCompanies will update the list automatically, and we can select the new one.
    setSelectedCompanyId(newCompany.id);
  };

  const handleCompanyDetailsChange = (details: Partial<Company>) => {
      if (!selectedCompanyId) return;
      // Optimistically update local state for company list
      setCompanies(prev => prev.map(c => c.id === selectedCompanyId ? { ...c, ...details } : c));
      // Debounced update to Firestore
      updateCompanyDetails(selectedCompanyId, details);
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
            ? "De beoordeling is uitgevoerd door de gevarenaanduidingen (H-zinnen) uit de veiligheidsinformatiebladen (SDS) te vertalen naar specifieke gevarencategorieën. Hoewel de basis voor de sommatieregels vergelijkbaar is, hanteert de ARIE-regeling eigen drempelwaarden en specifieke categorieën (zoals bijv. voor H314) die afwijken van de Seveso-systematiek. Voor beide kaders wordt per gevarengroep de meest kritieke categorie per stof bepaald, waarna de bijdragen binnen de betreffende wettelijke kaders worden gesommeerd."
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
            ? `Op basis van de huidige inventarisatie is de inrichting ${isSevesoExceeded ? 'wel' : 'niet'} aan te merken als een Seveso-inrichting (${stats.overallStatus === 'Geen' ? 'geen drempels overschreden' : stats.overallStatus}). Tevens is de inrichting ${stats.arieExceeded ? 'wel' : 'niet'} ARIE-plichtig met een totale sommatiewaarde van ${Math.round(stats.arieTotal * 100)}%.`
            : `Op basis van de huidige inventarisatie is de inrichting ${isSevesoExceeded ? 'wel' : 'niet'} aan te merken als een Seveso-inrichting (${stats.overallStatus === 'Geen' ? 'geen drempels overschreden' : stats.overallStatus}).`;
        const splitConclusie = doc.splitTextToSize(conclusieText, pageWidth - (margin * 2)); doc.text(splitConclusie, margin, finalY);

        doc.addPage();
        let invY = 20; doc.setFontSize(16); doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]); doc.setFont('helvetica', 'bold'); doc.text("Volledige Inventaris", margin, invY); invY += 8;
        
        const tableHead = includeArie ? [['Product / CAS', 'Seveso', 'ARIE', 'Voorraad']] : [['Product / CAS', 'Seveso', 'Voorraad']];
        const tableData = localInventory.map(sub => {
            const sevesoCats = sub.sevesoCategoryIds.map(id => (ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))?.displayId || id).join(", ");
            let rowData: any[] = [
                { content: sub.productName + (sub.casNumber ? `\n(${sub.casNumber})` : ''), styles: { fontStyle: 'bold' } },
                sevesoCats
            ];
            if (includeArie) {
                const arieCats = sub.arieCategoryIds.map(id => ALL_CATEGORIES[id]?.displayId || id).join(", ");
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
    if (!selectedCompanyId) return;
    const substanceWithId = {
        ...newSubstance,
        id: `sub-${Date.now()}-${Math.random()}`,
        quantity: 0
    };
    setLocalInventory(prev => [...prev, substanceWithId]);
    addSubstanceToDb(selectedCompanyId, substanceWithId);
  };
  
  const handleUpdateSubstanceQuantity = (id: string, quantity: number) => {
    if (!selectedCompanyId) return;
    const newQuantity = isNaN(quantity) ? 0 : quantity;
    setLocalInventory(prev => prev.map(sub => sub.id === id ? { ...sub, quantity: newQuantity } : sub));
    updateSubstanceQuantityInDb(selectedCompanyId, id, newQuantity);
  };

  const handleDeleteSubstance = (id: string) => {
    if (!selectedCompanyId) return;
    setLocalInventory(prev => prev.filter(sub => sub.id !== id));
    deleteSubstanceFromDb(selectedCompanyId, id);
  };

  const handleClearAll = () => {
    if (!selectedCompanyId) return;
    setLocalInventory([]);
    clearInventoryFromDb(selectedCompanyId);
    setIsClearAlertOpen(false);
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

        localInventory.forEach(sub => {
            const sevesoCats = sub.sevesoCategoryIds.map(id => (ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))?.displayId || id).join(", ");
            const arieCats = sub.arieCategoryIds.map(id => ALL_CATEGORIES[id]?.displayId || id).join(", ");
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
     // This functionality would need to be re-evaluated.
     // Do we import into the currently selected company or create a new one?
     // For now, we disable this to avoid ambiguity.
    toast({ title: 'Import (nog) niet beschikbaar', description: 'Deze functie wordt herzien voor gebruik met meerdere bedrijven.' });
    if (event.target) event.target.value = '';
  };

  const isActionDisabled = !selectedCompanyId || isDataLoading;

  if (!user) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-lg">Applicatie laden...</p>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
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
        disabled // Disabled for now
      />
      <input
        type="file"
        ref={excelFileInputRef}
        onChange={(e) => handleFileSelect(e, 'excel')}
        className="hidden"
        accept=".xlsx, .xls"
        disabled // Disabled for now
      />
      
      <CompanySelector 
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={handleSelectCompany}
        onCreateNew={handleCreateNewCompany}
        onDetailsChange={handleCompanyDetailsChange}
        disabled={isDataLoading}
      />
      
      <div className="mt-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-grow lg:w-2/3">
          {isDataLoading ? (
             <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Inventaris laden...</p>
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
              Deze actie kan niet ongedaan worden gemaakt. Dit zal de volledige inventaris voor het geselecteerde bedrijf wissen.
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
