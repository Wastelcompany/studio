"use client";

import type { Substance, HazardCategory, NamedSubstance, ThresholdMode, SummationGroup } from '@/lib/types';
import { FlaskConical, Flame, Leaf, AlertTriangle, Atom, Briefcase, Droplets } from 'lucide-react';

// Master list of all hazard categories (Seveso & ARIE)
export const ALL_CATEGORIES: Record<string, HazardCategory> = {
  // SEVESO Categories
  H1: { id: 'H1', name: 'Acuut toxisch, categorie 1 (alle blootstellingsroutes)', group: 'health' },
  H2: { id: 'H2', name: 'Acuut toxisch, categorie 2 (alle) & cat. 3 (inademing)', group: 'health' },
  H3: { id: 'H3', name: 'STOT eenmalig, cat. 1', group: 'health' },
  
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
  P6b: { id: 'P6b', name: 'Zelfontledende stoffen & Organische peroxiden, Type C-F', group: 'physical' },
  P7: { id: 'P7', name: 'Pyrofore vloeistoffen en vaste stoffen, categorie 1', group: 'physical' },
  P8: { id: 'P8', name: 'Oxiderende vloeistoffen en vaste stoffen, cat 1, 2, 3', group: 'physical' },
  
  E1: { id: 'E1', name: 'Gevaarlijk voor het aquatisch milieu, acuut 1 of chronisch 1', group: 'environment' },
  E2: { id: 'E2', name: 'Gevaarlijk voor het aquatisch milieu, chronisch 2', group: 'environment' },
  
  O1: { id: 'O1', name: 'Stoffen met gevarenaanduiding EUH014', group: 'other' },
  O2: { id: 'O2', name: 'Stoffen die in contact met water ontvlambare gassen ontwikkelen (Cat 1)', group: 'other' },
  O3: { id: 'O3', name: 'Stoffen met gevarenaanduiding EUH029', group: 'other' },

  // ARIE Specific Categories
  H4: { id: 'H4', name: 'Huidcorrosie, categorie 1A, 1B of 1C (H314)', group: 'health', displayId: 'H4 (Huid)' },
  'ARIE-P1a-sub3': { id: 'ARIE-P1a-sub3', name: 'Stoffen met explosieve eigenschappen (zonder 1.1-1.6)', group: 'physical', displayId: 'P1a (sub 3)' },
  'ARIE-P6a-1': { id: 'ARIE-P6a-1', name: 'Zelfontledende stoffen (Type A/B)', group: 'physical', displayId: 'P6a (Zelfontl.)' },
  'ARIE-P6a-2': { id: 'ARIE-P6a-2', name: 'Organische peroxiden (Type A/B)', group: 'physical', displayId: 'P6a (Org. Perox.)' },
  'ARIE-Vl-1': { id: 'ARIE-Vl-1', name: 'Ontvlambare vloeistoffen, cat. 1', group: 'physical', displayId: 'Vl.stof 1' },
  'ARIE-Vl-2': { id: 'ARIE-Vl-2', name: 'Ontvlambare vloeistoffen, cat. 2', group: 'physical', displayId: 'Vl.stof 2' },
  'ARIE-Vl-3': { id: 'ARIE-Vl-3', name: 'Ontvlambare vloeistoffen, cat. 3', group: 'physical', displayId: 'Vl.stof 3' },
  'ARIE-O4': { id: 'ARIE-O4', name: 'Stoffen met EUH001', group: 'other', displayId: 'O4 (EUH001)' },
  'ARIE-CMR': { id: 'ARIE-CMR', name: 'CMR-stoffen cat 1A/1B', group: 'health', displayId: 'CMR' },
};

export const NAMED_SUBSTANCES: Record<string, NamedSubstance> = {
  '67-56-1': { id: 'Methanol', cas: '67-56-1', name: 'Methanol', group: 'named', threshold: { low: 500, high: 5000 } },
  '1333-74-0': { id: 'Waterstof', cas: '1333-74-0', name: 'Waterstof', group: 'named', threshold: { low: 5, high: 50 } },
  '7782-44-7': { id: 'Zuurstof', cas: '7782-44-7', name: 'Zuurstof', group: 'named', threshold: { low: 200, high: 2000 } },
  '7782-50-5': { id: 'Chloor', cas: '7782-50-5', name: 'Chloor', group: 'named', threshold: { low: 10, high: 25 } },
  '75-21-8': { id: 'Ethyleenoxide', cas: '75-21-8', name: 'Ethyleenoxide', group: 'named', threshold: { low: 5, high: 50 } },
  '75-56-9': { id: 'Propyleenoxide', cas: '75-56-9', name: 'Propyleenoxide', group: 'named', threshold: { low: 5, high: 50 } },
};

