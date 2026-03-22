import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, Customer } from '@/lib/types';

export const toggleUserDisabledStatus = async (supabase: SupabaseClient, uid: string, currentStatus: boolean): Promise<void> => {
  const { error } = await supabase.from('user_profiles').update({ disabled: !currentStatus }).eq('id', uid);
  if (error) throw error;
};

export const updateUserRole = async (supabase: SupabaseClient, uid: string, newRole: 'admin' | 'user'): Promise<void> => {
  const { error } = await supabase.from('user_profiles').update({ role: newRole }).eq('id', uid);
  if (error) throw error;
};

export const updateUserGroup = async (supabase: SupabaseClient, userToUpdate: UserProfile, newCustomerName: string): Promise<void> => {
  const { data: existing } = await supabase.from('user_profiles').select('customer_id').eq('customer_name', newCustomerName).limit(1).single();
  let targetCustomerId = existing?.customer_id ?? userToUpdate.customerId;
  await supabase.from('user_profiles').update({ customer_id: targetCustomerId, customer_name: newCustomerName }).eq('id', userToUpdate.uid);
  if (userToUpdate.customerId) {
    const { data: userCompanies } = await supabase.from('companies').select('id').eq('customer_id', userToUpdate.customerId).eq('user_id', userToUpdate.uid);
    if (userCompanies && userCompanies.length > 0) {
      const ids = userCompanies.map((c: any) => c.id);
      await supabase.from('companies').update({ customer_id: targetCustomerId }).in('id', ids);
    }
  }
};

export const createCustomerRecord = async (supabase: SupabaseClient, customerInfo: { name: string; address: string; kvkNumber: string }): Promise<string> => {
  const { data, error } = await supabase.from('customers').insert({ name: customerInfo.name, address: customerInfo.address, kvk_number: customerInfo.kvkNumber }).select('id').single();
  if (error || !data) throw error;
  return data.id;
};

export const logAiUsage = async (supabase: SupabaseClient, userId: string, type: 'SDS_EXTRACTION' | 'KVK_SEARCH', model?: string, estimatedCost?: number): Promise<void> => {
  await supabase.from('ai_usage_logs').insert({ user_id: userId, type, model: model ?? null, estimated_cost: estimatedCost ?? 0 });
};
