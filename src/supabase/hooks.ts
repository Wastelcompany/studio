"use client";

import { useEffect, useState, useRef } from 'react';
import { useSupabase } from './provider';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface UseQueryResult<T> {
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseRowResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

// Accepts both Promise and PromiseLike (includes PostgrestFilterBuilder)
type QueryFn<T> = (client: SupabaseClient) => PromiseLike<{ data: T[] | null; error: any }>;
type RowQueryFn<T> = (client: SupabaseClient) => PromiseLike<{ data: T | null; error: any }>;

/**
 * Real-time collectie hook — vervangt useCollection van Firebase
 */
export function useRealtimeQuery<T>(
  table: string,
  queryFn: QueryFn<T> | null,
  deps: any[] = []
): UseQueryResult<T> {
  const { supabase } = useSupabase();
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!queryFn) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const fetchData = () => {
      Promise.resolve(queryFn(supabase)).then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setData(null);
        } else {
          setData(data ?? []);
          setError(null);
        }
        setIsLoading(false);
      });
    };

    fetchData();

    // Realtime abonnement
    channelRef.current?.unsubscribe();
    channelRef.current = supabase
      .channel(`realtime-${table}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, ...deps]);

  return { data, isLoading, error };
}

/**
 * Real-time single-row hook — vervangt useDoc van Firebase
 */
export function useRealtimeRow<T>(
  table: string,
  rowQueryFn: RowQueryFn<T> | null,
  deps: any[] = []
): UseRowResult<T> {
  const { supabase } = useSupabase();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!rowQueryFn) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const fetchData = () => {
      Promise.resolve(rowQueryFn(supabase)).then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setData(null);
        } else {
          setData(data ?? null);
          setError(null);
        }
        setIsLoading(false);
      });
    };

    fetchData();

    channelRef.current?.unsubscribe();
    channelRef.current = supabase
      .channel(`realtime-row-${table}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, ...deps]);

  return { data, isLoading, error };
}

/**
 * Simple table hook — wrapper voor useRealtimeQuery met tabel-naam en opties
 */
export interface UseTableOptions {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  filter?: Record<string, any>;
}

export function useTable<T>(
  table: string,
  options: UseTableOptions | null
): UseQueryResult<T> {
  return useRealtimeQuery<T>(
    table,
    options === null ? null : (sb) => {
      let q = sb.from(table).select('*') as any;
      if (options.filter) {
        for (const [key, val] of Object.entries(options.filter)) {
          q = q.eq(key, val);
        }
      }
      if (options.orderBy) {
        q = q.order(options.orderBy, { ascending: options.ascending ?? true });
      }
      if (options.limit) {
        q = q.limit(options.limit);
      }
      return q;
    },
    [JSON.stringify(options)]
  );
}