export const SEVESO_THRESHOLDS: Record<string, { low: number, high: number }> = {
  H1: { low: 5, high: 20 }, H2: { low: 50, high: 200 }, H3: { low: 50, high: 200 },
  P1a: { low: 10, high: 50 }, P1b: { low: 50, high: 200 }, P2: { low: 10, high: 50 },
  P3a: { low: 150, high: 500 }, P3b: { low: 5000, high: 50000 }, P4: { low: 50, high: 200 },
  P5a: { low: 10, high: 50 }, P5b: { low: 50, high: 200 }, P5c: { low: 5000, high: 50000 },
  P6a: { low: 10, high: 50 }, P6b: { low: 50, high: 200 }, P7: { low: 50, high: 200 }, P8: { low: 50, high: 200 },
  E1: { low: 100, high: 200 }, E2: { low: 200, high: 500 },
  O1: { low: 100, high: 500 }, O2: { low: 100, high: 500 }, O3: { low: 50, high: 200 },
};

export const ARIE_THRESHOLDS: Record<string, number> = {
  H1: 0.05, H2: 0.2, H3: 1, H4: 50, 'ARIE-CMR': 0.5,
  P1a: 0.05, 'ARIE-P1a-sub3': 0.05, P1b: 1, P2: 5, P3a: 5, P3b: 50, P4: 5,
  'ARIE-P6a-1': 0.05, 'ARIE-P6a-2': 0.05, 'ARIE-Vl-1': 1, 'ARIE-Vl-2': 10, 'ARIE-Vl-3': 100,
  O1: 0.5, O2: 0.05, O3: 0.5, 'ARIE-O4': 0.05,
};

export const H_PHRASE_MAPPING: Record<string, string[]> = {
  'H300': ['H1', 'H2'], 'H310': ['H1', 'H2'], 'H330': ['H1', 'H2'],
  'H331': ['H2'], 'H370': ['H3'], 'H314': ['H4'],
  'H340': ['ARIE-CMR'], 'H350': ['ARIE-CMR'], 'H360': ['ARIE-CMR'],
  'H200': ['P1a'], 'H201': ['P1a'], 'H202': ['P1a'], 'H203': ['P1a'], 'H205': ['P1a'],
  'EUH001': ['ARIE-O4', 'ARIE-P1a-sub3'], 'H204': ['P1b'],
  'H220': ['P2'], 'H221': ['P2'], 'H222': ['P3a', 'P3b'], 'H223': ['P3a', 'P3b'],
  'H224': ['P5a', 'ARIE-Vl-1'], 'H225': ['P5c', 'ARIE-Vl-2'], 'H226': ['P5c', 'ARIE-Vl-3'],
  'H240': ['P6a', 'ARIE-P6a-1', 'ARIE-P6a-2'], 'H241': ['P6a', 'ARIE-P6a-1', 'ARIE-P6a-2'],
  'H242': ['P6b'], 'H250': ['P7'], 'H270': ['P4'], 'H271': ['P8'], 'H272': ['P8'],
  'H400': ['E1'], 'H410': ['E1'], 'H411': ['E2'],
  'EUH014': ['O1'], 'H260': ['O2'], 'EUH029': ['O3'],
};

export const H_PHRASE_DESCRIPTIONS: Record<string, string> = {
  'H200': 'Ontplofbaar, gevaar voor massa-explosie',
  'H220': 'Zeer licht ontvlambaar gas',
  'H224': 'Zeer licht ontvlambare vloeistof en damp',
  'H300': 'Dodelijk bij inslikken',
  'H314': 'Veroorzaakt ernstige brandwonden en oogletsel',
  'H350': 'Kan kanker veroorzaken',
  'H400': 'Zeer giftig voor in het water levende organismen',
  'EUH001': 'In droge toestand ontplofbaar',
  'EUH014': 'Reageert heftig met water',
};

export function classifySubstance(hStatements: string[], casNumber: string | null) {
  const sevesoCategoryIds = new Set<string>();
  const arieCategoryIds = new Set<string>();
  let isNamed = false;
  let namedSubstanceName = null;

  if (casNumber && NAMED_SUBSTANCES[casNumber]) {
    isNamed = true;
    namedSubstanceName = NAMED_SUBSTANCES[casNumber].name;
    sevesoCategoryIds.add(NAMED_SUBSTANCES[casNumber].id);
  }

  hStatements.forEach(h => {
    const code = h.split(' ')[0].toUpperCase();
    const cats = H_PHRASE_MAPPING[code] || [];
    cats.forEach(catId => {
      if (catId.startsWith('ARIE')) {
        arieCategoryIds.add(catId);
      } else {
        sevesoCategoryIds.add(catId);
        // Map Seveso categories to ARIE equivalent if exists
        if (ARIE_THRESHOLDS[catId]) arieCategoryIds.add(catId);
      }
    });
  });

  return { 
    sevesoCategoryIds: Array.from(sevesoCategoryIds), 
    arieCategoryIds: Array.from(arieCategoryIds), 
    isNamed, 
    namedSubstanceName 
  };
}

