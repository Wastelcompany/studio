
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Substance } from '@/lib/types';
import { FileText } from 'lucide-react';

interface SdsViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  substance: Substance | null;
}

export default function SdsViewerDialog({ isOpen, onOpenChange, substance }: SdsViewerDialogProps) {
  if (!isOpen || !substance || !substance.sdsUri) {
    return null;
  }

  const isPdf = substance.sdsUri.startsWith('data:application/pdf');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                SDS Document: {substance.productName}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
          <div className="w-full h-full border rounded-md overflow-hidden bg-muted/20">
            {isPdf ? (
              <iframe
                src={substance.sdsUri}
                className="w-full h-full border-none"
                title={`SDS ${substance.productName}`}
              />
            ) : (
              <div className="w-full h-full overflow-auto flex items-center justify-center">
                <img
                  src={substance.sdsUri}
                  alt={`SDS ${substance.productName}`}
                  className="max-w-full h-auto shadow-md"
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
