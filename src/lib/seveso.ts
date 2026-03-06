"use client";

import type { Substance, HazardCategory, NamedSubstance, ThresholdMode, SummationGroup } from '@/lib/types';
import { FlaskConical, Flame, Leaf, AlertTriangle, Atom } from 'lucide-react';

export const ALL_CATEGORIES: Record<string, HazardCategory> = {
  H1: { id: 'H1', name: 'Acuut toxisch, categorie 1 (alle blootstellingsroutes)', group: 'health' },
  H2: { id: 'H2', name: 'Acuut toxisch, categorie 2 (alle) & cat. 3 (inademing)', group: 'health' },
  H3: { id: 'H3', name: 'STOT eenmalig, cat. 1', group: 'health' },
  H4: { id: 'H4', name: 'Huidcorrosie, categorie 1A, 1B of 1C (H314)', group: 'health', displayId: 'H4' },
  P1a: { id: 'P1a', name: 'Explosieve stoffen (instabiel, 1.1, 1.2, 1.3, 1.5)', group: 'physical' },
  P1b: { id: 'P1b', name: 'Explosieve stoffen (1.4)', group: 'physical' },
  P2: { id: 'P2', name: 'Ontvlambare gassen, categorie 1 en 2', group: 'physical' },
  P3a: { id: 'P3a', name: 'Ontvlambare aerosolen, cat 1 & 2 (met ontvlambaar gas/vloeistof cat 1)', group: 'physical' },
  P3b: { id: 'P3b', name: 'Ontvlambare aerosolen, cat 1 & 2 (overig)', group: 'physical' },
  P4: { id: 'P4', name: 'Oxiderende gassen, categorie 1', group: 'physical' },
  P5a: { id: 'P5a', name: 'Ontvlambare vloeistoffen, categorie 1', group: 'physical' },
  P5b: { id: 'P5b', name: 'Ontvlambare vloeistoffen, cat 2/3 (onder druk/hoge T)', group: 'physical' },
  P5c: { id: 'P5c', name: 'Ontvlambare vloeistoffen, categorie 2 en 3', group: 'physical' },
  P6a: { id: 'P6a', name: 'Zelfontledende stoffen & Organische peroxiden, Type A/B', group: 'physical' },
  P6b: { id: 'P6b', name: 'Zelfontledende stoffen & Organische peroxiden, Type C,D,E,F', group: 'physical' },
  P7: { id: 'P7', name: 'Pyrofore vloeistoffen en vaste stoffen, categorie 1', group: 'physical' },
  P8: { id: 'P8', name: 'Oxiderende vloeistoffen en vaste stoffen, cat 1, 2, 3', group: 'physical' },
  P9: { id: 'P9', name: 'Zelfverhittende stoffen en mengsels, cat 1 & 2', group: 'physical' },
  E1: { id: 'E1', name: 'Gevaarlijk voor het aquatisch milieu, acuut 1 of chronisch 1', group: 'environment' },
  E2: { id: 'E2', name: 'Gevaarlijk voor het aquatisch milieu, chronisch 2', group: 'environment' },
  O1: { id: 'O1', name: 'Stoffen met gevarenaanduiding EUH014', group: 'other' },
  O2: { id: 'O2', name: 'Stoffen die in contact met water ontvlambare gassen ontwikkelen (Cat 1)', group: 'other' },
  O3: { id: 'O3', name: 'Stoffen met gevarenaanduiding EUH029', group: 'other' },
  'ARIE-P1a-sub3': { id: 'ARIE-P1a-sub3', name: 'Stoffen/mengsels met explosieve eigenschappen (zonder sub 1.1-1.6)', group: 'physical', displayId: 'P1a (sub 3)' },
  'ARIE-CMR': { id: 'ARIE-CMR', name: 'Kankerverwekkend/mutageen/reprotoxisch cat 1A/1B', group: 'health', displayId: 'CMR' },
};

export const SEVESO_THRESHOLDS: Record<string, { low: number, high: number }> = {
  H1: { low: 5, high: 20 },
  H2: { low: 50, high: 200 },
  H3: { low: 50, high: 200 },
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
  O2: { low: 100, high: 500 },
  O3: { low: 100, high: 500 },
};