export function calculateSummations(inventory: Substance[], mode: ThresholdMode) {
  const groups: Record<string, number> = { health: 0, physical: 0, environment: 0, other: 0, named: 0 };
  const arieGroups: Record<string, number> = { health: 0, physical: 0, environment: 0, other: 0, named: 0 };
  let arieTotal = 0;

  inventory.forEach(sub => {
    sub.sevesoCategoryIds.forEach(catId => {
      const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
      const thresholdInfo = SEVESO_THRESHOLDS[catId] || (category as any)?.threshold;
      if (category && thresholdInfo) {
        const threshold = thresholdInfo[mode];
        if (threshold > 0) groups[category.group] += sub.quantity / threshold;
      }
    });

    sub.arieCategoryIds.forEach(catId => {
      const category = ALL_CATEGORIES[catId];
      const threshold = ARIE_THRESHOLDS[catId];
      if (category && threshold > 0) {
        const ratio = sub.quantity / threshold;
        arieGroups[category.group] += ratio;
        arieTotal += ratio;
      }
    });
  });

  const summationGroups: SummationGroup[] = [
    { name: 'Gezondheid', icon: FlaskConical, group: 'health', totalRatio: groups.health, isExceeded: groups.health >= 1 },
    { name: 'Fysiek', icon: Flame, group: 'physical', totalRatio: groups.physical, isExceeded: groups.physical >= 1 },
    { name: 'Milieu', icon: Leaf, group: 'environment', totalRatio: groups.environment, isExceeded: groups.environment >= 1 },
    { name: 'Overig', icon: AlertTriangle, group: 'other', totalRatio: groups.other, isExceeded: groups.other >= 1 },
    { name: 'Benoemde Stoffen', icon: Atom, group: 'named', totalRatio: groups.named, isExceeded: groups.named >= 1 },
  ];

  const arieSummationGroups: SummationGroup[] = [
    { name: 'Gezondheid', icon: FlaskConical, group: 'health', totalRatio: arieGroups.health, isExceeded: false },
    { name: 'Fysiek', icon: Flame, group: 'physical', totalRatio: arieGroups.physical, isExceeded: false },
    { name: 'Andere gevaren', icon: AlertTriangle, group: 'other', totalRatio: arieGroups.other, isExceeded: false },
  ];

  let overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel' = 'Geen';
  if (summationGroups.some(g => g.isExceeded)) {
    overallStatus = mode === 'high' ? 'Hogedrempel' : 'Lagedrempel';
  }

  const criticalGroup = summationGroups.sort((a, b) => b.totalRatio - a.totalRatio)[0]?.name;

  return { 
    summationGroups, 
    arieSummationGroups, 
    overallStatus, 
    criticalGroup, 
    arieTotal, 
    arieExceeded: arieTotal >= 1 
  };
}

export const SEVESO_CATEGORY_REFERENCE = Object.keys(SEVESO_THRESHOLDS).map(id => ({
  categoryId: id,
  categoryName: ALL_CATEGORIES[id]?.name || 'Benoemde stof',
  hPhrase: Object.keys(H_PHRASE_MAPPING).filter(h => H_PHRASE_MAPPING[h].includes(id)).join(', '),
  low: SEVESO_THRESHOLDS[id].low,
  high: SEVESO_THRESHOLDS[id].high
}));

export const SEVESO_NAMED_REFERENCE = Object.values(NAMED_SUBSTANCES).map(sub => ({
  categoryId: sub.name,
  categoryName: 'Benoemde stof',
  hPhrase: `CAS: ${sub.cas}`,
  low: sub.threshold.low,
  high: sub.threshold.high
}));

export const ARIE_REFERENCE_GUIDE_DATA = Object.keys(ARIE_THRESHOLDS).map(id => ({
  categoryId: ALL_CATEGORIES[id]?.displayId || id,
  categoryName: ALL_CATEGORIES[id]?.name || 'Onbekend',
  hPhrase: Object.keys(H_PHRASE_MAPPING).filter(h => H_PHRASE_MAPPING[h].includes(id)).join(', '),
  threshold: ARIE_THRESHOLDS[id]
}));
