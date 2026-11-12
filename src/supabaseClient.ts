import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Fallback to configured Lab project if environment variables are missing
const defaultSupabaseUrl = 'https://koakdlbwsjekmtiunfhr.supabase.co';
const defaultSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYWtkbGJ3c2pla210aXVuZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDEyNDUsImV4cCI6MjA4OTcxNzI0NX0.ZTXsET8hhtIebRmXiv1fHELmReGjVJlrq7HdlO9uWMI';

const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const envAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl: string = envUrl || defaultSupabaseUrl;
export const supabaseAnonKey: string = envAnonKey || defaultSupabaseAnonKey;

// Create and export the Supabase client
export const LAB_KEY_STORAGE = 'lab_access_code';
const readLabKey = (): string => {
  try { return localStorage.getItem(LAB_KEY_STORAGE) || ''; } catch { return ''; }
};

export const makeClient = (labKey: string): SupabaseClient => createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'x-lab-key': labKey } },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const supabase: SupabaseClient = makeClient(readLabKey());

export default supabase;
