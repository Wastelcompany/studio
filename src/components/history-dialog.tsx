
"use client";

import { useMemo } from 'react';
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
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Substance, QuantityLog } from '@/lib/types';
import { Loader2, History } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface HistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  substance: Substance | null;
  companyId: string | null;
}

export default function HistoryDialog({ isOpen, onOpenChange, substance, companyId }: HistoryDialogProps) {
  const db = useFirestore();

  const historyQuery = useMemoFirebase(() => {
    if (!isOpen || !substance || !companyId || !db) return null;
    return query(
      collection(db, 'companies', companyId, 'inventory', substance.id, 'history'),
      orderBy('date', 'desc')
    );
  }, [isOpen, substance, companyId, db]);

  const { data: logs, isLoading } = useCollection<QuantityLog>(historyQuery);

  if (!isOpen || !substance) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Voorraadverloop: {substance.productName}
            </DialogTitle>
            <DialogDescription>
              Historisch overzicht van de geregistreerde hoeveelheden.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6 flex flex-col">
          <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-muted/10">
            {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <ScrollArea className="h-full w-full">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Voorraad (ton)</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {logs && logs.length > 0 ? (
                        logs.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="font-medium">
                                {format(new Date(log.date), 'dd MMMM yyyy', { locale: nl })}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                                {log.quantity.toFixed(2)}
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                            Geen historie gevonden voor deze stof.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
