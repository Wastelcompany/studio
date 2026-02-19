"use client";

import { Button } from "@/components/ui/button";
import { Upload, FileText, Printer, Trash2, Info, FileUp } from 'lucide-react';

interface SevesoHeaderProps {
  onUpload: () => void;
  onClearAll: () => void;
  onShowReference: () => void;
  onPrint: () => void;
}

export default function SevesoHeader({
  onUpload,
  onClearAll,
  onShowReference,
  onPrint,
}: SevesoHeaderProps) {

  // Mock functions for disabled features
  const handleExport = () => alert("Export-functionaliteit is nog niet geïmplementeerd.");
  const handleImport = () => alert("Import-functionaliteit is nog niet geïmplementeerd.");

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print-header no-print">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Seveso Expert</h1>
        <p className="text-muted-foreground">Drempelwaarde Check</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onUpload}><Upload />Scan SDS</Button>
        <Button variant="outline" onClick={handleImport}><FileUp />Import</Button>
        <Button variant="outline" onClick={handleExport}><FileText />Export</Button>
        <Button variant="outline" onClick={onPrint}><Printer />Afdrukken</Button>
        <Button variant="ghost" size="icon" onClick={onShowReference} aria-label="Referentiegids">
          <Info />
        </Button>
        <Button variant="ghost" size="icon" onClick={onClearAll} className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Alles wissen">
          <Trash2 />
        </Button>
      </div>
    </header>
  );
}
