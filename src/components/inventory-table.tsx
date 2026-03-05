
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
import { Trash2, FileSpreadsheet, Upload, History, FileText } from "lucide-react";
import type { Substance, ThresholdMode } from "@/lib/types";
import { ALL_CATEGORIES, NAMED_SUBSTANCES, SEVESO_THRESHOLDS, getArieThreshold } from "@/lib/seveso";
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
  onShowHistory: (substanceId: string) => void;
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
              });
              addedContributions.add(key);
          }
      }
    });

    // ARIE contributions
    substance.arieCategoryIds.forEach(catId => {
      const key = `${catId}-ARIE`;
      if(addedContributions.has(key)) return;

      const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
      const threshold = getArieThreshold(catId);
      if (category && threshold && threshold > 0) {
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
          });
          addedContributions.add(key);
      }
    });

    return results.sort((a, b) => a.type.localeCompare(b.type));
  }, [substance, mode]);

  if (contributions.length === 0) return <div className="text-xs text-muted-foreground">-</div>;

  return (
    <div className="space-y-2 py-1">
      {contributions.map(contrib => (
        <TooltipProvider key={contrib.key}>
          <Tooltip>
            <TooltipTrigger className="w-full text-left">
              <div className="w-full">
                 <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium text-muted-foreground">{contrib.displayCategoryId} ({contrib.type})</span>
                    <span className={cn("text-xs font-semibold", contrib.isExceeded ? 'text-destructive' : 'text-foreground')}>{contrib.percentage}%</span>
                 </div>
                <Progress value={contrib.progressValue} className="h-2" indicatorClassName={cn(contrib.isExceeded ? 'bg-destructive' : (contrib.type === 'ARIE' ? 'bg-foreground' : 'bg-primary'))} />
              </div>
            </TooltipTrigger>
            <TooltipContent><p className="font-semibold">{contrib.categoryName}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

export default function InventoryTable({ inventory, onUpdateQuantity, onDelete, thresholdMode, onUpload, onShowExplanation, onShowHistory }: InventoryTableProps) {
  
  const handleViewSds = (sdsUri?: string) => {
    if (!sdsUri) return;
    const win = window.open();
    if (win) {
        win.document.write(`<iframe src="${sdsUri}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    }
  };

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed rounded-lg">
        <FileSpreadsheet className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">Inventaris is leeg</h3>
        <p className="text-muted-foreground mt-2 mb-6">Begin met het uploaden van een SDS om stoffen toe te voegen.</p>
        <Button onClick={onUpload}><Upload className="mr-2 h-4 w-4" /> Upload SDS</Button>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Productnaam</TableHead>
            <TableHead>Seveso Cat.</TableHead>
            <TableHead>ARIE Cat.</TableHead>
            <TableHead className="text-right">Voorraad (ton)</TableHead>
            <TableHead>Bijdrage (%)</TableHead>
            <TableHead className="text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.map((substance) => {
            const allSeveso = [...new Set(substance.sevesoCategoryIds || [])]
              .map(id => ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))
              .filter(Boolean);
            const allArie = [...new Set(substance.arieCategoryIds || [])]
              .map(id => ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))
              .filter(Boolean);
              
            return (
              <TableRow key={substance.id}>
                <TableCell className="font-medium">{substance.productName}<div className="text-xs text-muted-foreground">{substance.casNumber || 'N/A'}</div></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {allSeveso.map(cat => (
                      <Badge key={cat!.id} onClick={() => onShowExplanation(substance.id, cat!.id, 'seveso')} className="cursor-pointer">
                        {cat!.displayId || cat!.id}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {allArie.map(cat => (
                      <Badge key={cat!.id} onClick={() => onShowExplanation(substance.id, cat!.id, 'arie')} variant="secondary" className="cursor-pointer">
                        {cat!.displayId || cat!.id}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell><Input type="number" value={substance.quantity} onChange={(e) => onUpdateQuantity(substance.id, parseFloat(e.target.value))} className="w-24 h-9 ml-auto text-right" min="0" /></TableCell>
                <TableCell><Contributions substance={substance} mode={thresholdMode} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {substance.sdsUri && (
                        <Button variant="ghost" size="icon" onClick={() => handleViewSds(substance.sdsUri)} title="Bekijk SDS Document"><FileText className="h-4 w-4 text-primary" /></Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onShowHistory(substance.id)} title="Historie bekijken"><History className="h-4 w-4 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(substance.id)} title="Stof verwijderen"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
