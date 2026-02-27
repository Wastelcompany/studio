"use client";

import type { Substance, HazardCategory, NamedSubstance, ThresholdMode, SummationGroup } from '@/lib/types';
import { FlaskConical, Flame, Leaf, AlertTriangle, Atom } from 'lucide-react';

// Master list of all hazard categories (Seveso & ARIE)
export const ALL_CATEGORIES: Record<string, HazardCategory> = {
  // SEVESO Categories (H, P, E, O)
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
  H4: { id: 'H4', name: 'Huidcorrosie, categorie 1A, 1B of 1C (H314)', group: 'health', displayId: 'H4 (Huid)' },
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

export const NAMED_SUBSTANCES: Record<string, NamedSubstance> = {
  // Volledige lijst hier...
};

export const SEVESO_THRESHOLDS: Record<string, { low: number, high: number }> = {
  // Volledige lijst hier...
};

export const ARIE_THRESHOLDS: Record<string, number> = {
  // Volledige lijst hier...
};

export const H_PHRASE_MAPPING: Record<string, string[]> = {
  // Volledige lijst hier...
};

export const H_PHRASE_DESCRIPTIONS: Record<string, string> = {
  // Volledige lijst hier...
};

export const SUMMATION_GROUPS_CONFIG = [
  { name: 'Gezondheidsgevaren', icon: FlaskConical, group: 'health' },
  { name: 'Fysische gevaren', icon: Flame, group: 'physical' },
  { name: 'Milieugevaren', icon: Leaf, group: 'environment' },
  { name: 'Overige gevaren', icon: AlertTriangle, group: 'other' },
  { name: 'Benoemde Stoffen', icon: Atom, group: 'named' },
] as const;

export function classifySubstance(hStatements: string[], casNumber: string | null): { sevesoCategoryIds: string[], arieCategoryIds: string[], isNamed: boolean, namedSubstanceName: string | null } {
  // Functie logica hier...
  return { sevesoCategoryIds: [], arieCategoryIds: [], isNamed: false, namedSubstanceName: null }; // Placeholder
}

export function calculateSummations(inventory: Substance[], mode: ThresholdMode): { 
  summationGroups: SummationGroup[],
  arieSummationGroups: SummationGroup[],
  overallStatus: 'Geen' | 'Lagedrempel' | 'Hogedrempel', 
  criticalGroup: string | null,
  arieTotal: number,
  arieExceeded: boolean,
} {
  // Functie logica hier...
  return { summationGroups: [], arieSummationGroups: [], overallStatus: 'Geen', criticalGroup: null, arieTotal: 0, arieExceeded: false }; // Placeholder
}

function generateSevesoReferences() {
  // Functie logica hier...
  return { categories: [], namedSubstances: [] };
}

function generateArieReference() {
  // Functie logica hier...
  return [];
}

const sevesoRefs = generateSevesoReferences();
export const SEVESO_CATEGORY_REFERENCE = sevesoRefs.categories;
export const SEVESO_NAMED_REFERENCE = sevesoRefs.namedSubstances;
export const ARIE_REFERENCE_GUIDE_DATA = generateArieReference();
export const ARIE_NAMED_REFERENCE: any[] = []; // Expliciet exporteren als lege array
