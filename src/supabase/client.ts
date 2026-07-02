import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  console.log('Supabase client config:', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKeyLoaded: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 15),
  });

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
