
"use client";

import type { Substance, HazardCategory, NamedSubstance, ThresholdMode, SummationGroup } from '@/lib/types';
import { FlaskConical, Flame, Leaf, AlertTriangle, Atom } from 'lucide-react';

/**
 * @fileOverview Seveso III and ARIE classification and summation logic.
 * Consistent with the reference guide and legal requirements.
 */

// Master list of all hazard categories
export const ALL_CATEGORIES: Record<string, HazardCategory> = {
  "H1": { id: 'H1', name: 'Acuut toxisch, categorie 1 (alle routes)', group: 'health', displayId: 'H1' },
  "H2": { id: 'H2', name: 'Acuut toxisch, categorie 2 (alle) & cat. 3 (inademing)', group: 'health', displayId: 'H2' },
  "H3": { id: 'H3', name: 'STOT eenmalig, cat. 1', group: 'health', displayId: 'H3' },
  "H4": { id: 'H4', name: 'Huidcorrosie, categorie 1A, 1B of 1C (H314)', group: 'health', displayId: 'H4' },
  
  "P1a": { id: 'P1a', name: 'Explosieve stoffen (instabiel, 1.1, 1.2, 1.3, 1.5)', group: 'physical', displayId: 'P1a' },
  "P1b": { id: 'P1b', name: 'Explosieve stoffen (1.4)', group: 'physical', displayId: 'P1b' },
  "P2": { id: 'P2', name: 'Ontvlambare gassen, categorie 1 en 2', group: 'physical', displayId: 'P2' },
  "P3a": { id: 'P3a', name: 'Ontvlambare aerosolen, cat 1 & 2 (ontvlambaar)', group: 'physical', displayId: 'P3a' },
  "P3b": { id: 'P3b', name: 'Ontvlambare aerosolen, cat 1 & 2 (overig)', group: 'physical', displayId: 'P3b' },
  "P4": { id: 'P4', name: 'Oxiderende gassen, categorie 1', group: 'physical', displayId: 'P4' },
  "P5a": { id: 'P5a', name: 'Ontvlambare vloeistoffen, categorie 1', group: 'physical', displayId: 'P5a' },
  "P5b": { id: 'P5b', name: 'Ontvlambare vloeistoffen, cat 2/3 (onder druk/hoge T)', group: 'physical', displayId: 'P5b' },
  "P5c": { id: 'P5c', name: 'Ontvlambare vloeistoffen, categorie 2 en 3', group: 'physical', displayId: 'P5c' },
  "P6a": { id: 'P6a', name: 'Zelfontledende stoffen & Organische peroxiden, Type A/B', group: 'physical', displayId: 'P6a' },
  "P6b": { id: 'P6b', name: 'Zelfontledende stoffen & Organische peroxiden, Type C,D,E,F', group: 'physical', displayId: 'P6b' },
  "P7": { id: 'P7', name: 'Pyrofore vloeistoffen en vaste stoffen, categorie 1', group: 'physical', displayId: 'P7' },
  "P8": { id: 'P8', name: 'Oxiderende vloeistoffen en vaste stoffen, cat 1, 2, 3', group: 'physical', displayId: 'P8' },
  
  "E1": { id: 'E1', name: 'Gevaarlijk voor het aquatisch milieu, acuut 1 of chronisch 1', group: 'environment', displayId: 'E1' },
  "E2": { id: 'E2', name: 'Gevaarlijk voor het aquatisch milieu, chronisch 2', group: 'environment', displayId: 'E2' },
  
  "O1": { id: 'O1', name: 'Stoffen met gevarenaanduiding EUH014', group: 'other', displayId: 'O1' },
  "O2": { id: 'O2', name: 'Stoffen die in contact met water ontvlambare gassen ontwikkelen (Cat 1)', group: 'other', displayId: 'O2' },
  "O3": { id: 'O3', name: 'Stoffen met gevarenaanduiding EUH029', group: 'other', displayId: 'O3' },

  'ARIE-CMR': { id: 'ARIE-CMR', name: 'Kankerverwekkend/mutageen/reprotoxisch cat 1A/1B', group: 'health', displayId: 'CMR' },
  'ARIE-O4': { id: 'ARIE-O4', name: 'Stoffen met EUH001 (in droge toestand ontplofbaar)', group: 'physical', displayId: 'O4' },
};

