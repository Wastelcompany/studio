"use client";

import { useState, useMemo } from 'react';
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
import { SEVESO_CATEGORY_REFERENCE, SEVESO_NAMED_REFERENCE, ARIE_REFERENCE_GUIDE_DATA, ARIE_NAMED_REFERENCE } from '@/lib/seveso';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferenceGuideDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function ReferenceGuideDialog({ isOpen, onOpenChange }: ReferenceGuideDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSevesoCats = useMemo(() => {
    if (!searchTerm) return SEVESO_CATEGORY_REFERENCE;
    const term = searchTerm.toLowerCase();
    return SEVESO_CATEGORY_REFERENCE.filter(item => 
        item.categoryId.toLowerCase().includes(term) ||
        item.categoryName.toLowerCase().includes(term) ||
        item.hPhrase.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const filteredSevesoNamed = useMemo(() => {
    if (!searchTerm) return SEVESO_NAMED_REFERENCE;
    const term = searchTerm.toLowerCase();
    return SEVESO_NAMED_REFERENCE.filter(item => 
        item.categoryId.toLowerCase().includes(term) ||
        item.hPhrase.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const filteredArieCats = useMemo(() => {
    if (!searchTerm) return ARIE_REFERENCE_GUIDE_DATA;
    const term = searchTerm.toLowerCase();
    return ARIE_REFERENCE_GUIDE_DATA.filter(item => 
        item.categoryId.toLowerCase().includes(term) ||
        item.categoryName.toLowerCase().includes(term) ||
        item.hPhrase.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const filteredArieNamed = useMemo(() => {
    if (!searchTerm) return ARIE_NAMED_REFERENCE;
    const term = searchTerm.toLowerCase();
    return ARIE_NAMED_REFERENCE.filter(item => 
        item.categoryId.toLowerCase().includes(term) ||
        item.hPhrase.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Referentiegids: Beoordelingsmethode</DialogTitle>
          <DialogDescription>
            Uitleg over de methode voor de drempelwaardecheck, inclusief koppelingen tussen H-zinnen, categorieën en drempelwaarden.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
            <div className="text-sm text-muted-foreground max-w-xl">
                De beoordeling is gebaseerd op de Seveso III-richtlijn (2012/18/EU) en de ARIE-regeling. Elke gevarenaanduiding (H-zin) wordt gekoppeld aan een categorie.
            </div>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Snel zoeken..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                />
                {searchTerm && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-9 w-9" 
                        onClick={() => setSearchTerm("")}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>

        <Tabs defaultValue="seveso-cats" className="mt-4 flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="seveso-cats">Seveso Categorieën</TabsTrigger>
            <TabsTrigger value="seveso-named">Benoemde Stoffen</TabsTrigger>
            <TabsTrigger value="arie">ARIE Koppelingen</TabsTrigger>
          </TabsList>
          
          <TabsContent value="seveso-cats" className="flex-grow overflow-hidden mt-2">
            <ScrollArea className="h-full">
                <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                    <TableHead>Seveso Categorie</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>H-Zin(nen)</TableHead>
                    <TableHead className="text-right">Lage Drempel (ton)</TableHead>
                    <TableHead className="text-right">Hoge Drempel (ton)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSevesoCats.length > 0 ? (
                        filteredSevesoCats.map(({ categoryId, categoryName, hPhrase, low, high }) => (
                            <TableRow key={categoryId}>
                                <TableCell className="font-medium">{categoryId}</TableCell>
                                <TableCell>{categoryName}</TableCell>
                                <TableCell className="text-muted-foreground">{hPhrase}</TableCell>
                                <TableCell className="text-right font-mono">{low.toLocaleString('nl-NL')}</TableCell>
                                <TableCell className="text-right font-mono">{high.toLocaleString('nl-NL')}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Geen categorieën gevonden.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="seveso-named" className="flex-grow overflow-hidden mt-2">
            <ScrollArea className="h-full">
                <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                    <TableHead>Stofnaam</TableHead>
                    <TableHead>CAS Nummer</TableHead>
                    <TableHead className="text-right">Seveso Laag (t)</TableHead>
                    <TableHead className="text-right">Seveso Hoog (t)</TableHead>
                    <TableHead className="text-right">ARIE (t)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSevesoNamed.length > 0 ? (
                        filteredSevesoNamed.map((sub) => (
                            <TableRow key={sub.categoryId}>
                                <TableCell className="font-medium">{sub.categoryId}</TableCell>
                                <TableCell className="text-muted-foreground">{sub.hPhrase.replace('CAS: ', '')}</TableCell>
                                <TableCell className="text-right font-mono">{sub.low.toLocaleString('nl-NL')}</TableCell>
                                <TableCell className="text-right font-mono">{sub.high.toLocaleString('nl-NL')}</TableCell>
                                <TableCell className="text-right font-mono font-bold text-primary">{sub.arie ? sub.arie.toLocaleString('nl-NL') : '-'}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Geen stoffen gevonden.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="arie" className="flex-grow overflow-hidden mt-2">
             <ScrollArea className="h-full">
                <div className="space-y-6">
                    <div>
                        <h4 className="font-semibold text-primary mb-2">ARIE Gevarencategorieën</h4>
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                <TableRow>
                                <TableHead>ARIE Categorie</TableHead>
                                <TableHead>Omschrijving</TableHead>
                                <TableHead>H-Zin(nen)</TableHead>
                                <TableHead className="text-right">Drempel (ton)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredArieCats.length > 0 ? (
                                    filteredArieCats.map(({ categoryId, categoryName, hPhrase, threshold }) => (
                                        <TableRow key={categoryId}>
                                            <TableCell className="font-medium">{categoryId}</TableCell>
                                            <TableCell>{categoryName}</TableCell>
                                            <TableCell className="text-muted-foreground">{hPhrase}</TableCell>
                                            <TableCell className="text-right font-mono">{threshold.toLocaleString('nl-NL')}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Geen ARIE-categorieën gevonden.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-semibold text-primary mb-2">Benoemde Stoffen (ARIE)</h4>
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                <TableRow>
                                <TableHead>Stofnaam</TableHead>
                                <TableHead>CAS Nummer</TableHead>
                                <TableHead className="text-right">ARIE Drempel (ton)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredArieNamed.length > 0 ? (
                                    filteredArieNamed.map((sub) => (
                                        <TableRow key={sub.categoryId}>
                                            <TableCell className="font-medium">{sub.categoryId}</TableCell>
                                            <TableCell className="text-muted-foreground">{sub.hPhrase.replace('CAS: ', '')}</TableCell>
                                            <TableCell className="text-right font-mono font-bold">{sub.threshold.toLocaleString('nl-NL')}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Geen benoemde stoffen gevonden.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
