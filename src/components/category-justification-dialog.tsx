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
import type { Substance, SevesoCategory } from '@/lib/types';
import { H_PHRASE_MAPPING, NAMED_SUBSTANCES, REFERENCE_GUIDE_DATA } from '@/lib/seveso';
import { ScrollArea } from './ui/scroll-area';

interface ClickedCategory {
  id: string;
  name: string;
  group: string;
}

interface CategoryJustificationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  substance: Substance | null;
  category: ClickedCategory | null;
}

export default function CategoryJustificationDialog({ isOpen, onOpenChange, substance, category }: CategoryJustificationDialogProps) {
  const justificationData = useMemo(() => {
    if (!substance || !category) return [];

    // For named substances, the justification is the CAS number.
    const namedSubstance = Object.values(NAMED_SUBSTANCES).find(ns => ns.id === category.id);
    if (namedSubstance && substance.casNumber === namedSubstance.cas) {
        return [{
            trigger: `CAS: ${substance.casNumber}`,
            description: `Deze stof is een 'Benoemde Stof' op basis van het CAS-nummer.`,
        }];
    }

    // For other categories, find the H-phrases that map to this category.
    return substance.hStatements
      .map(hStatement => {
        const hCode = hStatement.split(' ')[0].toUpperCase();
        return { hStatement, hCode };
      })
      .filter(({ hCode }) => H_PHRASE_MAPPING[hCode] === category.id)
      .map(({ hStatement, hCode }) => {
        const reference = REFERENCE_GUIDE_DATA.find(ref => ref.hPhrase === hCode);
        return {
            trigger: hStatement,
            description: reference?.categoryName || 'Onbekende omschrijving',
        }
      });
  }, [substance, category]);

  if (!substance || !category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Onderbouwing voor {category.name}</DialogTitle>
          <DialogDescription>
            De categorie '{category.id}' is toegekend aan '{substance.productName}' op basis van de volgende gegevens:
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4 mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gegeven (H-zin of CAS)</TableHead>
                <TableHead>Omschrijving</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {justificationData.length > 0 ? (
                justificationData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.trigger}</TableCell>
                    <TableCell>{item.description}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                    Geen directe H-zinnen gevonden voor deze specifieke categorie.
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
