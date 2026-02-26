"use client";

import type { Substance, HazardCategory, NamedSubstance, ThresholdMode, SummationGroup } from '@/lib/types';
import { FlaskConical, Flame, Leaf, AlertTriangle, Atom } from 'lucide-react';

// Master list of all hazard categories (Seveso & ARIE)
export const ALL_CATEGORIES: Record<string, HazardCategory> = {
  // Gezondheid
  H1: { id: 'H1', name: 'H1: Acuut toxisch, cat. 1', group: 'health', displayId: 'H1' },
  H2: { id: 'H2', name: 'H2: Acuut toxisch, cat. 2 + cat. 3 (inad.)', group: 'health', displayId: 'H2' },
  H3: { id: 'H3', name: 'H3: Acuut toxisch cat. 3 / STOT SE cat. 1', group: 'health', displayId: 'H3' },
  H4: { id: 'H4', name: 'H4: Huidcorrosie/-irritatie cat. 1', group: 'health', displayId: 'H4' },
  
  // Fysiek
  P1a: { id: 'P1a', name: 'P1a: Explosieven (instabiel)', group: 'physical', displayId: 'P1a' },
  P1b: { id: 'P1b', name: 'P1b: Explosieven (1.4)', group: 'physical', displayId: 'P1b' },
  P2: { id: 'P2', name: 'P2: Ontvlambare gassen', group: 'physical', displayId: 'P2' },
  P3a: { id: 'P3a', name: 'P3a: Ontvlambare aerosolen (LPG/vloeistof)', group: 'physical', displayId: 'P3a' },
  P3b: { id: 'P3b', name: 'P3b: Ontvlambare aerosolen (overig)', group: 'physical', displayId: 'P3b' },
  P4: { id: 'P4', name: 'P4: Oxiderende gassen', group: 'physical', displayId: 'P4' },
  P5a: { id: 'P5a', name: 'P5a: Ontvlambare vloeistoffen (cat 1)', group: 'physical', displayId: 'P5a' },
  P5b: { id: 'P5b', name: 'P5b: Ontvlambare vloeistoffen (procescondities)', group: 'physical', displayId: 'P5b' },
  P5c: { id: 'P5c', name: 'P5c: Ontvlambare vloeistoffen (cat 2/3)', group: 'physical', displayId: 'P5c' },
  P6a: { id: 'P6a', name: 'P6a: Zelfontledend/Org. peroxiden Type A/B', group: 'physical', displayId: 'P6a' },
  P6b: { id: 'P6b', name: 'P6b: Zelfontledend/Org. peroxiden Type C-F', group: 'physical', displayId: 'P6b' },
  P7: { id: 'P7', name: 'P7: Pyrofore vloeistoffen/vaste stoffen', group: 'physical', displayId: 'P7' },
  P8: { id: 'P8', name: 'P8: Oxiderende vloeistoffen/vaste stoffen', group: 'physical', displayId: 'P8' },
  P9: { id: 'P9', name: 'P9: Zelfverhittende stoffen', group: 'physical', displayId: 'P9' },
  
  // Milieu (Seveso focus)
  E1: { id: 'E1', name: 'E1: Aquatisch acuut 1 / chronisch 1', group: 'environment', displayId: 'E1' },
  E2: { id: 'E2', name: 'E2: Aquatisch chronisch 2', group: 'environment', displayId: 'E2' },
  
  // Overig
  O1: { id: 'O1', name: 'O1: EUH014 (reageert heftig met water)', group: 'other', displayId: 'O1' },
  O2: { id: 'O2', name: 'O2: Ontwikkelt ontvlambare gassen, cat 1', group: 'other', displayId: 'O2' },
  O3: { id: 'O3', name: 'O3: EUH029 (vormt giftig gas met water)', group: 'other', displayId: 'O3' },
  O4: { id: 'O4', name: 'O4: Zelfontledende stoffen/peroxiden', group: 'other', displayId: 'O4' },
};

