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
  const { summationGroups, arieSummationGroups, overallStatus, criticalGroup, arieTotal, arieExceeded, criticalArieGroup } = useSevesoCalculator(inventory, thresholdMode);
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<{ group: SummationGroupType, type: 'seveso' | 'arie' } | null>(null);

  const getStatusIcon = () => {
    switch (overallStatus) {
      case 'Hogedrempel':
        return <ShieldAlert className="w-5 h-5 text-destructive" />;
      case 'Lagedrempel':
        return <AlertCircle className="w-5 h-5 text-primary" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-foreground/80" />;
    }
  };

  const getStatusColor = () => {
    switch(overallStatus) {
      case 'Hogedrempel': return 'text-destructive';
      case 'Lagedrempel': return 'text-primary';
      default: return 'text-foreground/80';
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
            <Label htmlFor="threshold-mode" className={cn("text-sm", thresholdMode === 'low' ? 'font-semibold text-primary' : 'text-muted-foreground')}>
              Lage
            </Label>
            <Switch
              id="threshold-mode"
              checked={thresholdMode === 'high'}
              onCheckedChange={(checked) => setThresholdMode(checked ? 'high' : 'low')}
            />
            <Label htmlFor="threshold-mode" className={cn("text-sm", thresholdMode === 'high' ? 'font-semibold text-primary' : 'text-muted-foreground')}>
              Hoge
            </Label>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {summationGroups.map((group) => {
            const percentage = Math.round(group.totalRatio * 100);
            return (
              <div 
                key={group.group} 
                onClick={() => group.totalRatio > 0 && setSelectedGroupInfo({ group, type: 'seveso' })} 
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
                <Progress value={Math.min(percentage, 100)} className="h-2" indicatorClassName={group.isExceeded ? 'bg-destructive' : 'bg-primary'} />
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="flex items-center justify-center text-center p-3 gap-3">
            {getStatusIcon()}
            <div>
                <p className={`text-base font-bold ${getStatusColor()}`}>{overallStatus === 'Geen' ? 'Geen Seveso-inrichting' : `${overallStatus}-inrichting`}</p>
                {overallStatus !== 'Geen' ? (
                    <p className="text-xs text-muted-foreground">
                        Kritieke groep: <span className="font-semibold text-foreground">{criticalGroup}</span>
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Geen drempelwaarden overschreden.
                    </p>
                )}
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ARIE Sommatie</CardTitle>
          <CardDescription>
            Ratio per gevarengroep. Klik voor details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {arieSummationGroups.map((group) => {
            const percentage = Math.round(group.totalRatio * 100);
            return (
              <div 
                key={group.group}
                onClick={() => group.totalRatio > 0 && setSelectedGroupInfo({ group, type: 'arie' })}
                className={group.totalRatio > 0 ? "cursor-pointer hover:bg-muted/50 p-2 -m-2 rounded-lg" : "p-2 -m-2"}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <group.icon className="w-4 h-4 text-muted-foreground" />
                    <span>{group.name}</span>
                  </div>
                  <span className={cn("text-sm font-semibold", group.isExceeded ? 'text-destructive' : 'text-foreground')}>
                    {percentage}%
                  </span>
                </div>
                <Progress value={Math.min(percentage, 100)} className="h-2" indicatorClassName={group.isExceeded ? 'bg-destructive' : 'bg-foreground'} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-center text-center p-3 gap-3">
            {arieExceeded ? (
                <ShieldAlert className="w-5 h-5 text-destructive" />
            ) : (
                <CheckCircle2 className="w-5 h-5 text-foreground/80" />
            )}
            <div>
                <p className={cn("text-base font-bold", arieExceeded ? 'text-destructive' : 'text-foreground/80')}>
                    {arieExceeded ? 'ARIE-plichtig' : 'Niet ARIE-plichtig'}
                </p>
                {arieExceeded ? (
                    <p className="text-xs text-muted-foreground">
                        Kritieke groep: <span className="font-semibold text-foreground">{criticalArieGroup}</span>
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Hoogste sommatiewaarde: {ariePercentage}%
                    </p>
                )}
            </div>
        </CardContent>
      </Card>

      <GroupDetailsDialog
        isOpen={!!selectedGroupInfo}
        onOpenChange={(open) => !open && setSelectedGroupInfo(null)}
        group={selectedGroupInfo?.group ?? null}
        inventory={inventory}
        mode={thresholdMode}
        type={selectedGroupInfo?.type ?? 'seveso'}
      />
    </div>
  );
}
