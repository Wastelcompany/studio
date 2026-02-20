"use client";

import { useMemo } from 'react';
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
import { Card } from "@/components/ui/card";
import { Trash2, FileSpreadsheet, Upload } from "lucide-react";
import type { Substance, ThresholdMode, SevesoCategory, NamedSubstance } from "@/lib/types";
import { SEVESO_CATEGORIES, NAMED_SUBSTANCES, SUMMATION_GROUPS_CONFIG, ARIE_THRESHOLDS } from "@/lib/seveso";
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

interface InventoryTableProps {
  inventory: Substance[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onDelete: (id: string) => void;
  thresholdMode: ThresholdMode;
  onUpload: () => void;
  onShowExplanation: (substanceId: string, categoryId: string) => void;
}

const groupToColorMap: Record<string, string> = {
  ...SUMMATION_GROUPS_CONFIG.reduce((acc, group) => {
    acc[group.group] = `bg-${group.colorClass} text-${group.colorClass}-foreground`;
    return acc;
  }, {} as Record<string, string>),
};


function SubstanceContributions({ substance, mode }: { substance: Substance, mode: ThresholdMode }) {
  const contributions = useMemo(() => {
    if (substance.quantity <= 0) return [];
    
    const results: {
        key: string;
        percentage: number;
        progressValue: number;
        categoryName: string;
        categoryId: string;
        isExceeded: boolean;
        type: 'Seveso' | 'ARIE';
    }[] = [];

    const uniqueCategories = [...new Set(substance.sevesoCategories)];

    uniqueCategories.forEach(catId => {
        const category = SEVESO_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
        if (!category) return;

        // Seveso contribution
        const sevesoThreshold = category.threshold[mode];
        if (sevesoThreshold > 0) {
            const percentage = Math.round((substance.quantity / sevesoThreshold) * 100);
            results.push({
                key: `${substance.id}-${catId}-seveso`,
                percentage,
                progressValue: Math.min(percentage, 100),
                categoryName: category.name,
                categoryId: catId,
                isExceeded: percentage >= 100,
                type: 'Seveso',
            });
        }

        // ARIE contribution
        const arieThreshold = ARIE_THRESHOLDS[catId];
        if (arieThreshold && arieThreshold > 0) {
            const percentage = Math.round((substance.quantity / arieThreshold) * 100);
            results.push({
                key: `${substance.id}-${catId}-arie`,
                percentage,
                progressValue: Math.min(percentage, 100),
                categoryName: category.name, // Same name
                categoryId: catId,
                isExceeded: percentage >= 100,
                type: 'ARIE',
            });
        }
    });

    return results.filter(item => item.percentage > 0).sort((a, b) => {
        if (a.categoryId !== b.categoryId) {
            return a.categoryId.localeCompare(b.categoryId);
        }
        if (a.type === 'ARIE') return 1; // ARIE comes after Seveso for the same category
        return -1;
    });

  }, [substance.quantity, substance.sevesoCategories, mode, substance.id]);

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
                    <span className="text-xs font-medium text-muted-foreground">{contrib.categoryId} ({contrib.type})</span>
                    <span className={`text-xs font-semibold ${contrib.isExceeded ? 'text-destructive' : 'text-foreground'}`}>{contrib.percentage}%</span>
                 </div>
                <Progress 
                  value={contrib.progressValue} 
                  className="h-2" 
                  indicatorClassName={cn(
                    contrib.isExceeded ? 'bg-destructive' : (contrib.type === 'ARIE' ? 'bg-[hsl(var(--arie-fg))]' : 'bg-green-600')
                  )} 
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{contrib.categoryName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}


export default function InventoryTable({ inventory, onUpdateQuantity, onDelete, thresholdMode, onUpload, onShowExplanation }: InventoryTableProps) {
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
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[25%]">Productnaam</TableHead>
            <TableHead>Categorieën</TableHead>
            <TableHead className="text-right w-24">Voorraad (ton)</TableHead>
            <TableHead className="w-[25%]">Bijdrage per Categorie</TableHead>
            <TableHead className="text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.map((substance) => {
            const allSevesoCategories = (substance.sevesoCategories || []).map(id => SEVESO_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id)).filter(Boolean);
            
            return (
              <TableRow key={substance.id}>
                <TableCell className="font-medium">
                  {substance.productName}
                  <div className="text-xs text-muted-foreground">{substance.casNumber || 'N/A'}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {allSevesoCategories.map((cat) => (
                      <TooltipProvider key={cat.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              onClick={() => onShowExplanation(substance.id, cat.id)}
                              className={cn("border-transparent cursor-pointer", groupToColorMap[cat.group])}
                            >
                              {cat.id}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{cat.name}</p>
                            {ARIE_THRESHOLDS[cat.id] && <p className="text-xs text-[hsl(var(--arie-fg))]">Ook ARIE-relevant</p>}
                            <p className="text-xs text-muted-foreground">Klik voor onderbouwing</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={substance.quantity}
                    onChange={(e) => onUpdateQuantity(substance.id, parseFloat(e.target.value))}
                    className="w-24 h-9 ml-auto text-right"
                    min="0"
                  />
                </TableCell>
                <TableCell>
                  <SubstanceContributions substance={substance} mode={thresholdMode} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onDelete(substance.id)} aria-label={`Verwijder ${substance.productName}`}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
