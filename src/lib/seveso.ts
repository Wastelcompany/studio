import type { Substance, SevesoCategory, NamedSubstance, ThresholdMode, SummationGroup } from '@/lib/types';
import { FlaskConical, Flame, Leaf, AlertTriangle, Atom } from 'lucide-react';

export const SEVESO_CATEGORIES: Record<string, SevesoCategory> = {
  // Health Hazards
  H1: { id: 'H1', name: 'Acuut toxisch, categorie 1 (alle blootstellingsroutes)', group: 'health', threshold: { low: 5, high: 20 } },
  H2: { id: 'H2', name: 'Acuut toxisch, categorie 2 (alle blootstellingsroutes)', group: 'health', threshold: { low: 50, high: 200 } },
  H3: { id: 'H3', name: 'Acuut toxisch, categorie 3 (inademing)', group: 'health', threshold: { low: 200, high: 500 } },

  // Physical Hazards
  P1a: { id: 'P1a', name: 'Explosief, instabiel', group: 'physical', threshold: { low: 10, high: 50 } },
  P2: { id: 'P2', name: 'Ontvlambare gassen', group: 'physical', threshold: { low: 10, high: 50 } },
  P3a: { id: 'P3a', name: 'Ontvlambare aerosolen (ontvlambaar)', group: 'physical', threshold: { low: 150, high: 500 } },
  P3b: { id: 'P3b', name: 'Ontvlambare aerosolen (zeer/extreem ontvlambaar)', group: 'physical', threshold: { low: 5000, high: 50000 } },
  P4: { id: 'P4', name: 'Oxiderende gassen', group: 'physical', threshold: { low: 50, high: 200 } },
  P5a: { id: 'P5a', name: 'Ontvlambare vloeistoffen (cat. 1)', group: 'physical', threshold: { low: 10, high: 50 } },
  P5b: { id: 'P5b', name: 'Ontvlambare vloeistoffen (cat. 2/3, T>kookpunt)', group: 'physical', threshold: { low: 50, high: 200 } },
  P5c: { id: 'P5c', name: 'Ontvlambare vloeistoffen (cat. 2/3)', group: 'physical', threshold: { low: 5000, high: 50000 } },
  P6a: { id: 'P6a', name: 'Zelfontledende stoffen (Type A/B)', group: 'physical', threshold: { low: 10, high: 50 } },
  P6b: { id: 'P6b', name: 'Organische peroxiden (Type A/B)', group: 'physical', threshold: { low: 10, high: 50 } },
  P7: { id: 'P7', name: 'Pyrofore vloeistoffen en vaste stoffen', group: 'physical', threshold: { low: 50, high: 200 } },
  P8: { id: 'P8', name: 'Oxiderende vloeistoffen en vaste stoffen', group: 'physical', threshold: { low: 50, high: 200 } },
  
  // Environmental Hazards
  E1: { id: 'E1', name: 'Gevaarlijk voor het aquatisch milieu, categorie 1', group: 'environment', threshold: { low: 100, high: 200 } },
  E2: { id: 'E2', name: 'Gevaarlijk voor het aquatisch milieu, categorie 2', group: 'environment', threshold: { low: 200, high: 500 } },

  // Other Hazards
  O1: { id: 'O1', name: 'Stoffen die in contact met water ontvlambare gassen ontwikkelen', group: 'other', threshold: { low: 50, high: 200 } },
  O2: { id: 'O2', name: 'STOT SE categorie 1', group: 'health', threshold: { low: 50, high: 200 } }, // As per guideline, often grouped with Health.
  O3: { id: 'O3', name: 'Kankerverwekkend, mutageen, reprotoxisch (CMR)', group: 'other', threshold: { low: 10, high: 50 } },
};

export const NAMED_SUBSTANCES: Record<string, NamedSubstance> = {
  '75-07-0': { id: 'Acetaldehyde', cas: '75-07-0', name: 'Acetaldehyde', group: 'named', threshold: { low: 2500, high: 25000 } },
  '7664-41-7': { id: 'Ammoniak', cas: '7664-41-7', name: 'Ammoniak (anhydrous)', group: 'named', threshold: { low: 50, high: 200 } },
  '71-43-2': { id: 'Benzeen', cas: '71-43-2', name: 'Benzeen', group: 'named', threshold: { low: 1, high: 5 } },
  '7726-95-6': { id: 'Chloor', cas: '7726-95-6', name: 'Chloor', group: 'named', threshold: { low: 10, high: 25 } },
  '67-56-1': { id: 'Methanol', cas: '67-56-1', name: 'Methanol', group: 'named', threshold: { low: 500, high: 5000 } },
};


