"use client";

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from './client';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/types';

interface SupabaseContextState {
  supabase: SupabaseClient;
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  isProfileLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextState | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    // Haal huidige sessie op
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsUserLoading(false);
    });

    // Luister naar auth-veranderingen
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsUserLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Haal user profile op als user ingelogd is
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    setIsProfileLoading(true);
    supabase
      .from('user_profiles')
      .select('*, customers(id, name, address, kvk_number)')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setUserProfile(null);
        } else {
          setUserProfile({
            uid: data.id,
            email: data.email,
            displayName: data.display_name ?? undefined,
            customerId: data.customer_id ?? '',
            customerName: data.customer_name ?? '',
            disabled: data.disabled,
            role: data.role as 'admin' | 'user',
            createdAt: data.created_at as any,
          });
        }
        setIsProfileLoading(false);
      });
  }, [user, supabase]);

  const value = useMemo(() => ({
    supabase,
    user,
    session,
    userProfile,
    isUserLoading,
    isProfileLoading,
  }), [supabase, user, session, userProfile, isUserLoading, isProfileLoading]);

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('useSupabase moet binnen een SupabaseProvider gebruikt worden');
  return ctx;
}

export function useUser() {
  const { user, userProfile, isUserLoading, isProfileLoading } = useSupabase();
  return { user, userProfile, isUserLoading, isProfileLoading };
}

export function useIsAdmin() {
  const { user, userProfile } = useSupabase();
  return (
    user?.email === 'admin@chemstats.nl' ||
    user?.email === 'post@wastelcompany.eu' ||
    user?.email === 'ai@spawnp.nl' ||
    userProfile?.role === 'admin'
  );
}
