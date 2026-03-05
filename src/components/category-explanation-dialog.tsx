
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
import { H_PHRASE_DESCRIPTIONS, H_PHRASE_MAPPING, ALL_CATEGORIES, NAMED_SUBSTANCES } from '@/lib/seveso';

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
  
  const category = ALL_CATEGORIES[categoryId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === categoryId);

  const explanations: Explanation[] = [];

  // Check H-phrases for mapping
  substance.hStatements.forEach(hStatement => {
    const code = hStatement.split(' ')[0].toUpperCase();
    const mappedCategories = H_PHRASE_MAPPING[code] || [];

    if (mappedCategories.includes(categoryId)) {
        explanations.push({
            source: code,
            description: H_PHRASE_DESCRIPTIONS[code] || hStatement,
            category: categoryId,
            categoryName: category?.name || 'Onbekende categorie'
        });
    }
  });

  // Check for named substance match (only for Seveso)
  if (categoryType === 'seveso' && substance.casNumber && NAMED_SUBSTANCES[substance.casNumber]?.id === categoryId) {
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
      <DialogContent className="sm:max-w-xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 shrink-0">
          <DialogHeader>
            <DialogTitle>Onderbouwing voor Categorie {categoryId} ({categoryType.toUpperCase()})</DialogTitle>
            <DialogDescription>
              De stof '{substance.productName}' is geclassificeerd op basis van de volgende gegevens:
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6 flex flex-col">
          <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-muted/10">
            <ScrollArea className="h-full w-full">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
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
                        Geen directe koppeling gevonden voor deze categorie.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
