"use client";

import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, FileSpreadsheet, Upload, Search, X, Filter } from "lucide-react";
import type { Substance, ThresholdMode, NamedSubstance } from "@/lib/types";
import { ALL_CATEGORIES, NAMED_SUBSTANCES, SEVESO_THRESHOLDS, ARIE_THRESHOLDS } from "@/lib/seveso";
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

interface InventoryTableProps {
  inventory: Substance[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onDelete: (id: string) => void;
  thresholdMode: ThresholdMode;
  onUpload: () => void;
  onShowExplanation: (substanceId: string, categoryId: string, type: 'seveso' | 'arie') => void;
}

function Contributions({ substance, mode }: { substance: Substance, mode: ThresholdMode }) {
  const contributions = useMemo(() => {
    if (substance.quantity <= 0) return [];
    
    const results: {
        key: string;
        percentage: number;
        progressValue: number;
        categoryName: string;
        categoryId: string;
        displayCategoryId: string;
        isExceeded: boolean;
        type: 'Seveso' | 'ARIE';
        threshold: number;
    }[] = [];

    const addedContributions = new Set<string>();

    // Seveso contributions
    substance.sevesoCategoryIds.forEach(catId => {
      const key = `${catId}-Seveso`;
      if(addedContributions.has(key)) return;

      const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
      const thresholdInfo = SEVESO_THRESHOLDS[catId] || (category as any)?.threshold;
      if (category && thresholdInfo) {
          const threshold = thresholdInfo[mode];
          if (threshold > 0) {
              const percentage = Math.round((substance.quantity / threshold) * 100);
              results.push({
                  key: `${substance.id}-${catId}-seveso`,
                  percentage,
                  progressValue: Math.min(percentage, 100),
                  categoryName: category.name,
                  categoryId: catId,
                  displayCategoryId: category.displayId || catId,
                  isExceeded: percentage >= 100,
                  type: 'Seveso',
                  threshold: threshold,
              });
              addedContributions.add(key);
          }
      }
    });

    // ARIE contributions
    substance.arieCategoryIds.forEach(catId => {
      const key = `${catId}-ARIE`;
      if(addedContributions.has(key)) return;

      const category = ALL_CATEGORIES[catId];
      const threshold = ARIE_THRESHOLDS[catId];
      if (category && threshold) {
          if (threshold > 0) {
              const percentage = Math.round((substance.quantity / threshold) * 100);
              results.push({
                  key: `${substance.id}-${catId}-arie`,
                  percentage,
                  progressValue: Math.min(percentage, 100),
                  categoryName: category.name,
                  categoryId: catId,
                  displayCategoryId: category.displayId || catId,
                  isExceeded: percentage >= 100,
                  type: 'ARIE',
                  threshold: threshold,
              });
              addedContributions.add(key);
          }
      }
    });

    return results.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'Seveso' ? -1 : 1;
      }
      return a.displayCategoryId.localeCompare(b.displayCategoryId);
    });

  }, [substance, mode]);

  if (contributions.length === 0) {
    return <div className="text-xs text-muted-foreground">-</div>;
  }

  return (
    <div className="space-y-2 py-1">
      {contributions.map(contrib => (
        <TooltipProvider key={contrib.key}>
          <Tooltip>
            <TooltipTrigger className="w-full text-left">
              <div className="w-full">
                 <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium text-muted-foreground">{contrib.displayCategoryId} ({contrib.type})</span>
                    <span className={`text-xs font-semibold ${contrib.isExceeded ? 'text-destructive' : 'text-foreground'}`}>{contrib.percentage}%</span>
                 </div>
                <Progress 
                  value={contrib.progressValue} 
                  className="h-2" 
                  indicatorClassName={cn(
                    contrib.isExceeded ? 'bg-destructive' : (contrib.type === 'ARIE' ? 'bg-foreground' : 'bg-primary')
                  )} 
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{contrib.categoryName}</p>
              <p className="text-xs text-muted-foreground">Drempel ({contrib.type === 'Seveso' ? mode : 'ARIE'}): {contrib.threshold.toLocaleString('nl-NL')} ton</p>
              <p className="text-xs text-muted-foreground">Voorraad: {substance.quantity.toLocaleString('nl-NL')} ton</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}


export default function InventoryTable({ inventory, onUpdateQuantity, onDelete, thresholdMode, onUpload, onShowExplanation }: InventoryTableProps) {
  const [editingValue, setEditingValue] = useState<{id: string, value: string} | null>(null);
  
  // Per-column filters
  const [filters, setFilters] = useState({
    name: "",
    seveso: "",
    arie: "",
  });

  const filteredInventory = useMemo(() => {
    return inventory.filter(sub => {
      const matchName = !filters.name || 
        sub.productName.toLowerCase().includes(filters.name.toLowerCase()) ||
        (sub.casNumber || "").toLowerCase().includes(filters.name.toLowerCase());
      
      const matchSeveso = !filters.seveso || 
        sub.sevesoCategoryIds.some(id => id.toLowerCase().includes(filters.seveso.toLowerCase()));
        
      const matchArie = !filters.arie || 
        sub.arieCategoryIds.some(id => id.toLowerCase().includes(filters.arie.toLowerCase()));

      return matchName && matchSeveso && matchArie;
    });
  }, [inventory, filters]);

  const clearFilters = () => {
    setFilters({ name: "", seveso: "", arie: "" });
  };

  const hasFilters = filters.name || filters.seveso || filters.arie;

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed rounded-lg">
        <FileSpreadsheet className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">Inventaris is leeg</h3>
        <p className="text-muted-foreground mt-2 mb-6">Begin met het uploaden van een Veiligheidsinformatieblad (SDS) om stoffen toe te voegen.</p>
        <Button onClick={onUpload}><Upload className="mr-2 h-4 w-4" /> Upload SDS</Button>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">Inventarisatie</CardTitle>
            {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                    <X className="mr-2 h-3 w-3" /> Filters wissen
                </Button>
            )}
        </div>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[25%] py-3">
                <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Productnaam / CAS</span>
                    <Input 
                        placeholder="Filter naam/CAS..." 
                        value={filters.name} 
                        onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                        className="h-7 text-xs bg-background"
                    />
                </div>
            </TableHead>
            <TableHead className="w-[15%] py-3">
                <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Seveso</span>
                    <Input 
                        placeholder="Filter cat..." 
                        value={filters.seveso} 
                        onChange={(e) => setFilters(prev => ({ ...prev, seveso: e.target.value }))}
                        className="h-7 text-xs bg-background"
                    />
                </div>
            </TableHead>
            <TableHead className="w-[15%] py-3">
                <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider">ARIE</span>
                    <Input 
                        placeholder="Filter cat..." 
                        value={filters.arie} 
                        onChange={(e) => setFilters(prev => ({ ...prev, arie: e.target.value }))}
                        className="h-7 text-xs bg-background"
                    />
                </div>
            </TableHead>
            <TableHead className="text-right w-24 py-3">
                <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider block">Voorraad</span>
                    <div className="h-7" /> {/* Spacer to align with inputs */}
                </div>
            </TableHead>
            <TableHead className="w-[20%] py-3">
                <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Ratio</span>
                    <div className="h-7" />
                </div>
            </TableHead>
            <TableHead className="text-right py-3">
                <div className="h-7" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredInventory.length > 0 ? (
            filteredInventory.map((substance) => {
              const allSevesoCategories = [...new Set(substance.sevesoCategoryIds)].map(id => ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id)).filter(Boolean);
              const allArieCategories = [...new Set(substance.arieCategoryIds)].map(id => ALL_CATEGORIES[id]).filter(Boolean);
              
              return (
                <TableRow key={substance.id}>
                  <TableCell className="font-medium">
                    {substance.productName}
                    <div className="text-xs text-muted-foreground">{substance.casNumber || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {allSevesoCategories.map((cat) => {
                        const threshold = SEVESO_THRESHOLDS[cat.id] || (cat as NamedSubstance).threshold;
                        return (
                        <TooltipProvider key={cat.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                onClick={() => onShowExplanation(substance.id, cat.id, 'seveso')}
                                className="cursor-pointer"
                                variant="default"
                              >
                                {cat.displayId || cat.id}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold">{cat.name}</p>
                              {threshold && (
                                  <>
                                  <p className="text-xs text-muted-foreground">Lage drempel: {threshold.low.toLocaleString('nl-NL')} ton</p>
                                  <p className="text-xs text-muted-foreground">Hoge drempel: {threshold.high.toLocaleString('nl-NL')} ton</p>
                                  </>
                              )}
                              <p className="text-xs text-muted-foreground/80 mt-1">Klik voor onderbouwing</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )})}
                    </div>
                  </TableCell>
                  <TableCell>
                      <div className="flex flex-wrap gap-1">
                          {allArieCategories.map((cat) => {
                            const threshold = ARIE_THRESHOLDS[cat.id];
                            return (
                              <TooltipProvider key={cat.id}>
                                  <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Badge
                                        onClick={() => onShowExplanation(substance.id, cat.id, 'arie')}
                                        className="cursor-pointer"
                                        variant="secondary"
                                      >
                                      {cat.displayId || cat.id}
                                      </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p className="font-semibold">{cat.name}</p>
                                      {threshold && <p className="text-xs text-muted-foreground">Drempel: {threshold.toLocaleString('nl-NL')} ton</p>}
                                      <p className="text-xs text-muted-foreground/80 mt-1">Klik voor onderbouwing</p>
                                  </TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          )})}
                      </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={
                        editingValue && editingValue.id === substance.id
                          ? editingValue.value
                          : substance.quantity
                      }
                      onBlur={() => setEditingValue(null)}
                      onChange={(e) => {
                          setEditingValue({ id: substance.id, value: e.target.value });
                          
                          const value = e.target.value.replace(',', '.');
                          let quantity = parseFloat(value);
                          
                          if (isNaN(quantity)) {
                              onUpdateQuantity(substance.id, 0);
                          } else if (quantity < 0) {
                              onUpdateQuantity(substance.id, 0);
                          } else {
                              onUpdateQuantity(substance.id, quantity);
                          }
                      }}
                      className="w-24 h-9 ml-auto text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Contributions substance={substance} mode={thresholdMode} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onDelete(substance.id)} aria-label={`Verwijder ${substance.productName}`}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Geen resultaten gevonden voor de opgegeven filters.
                </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
