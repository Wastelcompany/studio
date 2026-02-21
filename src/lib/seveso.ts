"use client";

import type { Substance, HazardCategory, NamedSubstance, ThresholdMode, SummationGroup } from '@/lib/types';
import { FlaskConical, Flame, Leaf, AlertTriangle, Atom, Briefcase } from 'lucide-react';

// Master list of all hazard categories (Seveso & ARIE)
export const ALL_CATEGORIES: Record<string, HazardCategory> = {
  H1: { id: 'H1', name: 'Acuut toxisch, categorie 1 (alle blootstellingsroutes)', group: 'health' },
  H2: { id: 'H2', name: 'Acuut toxisch, categorie 2 (alle blootstellingsroutes)', group: 'health' },
  H3: { id: 'H3', name: 'Acuut toxisch, categorie 3 (inademing) & STOT eenmalig 1', group: 'health' },
  H4: { id: 'H4', name: 'Huidcorrosie, categorie 1', group: 'health' }, // Primarily ARIE

  P1a: { id: 'P1a', name: 'Explosieve stoffen (instabiel, 1.1, 1.2, 1.3, 1.5)', group: 'physical' },
  P1b: { id: 'P1b', name: 'Explosieve stoffen (1.4)', group: 'physical' },
  P2: { id: 'P2', name: 'Ontvlambare gassen, categorie 1 en 2', group: 'physical' },
  P3a: { id: 'P3a', name: 'Ontvlambare aerosolen, categorie 1 (ontvlambaar)', group: 'physical' },
  P3b: { id: 'P3b', name: 'Ontvlambare aerosolen, categorie 2 (zeer/extreem ontvlambaar)', group: 'physical' },
  P4: { id: 'P4', name: 'Oxiderende gassen, categorie 1', group: 'physical' },
  P5a: { id: 'P5a', name: 'Ontvlambare vloeistoffen, categorie 1', group: 'physical' },
  P5b: { id: 'P5b', name: 'Ontvlambare vloeistoffen, cat 2/3 (onder druk/hoge T)', group: 'physical' },
  P5c: { id: 'P5c', name: 'Ontvlambare vloeistoffen, categorie 2 en 3', group: 'physical' },
  P6a: { id: 'P6a', name: 'Zelfontledende stoffen & Organische peroxiden, Type A/B', group: 'physical' },
  P6b: { id: 'P6b', name: 'Zelfontledende stoffen & Organische peroxiden, Type C,D,E,F', group: 'physical' },
  P7: { id: 'P7', name: 'Pyrofore vloeistoffen en vaste stoffen, categorie 1', group: 'physical' },
  P8: { id: 'P8', name: 'Oxiderende vloeistoffen en vaste stoffen, cat 1, 2, 3', group: 'physical' },
  
  E1: { id: 'E1', name: 'Gevaarlijk voor het aquatisch milieu, acuut 1 of chronisch 1', group: 'environment' },
  E2: { id: 'E2', name: 'Gevaarlijk voor het aquatisch milieu, chronisch 2', group: 'environment' },

  O1: { id: 'O1', name: 'Stoffen die reageren met water (toxische gassen)', group: 'other' },
  O2: { id: 'O2', name: 'Stoffen die in contact met water ontvlambare gassen ontwikkelen, cat 1', group: 'other' },
  O3: { id: 'O3', name: 'Kankerverwekkend, mutageen, reprotoxisch (CMR), cat 1A/1B', group: 'other' },
};

export const NAMED_SUBSTANCES: Record<string, NamedSubstance> = {
  '75-07-0': { id: 'Acetaldehyde', cas: '75-07-0', name: 'Acetaldehyde', group: 'named', threshold: { low: 2500, high: 25000 } },
  '7664-41-7': { id: 'Ammoniak', cas: '7664-41-7', name: 'Ammoniak (anhydrous)', group: 'named', threshold: { low: 50, high: 200 } },
  '71-43-2': { id: 'Benzeen', cas: '71-43-2', name: 'Benzeen', group: 'named', threshold: { low: 1, high: 5 } },
  '7726-95-6': { id: 'Chloor', cas: '7726-95-6', name: 'Chloor', group: 'named', threshold: { low: 10, high: 25 } },
  '67-56-1': { id: 'Methanol', cas: '67-56-1', name: 'Methanol', group: 'named', threshold: { low: 500, high: 5000 } },
};

