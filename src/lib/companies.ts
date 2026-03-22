import type { SupabaseClient } from '@supabase/supabase-js';
import type { Substance, Company } from './types';
import { format } from 'date-fns';

function snakeToCamelSubstance(row: any): Substance {
  return {
    id: row.id,
    productName: row.product_name,
    casNumber: row.cas_number ?? null,
    hStatements: row.h_statements ?? [],
    sevesoCategoryIds: row.seveso_category_ids ?? [],
    arieCategoryIds: row.arie_category_ids ?? [],
    isNamedSubstance: row.is_named_substance ?? false,
    namedSubstanceName: row.named_substance_name ?? null,
    quantity: Number(row.quantity) ?? 0,
    sdsUri: row.sds_uri ?? undefined,
  };
}

export function snakeToCamelCompany(row: any): Company {
  return {
    id: row.id,
    userId: row.user_id,
    customerId: row.customer_id,
    name: row.name,
    address: row.address ?? '',
  };
}

const debounceTimers: Record<string, NodeJS.Timeout> = {};
const quantityDebounceTimers: Record<string, NodeJS.Timeout> = {};

export const createNewCompany = async (supabase: SupabaseClient, userId: string, customerId: string): Promise<Company | null> => {
  const { data, error } = await supabase.from('companies').insert({ user_id: userId, customer_id: customerId, name: 'Nieuw Bedrijf', address: '' }).select().single();
  if (error || !data) { console.error('createNewCompany:', error); return null; }
  return snakeToCamelCompany(data);
};

export const updateCompanyDetails = (supabase: SupabaseClient, companyId: string, details: Partial<Company>) => {
  clearTimeout(debounceTimers[companyId]);
  debounceTimers[companyId] = setTimeout(() => {
    const update: any = {};
    if (details.name !== undefined) update.name = details.name;
    if (details.address !== undefined) update.address = details.address;
    supabase.from('companies').update(update).eq('id', companyId).then(({ error }) => { if (error) console.error('updateCompanyDetails:', error); });
  }, 500);
};

export const deleteCompanyFromDb = async (supabase: SupabaseClient, companyId: string): Promise<void> => {
  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  if (error) console.error('deleteCompanyFromDb:', error);
};

export const addSubstanceToDb = async (supabase: SupabaseClient, companyId: string, substance: Substance): Promise<void> => {
  const { error } = await supabase.from('inventory').upsert({ id: substance.id, company_id: companyId, product_name: substance.productName, cas_number: substance.casNumber ?? null, h_statements: substance.hStatements, seveso_category_ids: substance.sevesoCategoryIds, arie_category_ids: substance.arieCategoryIds, is_named_substance: substance.isNamedSubstance, named_substance_name: substance.namedSubstanceName ?? null, quantity: substance.quantity, sds_uri: substance.sdsUri ?? null });
  if (error) { console.error('addSubstanceToDb:', error); return; }
  const dateKey = format(new Date(), 'yyyy-MM-dd');
  await supabase.from('inventory_history').upsert({ inventory_id: substance.id, company_id: companyId, date: dateKey, quantity: substance.quantity }, { onConflict: 'inventory_id,date' });
};

export const deleteSubstanceFromDb = async (supabase: SupabaseClient, companyId: string, substanceId: string): Promise<void> => {
  const { error } = await supabase.from('inventory').delete().eq('id', substanceId).eq('company_id', companyId);
  if (error) console.error('deleteSubstanceFromDb:', error);
};

export const updateSubstanceQuantityInDb = (supabase: SupabaseClient, companyId: string, substanceId: string, quantity: number) => {
  const key = `${companyId}-${substanceId}`;
  clearTimeout(quantityDebounceTimers[key]);
  quantityDebounceTimers[key] = setTimeout(async () => {
    const { error } = await supabase.from('inventory').update({ quantity, updated_at: new Date().toISOString() }).eq('id', substanceId).eq('company_id', companyId);
    if (error) { console.error('updateSubstanceQuantityInDb:', error); return; }
    const dateKey = format(new Date(), 'yyyy-MM-dd');
    await supabase.from('inventory_history').upsert({ inventory_id: substanceId, company_id: companyId, date: dateKey, quantity }, { onConflict: 'inventory_id,date' });
  }, 300);
};

export const clearInventoryFromDb = async (supabase: SupabaseClient, companyId: string): Promise<void> => {
  const { error } = await supabase.from('inventory').delete().eq('company_id', companyId);
  if (error) console.error('clearInventoryFromDb:', error);
};

export const fetchInventory = async (supabase: SupabaseClient, companyId: string): Promise<Substance[]> => {
  const { data, error } = await supabase.from('inventory').select('*').eq('company_id', companyId);
  if (error || !data) return [];
  return data.map(snakeToCamelSubstance);
};