export const ARIE_THRESHOLDS: Record<string, number> = {
  H1: 1.5,
  H2: 15,
  H3: 15,
  H4: 15,
  'ARIE-CMR': 15,
  P1a: 3,
  'ARIE-P1a-sub3': 3,
  P1b: 15,
  P2: 3,
  P3a: 45,
  P3b: 1500,
  P4: 15,
  P5a: 3,
  P5b: 15,
  P5c: 1500,
  P6a: 3,
  P6b: 15,
  P7: 15,
  P8: 15,
  P9: 15,
  E1: 30,
  E2: 150,
  O1: 30,
  O2: 30,
  O3: 15,
};

export const NAMED_SUBSTANCES: Record<string, NamedSubstance> = {
  '67-56-1': { id: 'Named-Methanol', name: 'Methanol', cas: '67-56-1', group: 'named', threshold: { low: 500, high: 5000 }, arieThreshold: 150 },
  '75-07-0': { id: 'Named-Acetaldehyde', name: 'Acetaldehyde', cas: '75-07-0', group: 'named', threshold: { low: 10, high: 50 }, arieThreshold: 3 },
  '75-21-8': { id: 'Named-Ethyleenoxide', name: 'Ethyleenoxide', cas: '75-21-8', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 1.5 },
  '74-85-1': { id: 'Named-Ethyleen', name: 'Ethyleen', cas: '74-85-1', group: 'named', threshold: { low: 50, high: 200 }, arieThreshold: 15 },
};

export const H_PHRASE_MAPPING: Record<string, string[]> = {
  H200: ['P1a'], H201: ['P1a'], H202: ['P1a'], H203: ['P1a'], H204: ['P1b'], H205: ['P1b'],
  H220: ['P2'], H221: ['P2'], H222: ['P3a'], H223: ['P3a'], H224: ['P5a'], H225: ['P5c'], H226: ['P5c'],
  H240: ['P6a'], H241: ['P6a'], H242: ['P6b'], H250: ['P7'], H251: ['P9'], H252: ['P9'],
  H270: ['P4'], H271: ['P8'], H272: ['P8'],
  H300: ['H1'], H310: ['H1'], H330: ['H1'], H301: ['H2'], H311: ['H2'], H331: ['H2'],
  H370: ['H3'], H314: ['H4', 'ARIE-H4'], H350: ['ARIE-CMR'], H340: ['ARIE-CMR'], H360: ['ARIE-CMR'],
  H400: ['E1'], H410: ['E1'], H411: ['E2'],
  EUH014: ['O1'], EUH029: ['O3'],
};

export const H_PHRASE_DESCRIPTIONS: Record<string, string> = {
  H200: 'Instabiele ontplofbare stof', H224: 'Zeer licht ontvlambare vloeistof en damp',
  H300: 'Dodelijk bij inslikken', H330: 'Dodelijk bij inademing', H314: 'Veroorzaakt ernstige brandwonden',
};

export const SUMMATION_GROUPS_CONFIG = [
  { name: 'Gezondheidsgevaren', icon: FlaskConical, group: 'health' },
  { name: 'Fysische gevaren', icon: Flame, group: 'physical' },
  { name: 'Milieugevaren', icon: Leaf, group: 'environment' },
  { name: 'Overige gevaren', icon: AlertTriangle, group: 'other' },
  { name: 'Benoemde Stoffen', icon: Atom, group: 'named' },
] as const;

/**
 * Returns the ARIE threshold for a given category ID or named substance.
 */
export function getArieThreshold(catId: string): number {
  if (ARIE_THRESHOLDS[catId]) return ARIE_THRESHOLDS[catId];
  const named = Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
  return named?.arieThreshold || 0;
}

export function classifySubstance(hStatements: string[], casNumber: string | null) {
  const sevesoCategoryIds = new Set<string>();
  const arieCategoryIds = new Set<string>();
  
  hStatements.forEach(hStatement => {
    const code = hStatement.split(' ')[0].toUpperCase();
    if (H_PHRASE_MAPPING[code]) {
      H_PHRASE_MAPPING[code].forEach(catId => {
        if (SEVESO_THRESHOLDS[catId]) sevesoCategoryIds.add(catId);
        if (ARIE_THRESHOLDS[catId]) arieCategoryIds.add(catId);
      });
    }
  });

  let isNamed = false;
  let namedSubstanceName = null;
  if (casNumber && NAMED_SUBSTANCES[casNumber]) {
    const named = NAMED_SUBSTANCES[casNumber];
    sevesoCategoryIds.add(named.id);
    arieCategoryIds.add(named.id);
    isNamed = true;
    namedSubstanceName = named.name;
  }

  return { sevesoCategoryIds: Array.from(sevesoCategoryIds), arieCategoryIds: Array.from(arieCategoryIds), isNamed, namedSubstanceName };
}