// Seveso-specific thresholds, mapping category ID to thresholds
export const SEVESO_THRESHOLDS: Record<string, { low: number, high: number }> = {
  H1: { low: 5, high: 20 },
  H2: { low: 50, high: 200 },
  H3: { low: 200, high: 500 },
  P1a: { low: 10, high: 50 },
  P1b: { low: 50, high: 200 },
  P2: { low: 10, high: 50 },
  P3a: { low: 150, high: 500 }, 
  P3b: { low: 5000, high: 50000 }, 
  P4: { low: 50, high: 200 },
  P5a: { low: 10, high: 50 },
  P5b: { low: 50, high: 200 },
  P5c: { low: 5000, high: 50000 },
  P6a: { low: 10, high: 50 },
  P6b: { low: 50, high: 200 },
  P7: { low: 50, high: 200 },
  P8: { low: 50, high: 200 },
  E1: { low: 100, high: 200 },
  E2: { low: 200, high: 500 },
  O1: { low: 100, high: 500 },
  O2: { low: 50, high: 200 },
  O3: { low: 10, high: 50 },
};

// ARIE-specific thresholds (2023 Update)
export const ARIE_THRESHOLDS: Record<string, number> = {
    H1: 0.05,
    H2: 0.2,
    H3: 1, // STOT SE 1
    H4: 5,
    O3: 0.5, // CMR
    P1a: 0.05,
    P1b: 1, // Overige ontplofbare stoffen
    P6a: 0.05, // Type A of B
    P6b: 1, // Type C, D, E of F (H242) - TOEGEVOEGD
    P7: 0.05,
    O1: 0.5, // Water reactief (toxisch gas) - TOEGEVOEGD
    O2: 0.05, // Water reactief (ontvlambaar gas)
    'ARIE-Gas-1': 5,
    'ARIE-Gas-2': 50,
    'ARIE-Vloeistof-1': 1,
    'ARIE-Vloeistof-2': 10,
    'ARIE-Vloeistof-3': 100,
    'ARIE-Ox-Gas-1': 5,
    'ARIE-Ox-Vloeistof-1': 5,
    'ARIE-Ox-Vast-1': 5,
};

// Add custom ARIE categories to the master list, with a displayId to show the Seveso equivalent
ALL_CATEGORIES['ARIE-Gas-1'] = { id: 'ARIE-Gas-1', name: 'Ontvlambare gassen, cat. 1 (ARIE)', group: 'physical', displayId: 'P2' };
ALL_CATEGORIES['ARIE-Gas-2'] = { id: 'ARIE-Gas-2', name: 'Ontvlambare gassen, cat. 2 (ARIE)', group: 'physical', displayId: 'P2' };
ALL_CATEGORIES['ARIE-Vloeistof-1'] = { id: 'ARIE-Vloeistof-1', name: 'Ontvlambare vloeistoffen, cat. 1 (ARIE)', group: 'physical', displayId: 'P5a' };
ALL_CATEGORIES['ARIE-Vloeistof-2'] = { id: 'ARIE-Vloeistof-2', name: 'Ontvlambare vloeistoffen, cat. 2 (ARIE)', group: 'physical', displayId: 'P5c' };
ALL_CATEGORIES['ARIE-Vloeistof-3'] = { id: 'ARIE-Vloeistof-3', name: 'Ontvlambare vloeistoffen, cat. 3 (ARIE)', group: 'physical', displayId: 'P5c' };
ALL_CATEGORIES['ARIE-Ox-Gas-1'] = { id: 'ARIE-Ox-Gas-1', name: 'Oxiderende gassen, cat. 1 (ARIE)', group: 'physical', displayId: 'P4' };
ALL_CATEGORIES['ARIE-Ox-Vloeistof-1'] = { id: 'ARIE-Ox-Vloeistof-1', name: 'Oxiderende vloeistoffen, cat. 1/2 (ARIE)', group: 'physical', displayId: 'P8' };
ALL_CATEGORIES['ARIE-Ox-Vast-1'] = { id: 'ARIE-Ox-Vast-1', name: 'Oxiderende vaste stoffen, cat. 1/2 (ARIE)', group: 'physical', displayId: 'P8' };


