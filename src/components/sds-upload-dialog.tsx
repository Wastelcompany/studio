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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function SdsUploadDialog({ isOpen, onOpenChange, onAddSubstance }: SdsUploadDialogProps) {
  const [files, setFiles] = useState<File[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast, dismiss } = useToast();

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
      let fileIndex = 0;

      for (const file of files) {
        fileIndex++;
        const { id: toastId } = toast({
            title: 'Analyse bezig...',
            description: `Bestand ${fileIndex} van ${totalFiles}: ${file.name}`,
        });
          
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

          const { sevesoCategories, arieCategories, isNamed, namedSubstanceName } = classifySubstance(result.hStatements || [], result.casNumber || null);

          onAddSubstance({
              productName: result.productName,
              casNumber: result.casNumber,
              hStatements: result.hStatements || [],
              sevesoCategories,
              arieCategories,
              isNamedSubstance: isNamed,
              namedSubstanceName: namedSubstanceName,
          });
          successCount++;

        } catch (error) {
          dismiss(toastId); // Dismiss the progress toast on error
          console.error('SDS Extraction Error:', error);
          let errorMessage = error instanceof Error ? error.message : 'Er is een onbekende fout opgetreden.';
          if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            errorMessage = 'De API-limiet (per minuut of per dag) is overschreden. Wacht alstublieft en probeer het later opnieuw met minder bestanden.';
          }
          
          toast({
              variant: 'destructive',
              title: `Analyse Mislukt voor ${file.name}`,
              description: errorMessage,
          });
        } finally {
            dismiss(toastId);
        }
        
        // Add a delay between API calls to avoid rate limiting, but not after the last file.
        if (fileIndex < totalFiles) {
            await sleep(5000); // 5 seconds delay
        }
      }

      toast({
          title: 'Analyse voltooid',
          description: `${successCount} van de ${totalFiles} bestand(en) succesvol geanalyseerd.`,
      });
      
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isPending) {
        if (!open) {
          setFiles(null);
        }
        onOpenChange(open);
      }
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
            <div className="relative border-dashed border-2 rounded-md h-32 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors">
                <Input
                    id="sds-file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    multiple
                    disabled={isPending}
                />
                {!files || files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pointer-events-none text-muted-foreground">
                        <UploadCloud className="w-8 h-8" />
                        <p className="text-sm mt-2">Sleep bestanden hier of klik</p>
                    </div>
                ) : (
                    <div className="pointer-events-none text-sm font-medium text-foreground">
                        {files.length} bestand(en) geselecteerd
                    </div>
                )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={!files || files.length === 0 || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? 'Bezig met analyseren...' : `Analyseer ${files?.length || 0} bestand(en)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
