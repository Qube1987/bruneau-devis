import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_STOCK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_STOCK_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Stock Supabase environment variables');
}

export const stockClient = createClient(supabaseUrl, supabaseAnonKey);
