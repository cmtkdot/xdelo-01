import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://kqbxtrnqjmeyjjndvffl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxYnh0cm5xam1leWpqbmR2ZmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1OTQ3MzcsImV4cCI6MjA1MDE3MDczN30.owYhX5CBZcMaHjTyPQDJK0EYAYrZWkCcThqHmOJnrHE";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);