export const H_PHRASE_DESCRIPTIONS: Record<string, string> = {
  H200: 'Instabiele explosieve stof',
  H201: 'Ontplofbare stof: gevaar voor massa-explosie',
  H202: 'Ontplofbare stof: ernstig gevaar voor scherfwerking',
  H203: 'Ontplofbare stof: gevaar voor brand, luchtdruk of scherfwerking',
  H204: 'Gevaar voor brand of scherfwerking',
  H205: 'Gevaar voor massa-explosie bij brand',
  H220: 'Zeer licht ontvlambaar gas',
  H221: 'Ontvlambaar gas',
  H222: 'Zeer licht ontvlambare aerosol',
  H223: 'Ontvlambare aerosol',
  H224: 'Zeer licht ontvlambare vloeistof en damp',
  H225: 'Licht ontvlambare vloeistof en damp',
  H226: 'Ontvlambare vloeistof en damp',
  H240: 'Ontploffingsgevaar bij verwarming',
  H241: 'Brand- of ontploffingsgevaar bij verwarming',
  H242: 'Brandgevaar bij verwarming',
  H250: 'Vat spontaan vlam bij blootstelling aan lucht',
  H260: 'In contact met water komen ontvlambare gassen vrij die spontaan kunnen ontbranden',
  H270: 'Kan brand verooraken of bevorderen; oxiderend',
  H271: 'Kan brand of ontploffingen verooraken; sterk oxiderend',
  H272: 'Kan brand bevorderen; oxiderend',
  H300: 'Dodelijk bij inslikken',
  H301: 'Giftig bij inslikken',
  H310: 'Dodelijk bij contact met de huid',
  H311: 'Giftig bij contact met de huid',
  H314: 'Veroorzaakt ernstige brandwonden en oogletsel',
  H330: 'Dodelijk bij inademing',
  H331: 'Giftig bij inademing',
  H340: 'Kan genetische defecten veroorzaken',
  H350: 'Kan kanker veroorzaken',
  H360: 'Kan de vruchtbaarheid of het ongeboren kind schaden',
  H370: 'Veroorzaakt schade aan organen',
  H400: 'Zeer giftig voor in het water levende organismen',
  H410: 'Zeer giftig voor in het water levende organismen, met langdurige gevolgen',
  H411: 'Giftig voor in het water levende organismen, met langdurige gevolgen',
  EUH001: 'In droge toestand ontplofbaar',
  EUH014: 'Reageert heftig met water',
  EUH029: 'Vormt giftig gas in contact met water',
};

// Seveso III Thresholds
export const SEVESO_THRESHOLDS: Record<string, { low: number, high: number }> = {
  "H1": { low: 5, high: 20 },
  "H2": { low: 50, high: 200 },
  "H3": { low: 50, high: 200 },
  "P1a": { low: 10, high: 50 },
  "P1b": { low: 50, high: 200 },
  "P2": { low: 10, high: 50 },
  "P3a": { low: 150, high: 500 },
  "P3b": { low: 5000, high: 50000 },
  "P4": { low: 50, high: 200 },
  "P5a": { low: 10, high: 50 },
  "P5b": { low: 50, high: 200 },
  "P5c": { low: 5000, high: 50000 },
  "P6a": { low: 10, high: 50 },
  "P6b": { low: 50, high: 200 },
  "P7": { low: 50, high: 200 },
  "P8": { low: 50, high: 200 },
  "E1": { low: 100, high: 200 },
  "E2": { low: 200, high: 500 },
  "O1": { low: 100, high: 500 },
  "O2": { low: 100, high: 500 },
  "O3": { low: 50, high: 200 },
};

