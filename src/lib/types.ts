export type ThresholdMode = 'low' | 'high';

export interface SevesoCategory {
  id: string;
  name: string;
  group: 'health' | 'physical' | 'environment' | 'other' | 'named';
  threshold: {
    low: number;
    high: number;
  };
}

export interface ArieCategory {
  id: string;
  name: string;
  group: 'arie';
  threshold: number;
}

export interface NamedSubstance extends SevesoCategory {
  cas: string;
}

export interface Substance {
  id: string;
  productName: string;
  casNumber: string | null;
  hStatements: string[];
  sevesoCategories: string[]; // Array of category IDs
  arieCategories: string[]; // Array of ARIE category IDs
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
