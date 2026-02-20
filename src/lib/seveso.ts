import type { Substance, SevesoCategory, NamedSubstance, ThresholdMode, SummationGroup } from '@/lib/types';
import { FlaskConical, Flame, Leaf, AlertTriangle, Atom, Briefcase } from 'lucide-react';

export const SEVESO_CATEGORIES: Record<string, SevesoCategory> = {
  // Health Hazards
  H1: { id: 'H1', name: 'Acuut toxisch, categorie 1 (alle blootstellingsroutes)', group: 'health', threshold: { low: 5, high: 20 } },
  H2: { id: 'H2', name: 'Acuut toxisch, categorie 2 (alle blootstellingsroutes)', group: 'health', threshold: { low: 50, high: 200 } },
  H3: { id: 'H3', name: 'Acuut toxisch, categorie 3 (inademing)', group: 'health', threshold: { low: 200, high: 500 } },
  H4: { id: 'H4', name: 'Huidcorrosief, categorie 1', group: 'health', threshold: { low: 25, high: 50 } },

  // Physical Hazards
  P1a: { id: 'P1a', name: 'Explosief, instabiel of div 1.1', group: 'physical', threshold: { low: 10, high: 50 } },
  P2: { id: 'P2', name: 'Ontvlambare gassen', group: 'physical', threshold: { low: 10, high: 50 } },
  P3a: { id: 'P3a', name: 'Ontvlambare aerosolen (ontvlambaar)', group: 'physical', threshold: { low: 150, high: 500 } },
  P3b: { id: 'P3b', name: 'Ontvlambare aerosolen (zeer/extreem ontvlambaar)', group: 'physical', threshold: { low: 5000, high: 50000 } },
  P4: { id: 'P4', name: 'Oxiderende gassen', group: 'physical', threshold: { low: 50, high: 200 } },
  P5a: { id: 'P5a', name: 'Ontvlambare vloeistoffen (cat. 1)', group: 'physical', threshold: { low: 10, high: 50 } },
  P5b: { id: 'P5b', name: 'Ontvlambare vloeistoffen (cat. 2/3, T>kookpunt)', group: 'physical', threshold: { low: 50, high: 200 } },
  P5c: { id: 'P5c', name: 'Ontvlambare vloeistoffen (cat. 2/3)', group: 'physical', threshold: { low: 5000, high: 50000 } },
  P6a: { id: 'P6a', name: 'Zelfontledende stoffen & Organische peroxiden (Type A/B)', group: 'physical', threshold: { low: 10, high: 50 } },
  P6b: { id: 'P6b', name: 'Zelfontledende stoffen & Organische peroxiden (Type C,D,E,F)', group: 'physical', threshold: { low: 50, high: 200 } },
  P7: { id: 'P7', name: 'Pyrofore vloeistoffen en vaste stoffen', group: 'physical', threshold: { low: 50, high: 200 } },
  P8: { id: 'P8', name: 'Oxiderende vloeistoffen en vaste stoffen', group: 'physical', threshold: { low: 50, high: 200 } },
  
  // Environmental Hazards
  E1: { id: 'E1', name: 'Gevaarlijk voor het aquatisch milieu, categorie 1', group: 'environment', threshold: { low: 100, high: 200 } },
  E2: { id: 'E2', name: 'Gevaarlijk voor het aquatisch milieu, categorie 2', group: 'environment', threshold: { low: 200, high: 500 } },

  // Other Hazards
  O1: { id: 'O1', name: 'Stoffen die reageren met water onder vorming van toxische gassen', group: 'other', threshold: { low: 100, high: 500 } },
  O2: { id: 'O2', name: 'Stoffen die in contact met water ontvlambare gassen ontwikkelen', group: 'other', threshold: { low: 50, high: 200 } },
  O3: { id: 'O3', name: 'Kankerverwekkend, mutageen, reprotoxisch (CMR)', group: 'other', threshold: { low: 10, high: 50 } },
};

export const NAMED_SUBSTANCES: Record<string, NamedSubstance> = {
  '75-07-0': { id: 'Acetaldehyde', cas: '75-07-0', name: 'Acetaldehyde', group: 'named', threshold: { low: 2500, high: 25000 } },
  '7664-41-7': { id: 'Ammoniak', cas: '7664-41-7', name: 'Ammoniak (anhydrous)', group: 'named', threshold: { low: 50, high: 200 } },
  '71-43-2': { id: 'Benzeen', cas: '71-43-2', name: 'Benzeen', group: 'named', threshold: { low: 1, high: 5 } },
  '7726-95-6': { id: 'Chloor', cas: '7726-95-6', name: 'Chloor', group: 'named', threshold: { low: 10, high: 25 } },
  '67-56-1': { id: 'Methanol', cas: '67-56-1', name: 'Methanol', group: 'named', threshold: { low: 500, high: 5000 } },
};

