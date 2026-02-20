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
import { H_PHRASE_DESCRIPTIONS, H_PHRASE_MAPPING, NAMED_SUBSTANCES, SEVESO_CATEGORIES, ARIE_CATEGORIES, ARIE_H_PHRASE_MAPPING } from '@/lib/seveso';

interface CategoryExplanationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  substance: Substance | null;
  categoryId: string | null;
}

interface Explanation {
    source: string;
    description: string;
    category: string;
    categoryName: string;
}

export default function CategoryExplanationDialog({ isOpen, onOpenChange, substance, categoryId }: CategoryExplanationDialogProps) {
  if (!isOpen || !substance || !categoryId) {
    return null;
  }
  
  const category = SEVESO_CATEGORIES[categoryId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === categoryId) || ARIE_CATEGORIES[categoryId];

  const explanations: Explanation[] = [];

  // Check H-phrases
  substance.hStatements.forEach(hStatement => {
    const code = hStatement.split(' ')[0].toUpperCase();
    const isSevesoMatch = H_PHRASE_MAPPING[code] === categoryId;
    const isArieMatch = ARIE_H_PHRASE_MAPPING[code]?.includes(categoryId);

    if (isSevesoMatch || isArieMatch) {
        explanations.push({
            source: code,
            description: H_PHRASE_DESCRIPTIONS[code] || hStatement,
            category: categoryId,
            categoryName: category?.name || 'Onbekende categorie'
        });
    }
  });

  // Check for named substance match
  if (substance.casNumber && NAMED_SUBSTANCES[substance.casNumber]?.id === categoryId) {
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
          <DialogTitle>Onderbouwing voor Categorie {categoryId}</DialogTitle>
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
