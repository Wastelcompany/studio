'use client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from './ui/scroll-area';
import { useSupabase } from '@/supabase/provider';
import type { Substance } from '@/lib/types';
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
  const { supabase } = useSupabase();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !substance || !companyId) return;
    setIsLoading(true);
    supabase
      .from('inventory_history')
      .select('*')
      .eq('inventory_id', substance.id)
      .eq('company_id', companyId)
      .order('date', { ascending: false })
      .then(({ data }) => { setLogs(data ?? []); setIsLoading(false); });
  }, [isOpen, substance, companyId, supabase]);

  if (!isOpen || !substance) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" />Geschiedenis</DialogTitle>
          <DialogDescription>{substance.productName}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Geen geschiedenis beschikbaar.</p>
        ) : (
          <ScrollArea className="h-72">
            <Table>
              <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead className="text-right">Hoeveelheid (kg)</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.date), 'd MMMM yyyy', { locale: nl })}</TableCell>
                    <TableCell className="text-right font-mono">{Number(log.quantity).toLocaleString('nl-NL')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