export const H_PHRASE_MAPPING: Record<string, string> = {
  // Health
  'H300': 'H1', 'H310': 'H1', 'H330': 'H1',
  'H301': 'H2', 'H311': 'H2', 'H331': 'H2',
  'H332': 'H3',
  'H370': 'O2',

  // Physical
  'EUH001': 'P1a',
  'H200': 'P1a', 'H201': 'P1a', 'H202': 'P1a', 'H203': 'P1a',
  'H220': 'P2', 'H221': 'P2',
  'H222': 'P3b', 'H223': 'P3a', // H222 is more severe than H223 for aerosols
  'H270': 'P4',
  'H224': 'P5a',
  'H225': 'P5c', // Assuming Cat 2
  'H226': 'P5c', // Assuming Cat 3
  'H241': 'P6b', 'H242': 'P6b',
  'H250': 'P7',
  'H271': 'P8', 'H272': 'P8',

  // Environmental
  'H400': 'E1',
  'H410': 'E1',
  'H411': 'E2',

  // Other
  'H260': 'O1', 'H261': 'O1',
  'H350': 'O3', 'H340': 'O3', 'H360': 'O3',
};

export const classifySubstance = (hStatements: string[], casNumber: string | null): { categories: string[], isNamed: boolean, namedSubstanceName: string | null } => {
  const categories = new Set<string>();
  
  hStatements.forEach(hStatement => {
    const code = hStatement.split(' ')[0].toUpperCase();
    if (H_PHRASE_MAPPING[code]) {
      categories.add(H_PHRASE_MAPPING[code]);
    }
  });

  let isNamed = false;
  let namedSubstanceName = null;
  if(casNumber && NAMED_SUBSTANCES[casNumber]) {
    const named = NAMED_SUBSTANCES[casNumber];
    categories.add(named.id);
    isNamed = true;
    namedSubstanceName = named.name;
  }
  
  return { categories: Array.from(categories), isNamed, namedSubstanceName };
};


export const SUMMATION_GROUPS_CONFIG = [
  { name: 'Gezondheidsgevaren', icon: FlaskConical, group: 'health' },
  { name: 'Fysische gevaren', icon: Flame, group: 'physical' },
  { name: 'Milieugevaren', icon: Leaf, group: 'environment' },
  { name: 'Overige gevaren', icon: AlertTriangle, group: 'other' },
  { name: 'Benoemde Stoffen', icon: Atom, group: 'named' },
] as const;


export const calculateSummations = (inventory: Substance[], mode: ThresholdMode): { summationGroups: SummationGroup[], overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel', criticalGroup: string | null } => {
  const groupTotals: Record<string, number> = {
    health: 0,
    physical: 0,
    environment: 0,
    other: 0,
    named: 0,
  };

  inventory.forEach(substance => {
    if (substance.quantity > 0) {
      substance.sevesoCategories.forEach(catId => {
        const category = SEVESO_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
        if (category) {
          const threshold = category.threshold[mode];
          // For named substances, the calculation is direct, not summative with others in the same group.
          // However, the Seveso rule is complex. For this app, we will apply the simple summation rule across all groups for demonstration.
          // A real-world app would need more nuanced logic here, especially for named substances vs. generic categories.
          if (threshold > 0) {
            groupTotals[category.group] += substance.quantity / threshold;
          }
        }
      });
    }
  });

  const summationGroups: SummationGroup[] = SUMMATION_GROUPS_CONFIG.map(config => ({
    ...config,
    totalRatio: groupTotals[config.group] || 0,
    isExceeded: (groupTotals[config.group] || 0) >= 1,
  }));

  const isHighThreshold = summationGroups.some(g => g.totalRatio >= 1 && mode === 'high');
  const isLowThreshold = summationGroups.some(g => g.totalRatio >= 1);

  let overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel' = 'Geen';
  if (isHighThreshold) {
      overallStatus = 'Hogedrempel';
  } else if (isLowThreshold) {
      overallStatus = 'Lagedrempel';
  }

  const mostCriticalGroup = summationGroups
    .filter(g => g.totalRatio > 0)
    .sort((a, b) => b.totalRatio - a.totalRatio)[0];

  return { 
    summationGroups, 
    overallStatus, 
    criticalGroup: mostCriticalGroup ? mostCriticalGroup.name : null 
  };
};

export const REFERENCE_GUIDE_DATA = Object.entries(H_PHRASE_MAPPING).map(([hPhrase, categoryId]) => ({
  hPhrase,
  categoryId,
  categoryName: SEVESO_CATEGORIES[categoryId]?.name || '',
}));
