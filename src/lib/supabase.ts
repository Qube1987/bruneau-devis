import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Initializing Supabase client...');
console.log('Environment check:', {
  VITE_SUPABASE_URL: supabaseUrl ? 'SET' : 'MISSING',
  VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'MISSING',
  NODE_ENV: import.meta.env.MODE
});

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'Missing Supabase environment variables. Please check your .env file.';
  console.error(errorMessage);
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  console.error('Current values:', {
    VITE_SUPABASE_URL: supabaseUrl ? 'SET' : 'MISSING',
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'MISSING'
  });
  throw new Error(errorMessage);
}

// Validate URL format
try {
  new URL(supabaseUrl);
  console.log('Supabase URL is valid:', supabaseUrl);
} catch (error) {
  const errorMessage = `Invalid VITE_SUPABASE_URL format: ${supabaseUrl}`;
  console.error(errorMessage);
  alert('Configuration error: Invalid Supabase URL. Please contact support.');
  throw new Error(errorMessage);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const STORAGE_BUCKETS = {
  PRODUCTS: 'products',
  CROQUIS: 'croquis',
  SIGNATURES: 'signatures',
} as const;

export function getPublicImageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('data:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) return url;

    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}