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
          <DialogTitle>Referentiegids</DialogTitle>
          <DialogDescription>
            Een overzicht van H-zinnen en hun mapping naar Seveso-gevarencategorieën.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] mt-4">
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
