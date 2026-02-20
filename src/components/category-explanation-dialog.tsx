"use client";

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
import { ScrollArea } from './ui/scroll-area';
import type { Substance } from '@/lib/types';
import { H_PHRASE_DESCRIPTIONS, SEVESO_H_PHRASE_MAPPING, ARIE_H_PHRASE_MAPPING, SEVESO_CATEGORIES, ARIE_CATEGORIES, NAMED_SUBSTANCES } from '@/lib/seveso';

interface CategoryExplanationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  substance: Substance | null;
  categoryId: string | null;
  categoryType: 'seveso' | 'arie' | null;
}

interface Explanation {
    source: string;
    description: string;
    category: string;
    categoryName: string;
}

export default function CategoryExplanationDialog({ isOpen, onOpenChange, substance, categoryId, categoryType }: CategoryExplanationDialogProps) {
  if (!isOpen || !substance || !categoryId || !categoryType) {
    return null;
  }
  
  const isSeveso = categoryType === 'seveso';
  const category = isSeveso 
    ? SEVESO_CATEGORIES[categoryId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === categoryId)
    : ARIE_CATEGORIES[categoryId];

  const mapping = isSeveso ? SEVESO_H_PHRASE_MAPPING : ARIE_H_PHRASE_MAPPING;

  const explanations: Explanation[] = [];

  // Check H-phrases for mapping
  substance.hStatements.forEach(hStatement => {
    const code = hStatement.split(' ')[0].toUpperCase();
    const isMatch = isSeveso
      ? (mapping as Record<string, string>)[code] === categoryId
      : (mapping as Record<string, string[]>)[code]?.includes(categoryId);

    if (isMatch) {
        explanations.push({
            source: code,
            description: H_PHRASE_DESCRIPTIONS[code] || hStatement,
            category: categoryId,
            categoryName: category?.name || 'Onbekende categorie'
        });
    }
  });

  // Check for named substance match (only for Seveso)
  if (isSeveso && substance.casNumber && NAMED_SUBSTANCES[substance.casNumber]?.id === categoryId) {
    const namedSubstance = NAMED_SUBSTANCES[substance.casNumber];
    explanations.push({
        source: `CAS: ${substance.casNumber}`,
        description: `Gedefinieerd als benoemde stof: ${namedSubstance.name}`,
        category: namedSubstance.id,
        categoryName: namedSubstance.name
    });
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Onderbouwing voor Categorie {categoryId} ({categoryType.toUpperCase()})</DialogTitle>
          <DialogDescription>
            De stof '{substance.productName}' is geclassificeerd in categorie {categoryId} ({category?.name}) op basis van de volgende gegevens:
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4 mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bron (H-zin / CAS)</TableHead>
                <TableHead>Omschrijving</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {explanations.length > 0 ? (
                explanations.map((exp, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{exp.source}</TableCell>
                    <TableCell>{exp.description}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                    Geen directe koppeling gevonden in de H-zinnen of als benoemde stof voor deze specifieke categorie.
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
