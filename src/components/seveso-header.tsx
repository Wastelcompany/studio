"use client";

import { Button } from "@/components/ui/button";
import { Upload, FileText, Printer, Trash2, Info, FileUp } from 'lucide-react';

interface SevesoHeaderProps {
  onUpload: () => void;
  onClearAll: () => void;
  onShowReference: () => void;
  onPrint: () => void;
  onImport: () => void;
  onExport: () => void;
}

export default function SevesoHeader({
  onUpload,
  onClearAll,
  onShowReference,
  onPrint,
  onImport,
  onExport,
}: SevesoHeaderProps) {

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Seveso en ARIE</h1>
        <p className="text-muted-foreground">Drempelwaarde Check</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onUpload}><Upload />Upload SDS</Button>
        <Button variant="outline" onClick={onImport}><FileUp />Import</Button>
        <Button variant="outline" onClick={onExport}><FileText />Export</Button>
        <Button variant="outline" onClick={onPrint}><Printer />Afdrukken</Button>
        <Button variant="outline" size="icon" onClick={onShowReference} aria-label="Referentiegids">
          <Info />
        </Button>
        <Button variant="outline" size="icon" onClick={onClearAll} className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground" aria-label="Alles wissen">
          <Trash2 />
        </Button>
      </div>
    </header>
  );
}
