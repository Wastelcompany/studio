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

export default function SevesoApp() {
  const [inventory, setInventory] = useState<Substance[]>([]);
  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('low');
  
  const [isSdsUploadOpen, setIsSdsUploadOpen] = useState(false);
  const [isReferenceGuideOpen, setIsReferenceGuideOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddSubstance = (newSubstance: Omit<Substance, 'id' | 'quantity' | 'sevesoCategories'> & {sevesoCategories: string[]}) => {
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
    setIsClearAlertOpen(false);
  };
  
  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (inventory.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Export Mislukt',
        description: 'De inventaris is leeg. Er is niets om te exporteren.',
      });
      return;
    }
    const dataStr = JSON.stringify(inventory, null, 2);
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
        
        if (Array.isArray(data) && (data.length === 0 || (data[0].id && data[0].productName && 'quantity' in data[0]))) {
          setInventory(data);
          toast({
            title: 'Inventaris succesvol geïmporteerd',
            description: `${data.length} stoffen geladen.`,
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 print-container">
      <SevesoHeader
        onUpload={() => setIsSdsUploadOpen(true)}
        onClearAll={() => setIsClearAlertOpen(true)}
        onShowReference={() => setIsReferenceGuideOpen(true)}
        onPrint={handlePrint}
        onImport={handleImportClick}
        onExport={handleExport}
      />
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="application/json"
      />
      
      <div className="mt-6 flex flex-col lg:flex-row gap-8 print-main-content">
        <div className="flex-grow lg:w-2/3 print-table-container">
          <InventoryTable
            inventory={inventory}
            onUpdateQuantity={handleUpdateSubstanceQuantity}
            onDelete={handleDeleteSubstance}
            thresholdMode={thresholdMode}
          />
        </div>
        <aside className="lg:w-1/3 lg:sticky lg:top-8 h-fit print-dashboard-container print:static">
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
              Deze actie kan niet ongedaan worden gemaakt. Dit zal de volledige inventarisatie permanent verwijderen.
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
    </div>
  );
}
