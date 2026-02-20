"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSevesoCalculator } from "@/hooks/use-seveso-calculator";
import type { Substance, ThresholdMode, SummationGroup as SummationGroupType } from "@/lib/types";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import GroupDetailsDialog from "./group-details-dialog";
import { SUMMATION_GROUPS_CONFIG } from "@/lib/seveso";

interface DashboardProps {
  inventory: Substance[];
  thresholdMode: ThresholdMode;
  setThresholdMode: (mode: ThresholdMode) => void;
}

const indicatorColorMap: Record<string, string> = SUMMATION_GROUPS_CONFIG.reduce((acc, group) => {
  acc[group.group] = `bg-${group.colorClass}`;
  return acc;
}, {} as Record<string, string>);

export default function Dashboard({ inventory, thresholdMode, setThresholdMode }: DashboardProps) {
  const { summationGroups, overallStatus, criticalGroup } = useSevesoCalculator(inventory, thresholdMode);
  const [selectedGroup, setSelectedGroup] = useState<SummationGroupType | null>(null);

  const getStatusIcon = () => {
    switch (overallStatus) {
      case 'Hogedrempel':
        return <ShieldAlert className="w-10 h-10 text-destructive" />;
      case 'Lagedrempel':
        return <AlertCircle className="w-10 h-10 text-yellow-500" />;
      default:
        return <CheckCircle2 className="w-10 h-10 text-green-500" />;
    }
  };

  const getStatusColor = () => {
    switch(overallStatus) {
      case 'Hogedrempel': return 'text-destructive';
      case 'Lagedrempel': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Drempelwaarde Modus</CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="threshold-mode" className={thresholdMode === 'low' ? 'text-primary font-semibold' : 'text-muted-foreground'}>
              Lage
            </Label>
            <Switch
              id="threshold-mode"
              checked={thresholdMode === 'high'}
              onCheckedChange={(checked) => setThresholdMode(checked ? 'high' : 'low')}
            />
            <Label htmlFor="threshold-mode" className={thresholdMode === 'high' ? 'text-primary font-semibold' : 'text-muted-foreground'}>
              Hoge
            </Label>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Schakel tussen lage en hoge drempels voor de berekening.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sommatie Overzicht</CardTitle>
          <CardDescription>
            Ratio per gevarengroep. Klik op een groep voor details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {summationGroups.map((group) => {
            const percentage = Math.round(group.totalRatio * 100);
            return (
              <div 
                key={group.group} 
                onClick={() => group.totalRatio > 0 && setSelectedGroup(group)} 
                className={group.totalRatio > 0 ? "cursor-pointer hover:bg-muted/50 p-2 -m-2 rounded-lg" : "p-2 -m-2"}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <group.icon className="w-4 h-4 text-muted-foreground" />
                    <span>{group.name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${group.isExceeded ? 'text-destructive' : 'text-foreground'}`}>
                    {percentage}%
                  </span>
                </div>
                <Progress value={Math.min(percentage, 100)} className="h-2" indicatorClassName={indicatorColorMap[group.group]} />
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      <Card className="bg-primary/5">
        <CardHeader className="items-center">
          <CardTitle>Seveso Conclusie</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center">
            {getStatusIcon()}
            <p className={`mt-2 text-2xl font-bold ${getStatusColor()}`}>{overallStatus}-inrichting</p>
            {overallStatus !== 'Geen' ? (
                <p className="text-muted-foreground mt-1">
                    Meest kritieke groep: <span className="font-semibold text-foreground">{criticalGroup}</span>
                </p>
            ) : (
                <p className="text-muted-foreground mt-1">
                    Geen drempelwaarden overschreden.
                </p>
            )}
        </CardContent>
      </Card>
      <GroupDetailsDialog
        isOpen={!!selectedGroup}
        onOpenChange={(open) => !open && setSelectedGroup(null)}
        group={selectedGroup}
        inventory={inventory}
        mode={thresholdMode}
      />
    </div>
  );
}
