
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zdegisedwfqvubcbagci.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWdpc2Vkd2ZxdnViY2JhZ2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzY1NTEsImV4cCI6MjA4NDE1MjU1MX0.AY-3FnO1Nrj8QmHazlY9n7nxFInew1L_gMxJcL5oVj4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
