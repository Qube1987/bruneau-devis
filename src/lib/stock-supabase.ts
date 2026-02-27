import { supabase } from './supabase';

export const stockSupabase = supabase;

export interface StockArticle {
  id: number;
  ref_extrabat: string;
  designation: string;
  quantite: number;
  created_at?: string;
  updated_at?: string;
}
