'use client';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/supabase/provider';
import { Button } from '@/components/ui/button';
import { Upload, FileDown, Trash2, Info, Loader2, ChevronDown, LogOut, FileText, KeyRound, DatabaseBackup, Settings } from 'lucide-react';
import { useRef } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

interface SevesoHeaderProps {
  onUpload: () => void;
  onClearAll: () => void;
  onShowReference: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onSaveAsPdf: (type: 'full' | 'seveso') => void;
  onPasswordChange: () => void;
  onGoToAdmin: () => void;
  isSavingPdf: boolean;
  disabled: boolean;
  isAdmin: boolean;
}

export default function SevesoHeader({ onUpload, onClearAll, onShowReference, onExport, onImport, onSaveAsPdf, onPasswordChange, onGoToAdmin, isSavingPdf, disabled, isAdmin }: SevesoHeaderProps) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight"><span className="text-primary">Chem</span>Stats</h1>
          <p className="text-xs text-muted-foreground">Seveso III &amp; ARIE Analyse</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onShowReference}><Info className="mr-2 h-4 w-4" />Referentie</Button>
        <Button variant="outline" size="sm" onClick={onUpload} disabled={disabled}><Upload className="mr-2 h-4 w-4" />SDS Uploaden</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled || isSavingPdf}>
              {isSavingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Exporteren <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Exporteer als...</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSaveAsPdf('full')}><FileText className="mr-2 h-4 w-4" />Volledig Rapport (PDF)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSaveAsPdf('seveso')}><FileText className="mr-2 h-4 w-4" />Seveso Overzicht (PDF)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport}><DatabaseBackup className="mr-2 h-4 w-4" />Back-up (JSON)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}><DatabaseBackup className="mr-2 h-4 w-4" />Herstellen (JSON)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="destructive" size="sm" onClick={onClearAll} disabled={disabled}><Trash2 className="mr-2 h-4 w-4" />Alles Wissen</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm"><Settings className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPasswordChange}><KeyRound className="mr-2 h-4 w-4" />Wachtwoord Wijzigen</DropdownMenuItem>
            {isAdmin && <DropdownMenuItem onClick={onGoToAdmin}><Settings className="mr-2 h-4 w-4" />Beheer</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Uitloggen</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={onImport} />
      </div>
    </header>
  );
}
