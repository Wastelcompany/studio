"use client";

import { useState, useRef } from 'react';
import type { Substance, ThresholdMode } from '@/lib/types';
import SevesoHeader from '@/components/seveso-header';
import InventoryTable from '@/components/inventory-table';
import Dashboard from '@/components/dashboard';
import SdsUploadDialog from './sds-upload-dialog';
import ReferenceGuideDialog from './reference-guide-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import CategoryExplanationDialog from './category-explanation-dialog';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import CompanyDetails from './company-details';

export default function SevesoApp() {
  const [inventory, setInventory] = useState<Substance[]>([]);
  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('low');
  const [companyDetails, setCompanyDetails] = useState({ name: '', address: '' });
  
  const [isSdsUploadOpen, setIsSdsUploadOpen] = useState(false);
  const [isReferenceGuideOpen, setIsReferenceGuideOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, dismiss } = useToast();

  const [explanationData, setExplanationData] = useState<{ substance: Substance | null; categoryId: string | null }>({ substance: null, categoryId: null });
  
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleSaveAsPdf = async () => {
    const dashboardEl = dashboardRef.current;
    const tableEl = tableRef.current;

    if (!dashboardEl || !tableEl) {
        toast({
            variant: "destructive",
            title: "Fout bij PDF genereren",
            description: "De benodigde componenten konden niet gevonden worden.",
        });
        return;
    }

    setIsSavingPdf(true);
    const { id: toastId } = toast({
        title: "PDF genereren...",
        description: "Rapport wordt samengesteld. Een ogenblik geduld.",
    });

    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pdfWidth - margin * 2;
        let finalY = margin;

        // Add title
        pdf.setFontSize(18);
        pdf.text("Seveso Drempelwaarde Rapport", margin, finalY + 5);
        finalY += 10;

        // Add company details
        if (companyDetails.name || companyDetails.address) {
            pdf.setFontSize(12);
            pdf.setTextColor(100);
            if(companyDetails.name) {
                pdf.text(`Bedrijf: ${companyDetails.name}`, margin, finalY);
                finalY += 6;
            }
            if(companyDetails.address) {
                pdf.text(`Adres: ${companyDetails.address}`, margin, finalY);
                finalY += 6;
            }
            pdf.setTextColor(0);
        }
        finalY += 10;


        // 1. Process Dashboard
        const dashboardCanvas = await html2canvas(dashboardEl, { scale: 2, backgroundColor: '#ffffff' });
        const dashboardImgData = dashboardCanvas.toDataURL('image/png');
        const dashboardImgProps = pdf.getImageProperties(dashboardImgData);
        const dashboardPdfHeight = (dashboardImgProps.height * contentWidth) / dashboardImgProps.width;
        
        pdf.setFontSize(14);
        pdf.text("Sommatie Overzicht", margin, finalY);
        finalY += 8;
        pdf.addImage(dashboardImgData, 'PNG', margin, finalY, contentWidth, dashboardPdfHeight);
        finalY += dashboardPdfHeight;

        // 2. Process Table
        const tableCanvas = await html2canvas(tableEl, { scale: 2, backgroundColor: '#ffffff' });
        const tableImgData = tableCanvas.toDataURL('image/png');
        const tableImgProps = pdf.getImageProperties(tableImgData);
        const tablePdfHeight = (tableImgProps.height * contentWidth) / tableImgProps.width;

        finalY += 15; // Space between sections

        // Check if table fits on current page
        if (finalY + tablePdfHeight + 20 > pdfHeight) {
            pdf.addPage();
            finalY = margin; // Reset Y for new page
        }
        
        pdf.setFontSize(14);
        pdf.text('Inventaris Details', margin, finalY);
        finalY += 8;
        pdf.addImage(tableImgData, 'PNG', margin, finalY, contentWidth, tablePdfHeight);

        pdf.save('seveso-rapport.pdf');

        dismiss(toastId);
        toast({
            title: "PDF opgeslagen",
            description: "Het rapport is succesvol gedownload."
        });

    } catch (error) {
        console.error("PDF Generation Error:", error);
        dismiss(toastId);
        toast({
            variant: "destructive",
            title: "PDF Generatie Mislukt",
            description: "Er is een onverwachte fout opgetreden.",
        });
    } finally {
        setIsSavingPdf(false);
    }
  };


  const handleAddSubstance = (newSubstance: Omit<Substance, 'id' | 'quantity'>) => {
    setInventory(prev => [...prev, {
        ...newSubstance,
        id: `sub-${Date.now()}-${Math.random()}`,
        quantity: 0
    }]);
  };
  
  const handleUpdateSubstanceQuantity = (id: string, quantity: number) => {
    setInventory(prev => prev.map(sub => sub.id === id ? { ...sub, quantity: isNaN(quantity) ? 0 : quantity } : sub));
  };

  const handleDeleteSubstance = (id: string) => {
    setInventory(prev => prev.filter(sub => sub.id !== id));
  };

  const handleClearAll = () => {
    setInventory([]);
    setCompanyDetails({ name: '', address: ''});
    setIsClearAlertOpen(false);
  };
  
  const handleExport = () => {
    if (inventory.length === 0 && !companyDetails.name && !companyDetails.address) {
      toast({
        variant: 'destructive',
        title: 'Export Mislukt',
        description: 'Er zijn geen gegevens om te exporteren.',
      });
      return;
    }
    const exportData = {
        companyDetails,
        inventory
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'seveso-inventaris.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: 'Export Succesvol',
      description: 'Inventaris opgeslagen als seveso-inventaris.json.',
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Ongeldige bestandsinhoud');
        }
        const data = JSON.parse(text);
        
        // Ensure new properties exist, providing defaults if they don't
        const importedInventory = (data.inventory || data).map((sub: any) => ({
          ...sub,
          arieCategories: sub.arieCategories || [],
        }));
        const importedDetails = data.companyDetails || { name: '', address: '' };

        if (Array.isArray(importedInventory)) {
            setInventory(importedInventory);
            setCompanyDetails(importedDetails);
            toast({
              title: 'Inventaris succesvol geïmporteerd',
              description: `${importedInventory.length} stoffen geladen.`,
            });
        } else {
          throw new Error('Ongeldig bestandsformaat.');
        }

      } catch (error) {
        console.error("Import Error:", error);
        toast({
          variant: "destructive",
          title: "Import Mislukt",
          description: error instanceof Error ? error.message : "Kon het bestand niet lezen.",
        });
      } finally {
        if (event.target) {
            event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleShowExplanation = (substanceId: string, categoryId: string) => {
    const substance = inventory.find(sub => sub.id === substanceId);
    if (substance) {
      setExplanationData({ substance, categoryId });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <SevesoHeader
        onUpload={() => setIsSdsUploadOpen(true)}
        onClearAll={() => setIsClearAlertOpen(true)}
        onShowReference={() => setIsReferenceGuideOpen(true)}
        onImport={handleImportClick}
        onExport={handleExport}
        onSaveAsPdf={handleSaveAsPdf}
        isSavingPdf={isSavingPdf}
      />
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="application/json"
      />
      
      <CompanyDetails details={companyDetails} onDetailsChange={setCompanyDetails} />
      
      <div className="mt-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-grow lg:w-2/3" ref={tableRef}>
          <InventoryTable
            inventory={inventory}
            onUpdateQuantity={handleUpdateSubstanceQuantity}
            onDelete={handleDeleteSubstance}
            thresholdMode={thresholdMode}
            onUpload={() => setIsSdsUploadOpen(true)}
            onShowExplanation={handleShowExplanation}
          />
        </div>
        <aside className="lg:w-1/3 lg:sticky lg:top-8 h-fit" ref={dashboardRef}>
          <Dashboard
            inventory={inventory}
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
              Deze actie kan niet ongedaan worden gemaakt. Dit zal de volledige inventarisatie en bedrijfsgegevens permanent verwijderen.
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
        onOpenChange={(open) => !open && setExplanationData({ substance: null, categoryId: null })}
        substance={explanationData.substance}
        categoryId={explanationData.categoryId}
      />
    </div>
  );
}