export const H_PHRASE_MAPPING: Record<string, string[]> = {
  // Health
  'H300': ['H1'], 'H310': ['H1'], 'H330': ['H1'],
  'H301': ['H2'], 'H311': ['H2'], 'H331': ['H2'],
  'H332': ['H3'], 
  'H370': ['H3'], 
  'H314': ['H4'],

  // Physical - Explosives
  'EUH001': ['P1a'], 'H200': ['P1a'], 'H201': ['P1a'], 'H202': ['P1a'], 'H203': ['P1a'],
  'H204': ['P1b'],
  'H205': ['P1a'],
  
  // Physical - Flammable Gases / Aerosols
  'H220': ['ARIE-Gas-1'],
  'H221': ['ARIE-Gas-2'],
  'H222': ['P3b'], 'H223': ['P3a'],
  
  // Physical - Flammable Liquids
  'H224': ['P5a', 'ARIE-Vloeistof-1'],
  'H225': ['P5c', 'ARIE-Vloeistof-2'],
  'H226': ['P5c', 'ARIE-Vloeistof-3'],

  // Physical - Self-reactive & Peroxides
  'H240': ['P6a'], 'H241': ['P6a'],
  'H242': ['P6b'],

  // Physical - Pyrophoric
  'H250': ['P7'],

  // Physical - Oxidizing
  'H270': ['P4', 'ARIE-Ox-Gas-1'],
  'H271': ['P8', 'ARIE-Ox-Vloeistof-1', 'ARIE-Ox-Vast-1'],
  'H272': ['P8', 'ARIE-Ox-Vloeistof-1', 'ARIE-Ox-Vast-1'],

  // Environment
  'H400': ['E1'], 'H410': ['E1'],
  'H411': ['E2'],

  // Other - Water reactive
  'EUH014': ['O1'], 'EUH029': ['O1'], 'EUH032': ['O1'],
  'H260': ['O2', 'P7'], 
  'H261': ['O2'], 
  
  // Other - CMR
  'H340': ['O3'], 'H350': ['O3'], 'H350i': ['O3'], 'H360': ['O3'], 'H360F': ['O3'], 'H360D': ['O3'], 'H360FD': ['O3'], 'H360Fd': ['O3'], 'H360Df': ['O3'],
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
    'H302': 'Schadelijk bij inslikken',
    'H310': 'Dodelijk bij contact met de huid',
    'H311': 'Giftig bij contact met de huid',
    'H312': 'Schadelijk bij contact met de huid',
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
    'EUH032': 'Vormt zeer giftig gas in contact met zuren',
};

export const classifySubstance = (hStatements: string[], casNumber: string | null): { sevesoCategoryIds: string[], arieCategoryIds: string[], isNamed: boolean, namedSubstanceName: string | null } => {
  const allCategoryIds = new Set<string>();
  
  hStatements.forEach(hStatement => {
    const code = hStatement.split(' ')[0].toUpperCase();
    if (H_PHRASE_MAPPING[code]) {
      H_PHRASE_MAPPING[code].forEach(catId => allCategoryIds.add(catId));
    }
  });

  const sevesoCategoryIds = new Set<string>();
  const arieCategoryIds = new Set<string>();

  allCategoryIds.forEach(catId => {
    if (SEVESO_THRESHOLDS[catId]) {
      sevesoCategoryIds.add(catId);
    }
    if (ARIE_THRESHOLDS[catId]) {
      arieCategoryIds.add(catId);
    }
  });

  let isNamed = false;
  let namedSubstanceName = null;
  if(casNumber && NAMED_SUBSTANCES[casNumber]) {
    const named = NAMED_SUBSTANCES[casNumber];
    sevesoCategoryIds.add(named.id);
    isNamed = true;
    namedSubstanceName = named.name;
    // Check if named substance is also relevant for ARIE
    if (ARIE_THRESHOLDS[named.id]) {
        arieCategoryIds.add(named.id);
    }
  }
  
  return { sevesoCategoryIds: Array.from(sevesoCategoryIds), arieCategoryIds: Array.from(arieCategoryIds), isNamed, namedSubstanceName };
};


