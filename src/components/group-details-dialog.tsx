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
import { SEVESO_CATEGORIES, NAMED_SUBSTANCES } from '@/lib/seveso';
import { ScrollArea } from './ui/scroll-area';

interface GroupDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  group: SummationGroup | null;
  inventory: Substance[];
  mode: ThresholdMode;
}

export default function GroupDetailsDialog({ isOpen, onOpenChange, group, inventory, mode }: GroupDetailsDialogProps) {
  const contributingSubstances = useMemo(() => {
    if (!group) return [];
    
    return inventory
      .map(substance => {
        let contribution = 0;
        
        substance.sevesoCategories.forEach(catId => {
          const category = SEVESO_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
          if (category && category.group === group.group) {
            const threshold = category.threshold[mode];
            if (threshold > 0 && substance.quantity > 0) {
              contribution += substance.quantity / threshold;
            }
          }
        });

        return {
          ...substance,
          contribution,
        };
      })
      .filter(item => item.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution);

  }, [group, inventory, mode]);

  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Details voor: {group.name}</DialogTitle>
          <DialogDescription>
            De volgende stoffen dragen bij aan de sommatie voor deze groep. Het totaal is {Math.round(group.totalRatio * 100)}%.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <Table>
            <TableHeader>
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
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Geen bijdragende stoffen gevonden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
