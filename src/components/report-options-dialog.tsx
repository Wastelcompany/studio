
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText, FileStack } from 'lucide-react';

interface ReportOptionsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onGenerate: (options: { type: 'full' | 'seveso'; includeSds: boolean }) => void;
  isGenerating: boolean;
}

export default function ReportOptionsDialog({
  isOpen,
  onOpenChange,
  onGenerate,
  isGenerating,
}) {
  const [reportType, setReportType] = useState<'full' | 'seveso'>('full');
  const [includeSds, setIncludeSds] = useState(false);

  const handleGenerate = () => {
    onGenerate({ type: reportType, includeSds });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rapportage Opties</DialogTitle>
          <DialogDescription>
            Selecteer het gewenste rapporttype en geef aan of u de SDS-documenten als bijlage wilt toevoegen.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <Label className="text-base">Type Rapport</Label>
            <RadioGroup
              value={reportType}
              onValueChange={(v) => setReportType(v as 'full' | 'seveso')}
              className="grid gap-2"
            >
              <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Volledig rapport (SERIE)</div>
                  <div className="text-xs text-muted-foreground">Inclusief Seveso en ARIE sommaties.</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="seveso" id="seveso" />
                <Label htmlFor="seveso" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Seveso rapport (SEV)</div>
                  <div className="text-xs text-muted-foreground">Alleen Seveso drempelwaarde-analyses.</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-3 border rounded-md p-4 bg-muted/20">
            <Checkbox
              id="include-sds"
              checked={includeSds}
              onCheckedChange={(checked) => setIncludeSds(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="include-sds"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                <FileStack className="h-4 w-4 text-primary" />
                SDS Bijlagen toevoegen
              </Label>
              <p className="text-xs text-muted-foreground">
                Bundelt de originele SDS-documenten achteraan het rapport.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Annuleren
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="min-w-[140px]">
            {isGenerating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Genereren...</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" /> Rapport maken</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
