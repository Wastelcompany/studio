"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSevesoCalculator } from "@/hooks/use-seveso-calculator";
import type { Substance, SummationGroup as SummationGroupType, ThresholdMode } from "@/lib/types";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
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
        return <ShieldAlert className="w-6 h-6 text-destructive" />;
      case 'Lagedrempel':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      default:
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
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
    <div className="space-y-4">
      
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div>
            <CardTitle>Seveso Sommatie</CardTitle>
            <CardDescription className="mt-1 text-xs">
              Ratio per groep. Klik voor details.
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 shrink-0 ml-4">
            <Label htmlFor="threshold-mode" className={cn("text-sm", thresholdMode === 'low' ? 'text-primary font-semibold' : 'text-muted-foreground')}>
              Lage
            </Label>
            <Switch
              id="threshold-mode"
              checked={thresholdMode === 'high'}
              onCheckedChange={(checked) => setThresholdMode(checked ? 'high' : 'low')}
            />
            <Label htmlFor="threshold-mode" className={cn("text-sm", thresholdMode === 'high' ? 'text-primary font-semibold' : 'text-muted-foreground')}>
              Hoge
            </Label>
          </div>
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
        <CardContent className="flex items-center justify-center text-center p-3 gap-4">
            {getStatusIcon()}
            <div>
                <p className={`text-lg font-bold ${getStatusColor()}`}>{overallStatus === 'Geen' ? 'Geen Seveso-inrichting' : `${overallStatus}-inrichting`}</p>
                {overallStatus !== 'Geen' ? (
                    <p className="text-xs text-muted-foreground">
                        Meest kritieke Seveso groep: <span className="font-semibold text-foreground">{criticalGroup}</span>
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Geen Seveso drempelwaarden overschreden.
                    </p>
                )}
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ARIE Sommatie</CardTitle>
          <CardDescription>
            Bijdrage per gevarengroep aan de totale ARIE-som.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {arieSummationGroups.map((group) => {
            const percentage = Math.round(group.totalRatio * 100);
            return (
              <div key={group.group} className="p-2 -m-2 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <group.icon className="w-4 h-4 text-muted-foreground" />
                    <span>{group.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {percentage}%
                  </span>
                </div>
                <Progress value={Math.min(percentage, 100)} className="h-2" indicatorClassName="bg-[hsl(var(--arie-fg))]" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-arie-bg">
        <CardContent className="flex items-center justify-center text-center p-3 gap-4">
            {arieExceeded ? (
                <ShieldAlert className="w-6 h-6 text-arie-fg" />
            ) : (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
            )}
            <div>
                <p className={cn("text-lg font-bold", arieExceeded ? 'text-arie-fg' : 'text-green-600 dark:text-green-400')}>
                    {arieExceeded ? 'ARIE-plichtig' : 'Niet ARIE-plichtig'}
                </p>
                 {arieExceeded ? (
                     <p className="text-xs text-muted-foreground">
                        De sommatiewaarde van {ariePercentage}% overschrijdt de drempel.
                    </p>
                ) : (
                     <p className="text-xs text-muted-foreground">
                        De sommatiewaarde van {ariePercentage}% is onder de drempel.
                    </p>
                )}
            </div>
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
