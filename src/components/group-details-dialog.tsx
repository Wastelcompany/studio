"use client";

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Substance, SummationGroup, ThresholdMode } from '@/lib/types';
import { ALL_CATEGORIES, NAMED_SUBSTANCES, SEVESO_THRESHOLDS, getArieThreshold } from '@/lib/seveso';
import { ScrollArea } from './ui/scroll-area';

interface GroupDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  group: SummationGroup | null;
  inventory: Substance[];
  mode: ThresholdMode;
  type: 'seveso' | 'arie';
}

export default function GroupDetailsDialog({ isOpen, onOpenChange, group, inventory, mode, type }: GroupDetailsDialogProps) {
  const contributingSubstances = useMemo(() => {
    if (!group) return [];
    
    return inventory
      .map(substance => {
        let contribution = 0;
        
        if (type === 'seveso') {
            substance.sevesoCategoryIds.forEach(catId => {
              const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
              const thresholdInfo = SEVESO_THRESHOLDS[catId] || (category as any)?.threshold;
              if (category && category.group === group.group && thresholdInfo) {
                const threshold = thresholdInfo[mode];
                if (threshold > 0 && substance.quantity > 0) contribution += substance.quantity / threshold;
              }
            });
        } else { // ARIE
            substance.arieCategoryIds.forEach(catId => {
                const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
                const threshold = getArieThreshold(catId);
                if (category && category.group === group.group && threshold && threshold > 0) {
                    contribution += substance.quantity / threshold;
                }
            });
        }

        return { ...substance, contribution };
      })
      .filter(item => item.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution);

  }, [group, inventory, mode, type]);

  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden p-0">
        <div className="p-6 pb-2 shrink-0">
          <DialogHeader>
            <DialogTitle>Details voor: {group.name} ({type.toUpperCase()})</DialogTitle>
            <DialogDescription>
              De volgende stoffen dragen bij aan de sommatie voor deze groep. Het totaal is {Math.round(group.totalRatio * 100)}%.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex-grow overflow-hidden m-6 mt-0 border rounded-md relative flex flex-col min-h-0">
          <ScrollArea className="h-full w-full">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead>Stof</TableHead>
                  <TableHead className="text-right">Voorraad (ton)</TableHead>
                  <TableHead className="text-right">Bijdrage (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributingSubstances.length > 0 ? (
                  contributingSubstances.map(sub => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.productName}</TableCell>
                      <TableCell className="text-right">{sub.quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{(sub.contribution * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">Geen bijdragende stoffen gevonden.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
