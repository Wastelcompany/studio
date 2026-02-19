"use client";

import { useState } from 'react';
import type { Substance, ThresholdMode } from '@/lib/types';
import SevesoHeader from '@/components/seveso-header';
import InventoryTable from '@/components/inventory-table';
import Dashboard from '@/components/dashboard';
import SdsUploadDialog from './sds-upload-dialog';
import ReferenceGuideDialog from './reference-guide-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

export default function SevesoApp() {
  const [inventory, setInventory] = useState<Substance[]>([]);
  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('low');
  
  const [isSdsUploadOpen, setIsSdsUploadOpen] = useState(false);
  const [isReferenceGuideOpen, setIsReferenceGuideOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [substanceToUpdate, setSubstanceToUpdate] = useState<Substance | null>(null);

  const handleAddSubstance = (newSubstance: Omit<Substance, 'id' | 'quantity' | 'sevesoCategories'> & {sevesoCategories: string[]}) => {
    setInventory(prev => [...prev, {
        ...newSubstance,
        id: `sub-${Date.now()}`,
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 print-container">
      <SevesoHeader
        onUpload={() => setIsSdsUploadOpen(true)}
        onClearAll={() => setIsClearAlertOpen(true)}
        onShowReference={() => setIsReferenceGuideOpen(true)}
        onPrint={handlePrint}
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
        <aside className="lg:w-1/3 lg:sticky lg:top-8 h-fit print-dashboard-container">
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
