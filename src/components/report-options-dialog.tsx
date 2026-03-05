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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText } from 'lucide-react';

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
}: ReportOptionsDialogProps) {
  const [reportType, setReportType] = useState<'full' | 'seveso'>('full');

  const handleGenerate = () => {
    onGenerate({ type: reportType, includeSds: false });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rapportage Opties</DialogTitle>
          <DialogDescription>
            Selecteer het gewenste rapporttype.
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
