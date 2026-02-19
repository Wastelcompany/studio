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
import { REFERENCE_GUIDE_DATA } from '@/lib/seveso';

interface ReferenceGuideDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function ReferenceGuideDialog({ isOpen, onOpenChange }: ReferenceGuideDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Referentiegids: Beoordelingsmethode</DialogTitle>
          <DialogDescription>
            Hoe de Seveso Expert app stoffen classificeert op basis van H-zinnen.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mt-4 space-y-2">
            <p>De beoordeling is gebaseerd op de Seveso III-richtlijn (2012/18/EU). Elke gevarenaanduiding (H-zin) die op een veiligheidsinformatieblad (SDS) wordt vermeld, wordt gekoppeld aan een specifieke Seveso-gevarencategorie.</p>
            <p>De totale hoeveelheid van stoffen binnen dezelfde categorie wordt opgeteld en vergeleken met de wettelijke drempelwaarden om de Seveso-status van de inrichting te bepalen.</p>
            <p>De onderstaande tabel toont de exacte koppelingen die de app gebruikt.</p>
        </div>
        <ScrollArea className="h-[50vh] mt-4">
            <Table>
            <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                <TableHead>H-Zin</TableHead>
                <TableHead>Seveso Categorie</TableHead>
                <TableHead>Omschrijving</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {REFERENCE_GUIDE_DATA.map(({ hPhrase, categoryId, categoryName }) => (
                <TableRow key={hPhrase}>
                    <TableCell className="font-medium">{hPhrase}</TableCell>
                    <TableCell>{categoryId}</TableCell>
                    <TableCell>{categoryName}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
