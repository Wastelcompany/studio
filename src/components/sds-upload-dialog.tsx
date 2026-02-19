"use client";

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud } from 'lucide-react';
import { aiMsdsDataExtraction } from '@/ai/flows/ai-msds-data-extraction';
import { classifySubstance } from '@/lib/seveso';
import type { Substance } from '@/lib/types';

interface SdsUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddSubstance: (substance: Omit<Substance, 'id' | 'quantity'>) => void;
}

export default function SdsUploadDialog({ isOpen, onOpenChange, onAddSubstance }: SdsUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Geen bestand geselecteerd',
        description: 'Selecteer een PDF- of afbeeldingsbestand om door te gaan.',
      });
      return;
    }

    startTransition(async () => {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const dataUri = reader.result as string;
          const result = await aiMsdsDataExtraction({ documentDataUri: dataUri });

          if (!result.productName) {
            throw new Error("Kon productnaam niet extraheren.");
          }

          const { categories, isNamed, namedSubstanceName } = classifySubstance(result.hStatements || [], result.casNumber || null);

          onAddSubstance({
            productName: result.productName,
            casNumber: result.casNumber,
            hStatements: result.hStatements || [],
            sevesoCategories: categories,
            isNamedSubstance: isNamed,
            namedSubstanceName: namedSubstanceName,
          });

          toast({
            title: 'Analyse Succesvol',
            description: `"${result.productName}" is toegevoegd aan de inventaris.`,
          });
          setFile(null);
          onOpenChange(false);
        };
        reader.onerror = (error) => {
            throw new Error("Kon bestand niet lezen.");
        }
      } catch (error) {
        console.error('SDS Extraction Error:', error);
        toast({
          variant: 'destructive',
          title: 'Analyse Mislukt',
          description: error instanceof Error ? error.message : 'Er is een onbekende fout opgetreden.',
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>SDS/MSDS Analyseren</DialogTitle>
          <DialogDescription>
            Upload een PDF of afbeelding van een veiligheidsinformatieblad. De AI zal de relevante data extraheren.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="sds-file">SDS Document</Label>
            <div className="relative">
                <Input id="sds-file" type="file" onChange={handleFileChange} accept=".pdf,image/*" className="border-dashed h-24 p-4 flex items-center justify-center text-center cursor-pointer" />
                {!file && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted-foreground">
                        <UploadCloud className="w-8 h-8" />
                        <p className="text-sm mt-2">Sleep bestand hier of klik</p>
                    </div>
                )}
                {file && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-sm font-medium text-foreground">
                        {file.name}
                    </div>
                )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={!file || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Analyseren en Toevoegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
