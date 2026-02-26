"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
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
  onSaveAsPdf: () => void;
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
  const auth = useAuth();

  const handleLogout = () => {
    signOut(auth).then(() => {
        router.push('/');
    });
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

        <Button 
          variant="outline" 
          onClick={onSaveAsPdf} 
          disabled={disabled || isSavingPdf}
          className="gap-2"
        >
          {isSavingPdf ? <Loader2 className="animate-spin h-4 w-4" /> : <FileDown className="h-4 w-4" />}
          Opslaan rapportage
        </Button>

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
