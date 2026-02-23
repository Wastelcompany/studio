"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, Trash2, Info, FileUp, Loader2, ChevronDown, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SevesoHeaderProps {
  onUpload: () => void;
  onClearAll: () => void;
  onShowReference: () => void;
  onImport: (type: 'json' | 'excel') => void;
  onExport: (type: 'json' | 'excel') => void;
  onSaveAsPdf: (reportType: 'full' | 'seveso_only') => void;
  isSavingPdf: boolean;
  disabled: boolean;
}

export default function SevesoHeader({
  onUpload,
  onClearAll,
  onShowReference,
  onImport,
  onExport,
  onSaveAsPdf,
  isSavingPdf,
  disabled,
}: SevesoHeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          <span className="text-primary">Chem</span>
          <span className="text-foreground">Stats</span>
        </h1>
        <p className="text-muted-foreground">Gevaarlijke Stoffen Analyse - Seveso en ARIE drempelwaarde check</p>
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <Button onClick={onUpload} type="button" disabled={disabled}><Upload />Upload SDS</Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled}><FileUp /> Import <ChevronDown className="ml-1 h-4 w-4 opacity-50" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onImport('json')} disabled>Importeer JSON (.json)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onImport('excel')} disabled>Importeer Excel (.xlsx)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled}><FileDown /> Export <ChevronDown className="ml-1 h-4 w-4 opacity-50" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('json')}>Exporteer JSON (.json)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('excel')}>Exporteer Excel (.xlsx)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled || isSavingPdf}>
              {isSavingPdf ? <Loader2 className="animate-spin" /> : <FileDown />}
              Opslaan rapportage
              <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSaveAsPdf('full')} disabled={isSavingPdf}>
              Volledig Rapport (Seveso &amp; ARIE)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSaveAsPdf('seveso_only')} disabled={isSavingPdf}>
              Alleen Seveso Rapport
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="icon" onClick={onShowReference} aria-label="Referentiegids" type="button" disabled={disabled}>
          <Info />
        </Button>
        <Button variant="outline" size="icon" onClick={onClearAll} className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Alles wissen" type="button" disabled={disabled}>
          <Trash2 />
        </Button>
        <Button variant="outline" onClick={handleLogout}><LogOut />Uitloggen</Button>
      </div>
    </header>
  );
}
