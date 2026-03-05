
'use client';

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
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferenceGuideDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function ReferenceGuideDialog({ isOpen, onOpenChange }: ReferenceGuideDialogProps) {
  const [sevesoFilters, setSevesoFilters] = useState({ cat: "", desc: "", h: "" });
  const [namedFilters, setNamedFilters] = useState({ name: "", cas: "" });
  const [arieFilters, setArieFilters] = useState({ cat: "", desc: "", h: "" });

  const filteredSevesoCats = useMemo(() => {
    return SEVESO_CATEGORY_REFERENCE.filter(item => {
        const matchCat = !sevesoFilters.cat || item.categoryId.toLowerCase().includes(sevesoFilters.cat.toLowerCase());
        const matchDesc = !sevesoFilters.desc || item.categoryName.toLowerCase().includes(sevesoFilters.desc.toLowerCase());
        const matchH = !sevesoFilters.h || item.hPhrase.toLowerCase().includes(sevesoFilters.h.toLowerCase());
        return matchCat && matchDesc && matchH;
    });
  }, [sevesoFilters]);

  const filteredSevesoNamed = useMemo(() => {
    return SEVESO_NAMED_REFERENCE.filter(item => {
        const matchName = !namedFilters.name || item.categoryId.toLowerCase().includes(namedFilters.name.toLowerCase());
        const matchCas = !namedFilters.cas || item.hPhrase.toLowerCase().includes(namedFilters.cas.toLowerCase());
        return matchName && matchCas;
    });
  }, [namedFilters]);

  const filteredArieCats = useMemo(() => {
    return ARIE_REFERENCE_GUIDE_DATA.filter(item => {
        const matchCat = !arieFilters.cat || item.categoryId.toLowerCase().includes(arieFilters.cat.toLowerCase());
        const matchDesc = !arieFilters.desc || item.categoryName.toLowerCase().includes(arieFilters.desc.toLowerCase());
        const matchH = !arieFilters.h || item.hPhrase.toLowerCase().includes(arieFilters.h.toLowerCase());
        return matchCat && matchDesc && matchH;
    });
  }, [arieFilters]);

  const filteredArieNamed = useMemo(() => {
    return ARIE_NAMED_REFERENCE.filter(item => {
        const matchName = !namedFilters.name || item.categoryId.toLowerCase().includes(namedFilters.name.toLowerCase());
        const matchCas = !namedFilters.cas || item.hPhrase.toLowerCase().includes(namedFilters.cas.toLowerCase());
        return matchName && matchCas;
    });
  }, [namedFilters]);

  const clearSevesoFilters = () => setSevesoFilters({ cat: "", desc: "", h: "" });
  const clearNamedFilters = () => setNamedFilters({ name: "", cas: "" });
  const clearArieFilters = () => setArieFilters({ cat: "", desc: "", h: "" });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 shrink-0">
          <DialogHeader>
            <DialogTitle>Referentiegids: Beoordelingsmethode</DialogTitle>
            <DialogDescription>
              Uitleg over de drempelwaardecheck conform Seveso III en Arbo-wetgeving (ARIE). Volgorde: H, P, E, O.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs defaultValue="seveso-cats" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 shrink-0 mb-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="seveso-cats">Seveso Cats</TabsTrigger>
              <TabsTrigger value="seveso-named">Seveso Benoemd</TabsTrigger>
              <TabsTrigger value="arie">ARIE Cats</TabsTrigger>
              <TabsTrigger value="arie-named">ARIE Benoemd</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6 flex flex-col">
            <TabsContent value="seveso-cats" className="flex-1 min-h-0 flex flex-col mt-0 data-[state=active]:flex-1 data-[state=active]:flex">
              <div className="flex justify-end mb-2 shrink-0">
                  {(sevesoFilters.cat || sevesoFilters.desc || sevesoFilters.h) && (
                      <Button variant="ghost" size="sm" onClick={clearSevesoFilters} className="h-7 text-xs">
                          <X className="mr-2 h-3 w-3" /> Filters wissen
                      </Button>
                  )}
              </div>
              <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-muted/10">
                <ScrollArea className="h-full w-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow className="bg-muted/30">
                            <TableHead className="py-2">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase">Cat.</span>
                                    <Input placeholder="Filter..." value={sevesoFilters.cat} onChange={(e) => setSevesoFilters(prev => ({ ...prev, cat: e.target.value }))} className="h-7 text-xs" />
                                </div>
                            </TableHead>
                            <TableHead className="py-2">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase">Omschrijving</span>
                                    <Input placeholder="Filter..." value={sevesoFilters.desc} onChange={(e) => setSevesoFilters(prev => ({ ...prev, desc: e.target.value }))} className="h-7 text-xs" />
                                </div>
                            </TableHead>
                            <TableHead className="py-2">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase">H-Zinnen</span>
                                    <Input placeholder="Filter..." value={sevesoFilters.h} onChange={(e) => setSevesoFilters(prev => ({ ...prev, h: e.target.value }))} className="h-7 text-xs" />
                                </div>
                            </TableHead>
                            <TableHead className="text-right py-2 w-24"><span className="text-[10px] font-bold uppercase">Laag (t)</span></TableHead>
                            <TableHead className="text-right py-2 w-24"><span className="text-[10px] font-bold uppercase">Hoog (t)</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSevesoCats.map(({ categoryId, categoryName, hPhrase, low, high }) => (
                            <TableRow key={categoryId}>
                                <TableCell className="font-medium text-xs">{categoryId}</TableCell>
                                <TableCell className="text-xs">{categoryName}</TableCell>
                                <TableCell className="text-muted-foreground text-xs">{hPhrase}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{low.toLocaleString('nl-NL')}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{high.toLocaleString('nl-NL')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="seveso-named" className="flex-1 min-h-0 flex flex-col mt-0 data-[state=active]:flex-1 data-[state=active]:flex">
              <div className="flex justify-end mb-2 shrink-0">
                  {(namedFilters.name || namedFilters.cas) && (
                      <Button variant="ghost" size="sm" onClick={clearNamedFilters} className="h-7 text-xs">
                          <X className="mr-2 h-3 w-3" /> Filters wissen
                      </Button>
                  )}
              </div>
              <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-muted/10">
                <ScrollArea className="h-full w-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow className="bg-muted/30">
                            <TableHead className="py-2">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase">Stofnaam</span>
                                    <Input placeholder="Filter..." value={namedFilters.name} onChange={(e) => setNamedFilters(prev => ({ ...prev, name: e.target.value }))} className="h-7 text-xs" />
                                </div>
                            </TableHead>
                            <TableHead className="py-2">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase">CAS</span>
                                    <Input placeholder="Filter..." value={namedFilters.cas} onChange={(e) => setNamedFilters(prev => ({ ...prev, cas: e.target.value }))} className="h-7 text-xs" />
                                </div>
                            </TableHead>
                            <TableHead className="text-right py-2"><span className="text-[10px] font-bold uppercase">Laag (t)</span></TableHead>
                            <TableHead className="text-right py-2"><span className="text-[10px] font-bold uppercase">Hoog (t)</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSevesoNamed.map((sub, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="font-medium text-xs">{sub.categoryId}</TableCell>
                                <TableCell className="text-muted-foreground text-xs">{sub.hPhrase.replace('CAS: ', '')}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{sub.low.toLocaleString('nl-NL')}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{sub.high.toLocaleString('nl-NL')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="arie" className="flex-1 min-h-0 flex flex-col mt-0 data-[state=active]:flex-1 data-[state=active]:flex">
              <div className="flex justify-end mb-2 shrink-0">
                  {(arieFilters.cat || arieFilters.desc || arieFilters.h) && (
                      <Button variant="ghost" size="sm" onClick={clearArieFilters} className="h-7 text-xs">
                          <X className="mr-2 h-3 w-3" /> Filters wissen
                      </Button>
                  )}
              </div>
              <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-muted/10">
                <ScrollArea className="h-full w-full">
                  <Table>
                      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                          <TableRow className="bg-muted/30">
                              <TableHead className="py-2">
                                  <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase">Cat.</span>
                                      <Input placeholder="Filter..." value={arieFilters.cat} onChange={(e) => setArieFilters(prev => ({ ...prev, cat: e.target.value }))} className="h-7 text-xs" />
                                  </div>
                              </TableHead>
                              <TableHead className="py-2">
                                  <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase">Omschrijving</span>
                                      <Input placeholder="Filter..." value={arieFilters.desc} onChange={(e) => setArieFilters(prev => ({ ...prev, desc: e.target.value }))} className="h-7 text-xs" />
                                  </div>
                              </TableHead>
                              <TableHead className="py-2">
                                  <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase">H-Zinnen</span>
                                      <Input placeholder="Filter..." value={arieFilters.h} onChange={(e) => setArieFilters(prev => ({ ...prev, h: e.target.value }))} className="h-7 text-xs" />
                                  </div>
                              </TableHead>
                              <TableHead className="text-right py-2"><span className="text-[10px] font-bold uppercase">Drempel (t)</span></TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredArieCats.map(({ categoryId, categoryName, hPhrase, threshold }) => (
                              <TableRow key={categoryId}>
                                  <TableCell className="font-medium text-xs">{categoryId}</TableCell>
                                  <TableCell className="text-xs">{categoryName}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{hPhrase}</TableCell>
                                  <TableCell className="text-right font-mono text-xs">{threshold.toLocaleString('nl-NL')}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="arie-named" className="flex-1 min-h-0 flex flex-col mt-0 data-[state=active]:flex-1 data-[state=active]:flex">
              <div className="flex justify-end mb-2 shrink-0">
                  {(namedFilters.name || namedFilters.cas) && (
                      <Button variant="ghost" size="sm" onClick={clearNamedFilters} className="h-7 text-xs">
                          <X className="mr-2 h-3 w-3" /> Filters wissen
                      </Button>
                  )}
              </div>
              <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-muted/10">
                <ScrollArea className="h-full w-full">
                  <Table>
                      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                          <TableRow className="bg-muted/30">
                              <TableHead className="py-2">
                                  <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase">Naam</span>
                                      <Input placeholder="Filter..." value={namedFilters.name} onChange={(e) => setNamedFilters(prev => ({ ...prev, name: e.target.value }))} className="h-7 text-xs" />
                                  </div>
                              </TableHead>
                              <TableHead className="py-2">
                                  <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase">CAS</span>
                                      <Input placeholder="Filter..." value={namedFilters.cas} onChange={(e) => setNamedFilters(prev => ({ ...prev, cas: e.target.value }))} className="h-7 text-xs" />
                                  </div>
                              </TableHead>
                              <TableHead className="text-right py-2"><span className="text-[10px] font-bold uppercase">Drempel (t)</span></TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredArieNamed.map((sub, idx) => (
                              <TableRow key={idx}>
                                  <TableCell className="font-medium text-xs">{sub.categoryId}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{sub.hPhrase.replace('CAS: ', '')}</TableCell>
                                  <TableCell className="text-right font-mono font-bold text-xs">{sub.threshold.toLocaleString('nl-NL')}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
