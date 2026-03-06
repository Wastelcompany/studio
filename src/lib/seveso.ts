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
  E1: { id: 'E1', name: 'Gevaarlijk voor het aquatisch milieu, acuut 1 of chronisch 1', group: 'environment' },
  E2: { id: 'E2', name: 'Gevaarlijk voor het aquatisch milieu, chronisch 2', group: 'environment' },
  O1: { id: 'O1', name: 'Stoffen met gevarenaanduiding EUH014', group: 'other' },
  O2: { id: 'O2', name: 'Stoffen die in contact met water ontvlambare gassen ontwikkelen (Cat 1)', group: 'other' },
  O3: { id: 'O3', name: 'Stoffen met gevarenaanduiding EUH029', group: 'other' },
  'ARIE-P1a-sub3': { id: 'ARIE-P1a-sub3', name: 'Stoffen/mengsels met explosieve eigenschappen (zonder sub 1.1-1.6)', group: 'physical', displayId: 'P1a (sub 3)' },
  'ARIE-P6a-1': { id: 'ARIE-P6a-1', name: 'Enkel zelfontledende stoffen/mengsels (Type A/B)', group: 'physical', displayId: 'P6a (Zelfontl.)' },
  'ARIE-P6a-2': { id: 'ARIE-P6a-2', name: 'Enkel organische peroxiden (Type A/B)', group: 'physical', displayId: 'P6a (Org. Perox.)' },
  'ARIE-P6b-1': { id: 'ARIE-P6b-1', name: 'Enkel zelfontledende stoffen/mengsels (Type C-F)', group: 'physical', displayId: 'P6b (Zelfontl.)' },
  'ARIE-P6b-2': { id: 'ARIE-P6b-2', name: 'Enkel organische peroxiden (Type C-F)', group: 'physical', displayId: 'P6b (Org. Perox.)' },
  'ARIE-P7-1': { id: 'ARIE-P7-1', name: 'Enkel pyrofore vloeistoffen', group: 'physical', displayId: 'P7 (Vl.stof)' },
  'ARIE-P7-2': { id: 'ARIE-P7-2', name: 'Enkel pyrofore vaste stoffen', group: 'physical', displayId: 'P7 (Vast)' },
  'ARIE-Vl-1': { id: 'ARIE-Vl-1', name: 'Ontvlambare vloeistoffen, cat. 1', group: 'physical', displayId: 'Vl.stof 1' },
  'ARIE-Vl-2': { id: 'ARIE-Vl-2', name: 'Ontvlambare vloeistoffen, cat. 2', group: 'physical', displayId: 'Vl.stof 2' },
  'ARIE-Vl-3': { id: 'ARIE-Vl-3', name: 'Ontvlambare vloeistoffen, cat. 3', group: 'physical', displayId: 'Vl.stof 3' },
  'ARIE-O4': { id: 'ARIE-O4', name: 'Stoffen met EUH001 (in droge toestand ontplofbaar)', group: 'other', displayId: 'O4 (EUH001)' },
  'ARIE-CMR': { id: 'ARIE-CMR', name: 'Kankerverwekkend/mutageen/reprotoxisch cat 1A/1B', group: 'health', displayId: 'CMR' },
};
export const NAMED_SUBSTANCES: Record<string, NamedSubstance> = { /* ... full list ... */ };
export const SEVESO_THRESHOLDS: Record<string, { low: number, high: number }> = { /* ... full list ... */ };
export const ARIE_THRESHOLDS: Record<string, number> = { /* ... full list ... */ };
export const H_PHRASE_MAPPING: Record<string, string[]> = { /* ... full list ... */ };
export const H_PHRASE_DESCRIPTIONS: Record<string, string> = { /* ... full list ... */ };
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
        if (SEVESO_THRESHOLDS[catId]) {
            sevesoCategoryIds.add(catId);
        }
        if (ARIE_THRESHOLDS[catId]) {
            arieCategoryIds.add(catId);
        }
    });
    let isNamed = false;
    let namedSubstanceName = null;
    if (casNumber && NAMED_SUBSTANCES[casNumber]) {
        const named = NAMED_SUBSTANCES[casNumber];
        sevesoCategoryIds.add(named.id);
        isNamed = true;
        namedSubstanceName = named.name;
        if (ARIE_THRESHOLDS[named.id]) {
            arieCategoryIds.add(named.id);
        }
    }
    return { sevesoCategoryIds: Array.from(sevesoCategoryIds), arieCategoryIds: Array.from(arieCategoryIds), isNamed, namedSubstanceName };
}
export function calculateSummations(inventory: Substance[], mode: ThresholdMode): {
    summationGroups: SummationGroup[],
    arieSummationGroups: SummationGroup[],
    overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel',
    criticalGroup: string | null,
    arieTotal: number,
    arieExceeded: boolean,
} {
    const sevesoGroupTotals: Record<string, number> = { health: 0, physical: 0, environment: 0, other: 0, named: 0 };
    const arieGroupTotals: Record<string, number> = { health: 0, physical: 0, environment: 0, other: 0, named: 0 };
    inventory.forEach(substance => {
        if (substance.quantity > 0) {
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
    const mostCriticalGroup = summationGroups.filter(g => g.totalRatio > 0).sort((a, b) => b.totalRatio - a.totalRatio)[0];
    return {
        summationGroups,
        arieSummationGroups,
        overallStatus,
        criticalGroup: mostCriticalGroup ? mostCriticalGroup.name : null,
        arieTotal: totalArieRatio,
        arieExceeded: totalArieRatio >= 1,
    };
}
function generateSevesoReferences() {
    const categories: { hPhrase: string, categoryId: string, categoryName: string, low: number, high: number }[] = [];
    const namedSubstances: { hPhrase: string, categoryId: string, categoryName: string, low: number, high: number }[] = [];
    const hPhrasesForCats: Record<string, string[]> = {};
    for (const [hPhrase, catIds] of Object.entries(H_PHRASE_MAPPING)) {
        for (const catId of catIds) {
            if (!hPhrasesForCats[catId]) hPhrasesForCats[catId] = [];
            hPhrasesForCats[catId].push(hPhrase);
        }
    }
    for (const [catId, threshold] of Object.entries(SEVESO_THRESHOLDS)) {
        const category = ALL_CATEGORIES[catId];
        const hPhrases = hPhrasesForCats[catId] || [];
        if (category) {
            categories.push({
                hPhrase: hPhrases.join(', ') || 'Specifiek',
                categoryId: category.displayId || category.id,
                categoryName: category.name,
                low: threshold.low,
                high: threshold.high,
            });
        }
    }
    for (const sub of Object.values(NAMED_SUBSTANCES)) {
        namedSubstances.push({
            hPhrase: sub.cas,
            categoryId: sub.name,
            categoryName: 'Benoemde Stof',
            low: sub.threshold.low,
            high: sub.threshold.high,
        });
    }
    const sortOrder = ['H', 'P', 'E', 'O'];
    const sortedCategories = categories.sort((a, b) => {
        const groupA = a.categoryId.charAt(0);
        const groupB = b.categoryId.charAt(0);
        const indexA = sortOrder.indexOf(groupA);
        const indexB = sortOrder.indexOf(groupB);
        if (indexA !== indexB) {
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        }
        return a.categoryId.localeCompare(b.categoryId, undefined, { numeric: true, sensitivity: 'base' });
    });
    return {
        categories: sortedCategories,
        namedSubstances: namedSubstances.sort((a, b) => a.categoryId.localeCompare(b.categoryId))
    };
}
function generateArieReference() {
    const arieReferenceData: { hPhrase: string, categoryId: string, categoryName: string, threshold: number }[] = [];
    const hPhrasesForArieCats: Record<string, string[]> = {};
    Object.keys(ARIE_THRESHOLDS).forEach(catId => {
        hPhrasesForArieCats[catId] = [];
    });
    for (const [hPhrase, catIds] of Object.entries(H_PHRASE_MAPPING)) {
        for (const catId of catIds) {
            if (hPhrasesForArieCats[catId]) {
                hPhrasesForArieCats[catId].push(hPhrase);
            }
        }
    }
    const sortOrder = ['H', 'P', 'E', 'O'];
    for (const [catId, hPhrases] of Object.entries(hPhrasesForArieCats)) {
        const category = ALL_CATEGORIES[catId];
        if (category) {
            arieReferenceData.push({
                hPhrase: hPhrases.join(', ') || 'Specifiek',
                categoryId: category.displayId || category.id,
                categoryName: category.name,
                threshold: ARIE_THRESHOLDS[catId]
            });
        }
    }
    return arieReferenceData.sort((a, b) => {
        const groupA = (a.categoryId.startsWith('ARIE-') ? (a.categoryId.includes('CMR') || a.categoryId.includes('H-CAT') ? 'H' : 'P') : a.categoryId.charAt(0));
        const groupB = (b.categoryId.startsWith('ARIE-') ? (b.categoryId.includes('CMR') || b.categoryId.includes('H-CAT') ? 'H' : 'P') : b.categoryId.charAt(0));
        const indexA = sortOrder.indexOf(groupA);
        const indexB = sortOrder.indexOf(groupB);
        if (indexA !== indexB) {
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        }
        return a.categoryId.localeCompare(b.categoryId, undefined, { numeric: true, sensitivity: 'base' });
    });
}
const sevesoRefs = generateSevesoReferences();
export const SEVESO_CATEGORY_REFERENCE = sevesoRefs.categories;
export const SEVESO_NAMED_REFERENCE = sevesoRefs.namedSubstances;
export const ARIE_REFERENCE_GUIDE_DATA = generateArieReference();
export const ARIE_NAMED_REFERENCE: any[] = [];
