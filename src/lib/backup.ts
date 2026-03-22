import type { SupabaseClient } from '@supabase/supabase-js';
import type { Company, Substance } from './types';
import { v4 as uuidv4 } from 'uuid';

export const exportCompanyData = async (supabase: SupabaseClient, company: Company): Promise<string> => {
  const { data: inventory } = await supabase.from('inventory').select('*').eq('company_id', company.id);
  const backupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    company: { name: company.name, address: company.address },
    inventory: inventory ?? [],
  };
  return JSON.stringify(backupData, null, 2);
};

export const importCompanyData = async (supabase: SupabaseClient, userId: string, customerId: string, jsonString: string): Promise<string | null> => {
  try {
    const data = JSON.parse(jsonString);
    if (!data.company || !Array.isArray(data.inventory)) throw new Error('Ongeldig back-up bestand.');
    const { data: newCompany, error } = await supabase.from('companies').insert({ user_id: userId, customer_id: customerId, name: `${data.company.name} (Hersteld)`, address: data.company.address || '' }).select('id').single();
    if (error || !newCompany) throw error;
    for (const item of data.inventory) {
      await supabase.from('inventory').insert({ ...item, id: uuidv4(), company_id: newCompany.id });
    }
    return newCompany.id;
  } catch (e) {
    console.error('Import error:', e);
    return null;
  }
};
