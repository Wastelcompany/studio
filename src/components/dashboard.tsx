"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSevesoCalculator } from "@/hooks/use-seveso-calculator";
import type { Substance, SummationGroup as SummationGroupType, ThresholdMode } from "@/lib/types";
import { AlertCircle, CheckCircle2, ShieldAlert, Briefcase } from "lucide-react";
import GroupDetailsDialog from "./group-details-dialog";
import { cn } from "@/lib/utils";

interface DashboardProps {
  inventory: Substance[];
  thresholdMode: ThresholdMode;
  setThresholdMode: (mode: ThresholdMode) => void;
}

export default function Dashboard({ inventory, thresholdMode, setThresholdMode }: DashboardProps) {
  const { summationGroups, arieSummationGroups, overallStatus, criticalGroup, arieTotal, arieExceeded } = useSevesoCalculator(inventory, thresholdMode);
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
  
  const ariePercentage = Math.round(arieTotal * 100);

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
          <p className="text-xs text-muted-foreground">Schakel tussen lage en hoge Seveso drempels.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seveso Sommatie</CardTitle>
          <CardDescription>
            Ratio per Seveso gevarengroep. Klik op een groep voor details.
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
                <Progress value={Math.min(percentage, 100)} className="h-2" indicatorClassName={group.isExceeded ? 'bg-destructive' : 'bg-green-600'} />
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
                    Meest kritieke Seveso groep: <span className="font-semibold text-foreground">{criticalGroup}</span>
                </p>
            ) : (
                <p className="text-muted-foreground mt-1">
                    Geen Seveso drempelwaarden overschreden.
                </p>
            )}
        </CardContent>
      </Card>

      <Card className="bg-arie-bg">
        <CardHeader className="items-center">
          <CardTitle>ARIE Conclusie</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center">
            {arieExceeded ? (
                <ShieldAlert className="w-10 h-10 text-arie-fg" />
            ) : (
                <CheckCircle2 className="w-10 h-10 text-green-500" />
            )}
            <p className={cn("mt-2 text-2xl font-bold", arieExceeded ? 'text-arie-fg' : 'text-green-600 dark:text-green-400')}>
                {arieExceeded ? 'ARIE-plichtig' : 'Niet ARIE-plichtig'}
            </p>
             {arieExceeded ? (
                 <p className="text-muted-foreground mt-1">
                    De sommatiewaarde van {ariePercentage}% overschrijdt de drempel.
                </p>
            ) : (
                 <p className="text-muted-foreground mt-1">
                    De sommatiewaarde van {ariePercentage}% is onder de drempel.
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
