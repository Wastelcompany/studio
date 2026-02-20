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
import { Card } from "@/components/ui/card";
import { Trash2, FileSpreadsheet, Upload } from "lucide-react";
import type { Substance, ThresholdMode } from "@/lib/types";
import { SEVESO_CATEGORIES, NAMED_SUBSTANCES, SUMMATION_GROUPS_CONFIG } from "@/lib/seveso";
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import CategoryJustificationDialog from './category-justification-dialog';

interface InventoryTableProps {
  inventory: Substance[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onDelete: (id: string) => void;
  thresholdMode: ThresholdMode;
  onUpload: () => void;
}

const groupToColorMap: Record<string, string> = SUMMATION_GROUPS_CONFIG.reduce((acc, group) => {
  acc[group.group] = `bg-${group.colorClass} text-${group.colorClass}-foreground`;
  return acc;
}, {} as Record<string, string>);

const groupToIndicatorColorMap: Record<string, string> = SUMMATION_GROUPS_CONFIG.reduce((acc, group) => {
    acc[group.group] = `bg-${group.colorClass}`;
    return acc;
}, {} as Record<string, string>);

function ContributionCard({ substance, mode }: { substance: Substance, mode: ThresholdMode }) {
  const maxContribution = useMemo(() => {
    let max = { ratio: 0, categoryName: '', group: '' };
    if (substance.quantity > 0) {
      substance.sevesoCategories.forEach(catId => {
        const category = SEVESO_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
        if (category) {
          const threshold = category.threshold[mode];
          if (threshold > 0) {
            const ratio = (substance.quantity / threshold);
            if (ratio > max.ratio) {
              max = { ratio, categoryName: category.name, group: category.group };
            }
          }
        }
      });
    }
    return max;
  }, [substance.quantity, substance.sevesoCategories, mode]);
  
  if (maxContribution.ratio === 0) {
    return <div className="text-xs text-muted-foreground">-</div>;
  }
  
  const percentage = Math.round(maxContribution.ratio * 100);
  const progressValue = Math.min(percentage, 100);
  const indicatorColorClass = groupToIndicatorColorMap[maxContribution.group] || 'bg-primary';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full">
            <Progress value={progressValue} className="h-2" indicatorClassName={indicatorColorClass} />
            <div className="text-xs text-muted-foreground mt-1 text-right">{percentage}%</div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{percentage}% van drempelwaarde voor</p>
          <p className="font-semibold">{maxContribution.categoryName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


export default function InventoryTable({ inventory, onUpdateQuantity, onDelete, thresholdMode, onUpload }: InventoryTableProps) {
  const [isJustificationOpen, setIsJustificationOpen] = useState(false);
  const [selectedDataForJustification, setSelectedDataForJustification] = useState<{substance: Substance, category: {id: string, name: string, group: string}} | null>(null);

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
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[25%]">Productnaam</TableHead>
              <TableHead>Seveso Categorieën</TableHead>
              <TableHead className="text-right">Voorraad (ton)</TableHead>
              <TableHead className="w-[15%] text-center">Belangrijkste Bijdrage</TableHead>
              <TableHead className="text-right no-print">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((substance) => {
              const allCategories = substance.sevesoCategories.map(id => SEVESO_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id)).filter(Boolean);
              
              return (
                <TableRow key={substance.id}>
                  <TableCell className="font-medium">
                    {substance.productName}
                    <div className="text-xs text-muted-foreground">{substance.casNumber || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {allCategories.map((cat) => (
                        <TooltipProvider key={cat.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                className={cn("border-transparent cursor-pointer", groupToColorMap[cat.group])}
                                onClick={() => {
                                  setSelectedDataForJustification({substance, category: cat});
                                  setIsJustificationOpen(true);
                                }}
                              >
                                {cat.id}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{cat.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={substance.quantity}
                      onChange={(e) => onUpdateQuantity(substance.id, parseFloat(e.target.value))}
                      className="w-24 h-9 ml-auto text-right"
                      min="0"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <ContributionCard substance={substance} mode={thresholdMode} />
                  </TableCell>
                  <TableCell className="text-right no-print">
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
      <CategoryJustificationDialog
        isOpen={isJustificationOpen}
        onOpenChange={setIsJustificationOpen}
        substance={selectedDataForJustification?.substance || null}
        category={selectedDataForJustification?.category || null}
      />
    </>
  );
}
