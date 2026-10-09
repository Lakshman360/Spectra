/**
 * Supabase Client Initialization & Status Reporter
 *
 * Checks for live VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.
 * If credentials are not present, reports honest status without pretending they exist.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export interface BackendStatus {
  isSupabaseConfigured: boolean;
  supabaseUrl: string | null;
  hasStorageBucket: boolean;
  isEmailServiceConfigured: boolean;
  activeStorageMode: 'Supabase PostgreSQL' | 'Local Persistent Store (Browser DB)';
}

export function getBackendStatus(): BackendStatus {
  const emailApiKey = import.meta.env.VITE_RESEND_API_KEY || import.meta.env.VITE_SMTP_HOST;
  return {
    isSupabaseConfigured,
    supabaseUrl: isSupabaseConfigured ? supabaseUrl! : null,
    hasStorageBucket: isSupabaseConfigured,
    isEmailServiceConfigured: Boolean(emailApiKey),
    activeStorageMode: isSupabaseConfigured
      ? 'Supabase PostgreSQL'
      : 'Local Persistent Store (Browser DB)',
  };
}