// ARIE Thresholds (Wettelijk bepaald)
// CRITICAL: P5-categorieën (P5a, P5b, P5c) zijn hier op verzoek verwijderd.
export const ARIE_THRESHOLDS: Record<string, number> = {
  "H1": 0.05,
  "H2": 0.2,
  "H3": 1,
  "H4": 50,
  "ARIE-CMR": 0.5,
  "P1a": 0.05,
  "P1b": 1,
  "P2": 5,
  "P3a": 5,
  "P3b": 50,
  "P4": 5,
  "P6a": 0.05,
  "P6b": 1,
  "P7": 0.05,
  "P8": 1,
  "E1": 1,
  "E2": 2,
  "O1": 0.5,
  "O2": 0.05,
  "O3": 0.5,
  "ARIE-O4": 0.05,
};

// Named substances (Seveso & ARIE)
export const NAMED_SUBSTANCES: Record<string, NamedSubstance & { primaryGroup: string }> = {
  '6484-52-2-5000': { id: 'Ammoniumnitraat-5000', cas: '6484-52-2', name: 'Ammoniumnitraat (meststoffen, groep 1)', group: 'named', primaryGroup: 'other', threshold: { low: 5000, high: 10000 }, arieThreshold: 1250 },
  '67-56-1': { id: 'Methanol', cas: '67-56-1', name: 'Methanol', group: 'named', primaryGroup: 'physical', threshold: { low: 500, high: 5000 }, arieThreshold: 500 },
  '1333-74-0': { id: 'Waterstof', cas: '1333-74-0', name: 'Waterstof', group: 'named', primaryGroup: 'physical', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '7782-50-5': { id: 'Chloor', cas: '7782-50-5', name: 'Chloor', group: 'named', primaryGroup: 'health', threshold: { low: 10, high: 25 }, arieThreshold: 10 },
  '68476-85-7': { id: 'LPG', cas: '68476-85-7', name: 'Vloeibare gassen (LPG)', group: 'named', primaryGroup: 'physical', threshold: { low: 50, high: 200 }, arieThreshold: 50 },
};

// H-phrase Mapping
export const H_PHRASE_MAPPING: Record<string, string[]> = {
  'H300': ['H1'], 'H310': ['H1'], 'H330': ['H1'],
  'H301': ['H2'], 'H311': ['H2'], 'H331': ['H2'],
  'H370': ['H3'], 'H314': ['H4'],
  'H200': ['P1a'], 'H201': ['P1a'], 'H202': ['P1a'], 'H203': ['P1a'], 'H205': ['P1a'],
  'H204': ['P1b'], 'H220': ['P2'], 'H221': ['P2'],
  'H222': ['P3a'], 'H223': ['P3a'], 'H270': ['P4'],
  'H224': ['P5a'], 'H225': ['P5b'], 'H226': ['P5c'],
  'H240': ['P6a'], 'H241': ['P6a'],
  'H242': ['P6b'], 'H250': ['P7'],
  'H271': ['P8'], 'H272': ['P8'], 'H400': ['E1'], 'H410': ['E1'], 'H411': ['E2'],
  'EUH014': ['O1'], 'H260': ['O2'], 'EUH029': ['O3'],
  'H340': ['ARIE-CMR'], 'H350': ['ARIE-CMR'], 'H360': ['ARIE-CMR'],
  'EUH001': ['ARIE-O4'],
};

export const SUMMATION_GROUPS_CONFIG = [
  { name: 'Gezondheidsgevaren', icon: FlaskConical, group: 'health' },
  { name: 'Fysische gevaren', icon: Flame, group: 'physical' },
  { name: 'Milieugevaren', icon: Leaf, group: 'environment' },
  { name: 'Overige gevaren', icon: AlertTriangle, group: 'other' },
  { name: 'Benoemde Stoffen', icon: Atom, group: 'named' },
] as const;

/**
 * Gets the correct ARIE threshold for a category ID.
 * Returns null if the category is not relevant for ARIE (like P5).
 */
export function getArieThreshold(catId: string): number | null {
  // 1. Check explicit ARIE map first
  if (ARIE_THRESHOLDS[catId] !== undefined) return ARIE_THRESHOLDS[catId];
  
  // 2. Check named substances
  const named = Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
  if (named) return named.arieThreshold ?? named.threshold.low;
  
  return null;
}

export function classifySubstance(hStatements: string[], casNumber: string | null): { sevesoCategoryIds: string[], arieCategoryIds: string[], isNamed: boolean, namedSubstanceName: string | null } {
  const hCodes = hStatements.map(h => h.split(' ')[0].toUpperCase());
  const sevesoCategoryIds = new Set<string>();
  const arieCategoryIds = new Set<string>();

  hCodes.forEach(code => {
    if (H_PHRASE_MAPPING[code]) {
      H_PHRASE_MAPPING[code].forEach(catId => {
        // Seveso indeling
        if (SEVESO_THRESHOLDS[catId]) {
          sevesoCategoryIds.add(catId);
        }
        // ARIE indeling: Alleen toevoegen als er een drempelwaarde is.
        // Omdat P5-categorieën niet in ARIE_THRESHOLDS staan, worden ze hier gefilterd.
        const arieThreshold = getArieThreshold(catId);
        if (arieThreshold !== null || catId.startsWith('ARIE-')) {
          arieCategoryIds.add(catId);
        }
      });
    }
  });

  let isNamed = false;
  let namedSubstanceName = null;
  if(casNumber && NAMED_SUBSTANCES[casNumber]) {
    const named = NAMED_SUBSTANCES[casNumber];
    sevesoCategoryIds.add(named.id);
    arieCategoryIds.add(named.id);
    isNamed = true;
    namedSubstanceName = named.name;
  }
  
  return { 
    sevesoCategoryIds: Array.from(sevesoCategoryIds), 
    arieCategoryIds: Array.from(arieCategoryIds), 
    isNamed, 
    namedSubstanceName 
  };
}

export function calculateSummations(inventory: Substance[], mode: ThresholdMode): { 
  summationGroups: SummationGroup[],
  arieSummationGroups: SummationGroup[],
  overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel', 
  criticalGroup: string | null,
  arieTotal: number,
  arieExceeded: boolean,
  criticalArieGroup: string | null,
} {
  const sevesoGroupTotals: Record<string, number> = { health: 0, physical: 0, environment: 0, other: 0, named: 0 };
  const arieGroupTotals: Record<string, number> = { health: 0, physical: 0, environment: 0, other: 0, named: 0 };
  
  inventory.forEach(substance => {
    if (substance.quantity > 0) {
      // Seveso Aggregation
      const sevesoMaxPerGroup: Record<string, number> = {};
      substance.sevesoCategoryIds.forEach(catId => {
        const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
        const thresholdInfo = SEVESO_THRESHOLDS[catId] || (category as any)?.threshold;
        if (category && thresholdInfo) {
          const threshold = thresholdInfo[mode];
          if (threshold > 0) {
            const ratio = substance.quantity / threshold;
            const group = category.group;
            if (!sevesoMaxPerGroup[group] || ratio > sevesoMaxPerGroup[group]) sevesoMaxPerGroup[group] = ratio;
          }
        }
      });
      for (const group in sevesoMaxPerGroup) {
        sevesoGroupTotals[group] = (sevesoGroupTotals[group] || 0) + sevesoMaxPerGroup[group];
      }

      // ARIE Aggregation
      const arieMaxPerGroup: Record<string, number> = {};
      substance.arieCategoryIds.forEach(catId => {
        const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
        const arieThreshold = getArieThreshold(catId);
        if (category && arieThreshold && arieThreshold > 0) {
          const ratio = substance.quantity / arieThreshold;
          const group = (category as any).primaryGroup || category.group;
          if (!arieMaxPerGroup[group] || ratio > arieMaxPerGroup[group]) arieMaxPerGroup[group] = ratio;
        }
      });
      for (const group in arieMaxPerGroup) {
        arieGroupTotals[group] = (arieGroupTotals[group] || 0) + arieMaxPerGroup[group];
      }
    }
  });

  const summationGroups: SummationGroup[] = SUMMATION_GROUPS_CONFIG.map(config => ({
    ...config,
    totalRatio: (sevesoGroupTotals[config.group] || 0),
    isExceeded: (sevesoGroupTotals[config.group] || 0) >= 1,
    categoryContributions: {},
  }));
  
  const arieSummationGroups: SummationGroup[] = SUMMATION_GROUPS_CONFIG.map(config => ({
    ...config,
    totalRatio: (arieGroupTotals[config.group] || 0),
    isExceeded: (arieGroupTotals[config.group] || 0) >= 1, 
    categoryContributions: {},
  }));

  const arieMaxRatio = Math.max(...Object.values(arieGroupTotals), 0);
  const isHighSeveso = summationGroups.some(g => g.totalRatio >= 1 && mode === 'high');
  const isLowSeveso = summationGroups.some(g => g.totalRatio >= 1);

  let overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel' = 'Geen';
  if (isHighSeveso) overallStatus = 'Hogedrempel';
  else if (isLowSeveso) overallStatus = 'Lagedrempel';

  const critS = [...summationGroups].sort((a, b) => b.totalRatio - a.totalRatio)[0];
  const critA = [...arieSummationGroups].sort((a, b) => b.totalRatio - a.totalRatio)[0];
  
  return { 
    summationGroups, 
    arieSummationGroups, 
    overallStatus, 
    arieTotal: arieMaxRatio, 
    arieExceeded: arieMaxRatio >= 1,
    criticalGroup: critS && critS.totalRatio > 0 ? critS.name : null, 
    criticalArieGroup: critA && critA.totalRatio > 0 ? critA.name : null,
  };
}

export const SEVESO_CATEGORY_REFERENCE = Object.keys(SEVESO_THRESHOLDS).map(catId => {
    const cat = ALL_CATEGORIES[catId];
    const hPhrases = Object.entries(H_PHRASE_MAPPING).filter(([_, cats]) => cats.includes(catId)).map(([h]) => h).join(', ');
    return { categoryId: cat.displayId || cat.id, categoryName: cat.name, hPhrase: hPhrases || 'Specifiek', low: SEVESO_THRESHOLDS[catId].low, high: SEVESO_THRESHOLDS[catId].high };
}).sort((a,b) => a.categoryId.localeCompare(b.categoryId, undefined, {numeric: true}));

export const ARIE_REFERENCE_GUIDE_DATA = Object.keys(ARIE_THRESHOLDS).map(catId => {
    const cat = ALL_CATEGORIES[catId];
    const hPhrases = Object.entries(H_PHRASE_MAPPING).filter(([_, cats]) => cats.includes(catId)).map(([h]) => h).join(', ');
    return { categoryId: cat.displayId || cat.id, categoryName: cat.name, hPhrase: hPhrases || 'Specifiek', threshold: ARIE_THRESHOLDS[catId] };
}).sort((a,b) => a.categoryId.localeCompare(b.categoryId, undefined, {numeric: true}));

export const SEVESO_NAMED_REFERENCE = Object.values(NAMED_SUBSTANCES).map(s => ({ categoryId: s.name, hPhrase: s.cas, low: s.threshold.low, high: s.threshold.high, arie: s.arieThreshold || s.threshold.low }));
export const ARIE_NAMED_REFERENCE = Object.values(NAMED_SUBSTANCES).map(s => ({ categoryId: s.name, hPhrase: s.cas, threshold: s.arieThreshold || s.threshold.low }));
