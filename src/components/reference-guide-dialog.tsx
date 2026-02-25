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
import { REFERENCE_GUIDE_DATA, ARIE_REFERENCE_GUIDE_DATA } from '@/lib/seveso';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReferenceGuideDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function ReferenceGuideDialog({ isOpen, onOpenChange }: ReferenceGuideDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Referentiegids: Beoordelingsmethode</DialogTitle>
          <DialogDescription>
            Uitleg over de methode voor de drempelwaardecheck, inclusief koppelingen tussen H-zinnen, categorieën en drempelwaarden.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mt-4 space-y-2">
            <p>De beoordeling is gebaseerd op de Seveso III-richtlijn (2012/18/EU) en de ARIE-regeling. Elke gevarenaanduiding (H-zin) wordt gekoppeld aan een specifieke gevarencategorie. De totale hoeveelheid van stoffen binnen dezelfde categorie wordt opgeteld en vergeleken met de wettelijke drempelwaarden.</p>
        </div>
        <Tabs defaultValue="seveso" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="seveso">Seveso Koppelingen</TabsTrigger>
            <TabsTrigger value="arie">ARIE Koppelingen</TabsTrigger>
          </TabsList>
          <TabsContent value="seveso">
            <ScrollArea className="h-[50vh] mt-2">
                <Table>
                <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                    <TableHead>Seveso Categorie</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>Gerelateerde H-Zin(nen)</TableHead>
                    <TableHead className="text-right">Lage Drempel (ton)</TableHead>
                    <TableHead className="text-right">Hoge Drempel (ton)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {REFERENCE_GUIDE_DATA.map(({ categoryId, categoryName, hPhrase, low, high }) => (
                    <TableRow key={categoryId}>
                        <TableCell className="font-medium">{categoryId}</TableCell>
                        <TableCell>{categoryName}</TableCell>
                        <TableCell className="text-muted-foreground">{hPhrase}</TableCell>
                        <TableCell className="text-right font-mono">{low.toLocaleString('nl-NL')}</TableCell>
                        <TableCell className="text-right font-mono">{high.toLocaleString('nl-NL')}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="arie">
             <ScrollArea className="h-[50vh] mt-2">
                <Table>
                <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                    <TableHead>ARIE Categorie</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>Gerelateerde H-Zin(nen)</TableHead>
                    <TableHead className="text-right">Drempelwaarde (ton)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ARIE_REFERENCE_GUIDE_DATA.map(({ categoryId, categoryName, hPhrase, threshold }) => (
                    <TableRow key={categoryId}>
                        <TableCell className="font-medium">{categoryId}</TableCell>
                        <TableCell>{categoryName}</TableCell>
                        <TableCell className="text-muted-foreground">{hPhrase}</TableCell>
                        <TableCell className="text-right font-mono">{threshold.toLocaleString('nl-NL')}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
