"use client";

import { Button } from "@/components/ui/button";
import { Upload, FileText, Printer, Trash2, Info, FileUp } from 'lucide-react';

interface SevesoHeaderProps {
  onUpload: () => void;
  onClearAll: () => void;
  onShowReference: () => void;
  onImport: () => void;
  onExport: () => void;
}

export default function SevesoHeader({
  onUpload,
  onClearAll,
  onShowReference,
  onImport,
  onExport,
}: SevesoHeaderProps) {

  const handlePrintClick = () => {
    console.log("🔥 Print button clicked directly in header!");
    window.print();
  };

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Seveso en ARIE</h1>
        <p className="text-muted-foreground">Drempelwaarde Check</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onUpload} type="button"><Upload />Upload SDS</Button>
        <Button variant="outline" onClick={onImport} type="button"><FileUp />Import</Button>
        <Button variant="outline" onClick={onExport} type="button"><FileText />Export</Button>
        <Button variant="outline" onClick={handlePrintClick} type="button"><Printer />Afdrukken</Button>
        <Button variant="outline" size="icon" onClick={onShowReference} aria-label="Referentiegids" type="button">
          <Info />
        </Button>
        <Button variant="outline" size="icon" onClick={onClearAll} className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground" aria-label="Alles wissen" type="button">
          <Trash2 />
        </Button>
      </div>
    </header>
  );
}
