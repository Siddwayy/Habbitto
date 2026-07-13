import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (url && anonKey) {
  try {
    supabase = createClient(url, anonKey);
  } catch (err) {
    console.warn('Supabase client failed to create:', err);
  }
} else {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env and restart the dev server.');
}

export { supabase };