// ARIE thresholds in tons, mapped by Seveso Category ID
export const ARIE_THRESHOLDS: Record<string, number> = {
  // Giftigheid
  'H1': 0.05,    // Acuut toxisch cat 1 -> 50 kg
  'H2': 0.2,     // Acuut toxisch cat 2 -> 200 kg
  // H3 is more complex in ARIE. Simplification: STOT eenmalig cat 1 (H370) has the lowest threshold.
  'H3': 0.5,     // STOT eenmalig, cat 1 (H370 mapped to H3) -> 500 kg
  'O3': 0.5,     // CMR stoffen cat 1A/1B -> 500 kg

  // Fysische gevaren
  'P1a': 0.05,   // Ontplofbaar -> 50kg
  'P6a': 0.05,   // Zelfontledend A/B, Org Perox A/B -> 50kg
  'P7': 0.05,    // Pyrofoor cat 1 -> 50kg
  'O2': 0.05,    // Stoffen die met water ontvlambare gassen vormen, Cat 1 -> 50kg
  'P5a': 1,      // Ontvlambare vloeistof cat 1 -> 1000kg
  'P5b': 5,      // Ontvlambare vloeistof cat 2/3 (onder condities) -> 5000kg
  'P2': 5,       // Ontvlambare gassen -> 5000kg
  'P4': 5,       // Oxiderende gassen -> 5000kg
  'P8': 5,       // Oxiderende vloeistoffen/vaste stoffen -> 5000kg
};

export const H_PHRASE_MAPPING: Record<string, string> = {
  // Health
  'H300': 'H1', 'H310': 'H1', 'H330': 'H1',
  'H301': 'H2', 'H311': 'H2', 'H331': 'H2',
  'H332': 'H3',
  'H370': 'H3', // STOT SE 1
  'H314': 'H4',

  // Physical
  'EUH001': 'P1a',
  'H200': 'P1a', 'H201': 'P1a', 'H202': 'P1a', 'H203': 'P1a', 'H205': 'P1a',
  'H220': 'P2', 'H221': 'P2',
  'H222': 'P3b', 'H223': 'P3a',
  'H224': 'P5a',
  'H225': 'P5c',
  'H226': 'P5c',
  'H240': 'P6a', 'H241': 'P6a',
  'H242': 'P6b',
  'H250': 'P7',
  'H270': 'P4',
  'H271': 'P8', 'H272': 'P8',
  
  // Environmental
  'H400': 'E1', 'H410': 'E1',
  'H411': 'E2',

  // Other
  'EUH014': 'O1',
  'EUH029': 'O1',
  'H260': 'O2', 'H261': 'O2',
  'H340': 'O3', 'H350': 'O3', 'H350i': 'O3', 
  'H360': 'O3', 'H360F': 'O3', 'H360D': 'O3', 'H360FD': 'O3', 'H360Fd': 'O3', 'H360Df': 'O3'
};

export const H_PHRASE_DESCRIPTIONS: Record<string, string> = {
    'H200': 'Ontplofbaar, gevaar voor massa-explosie',
    'H201': 'Ontplofbaar, gevaar voor scherfwerking, maar geen gevaar voor massa-explosie',
    'H202': 'Ontplofbaar, ernstig gevaar voor scherfwerking',
    'H203': 'Ontplofbaar, gevaar voor brand, scherfwerking of drukgolf',
    'H204': 'Gevaar voor brand of scherfwerking',
    'H205': 'Gevaar voor massa-explosie bij brand',
    'H220': 'Zeer licht ontvlambaar gas',
    'H221': 'Ontvlambaar gas',
    'H222': 'Zeer licht ontvlambare aerosol',
    'H223': 'Ontvlambare aerosol',
    'H224': 'Zeer licht ontvlambare vloeistof en damp',
    'H225': 'Licht ontvlambare vloeistof en damp',
    'H226': 'Ontvlambare vloeistof en damp',
    'H240': 'Kan een explosie veroorzaken bij verhitting',
    'H241': 'Kan brand of een explosie veroorzaken bij verhitting',
    'H242': 'Brandgevaar bij verhitting',
    'H250': 'Vatbaar voor zelfontbranding in lucht',
    'H260': 'Vormt in contact met water ontvlambare gassen die spontaan kunnen ontbranden',
    'H261': 'Vormt in contact met water ontvlambare gassen',
    'H270': 'Kan brand veroorzaken of bevorderen; oxiderend',
    'H271': 'Kan brand of een explosie veroorzaken; sterk oxiderend',
    'H272': 'Kan brand bevorderen; oxiderend',
    'H300': 'Dodelijk bij inslikken',
    'H301': 'Giftig bij inslikken',
    'H310': 'Dodelijk bij contact met de huid',
    'H311': 'Giftig bij contact met de huid',
    'H314': 'Veroorzaakt ernstige brandwonden en oogletsel',
    'H330': 'Dodelijk bij inademing',
    'H331': 'Giftig bij inademing',
    'H332': 'Schadelijk bij inademing',
    'H340': 'Kan genetische afwijkingen veroorzaken',
    'H350': 'Kan kanker veroorzaken',
    'H350i': 'Kan kanker veroorzaken bij inademing',
    'H360': 'Kan de vruchtbaarheid of het ongeboren kind schaden',
    'H360F': 'Kan de vruchtbaarheid schaden',
    'H360D': 'Kan het ongeboren kind schaden',
    'H360FD': 'Kan de vruchtbaarheid schaden. Kan het ongeboren kind schaden.',
    'H360Fd': 'Kan de vruchtbaarheid schaden. Wordt ervan verdacht het ongeboren kind te schaden.',
    'H360Df': 'Kan het ongeboren kind schaden. Wordt ervan verdacht de vruchtbaarheid te schaden.',
    'H370': 'Veroorzaakt schade aan organen',
    'H372': 'Veroorzaakt schade aan organen bij langdurige of herhaalde blootstelling',
    'H400': 'Zeer giftig voor in het water levende organismen',
    'H410': 'Zeer giftig voor in het water levende organismen, met langdurige gevolgen',
    'H411': 'Giftig voor in het water levende organismen, met langdurige gevolgen',
    'EUH001': 'In droge toestand ontplofbaar',
    'EUH014': 'Reageert heftig met water',
    'EUH029': 'Vormt giftig gas in contact met water',
};