export function calculateSummations(inventory: Substance[], mode: ThresholdMode) {
  const sevesoGroupTotals: Record<string, number> = { health: 0, physical: 0, environment: 0, other: 0, named: 0 };
  const arieGroupTotals: Record<string, number> = { health: 0, physical: 0, environment: 0, other: 0, named: 0 };
  
  const sevesoCatContribs: Record<string, Record<string, number>> = { health: {}, physical: {}, environment: {}, other: {}, named: {} };
  const arieCatContribs: Record<string, Record<string, number>> = { health: {}, physical: {}, environment: {}, other: {}, named: {} };

  inventory.forEach(substance => {
    if (substance.quantity <= 0) return;

    // Seveso
    substance.sevesoCategoryIds.forEach(catId => {
      const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
      const threshold = (SEVESO_THRESHOLDS[catId] || (category as any)?.threshold)?.[mode];
      if (category && threshold > 0) {
        const ratio = substance.quantity / threshold;
        sevesoGroupTotals[category.group] += ratio;
        sevesoCatContribs[category.group][catId] = (sevesoCatContribs[category.group][catId] || 0) + ratio;
      }
    });

    // ARIE
    substance.arieCategoryIds.forEach(catId => {
      const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
      const threshold = getArieThreshold(catId);
      if (category && threshold > 0) {
        const ratio = substance.quantity / threshold;
        arieGroupTotals[category.group] += ratio;
        arieCatContribs[category.group][catId] = (arieCatContribs[category.group][catId] || 0) + ratio;
      }
    });
  });

  const summationGroups: SummationGroup[] = SUMMATION_GROUPS_CONFIG.map(config => ({
    ...config,
    totalRatio: sevesoGroupTotals[config.group],
    isExceeded: sevesoGroupTotals[config.group] >= 1,
    categoryContributions: sevesoCatContribs[config.group]
  }));

  const arieSummationGroups: SummationGroup[] = SUMMATION_GROUPS_CONFIG.map(config => ({
    ...config,
    totalRatio: arieGroupTotals[config.group],
    isExceeded: arieGroupTotals[config.group] >= 1,
    categoryContributions: arieCatContribs[config.group]
  }));

  const totalArieRatio = Object.values(arieGroupTotals).reduce((a, b) => a + b, 0);

  return {
    summationGroups,
    arieSummationGroups,
    overallStatus: (summationGroups.some(g => g.isExceeded) ? (mode === 'high' ? 'Hogedrempel' : 'Lagedrempel') : 'Geen') as any,
    criticalGroup: summationGroups.find(g => g.isExceeded)?.name || null,
    arieTotal: totalArieRatio,
    arieExceeded: totalArieRatio >= 1,
    criticalArieGroup: arieSummationGroups.find(g => g.totalRatio > 0)?.name || null
  };
}

const generateRefs = () => {
    const categories: any[] = [];
    Object.entries(SEVESO_THRESHOLDS).forEach(([id, t]) => {
        const cat = ALL_CATEGORIES[id];
        if (cat) categories.push({ categoryId: cat.displayId || id, categoryName: cat.name, hPhrase: 'Zie H-Mappen', low: t.low, high: t.high });
    });
    return { categories, namedSubstances: Object.values(NAMED_SUBSTANCES).map(s => ({ categoryId: s.name, hPhrase: s.cas, low: s.threshold.low, high: s.threshold.high })) };
};
const refs = generateRefs();
export const SEVESO_CATEGORY_REFERENCE = refs.categories;
export const SEVESO_NAMED_REFERENCE = refs.namedSubstances;
export const ARIE_REFERENCE_GUIDE_DATA = Object.entries(ARIE_THRESHOLDS).map(([id, t]) => {
    const cat = ALL_CATEGORIES[id];
    return { categoryId: cat?.displayId || id, categoryName: cat?.name || id, hPhrase: 'ARIE-specifiek', threshold: t };
});