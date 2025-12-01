
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------

const SUPABASE_URL = 'https://mbbpvxkyoorqkwalfqzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnB2eGt5b29ycWt3YWxmcXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjIxOTYsImV4cCI6MjA3OTkzODE5Nn0.sOPEATKlI3r2B3ilOe-5enkCi3MOfphCkNjEEeR3glo';

// Criação do cliente único
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
