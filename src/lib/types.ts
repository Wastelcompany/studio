
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

export interface Customer {
  id: string;
  name: string;
  address?: string;
  kvkNumber?: string;
  billingEmail?: string;
  createdAt?: Timestamp;
  customerNumber?: string; // 4-digit numeric code
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
  // NEW: A breakdown of which categories contributed to the totalRatio
  // Key is the category ID (e.g., 'P5a', 'H3'), value is the sum of ratios for that category
  categoryContributions: Record<string, number>;
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
