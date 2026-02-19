"use client";

import { useMemo } from 'react';
import type { Substance, ThresholdMode } from '@/lib/types';
import { calculateSummations } from '@/lib/seveso';

export function useSevesoCalculator(inventory: Substance[], mode: ThresholdMode) {
  const calculationResults = useMemo(() => {
    return calculateSummations(inventory, mode);
  }, [inventory, mode]);

  return calculationResults;
}