export const classifySubstance = (hStatements: string[], casNumber: string | null): { sevesoCategories: string[], isNamed: boolean, namedSubstanceName: string | null } => {
  const sevesoCategories = new Set<string>();
  
  hStatements.forEach(hStatement => {
    const code = hStatement.split(' ')[0].toUpperCase();
    if (H_PHRASE_MAPPING[code]) {
      sevesoCategories.add(H_PHRASE_MAPPING[code]);
    }
  });

  let isNamed = false;
  let namedSubstanceName = null;
  if(casNumber && NAMED_SUBSTANCES[casNumber]) {
    const named = NAMED_SUBSTANCES[casNumber];
    sevesoCategories.add(named.id);
    isNamed = true;
    namedSubstanceName = named.name;
  }
  
  return { sevesoCategories: Array.from(sevesoCategories), isNamed, namedSubstanceName };
};


export const SUMMATION_GROUPS_CONFIG = [
  { name: 'Gezondheidsgevaren', icon: FlaskConical, group: 'health', colorClass: 'seveso-health' },
  { name: 'Fysische gevaren', icon: Flame, group: 'physical', colorClass: 'seveso-physical' },
  { name: 'Milieugevaren', icon: Leaf, group: 'environment', colorClass: 'seveso-environment' },
  { name: 'Overige gevaren', icon: AlertTriangle, group: 'other', colorClass: 'seveso-other' },
  { name: 'Benoemde Stoffen', icon: Atom, group: 'named', colorClass: 'seveso-named' },
] as const;


export const calculateSummations = (inventory: Substance[], mode: ThresholdMode): { 
  summationGroups: SummationGroup[], 
  arieSummation: { totalRatio: number, isExceeded: boolean },
  overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel', 
  criticalGroup: string | null 
} => {
  const groupTotals: Record<string, number> = {
    health: 0,
    physical: 0,
    environment: 0,
    other: 0,
    named: 0,
  };

  let arieTotalRatio = 0;

  inventory.forEach(substance => {
    if (substance.quantity > 0) {
      // Seveso calculation
      const substanceGroupContributions: Record<string, number> = {};
      substance.sevesoCategories.forEach(catId => {
        const category = SEVESO_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
        if (category) {
          const threshold = category.threshold[mode];
          if (threshold > 0) {
            const ratio = substance.quantity / threshold;
            if (!substanceGroupContributions[category.group] || ratio > substanceGroupContributions[category.group]) {
               substanceGroupContributions[category.group] = ratio;
            }
          }
        }
      });
      for (const group in substanceGroupContributions) {
        groupTotals[group] += substanceGroupContributions[group];
      }

      // ARIE calculation: For each substance, find the lowest applicable threshold and use that for the summation.
      let maxArieRatioForSubstance = 0;
      substance.sevesoCategories.forEach(catId => {
          const arieThreshold = ARIE_THRESHOLDS[catId];
          if (arieThreshold && arieThreshold > 0) {
              const ratio = substance.quantity / arieThreshold;
              if (ratio > maxArieRatioForSubstance) {
                  maxArieRatioForSubstance = ratio;
              }
          }
      });
      arieTotalRatio += maxArieRatioForSubstance;
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
  
  const arieSummation = {
      totalRatio: arieTotalRatio,
      isExceeded: arieTotalRatio >= 1,
  };

  return { 
    summationGroups,
    arieSummation, 
    overallStatus, 
    criticalGroup: mostCriticalGroup ? mostCriticalGroup.name : null 
  };
};

export const REFERENCE_GUIDE_DATA = Object.entries(H_PHRASE_MAPPING).map(([hPhrase, categoryId]) => ({
  hPhrase,
  categoryId,
  categoryName: SEVESO_CATEGORIES[categoryId]?.name || '',
}));
