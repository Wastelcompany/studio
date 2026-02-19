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
import { Progress } from './ui/progress';

interface SdsUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddSubstance: (substance: Omit<Substance, 'id' | 'quantity'>) => void;
}

export default function SdsUploadDialog({ isOpen, onOpenChange, onAddSubstance }: SdsUploadDialogProps) {
  const [files, setFiles] = useState<File[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFiles(Array.from(event.target.files));
    } else {
      setFiles(null);
    }
  };

  const handleSubmit = async () => {
    if (!files || files.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Geen bestanden geselecteerd',
        description: 'Selecteer één of meerdere PDF- of afbeeldingsbestanden om door te gaan.',
      });
      return;
    }

    startTransition(async () => {
      let successCount = 0;
      const totalFiles = files.length;
      setProgress({ processed: 0, total: totalFiles });
      
      for (const file of files) {
          try {
            const dataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(new Error(`Kon het bestand ${file.name} niet lezen`));
            });

            const result = await aiMsdsDataExtraction({ documentDataUri: dataUri });

            if (!result.productName) {
                throw new Error(`Kon productnaam niet extraheren uit ${file.name}.`);
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
            successCount++;

          } catch (error) {
            console.error('SDS Extraction Error:', error);
            toast({
                variant: 'destructive',
                title: 'Analyse Mislukt',
                description: error instanceof Error ? error.message : 'Er is een onbekende fout opgetreden.',
            });
          }
          setProgress(prev => prev ? { ...prev, processed: prev.processed + 1 } : null);
      }

      if (successCount > 0) {
        toast({
            title: 'Analyse voltooid',
            description: `${successCount} van de ${totalFiles} bestand(en) succesvol geanalyseerd.`,
        });
      }
      
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setFiles(null);
        setProgress(null);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>SDS/MSDS Analyseren</DialogTitle>
          <DialogDescription>
            Upload één of meerdere PDF's of afbeeldingen van veiligheidsinformatiebladen. De AI zal de relevante data extraheren.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="sds-file">SDS Document(en)</Label>
            <div className="relative">
                <Input id="sds-file" type="file" onChange={handleFileChange} accept=".pdf,image/*" className="border-dashed h-24 p-4 flex items-center justify-center text-center cursor-pointer" multiple disabled={isPending} />
                {!files || files.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted-foreground">
                        <UploadCloud className="w-8 h-8" />
                        <p className="text-sm mt-2">Sleep bestanden hier of klik</p>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-sm font-medium text-foreground">
                        {files.length} bestand(en) geselecteerd
                    </div>
                )}
            </div>
          </div>
          {isPending && progress && (
            <div className="space-y-2 pt-2">
                <Label>Voortgang</Label>
                <Progress value={progress.total > 0 ? (progress.processed / progress.total) * 100 : 0} />
                <p className="text-sm text-muted-foreground text-center">
                    {progress.processed} / {progress.total} bestanden verwerkt
                </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={!files || files.length === 0 || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? 'Bezig met analyseren...' : 'Analyseren en Toevoegen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