export const NAMED_SUBSTANCES: Record<string, NamedSubstance> = {
  '6484-52-2': { id: 'Ammoniumnitraat-1', cas: '6484-52-2', name: 'Ammoniumnitraat (onzuiverheden < 0,2%)', group: 'named', threshold: { low: 5000, high: 10000 }, arieThreshold: 5000 },
  '7757-79-1': { id: 'Kaliumnitraat', cas: '7757-79-1', name: 'Kaliumnitraat (samengestelde meststof)', group: 'named', threshold: { low: 5000, high: 10000 }, arieThreshold: 5000 },
  '1303-28-2': { id: 'Arseenpentoxide', cas: '1303-28-2', name: 'Arseenpentoxide, arseenzuur (V) en zouten', group: 'named', threshold: { low: 1, high: 2 }, arieThreshold: 1 },
  '1327-53-3': { id: 'Arseentrioxide', cas: '1327-53-3', name: 'Arseentrioxide, arseenigzuur (III) en zouten', group: 'named', threshold: { low: 0.1, high: 0.1 }, arieThreshold: 0.1 },
  '7726-95-6': { id: 'Broom', cas: '7726-95-6', name: 'Broom', group: 'named', threshold: { low: 20, high: 100 }, arieThreshold: 20 },
  '7782-50-5': { id: 'Chloor', cas: '7782-50-5', name: 'Chloor', group: 'named', threshold: { low: 10, high: 25 }, arieThreshold: 10 },
  '7782-41-4': { id: 'Fluor', cas: '7782-41-4', name: 'Fluor', group: 'named', threshold: { low: 10, high: 20 }, arieThreshold: 10 },
  '50-00-0': { id: 'Formaldehyde', cas: '50-00-0', name: 'Formaldehyde (conc. >= 90%)', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '1333-74-0': { id: 'Waterstof', cas: '1333-74-0', name: 'Waterstof', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '7647-01-0': { id: 'Waterstofchloride', cas: '7647-01-0', name: 'Waterstofchloride (vloeibaar)', group: 'named', threshold: { low: 25, high: 250 }, arieThreshold: 25 },
  '74-86-2': { id: 'Acetyleen', cas: '74-86-2', name: 'Acetyleen', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '75-21-8': { id: 'Ethyleenoxide', cas: '75-21-8', name: 'Ethyleenoxide', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '75-56-9': { id: 'Propyleenoxide', cas: '75-56-9', name: 'Propyleenoxide', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '67-56-1': { id: 'Methanol', cas: '67-56-1', name: 'Methanol', group: 'named', threshold: { low: 500, high: 5000 }, arieThreshold: 500 },
  '101-14-4': { id: 'MOCA', cas: '101-14-4', name: '4,4-Methyleen-bis(2-chlooraniline)', group: 'named', threshold: { low: 0.01, high: 0.01 }, arieThreshold: 0.01 },
  '624-83-9': { id: 'Methylisocyanaat', cas: '624-83-9', name: 'Methylisocyanaat', group: 'named', threshold: { low: 0.15, high: 0.15 }, arieThreshold: 0.15 },
  '7782-44-7': { id: 'Zuurstof', cas: '7782-44-7', name: 'Zuurstof', group: 'named', threshold: { low: 200, high: 2000 }, arieThreshold: 200 },
  '26471-62-5': { id: 'TDI', cas: '26471-62-5', name: 'Tolueendiisocyanaat (2,4 en 2,6 mengsel)', group: 'named', threshold: { low: 10, high: 100 }, arieThreshold: 10 },
  '75-44-5': { id: 'Fosgeen', cas: '75-44-5', name: 'Carbonylchloride (fosgeen)', group: 'named', threshold: { low: 0.3, high: 0.75 }, arieThreshold: 0.3 },
  '7784-42-1': { id: 'Arsine', cas: '7784-42-1', name: 'Arsine (arseentrihydride)', group: 'named', threshold: { low: 0.2, high: 1 }, arieThreshold: 0.2 },
  '7803-51-2': { id: 'Fosfine', cas: '7803-51-2', name: 'Fosfine (fosfortrihydride)', group: 'named', threshold: { low: 0.2, high: 1 }, arieThreshold: 0.2 },
  '10545-99-0': { id: 'Zwaveldichloride', cas: '10545-99-0', name: 'Zwaveldichloride', group: 'named', threshold: { low: 1, high: 1 }, arieThreshold: 1 },
  '7446-11-9': { id: 'Zwaveltrioxide', cas: '7446-11-9', name: 'Zwaveltrioxide', group: 'named', threshold: { low: 15, high: 75 }, arieThreshold: 15 },
  '7664-41-7': { id: 'Ammoniak', cas: '7664-41-7', name: 'Ammoniak (watervrij)', group: 'named', threshold: { low: 50, high: 200 }, arieThreshold: 50 },
  '7637-07-2': { id: 'Boriumtrifluoride', cas: '7637-07-2', name: 'Boriumtrifluoride', group: 'named', threshold: { low: 5, high: 20 }, arieThreshold: 5 },
  '7783-06-4': { id: 'Waterstofsulfide', cas: '7783-06-4', name: 'Waterstofsulfide', group: 'named', threshold: { low: 5, high: 20 }, arieThreshold: 5 },
  '110-89-4': { id: 'Piperidine', cas: '110-89-4', name: 'Piperidine', group: 'named', threshold: { low: 50, high: 200 }, arieThreshold: 50 },
  '10102-43-9': { id: 'Stikstofmonoxide', cas: '10102-43-9', name: 'Stikstofmonoxide', group: 'named', threshold: { low: 25, high: 25 }, arieThreshold: 25 },
  '10102-44-0': { id: 'Stikstofdioxide', cas: '10102-44-0', name: 'Stikstofdioxide', group: 'named', threshold: { low: 1, high: 20 }, arieThreshold: 1 },
  '7446-09-5': { id: 'Zwaveldioxide', cas: '7446-09-5', name: 'Zwaveldioxide', group: 'named', threshold: { low: 15, high: 75 }, arieThreshold: 15 },
  '92-67-1': { id: '4-Aminobifenyl', cas: '92-67-1', name: '4-Aminobifenyl en/of de zouten daarvan', group: 'named', threshold: { low: 0.01, high: 0.01 }, arieThreshold: 0.01 },
  '98-07-7': { id: 'Benzotrichloride', cas: '98-07-7', name: 'Benzotrichloride', group: 'named', threshold: { low: 0.5, high: 2 }, arieThreshold: 0.5 },
  '100-44-7': { id: 'Benzylchloride', cas: '100-44-7', name: 'Benzylchloride', group: 'named', threshold: { low: 0.5, high: 2 }, arieThreshold: 0.5 },
  '75-55-8': { id: '1-2-Propyleenimine', cas: '75-55-8', name: '1,2-Propyleenimine', group: 'named', threshold: { low: 50, high: 200 }, arieThreshold: 50 },
  'PETROLEUM': { id: 'Petroleum-Producten', cas: 'PETROLEUM', name: 'Petroleumproducten en alternatieve brandstoffen', group: 'named', threshold: { low: 2500, high: 25000 }, arieThreshold: 2500 },
};

export const SEVESO_THRESHOLDS: Record<string, { low: number, high: number }> = {
  H1: { low: 5, high: 20 }, H2: { low: 50, high: 200 }, H3: { low: 50, high: 200 }, H4: { low: 0, high: 0 },
  P1a: { low: 10, high: 50 }, P1b: { low: 50, high: 200 }, P2: { low: 10, high: 50 },
  P3a: { low: 150, high: 500 }, P3b: { low: 5000, high: 50000 }, P4: { low: 50, high: 200 },
  P5a: { low: 10, high: 50 }, P5b: { low: 50, high: 200 }, P5c: { low: 5000, high: 50000 },
  P6a: { low: 10, high: 50 }, P6b: { low: 50, high: 200 }, P7: { low: 50, high: 200 }, P8: { low: 50, high: 200 },
  P9: { low: 50, high: 200 },
  E1: { low: 100, high: 200 }, E2: { low: 200, high: 500 },
  O1: { low: 100, high: 500 }, O2: { low: 10, high: 50 }, O3: { low: 50, high: 200 },
};

export const ARIE_THRESHOLDS: Record<string, number> = {
  H1: 1.5, H2: 15, H3: 15, H4: 15,
  P1a: 3, P1b: 3, P2: 3, P5a: 3, P5b: 15, P5c: 1500,
  P6a: 3, P6b: 15, P7: 15, P9: 15,
  O1: 30, O2: 30, O3: 15, O4: 15,
};

export const H_PHRASE_MAPPING: Record<string, string[]> = {
  'H300': ['H1'], 'H310': ['H1'], 'H330': ['H1'],
  'H301': ['H2'], 'H311': ['H2'], 'H331': ['H2'],
  'H370': ['H3'],
  'H314': ['H4'],
  'H200': ['P1a'], 'H201': ['P1a'], 'H202': ['P1a'], 'H203': ['P1a'], 'H205': ['P1a'],
  'H204': ['P1b'],
  'H220': ['P2'], 'H221': ['P2'],
  'H222': ['P3a', 'P3b'], 'H223': ['P3a', 'P3b'],
  'H224': ['P5a'], 'H225': ['P5c'], 'H226': ['P5c'],
  'H240': ['P6a'], 'H241': ['P6a'], 'H242': ['P6b'], 
  'H250': ['P7'], 'H251': ['P9'], 'H252': ['P9'],
  'H270': ['P4'], 'H271': ['P8'], 'H272': ['P8'],
  'H400': ['E1'], 'H410': ['E1'], 'H411': ['E2'],
  'EUH014': ['O1'], 'H260': ['O2'], 'EUH029': ['O3'], 'EUH001': ['O4'],
};

export function classifySubstance(hStatements: string[], casNumber: string | null) {
  const sevesoCategoryIds = new Set<string>();
  const arieCategoryIds = new Set<string>();
  let isNamed = false;
  let namedSubstanceName = null;

  if (casNumber && NAMED_SUBSTANCES[casNumber]) {
    isNamed = true;
    const ns = NAMED_SUBSTANCES[casNumber];
    namedSubstanceName = ns.name;
    sevesoCategoryIds.add(ns.id);
    if (ns.arieThreshold !== undefined) {
      arieCategoryIds.add(ns.id);
    }
  }

  hStatements.forEach(h => {
    const code = h.split(' ')[0].toUpperCase();
    const cats = H_PHRASE_MAPPING[code] || [];
    cats.forEach(catId => {
      if (SEVESO_THRESHOLDS[catId]) {
        sevesoCategoryIds.add(catId);
      }
      if (ARIE_THRESHOLDS[catId]) {
        arieCategoryIds.add(catId);
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
  const arieGroups: Record<string, number> = { health: 0, physical: 0, other: 0, named: 0 };

  inventory.forEach(sub => {
    // --- SEVESO ---
    let isAppliedAsNamedSeveso = false;
    sub.sevesoCategoryIds.forEach(catId => {
      const namedSub = Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
      if (namedSub) {
          const threshold = namedSub.threshold[mode];
          if (threshold > 0) {
              groups.named += sub.quantity / threshold;
              isAppliedAsNamedSeveso = true;
          }
      }
    });

    if (!isAppliedAsNamedSeveso) {
        sub.sevesoCategoryIds.forEach(catId => {
          const category = ALL_CATEGORIES[catId];
          const thresholdInfo = SEVESO_THRESHOLDS[catId];
          if (category && thresholdInfo) {
            const threshold = thresholdInfo[mode];
            if (threshold > 0) {
              groups[category.group] += sub.quantity / threshold;
            }
          }
        });
    }

    // --- ARIE ---
    let isAppliedAsNamedArie = false;
    sub.arieCategoryIds.forEach(catId => {
      const namedSub = Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
      if (namedSub && namedSub.arieThreshold !== undefined) {
          if (namedSub.arieThreshold > 0) {
              const ratio = sub.quantity / namedSub.arieThreshold;
              arieGroups.named += ratio;
              isAppliedAsNamedArie = true;
          }
      }
    });

    if (!isAppliedAsNamedArie) {
        sub.arieCategoryIds.forEach(catId => {
          const category = ALL_CATEGORIES[catId];
          const threshold = ARIE_THRESHOLDS[catId];
          if (category && threshold > 0) {
            const ratio = sub.quantity / threshold;
            if (arieGroups[category.group] !== undefined) {
              arieGroups[category.group] += ratio;
            }
          }
        });
    }
  });

  const summationGroups: SummationGroup[] = [
    { name: 'Gezondheid', icon: FlaskConical, group: 'health', totalRatio: groups.health, isExceeded: groups.health >= 1 },
    { name: 'Fysiek', icon: Flame, group: 'physical', totalRatio: groups.physical, isExceeded: groups.physical >= 1 },
    { name: 'Milieu', icon: Leaf, group: 'environment', totalRatio: groups.environment, isExceeded: groups.environment >= 1 },
    { name: 'Overig', icon: AlertTriangle, group: 'other', totalRatio: groups.other, isExceeded: groups.other >= 1 },
    { name: 'Benoemde Stoffen', icon: Atom, group: 'named', totalRatio: groups.named, isExceeded: groups.named >= 1 },
  ];

  const arieSummationGroups: SummationGroup[] = [
    { name: 'Gezondheid', icon: FlaskConical, group: 'health', totalRatio: arieGroups.health, isExceeded: arieGroups.health >= 1 },
    { name: 'Fysiek', icon: Flame, group: 'physical', totalRatio: arieGroups.physical, isExceeded: arieGroups.physical >= 1 },
    { name: 'Andere gevaren', icon: AlertTriangle, group: 'other', totalRatio: arieGroups.other, isExceeded: arieGroups.other >= 1 },
    { name: 'Benoemde Stoffen', icon: Atom, group: 'named', totalRatio: arieGroups.named, isExceeded: arieGroups.named >= 1 },
  ];

  let overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel' = 'Geen';
  if (summationGroups.some(g => g.isExceeded)) {
    overallStatus = mode === 'high' ? 'Hogedrempel' : 'Lagedrempel';
  }

  const criticalGroup = [...summationGroups].sort((a, b) => b.totalRatio - a.totalRatio)[0]?.name;
  
  // ARIE status logic: exceeded if any individual group is >= 1
  const arieExceeded = arieSummationGroups.some(g => g.isExceeded);
  const criticalArieGroup = [...arieSummationGroups].sort((a, b) => b.totalRatio - a.totalRatio)[0]?.name;

  return { 
    summationGroups, 
    arieSummationGroups, 
    overallStatus, 
    criticalGroup,
    arieExceeded,
    criticalArieGroup,
    arieTotal: Math.max(...arieSummationGroups.map(g => g.totalRatio)) // Show max ratio as representative total
  };
}

export const SEVESO_CATEGORY_REFERENCE = Object.keys(SEVESO_THRESHOLDS).map(id => ({
  categoryId: ALL_CATEGORIES[id]?.displayId || id,
  categoryName: ALL_CATEGORIES[id]?.name || 'Onbekend',
  hPhrase: Object.keys(H_PHRASE_MAPPING).filter(h => H_PHRASE_MAPPING[h].includes(id)).join(', '),
  low: SEVESO_THRESHOLDS[id].low,
  high: SEVESO_THRESHOLDS[id].high
}));

export const SEVESO_NAMED_REFERENCE = Object.values(NAMED_SUBSTANCES).map(sub => ({
  categoryId: sub.name,
  categoryName: 'Benoemde stof',
  hPhrase: `CAS: ${sub.cas}`,
  low: sub.threshold.low,
  high: sub.threshold.high,
  arie: sub.arieThreshold
})).sort((a, b) => a.categoryId.localeCompare(b.categoryId));

export const ARIE_NAMED_REFERENCE = Object.values(NAMED_SUBSTANCES)
  .filter(sub => sub.arieThreshold !== undefined)
  .map(sub => ({
    categoryId: sub.name,
    categoryName: 'Benoemde stof',
    hPhrase: `CAS: ${sub.cas}`,
    threshold: sub.arieThreshold!
  }))
  .sort((a, b) => a.categoryId.localeCompare(b.categoryId));

export const ARIE_REFERENCE_GUIDE_DATA = Object.keys(ARIE_THRESHOLDS).map(id => ({
  categoryId: ALL_CATEGORIES[id]?.displayId || id,
  categoryName: ALL_CATEGORIES[id]?.name || 'Onbekend',
  hPhrase: Object.keys(H_PHRASE_MAPPING).filter(h => H_PHRASE_MAPPING[h].includes(id)).join(', '),
  threshold: ARIE_THRESHOLDS[id]
}));
