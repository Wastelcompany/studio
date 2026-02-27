"use client";

import type { Substance, HazardCategory, NamedSubstance, ThresholdMode, SummationGroup } from '@/lib/types';
import { FlaskConical, Flame, Leaf, AlertTriangle, Atom } from 'lucide-react';

/**
 * @fileOverview Seveso III and ARIE classification and summation logic.
 * 
 * This file contains the master data for hazard categories, thresholds, 
 * and the logic to classify substances and calculate summations.
 */

// Master list of all hazard categories (Seveso & ARIE)
export const ALL_CATEGORIES: Record<string, HazardCategory> = {
  // SEVESO & ARIE Categories
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
  P6b: { id: 'P6b', name: 'Zelfontledende stoffen & Organische peroxiden, Type C,D,E,F', group: 'physical' },
  P7: { id: 'P7', name: 'Pyrofore vloeistoffen en vaste stoffen, categorie 1', group: 'physical' },
  P8: { id: 'P8', name: 'Oxiderende vloeistoffen en vaste stoffen, cat 1, 2, 3', group: 'physical' },
  
  E1: { id: 'E1', name: 'Gevaarlijk voor het aquatisch milieu, acuut 1 of chronisch 1', group: 'environment' },
  E2: { id: 'E2', name: 'Gevaarlijk voor het aquatisch milieu, chronisch 2', group: 'environment' },
  
  O1: { id: 'O1', name: 'Stoffen met gevarenaanduiding EUH014', group: 'other' },
  O2: { id: 'O2', name: 'Stoffen die in contact met water ontvlambare gassen ontwikkelen (Cat 1)', group: 'other' },
  O3: { id: 'O3', name: 'Stoffen met gevarenaanduiding EUH029', group: 'other' },

  // ARIE Specific Categories
  H4: { id: 'H4', name: 'Huidcorrosie, categorie 1A, 1B of 1C (H314)', group: 'health', displayId: 'H4' },
  'ARIE-CMR': { id: 'ARIE-CMR', name: 'Kankerverwekkend/mutageen/reprotoxisch cat 1A/1B', group: 'health', displayId: 'CMR' },
  'ARIE-O4': { id: 'ARIE-O4', name: 'Stoffen met EUH001 (in droge toestand ontplofbaar)', group: 'other', displayId: 'O4' },
};

