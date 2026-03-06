"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, Trash2, Info, Loader2, ChevronDown, LogOut, FileText, KeyRound, User, DatabaseBackup } from 'lucide-react';
import { useRef } from 'react';
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
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onSaveAsPdf: (type: 'full' | 'seveso') => void;
  onPasswordChange: () => void;
  isSavingPdf: boolean;
  disabled: boolean;
}

export default function SevesoHeader({
  onUpload,
  onClearAll,
  onShowReference,
  onExport,
  onImport,
  onSaveAsPdf,
  onPasswordChange,
  isSavingPdf,
  disabled,
}: SevesoHeaderProps) {
  const router = useRouter();
  const auth = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json" 
        onChange={onImport} 
      />
      
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          <span className="text-primary">Chem</span>Stats
        </h1>
        <p className="text-muted-foreground">Gevaarlijke Stoffen Analyse - Seveso en ARIE</p>
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <Button onClick={onUpload} disabled={disabled}><Upload className="h-4 w-4 mr-2" />Upload SDS</Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline"><DatabaseBackup className="h-4 w-4 mr-2" /> Back-up <ChevronDown className="ml-1 h-3 w-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onExport} disabled={disabled}>Export JSON (Check-point)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Herstel uit JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled || isSavingPdf}>
              {isSavingPdf ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Rapportage <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onSaveAsPdf('full')}>Volledig rapport (SERIE)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSaveAsPdf('seveso')}>Seveso rapport (SEV)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="icon" onClick={onShowReference} title="Referentiegids"><Info className="h-4 w-4" /></Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 w-10 p-0 rounded-full border"><User className="h-5 w-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Account Instellingen</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPasswordChange}><KeyRound className="h-4 w-4 mr-2" /> Wachtwoord wijzigen</DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut(auth).then(() => router.push('/'))} className="text-destructive"><LogOut className="h-4 w-4 mr-2" /> Uitloggen</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="outline" size="icon" onClick={onClearAll} className="text-destructive hover:bg-destructive/10" disabled={disabled} title="Lijst wissen"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </header>
  );
}