export const SUMMATION_GROUPS_CONFIG = [
  { name: 'Gezondheidsgevaren', icon: FlaskConical, group: 'health' },
  { name: 'Fysische gevaren', icon: Flame, group: 'physical' },
  { name: 'Milieugevaren', icon: Leaf, group: 'environment' },
  { name: 'Overige gevaren', icon: AlertTriangle, group: 'other' },
  { name: 'Benoemde Stoffen', icon: Atom, group: 'named' },
] as const;


export const calculateSummations = (inventory: Substance[], mode: ThresholdMode): { 
  summationGroups: SummationGroup[],
  arieSummationGroups: SummationGroup[],
  overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel', 
  criticalGroup: string | null,
  arieTotal: number,
  arieExceeded: boolean,
} => {
  const sevesoGroupTotals: Record<string, number> = { health: 0, physical: 0, environment: 0, other: 0, named: 0 };
  const arieGroupTotals: Record<string, number> = { health: 0, physical: 0, environment: 0, other: 0, named: 0 };
  
  inventory.forEach(substance => {
    if (substance.quantity > 0) {
      // --- Seveso summation ---
      const perGroupMaxRatio: Record<string, number> = {};
      substance.sevesoCategoryIds.forEach(catId => {
        const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
        const thresholdInfo = SEVESO_THRESHOLDS[catId] || (category as any)?.threshold;
        if (category && thresholdInfo) {
            const threshold = thresholdInfo[mode];
            if (threshold > 0) {
                const ratio = substance.quantity / threshold;
                if (!perGroupMaxRatio[category.group] || ratio > perGroupMaxRatio[category.group]) {
                    perGroupMaxRatio[category.group] = ratio;
                }
            }
        }
      });
      for (const group in perGroupMaxRatio) {
          sevesoGroupTotals[group] += perGroupMaxRatio[group];
      }

      // --- ARIE summation ---
      const perGroupMaxArieRatio: Record<string, number> = {};
      substance.arieCategoryIds.forEach(catId => {
        const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
        const arieThreshold = ARIE_THRESHOLDS[catId];
        if (category && arieThreshold && arieThreshold > 0) {
            const ratio = substance.quantity / arieThreshold;
            if (!perGroupMaxArieRatio[category.group] || ratio > perGroupMaxArieRatio[category.group]) {
                perGroupMaxArieRatio[category.group] = ratio;
            }
        }
      });
      for (const group in perGroupMaxArieRatio) {
        arieGroupTotals[group] = (arieGroupTotals[group] || 0) + perGroupMaxArieRatio[group];
      }
    }
  });

  const summationGroups: SummationGroup[] = SUMMATION_GROUPS_CONFIG.map(config => ({
    ...config,
    totalRatio: sevesoGroupTotals[config.group] || 0,
    isExceeded: (sevesoGroupTotals[config.group] || 0) >= 1,
  }));
  
  const arieSummationGroups: SummationGroup[] = SUMMATION_GROUPS_CONFIG.map(config => ({
    ...config,
    totalRatio: arieGroupTotals[config.group] || 0,
    isExceeded: false, 
  }));

  const totalArieRatio = Object.values(arieGroupTotals).reduce((sum, current) => sum + current, 0);

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
    arieSummationGroups,
    overallStatus, 
    criticalGroup: mostCriticalGroup ? mostCriticalGroup.name : null,
    arieTotal: totalArieRatio,
    arieExceeded: totalArieRatio >= 1,
  };
};

export const REFERENCE_GUIDE_DATA = Object.entries(SEVESO_THRESHOLDS).map(([categoryId, thresholds]) => {
  const category = ALL_CATEGORIES[categoryId];
  if (!category) return null;
  const hPhrases = Object.entries(H_PHRASE_MAPPING)
    .filter(([, catIds]) => catIds.includes(categoryId))
    .map(([hPhrase]) => hPhrase);
  
  return {
    hPhrase: hPhrases.join(', ') || 'Specifiek',
    categoryId: category.id,
    categoryName: category.name,
  };
}).filter(Boolean) as { hPhrase: string, categoryId: string, categoryName: string }[];
