"use client";

import { useEffect, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Substance } from '@/lib/types';
import { getAiClassificationAuditTrail, AiClassificationAuditTrailOutput } from '@/ai/flows/ai-classification-audit-trail';
import { SEVESO_CATEGORIES, NAMED_SUBSTANCES } from '@/lib/seveso';

interface AuditTrailDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  substance: Substance;
  categoryId: string;
}

export default function AuditTrailDialog({ isOpen, onOpenChange, substance, categoryId }: AuditTrailDialogProps) {
  const [auditData, setAuditData] = useState<AiClassificationAuditTrailOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const category = SEVESO_CATEGORIES[categoryId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === categoryId);

  useEffect(() => {
    if (isOpen && substance && category) {
      setAuditData(null); // Reset on open
      startTransition(async () => {
        try {
          // If it's a named substance, the reasoning is direct.
          if (category.group === 'named') {
            setAuditData({
                explanation: `De stof is geclassificeerd als '${category.name}' omdat het CAS-nummer (${substance.casNumber}) direct overeenkomt met de met naam genoemde stof in de Seveso III-richtlijn.`,
                triggeringHPhrases: [],
            });
            return;
          }

          const result = await getAiClassificationAuditTrail({
            substanceName: substance.productName,
            casNumber: substance.casNumber || undefined,
            hPhrases: substance.hStatements,
            assignedSevesoCategory: `${categoryId} (${category.name})`,
          });
          setAuditData(result);
        } catch (error) {
          console.error("Audit Trail Error:", error);
          toast({
            variant: "destructive",
            title: "Fout bij ophalen onderbouwing",
            description: "De AI kon geen uitleg genereren."
          });
          onOpenChange(false);
        }
      });
    }
  }, [isOpen, substance, category, categoryId]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Audit Spoor</DialogTitle>
          <DialogDescription>
            Uitleg voor de classificatie van <span className="font-semibold text-primary">{substance.productName}</span> als <span className="font-semibold text-primary">{categoryId}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isPending && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          )}
          {auditData && (
            <div>
              <h4 className="font-semibold mb-2">Uitleg</h4>
              <p className="text-sm text-foreground">{auditData.explanation}</p>
              
              {auditData.triggeringHPhrases.length > 0 && (
                <>
                  <h4 className="font-semibold mt-4 mb-2">Triggering H-Zinnen</h4>
                  <div className="flex flex-wrap gap-2">
                    {auditData.triggeringHPhrases.map(phrase => (
                      <Badge key={phrase} variant="default">{phrase}</Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