// Named substances from Seveso III Directive Annex I Part 2
export const NAMED_SUBSTANCES: Record<string, NamedSubstance> = {
  '6484-52-2-5000': { id: 'Ammoniumnitraat-5000', cas: '6484-52-2', name: 'Ammoniumnitraat (meststoffen, groep 1)', group: 'named', threshold: { low: 5000, high: 10000 }, arieThreshold: 1250 },
  '6484-52-2-1250': { id: 'Ammoniumnitraat-1250', cas: '6484-52-2', name: 'Ammoniumnitraat (meststoffen, groep 2)', group: 'named', threshold: { low: 1250, high: 5000 }, arieThreshold: 350 },
  '6484-52-2-350': { id: 'Ammoniumnitraat-350', cas: '6484-52-2', name: 'Ammoniumnitraat (technisch)', group: 'named', threshold: { low: 350, high: 2500 }, arieThreshold: 10 },
  '6484-52-2-10': { id: 'Ammoniumnitraat-10', cas: '6484-52-2', name: 'Ammoniumnitraat (off-spec/mest)', group: 'named', threshold: { low: 10, high: 50 }, arieThreshold: 10 },
  '7757-79-1-5000': { id: 'Kaliumnitraat-5000', cas: '7757-79-1', name: 'Kaliumnitraat (samengestelde meststoffen)', group: 'named', threshold: { low: 5000, high: 10000 }, arieThreshold: 1250 },
  '7757-79-1-1250': { id: 'Kaliumnitraat-1250', cas: '7757-79-1', name: 'Kaliumnitraat (kristallijn)', group: 'named', threshold: { low: 1250, high: 5000 }, arieThreshold: 1250 },
  '1303-28-2': { id: 'Arseenpentoxide', cas: '1303-28-2', name: 'Arseenpentoxide, arseen(V)zuur en zouten', group: 'named', threshold: { low: 1, high: 2 }, arieThreshold: 1 },
  '1327-53-3': { id: 'Arseentrioxide', cas: '1327-53-3', name: 'Arseentrioxide, arsenig(III)zuur en zouten', group: 'named', threshold: { low: 0.1, high: 0.1 }, arieThreshold: 0.1 },
  '7726-95-6': { id: 'Broom', cas: '7726-95-6', name: 'Broom', group: 'named', threshold: { low: 20, high: 100 }, arieThreshold: 20 },
  '7782-50-5': { id: 'Chloor', cas: '7782-50-5', name: 'Chloor', group: 'named', threshold: { low: 10, high: 25 }, arieThreshold: 10 },
  'Nickel-Comp': { id: 'Nikkelverbindingen', cas: 'Nickel-Comp', name: 'Nikkelverbindingen (poedervorm, inhaleerbaar)', group: 'named', threshold: { low: 1, high: 1 }, arieThreshold: 1 },
  '151-56-4': { id: 'Ethyleenimine', cas: '151-56-4', name: 'Ethyleenimine', group: 'named', threshold: { low: 10, high: 20 }, arieThreshold: 10 },
  '7782-41-4': { id: 'Fluor', cas: '7782-41-4', name: 'Fluor', group: 'named', threshold: { low: 10, high: 20 }, arieThreshold: 10 },
  '50-00-0': { id: 'Formaldehyde', cas: '50-00-0', name: 'Formaldehyde (concentratie ≥ 90%)', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '1333-74-0': { id: 'Waterstof', cas: '1333-74-0', name: 'Waterstof', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '7647-01-0': { id: 'Waterstofchloride', cas: '7647-01-0', name: 'Waterstofchloride (vloeibaar gas)', group: 'named', threshold: { low: 25, high: 250 }, arieThreshold: 25 },
  'Pb-Alkyl': { id: 'Loodalkylen', cas: 'Pb-Alkyl', name: 'Loodalkylen', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '68476-85-7': { id: 'LPG', cas: '68476-85-7', name: 'Vloeibare gassen (LPG)', group: 'named', threshold: { low: 50, high: 200 }, arieThreshold: 50 },
  '8006-14-2': { id: 'Aardgas', cas: '8006-14-2', name: 'Aardgas (vloeibaar/LNG)', group: 'named', threshold: { low: 50, high: 200 }, arieThreshold: 50 },
  '74-86-2': { id: 'Acetyleen', cas: '74-86-2', name: 'Acetyleen', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '75-21-8': { id: 'Ethyleenoxide', cas: '75-21-8', name: 'Ethyleenoxide', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '75-56-9': { id: 'Propyleenoxide', cas: '75-56-9', name: 'Propyleenoxide', group: 'named', threshold: { low: 5, high: 50 }, arieThreshold: 5 },
  '67-56-1': { id: 'Methanol', cas: '67-56-1', name: 'Methanol', group: 'named', threshold: { low: 500, high: 5000 }, arieThreshold: 500 },
  '101-14-4': { id: '4,4-methyleenbis', cas: '101-14-4', name: '4,4\'-methyleenbis(2-chlooraniline)', group: 'named', threshold: { low: 0.01, high: 0.01 }, arieThreshold: 0.01 },
  '624-83-9': { id: 'Methylisocyanaat', cas: '624-83-9', name: 'Methylisocyanaat', group: 'named', threshold: { low: 0.15, high: 0.15 }, arieThreshold: 0.15 },
  '7782-44-7': { id: 'Zuurstof', cas: '7782-44-7', name: 'Zuurstof', group: 'named', threshold: { low: 200, high: 2000 }, arieThreshold: 200 },
  '584-84-9': { id: 'TDI-2,4', cas: '584-84-9', name: '2,4-Tolueendiisocyanaat', group: 'named', threshold: { low: 10, high: 100 }, arieThreshold: 10 },
  '91-08-7': { id: 'TDI-2,6', cas: '91-08-7', name: '2,6-Tolueendiisocyanaat', group: 'named', threshold: { low: 10, high: 100 }, arieThreshold: 10 },
  '26471-62-5': { id: 'TDI-Mix', cas: '26471-62-5', name: 'Tolueendiisocyanaat (mengsel)', group: 'named', threshold: { low: 10, high: 100 }, arieThreshold: 10 },
  '75-44-5': { id: 'Fosgeen', cas: '75-44-5', name: 'Carbonyldichloride (Fosgeen)', group: 'named', threshold: { low: 0.3, high: 0.75 }, arieThreshold: 0.3 },
  '7784-42-1': { id: 'Arsine', cas: '7784-42-1', name: 'Arseenhydride (Arsine)', group: 'named', threshold: { low: 0.2, high: 1 }, arieThreshold: 0.2 },
  '7803-51-2': { id: 'Fosfine', cas: '7803-51-2', name: 'Fosforhydride (Fosfine)', group: 'named', threshold: { low: 0.2, high: 1 }, arieThreshold: 0.2 },
  '10545-99-0': { id: 'Zwaveldichloride', cas: '10545-99-0', name: 'Zwaveldichloride', group: 'named', threshold: { low: 1, high: 1 }, arieThreshold: 1 },
  '7446-11-9': { id: 'Zwaveltrioxide', cas: '7446-11-9', name: 'Zwaveltrioxide', group: 'named', threshold: { low: 15, high: 75 }, arieThreshold: 15 },
  '8006-11-1': { id: 'Petroleum-Benzine', cas: '8006-61-9', name: 'Petroleumproducten (Benzine)', group: 'named', threshold: { low: 2500, high: 25000 }, arieThreshold: 2500 },
  '68334-30-5': { id: 'Petroleum-Diesel', cas: '68334-30-5', name: 'Petroleumproducten (Diesel)', group: 'named', threshold: { low: 2500, high: 25000 }, arieThreshold: 2500 },
  '8008-20-6': { id: 'Petroleum-Kerosine', cas: '8008-20-6', name: 'Petroleumproducten (Kerosine)', group: 'named', threshold: { low: 2500, high: 25000 }, arieThreshold: 2500 },
  'Heavy-Fuel': { id: 'Zware-Stookolie', cas: 'Heavy-Fuel', name: 'Petroleumproducten (Zware stookolie)', group: 'named', threshold: { low: 2500, high: 25000 }, arieThreshold: 2500 },
};

// Seveso III Thresholds (Annex I, Part 1)
export const SEVESO_THRESHOLDS: Record<string, { low: number, high: number }> = {
  H1: { low: 5, high: 20 }, H2: { low: 50, high: 200 }, H3: { low: 50, high: 200 },
  P1a: { low: 10, high: 50 }, P1b: { low: 50, high: 200 }, P2: { low: 10, high: 50 },
  P3a: { low: 150, high: 500 }, P3b: { low: 5000, high: 50000 }, P4: { low: 50, high: 200 },
  P5a: { low: 10, high: 50 }, P5b: { low: 50, high: 200 }, P5c: { low: 5000, high: 50000 },
  P6a: { low: 10, high: 50 }, P6b: { low: 50, high: 200 }, P7: { low: 50, high: 200 }, P8: { low: 50, high: 200 },
  E1: { low: 100, high: 200 }, E2: { low: 200, high: 500 },
  O1: { low: 100, high: 500 }, O2: { low: 100, high: 500 }, O3: { low: 50, high: 200 },
};

// ARIE Thresholds (derived from ARIE regulation Annex I)
export const ARIE_THRESHOLDS: Record<string, number> = {
  H1: 0.05, H2: 0.2, H3: 1, H4: 50, 'ARIE-CMR': 0.5,
  P1a: 0.05, P1b: 1, P2: 5, P3a: 5, P3b: 50, P4: 5,
  P5a: 1, P5b: 10, P5c: 100,
  P6a: 0.05, P6b: 1, P7: 0.05, P8: 1,
  E1: 1, E2: 2,
  O1: 0.5, O2: 0.05, O3: 0.5, 'ARIE-O4': 0.05,
};

// Mapping of H-phrases to Hazard Categories
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

export const H_PHRASE_DESCRIPTIONS: Record<string, string> = {
  'H200': 'Ontplofbaar, gevaar voor massa-explosie',
  'H224': 'Zeer licht ontvlambare vloeistof en damp',
  'H300': 'Dodelijk bij inslikken',
  'H314': 'Veroorzaakt ernstige brandwonden en oogletsel',
  'H340': 'Kan genetische afwijkingen veroorzaken',
  'H350': 'Kan kanker veroorzaken',
  'H360': 'Kan de vruchtbaarheid of het ongeboren kind schaden',
  'H410': 'Zeer giftig voor in het water levende organismen, met langdurige gevolgen',
};

export const SUMMATION_GROUPS_CONFIG = [
  { name: 'Gezondheidsgevaren', icon: FlaskConical, group: 'health' },
  { name: 'Fysische gevaren', icon: Flame, group: 'physical' },
  { name: 'Milieugevaren', icon: Leaf, group: 'environment' },
  { name: 'Overige gevaren', icon: AlertTriangle, group: 'other' },
  { name: 'Benoemde Stoffen', icon: Atom, group: 'named' },
] as const;

export function classifySubstance(hStatements: string[], casNumber: string | null): { sevesoCategoryIds: string[], arieCategoryIds: string[], isNamed: boolean, namedSubstanceName: string | null } {
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
    // Add to Seveso if threshold exists
    if (SEVESO_THRESHOLDS[catId]) {
      sevesoCategoryIds.add(catId);
    }
    
    // Add to ARIE if threshold exists or if it's an ARIE-specific category
    if (ARIE_THRESHOLDS[catId] || catId.startsWith('ARIE-')) {
      arieCategoryIds.add(catId);
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
      // Seveso Summation logic
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
      for (const group in perGroupMaxRatio) sevesoGroupTotals[group] += perGroupMaxRatio[group];

      // ARIE Summation logic
      const perGroupMaxArieRatio: Record<string, number> = {};
      substance.arieCategoryIds.forEach(catId => {
        const category = ALL_CATEGORIES[catId] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === catId);
        const arieThreshold = ARIE_THRESHOLDS[catId] || (category as any)?.arieThreshold || (category as any)?.threshold?.low;
        if (category && arieThreshold && arieThreshold > 0) {
          const ratio = substance.quantity / arieThreshold;
          if (!perGroupMaxArieRatio[category.group] || ratio > perGroupMaxArieRatio[category.group]) {
            perGroupMaxArieRatio[category.group] = ratio;
          }
        }
      });
      for (const group in perGroupMaxArieRatio) arieGroupTotals[group] += perGroupMaxArieRatio[group];
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
    isExceeded: (arieGroupTotals[config.group] || 0) >= 1, 
  }));

  const highestArieGroupRatio = Math.max(...Object.values(arieGroupTotals));
  const isHighThreshold = summationGroups.some(g => g.totalRatio >= 1 && mode === 'high');
  const isLowThreshold = summationGroups.some(g => g.totalRatio >= 1);

  let overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel' = 'Geen';
  if (isHighThreshold) overallStatus = 'Hogedrempel';
  else if (isLowThreshold) overallStatus = 'Lagedrempel';

  const mostCriticalGroup = summationGroups.filter(g => g.totalRatio > 0).sort((a, b) => b.totalRatio - a.totalRatio)[0];
  const mostCriticalArieGroup = arieSummationGroups.filter(g => g.totalRatio > 0).sort((a, b) => b.totalRatio - a.totalRatio)[0];
  
  return { 
    summationGroups, 
    arieSummationGroups, 
    overallStatus, 
    arieTotal: highestArieGroupRatio, 
    arieExceeded: highestArieGroupRatio >= 1,
    criticalGroup: mostCriticalGroup ? mostCriticalGroup.name : null,
    criticalArieGroup: mostCriticalArieGroup ? mostCriticalArieGroup.name : null,
  };
}

function generateSevesoReferences() {
    const categories: { hPhrase: string, categoryId: string, categoryName: string, low: number, high: number }[] = [];
    const hPhrasesForCats: Record<string, string[]> = {};
    for (const [hPhrase, catIds] of Object.entries(H_PHRASE_MAPPING)) {
        for (const catId of catIds) {
            if (!hPhrasesForCats[catId]) hPhrasesForCats[catId] = [];
            hPhrasesForCats[catId].push(hPhrase);
        }
    }
    for (const [catId, threshold] of Object.entries(SEVESO_THRESHOLDS)) {
        const category = ALL_CATEGORIES[catId];
        if (category) {
            categories.push({
                hPhrase: (hPhrasesForCats[catId] || []).join(', ') || 'Specifiek',
                categoryId: category.displayId || category.id,
                categoryName: category.name, low: threshold.low, high: threshold.high,
            });
        }
    }
    return categories.sort((a, b) => a.categoryId.localeCompare(b.categoryId, undefined, { numeric: true }));
}

function generateArieReference() {
    const arieReferenceData: { hPhrase: string, categoryId: string, categoryName: string, threshold: number }[] = [];
    const namedReferenceData: { hPhrase: string, categoryId: string, categoryName: string, threshold: number }[] = [];
    const hPhrasesForArieCats: Record<string, string[]> = {};
    for (const [hPhrase, catIds] of Object.entries(H_PHRASE_MAPPING)) {
        for (const catId of catIds) {
            if (!hPhrasesForArieCats[catId]) hPhrasesForArieCats[catId] = [];
            hPhrasesForArieCats[catId].push(hPhrase);
        }
    }
    for (const [catId, threshold] of Object.entries(ARIE_THRESHOLDS)) {
        const category = ALL_CATEGORIES[catId];
        if (category) {
            arieReferenceData.push({
                hPhrase: (hPhrasesForArieCats[catId] || []).join(', ') || 'Specifiek',
                categoryId: category.displayId || category.id, categoryName: category.name, threshold
            });
        }
    }
    for (const sub of Object.values(NAMED_SUBSTANCES)) {
        namedReferenceData.push({
            hPhrase: sub.cas, categoryId: sub.name, categoryName: 'Benoemde Stof',
            threshold: sub.arieThreshold || sub.threshold.low
        });
    }
    return { cats: arieReferenceData.sort((a, b) => a.categoryId.localeCompare(b.categoryId, undefined, { numeric: true })), named: namedReferenceData };
}

export const SEVESO_CATEGORY_REFERENCE = generateSevesoReferences();
export const SEVESO_NAMED_REFERENCE = Object.values(NAMED_SUBSTANCES).map(s => ({ hPhrase: s.cas, categoryId: s.name, categoryName: 'Benoemde Stof', low: s.threshold.low, high: s.threshold.high, arie: s.arieThreshold || s.threshold.low }));
const arieRefs = generateArieReference();
export const ARIE_REFERENCE_GUIDE_DATA = arieRefs.cats;
export const ARIE_NAMED_REFERENCE = arieRefs.named;
