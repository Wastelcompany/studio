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
import { SEVESO_CATEGORY_REFERENCE, SEVESO_NAMED_REFERENCE, ARIE_REFERENCE_GUIDE_DATA } from '@/lib/seveso';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from './ui/input';

interface ReferenceGuideDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function ReferenceGuideDialog({ isOpen, onOpenChange }: ReferenceGuideDialogProps) {
  const [categoryFilters, setCategoryFilters] = useState({ name: '', hPhrase: '' });
  const [namedFilters, setNamedFilters] = useState({ name: '', cas: '' });
  const [arieFilters, setArieFilters] = useState({ name: '', hPhrase: '' });

  const filteredSevesoCategories = useMemo(() => {
    return (SEVESO_CATEGORY_REFERENCE || []).filter(item => {
        const matchName = !categoryFilters.name || item.categoryName.toLowerCase().includes(categoryFilters.name.toLowerCase());
        const matchHPhrase = !categoryFilters.hPhrase || item.hPhrase.toLowerCase().includes(categoryFilters.hPhrase.toLowerCase());
        return matchName && matchHPhrase;
    });
  }, [categoryFilters]);

  const filteredSevesoNamed = useMemo(() => {
      return (SEVESO_NAMED_REFERENCE || []).filter(item => {
          const matchName = !namedFilters.name || item.categoryId.toLowerCase().includes(namedFilters.name.toLowerCase());
          const matchCas = !namedFilters.cas || item.hPhrase.toLowerCase().includes(namedFilters.cas.toLowerCase());
          return matchName && matchCas;
      });
  }, [namedFilters]);
  
  const filteredArie = useMemo(() => {
      return (ARIE_REFERENCE_GUIDE_DATA || []).filter(item => {
          const matchName = !arieFilters.name || item.categoryName.toLowerCase().includes(arieFilters.name.toLowerCase());
          const matchHPhrase = !arieFilters.hPhrase || item.hPhrase.toLowerCase().includes(arieFilters.hPhrase.toLowerCase());
          return matchName && matchHPhrase;
      });
  }, [arieFilters]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Referentiegids: Beoordelingsmethode</DialogTitle>
          <DialogDescription>
            Uitleg over de methode, inclusief koppelingen tussen H-zinnen, categorieën en drempelwaarden.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="seveso-cats" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="seveso-cats">Seveso Categorieën</TabsTrigger>
            <TabsTrigger value="seveso-named">Seveso Benoemd</TabsTrigger>
            <TabsTrigger value="arie">ARIE Koppelingen</TabsTrigger>
          </TabsList>
          
          <TabsContent value="seveso-cats">
            <div className="grid grid-cols-2 gap-2 my-2">
                <Input placeholder="Filter op omschrijving..." value={categoryFilters.name} onChange={(e) => setCategoryFilters(prev => ({...prev, name: e.target.value}))} />
                <Input placeholder="Filter op H-zin..." value={categoryFilters.hPhrase} onChange={(e) => setCategoryFilters(prev => ({...prev, hPhrase: e.target.value}))} />
            </div>
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
                    {filteredSevesoCategories.map(({ categoryId, categoryName, hPhrase, low, high }) => (
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

          <TabsContent value="seveso-named">
             <div className="grid grid-cols-2 gap-2 my-2">
                <Input placeholder="Filter op stofnaam..." value={namedFilters.name} onChange={(e) => setNamedFilters(prev => ({...prev, name: e.target.value}))} />
                <Input placeholder="Filter op CAS-nummer..." value={namedFilters.cas} onChange={(e) => setNamedFilters(prev => ({...prev, cas: e.target.value}))} />
            </div>
            <ScrollArea className="h-[50vh] mt-2">
                <Table>
                <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                    <TableHead>Stofnaam</TableHead>
                    <TableHead>CAS Nummer</TableHead>
                    <TableHead className="text-right">Lage Drempel (ton)</TableHead>
                    <TableHead className="text-right">Hoge Drempel (ton)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSevesoNamed.map(({ categoryId, hPhrase, low, high }) => (
                    <TableRow key={categoryId}>
                        <TableCell className="font-medium">{categoryId}</TableCell>
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
             <div className="grid grid-cols-2 gap-2 my-2">
                <Input placeholder="Filter op omschrijving..." value={arieFilters.name} onChange={(e) => setArieFilters(prev => ({...prev, name: e.target.value}))} />
                <Input placeholder="Filter op H-zin..." value={arieFilters.hPhrase} onChange={(e) => setArieFilters(prev => ({...prev, hPhrase: e.target.value}))} />
            </div>
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
                    {filteredArie.map(({ categoryId, categoryName, hPhrase, threshold }) => (
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
