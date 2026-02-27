import { createClient } from '@supabase/supabase-js';

const STOCK_SUPABASE_URL = 'https://zkvgaphygwiumqgrzpla.supabase.co';
const STOCK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprdmdhcGh5Z3dpdW1xZ3J6cGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTAzOTUsImV4cCI6MjA2ODY4NjM5NX0.PIVKneXD_G1fRCjgc4GO60o9XHmcYe_TMO-1LKD5x5o';

export const stockSupabase = createClient(STOCK_SUPABASE_URL, STOCK_SUPABASE_ANON_KEY);

export interface StockArticle {
  id: number;
  ref_extrabat: string;
  designation: string;
  quantite: number;
  created_at?: string;
  updated_at?: string;
}
