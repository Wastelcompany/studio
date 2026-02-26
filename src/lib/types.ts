import type { Timestamp } from 'firebase/firestore';

export type ThresholdMode = 'low' | 'high';

export interface HazardCategory {
  id: string;
  name: string;
  group: 'health' | 'physical' | 'environment' | 'other' | 'named';
  displayId?: string;
}

export interface NamedSubstance extends HazardCategory {
  cas: string;
  threshold: {
    low: number;
    high: number;
  };
  arieThreshold?: number;
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  address: string;
  customerId: string;
}

export interface Substance {
  id: string;
  productName: string;
  casNumber: string | null;
  hStatements: string[];
  sevesoCategoryIds: string[];
  arieCategoryIds: string[];
  isNamedSubstance: boolean;
  namedSubstanceName: string | null;
  quantity: number; // in tons
}

export interface SummationGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'health' | 'physical' | 'environment' | 'other' | 'named';
  totalRatio: number;
  isExceeded: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  createdAt: Timestamp;
  displayName?: string;
  customerId: string;
  customerName: string;
  disabled: boolean;
}
