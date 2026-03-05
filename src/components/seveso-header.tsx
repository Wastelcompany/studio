
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, Trash2, Info, FileUp, Loader2, ChevronDown, LogOut, FileText, KeyRound, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface SevesoHeaderProps {
  onUpload: () => void;
  onClearAll: () => void;
  onShowReference: () => void;
  onImport: (type: 'json' | 'excel') => void;
  onExport: (type: 'json' | 'excel') => void;
  onSaveAsPdf: (type: 'full' | 'seveso') => void;
  onPasswordChange: () => void;
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
  onPasswordChange,
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
        <p className="text-muted-foreground">Gevaarlijke Stoffen Analyse - Seveso en ARIE</p>
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <Button onClick={onUpload} disabled={disabled}><Upload className="h-4 w-4 mr-2" />Upload SDS</Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled}><FileDown className="h-4 w-4 mr-2" /> Export <ChevronDown className="ml-1 h-3 w-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('json')}>Exporteer JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('excel')}>Exporteer Excel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled || isSavingPdf}>
              {isSavingPdf ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Rapportage
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onSaveAsPdf('full')}>Volledig rapport (SERIE)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSaveAsPdf('seveso')}>Seveso rapport (SEV)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="icon" onClick={onShowReference} disabled={disabled} title="Referentiegids">
          <Info className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 w-10 p-0 rounded-full border">
               <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPasswordChange}>
              <KeyRound className="h-4 w-4 mr-2" /> Wachtwoord wijzigen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Uitloggen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="icon" onClick={onClearAll} className="text-destructive hover:bg-destructive/10" disabled={disabled} title="Lijst wissen">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
