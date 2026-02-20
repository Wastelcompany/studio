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
import type { Substance } from '@/lib/types';
import { H_PHRASE_MAPPING, SEVESO_CATEGORIES, NAMED_SUBSTANCES } from '@/lib/seveso';

interface AuditTrailDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  substance: Substance;
  categoryId: string;
}

export default function AuditTrailDialog({ isOpen, onOpenChange, substance, categoryId }: AuditTrailDialogProps) {
  const category = SEVESO_CATEGORIES[categoryId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === categoryId);

  const classificationDetails = useMemo(() => {
    if (!substance) return [];
    return substance.hStatements
      .map(hStatement => {
        const code = hStatement.split(' ')[0].toUpperCase();
        const mappedCategoryId = H_PHRASE_MAPPING[code];
        if (mappedCategoryId) {
          const mappedCategory = SEVESO_CATEGORIES[mappedCategoryId];
          return {
            hPhrase: code,
            categoryId: mappedCategoryId,
            categoryName: mappedCategory?.name || 'Onbekend',
          };
        }
        return null;
      })
      .filter((details): details is NonNullable<typeof details> => details !== null);
  }, [substance]);

  if (!category) return null;

  // Specific view for "named substances"
  if (category.group === 'named') {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Onderbouwing: Met Naam Genoemde Stof</DialogTitle>
                    <DialogDescription>
                        Deze stof is direct geclassificeerd op basis van het CAS-nummer.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-sm">
                    <p>
                        De stof <span className="font-semibold text-primary">{substance.productName}</span> met CAS-nummer <span className="font-semibold text-primary">{substance.casNumber}</span> is een met naam genoemde stof in de Seveso III-richtlijn, gecategoriseerd als <span className="font-semibold text-primary">{category.name} ({category.id})</span>.
                    </p>
                    <p className="mt-2 text-muted-foreground">Voor deze stoffen is de classificatie niet gebaseerd op H-zinnen, maar op de specifieke vermelding in de wetgeving.</p>
                </div>
            </DialogContent>
        </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Classificatie Onderbouwing</DialogTitle>
          <DialogDescription>
            H-zinnen van <span className="font-semibold text-primary">{substance.productName}</span> die leiden tot een Seveso-categorie.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>H-Zin</TableHead>
                <TableHead>Seveso Categorie</TableHead>
                <TableHead>Omschrijving</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classificationDetails.length > 0 ? (
                classificationDetails.map(detail => (
                  <TableRow key={detail.hPhrase + detail.categoryId} className={detail.categoryId === categoryId ? 'bg-secondary' : ''}>
                    <TableCell className="font-medium">{detail.hPhrase}</TableCell>
                    <TableCell>{detail.categoryId}</TableCell>
                    <TableCell>{detail.categoryName}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Deze stof heeft geen H-zinnen die leiden tot een Seveso-classificatie.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
