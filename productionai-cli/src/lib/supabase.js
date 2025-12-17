const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// =============================================================================
// OPTION 1: Hardcode your credentials here (easier, less secure)
// =============================================================================
const HARDCODED_URL = 'https://nnttpwhvrtfqdwxvbphq.supabase.co';  // ← PASTE YOUR URL HERE
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udHRwd2h2cnRmcWR3eHZicGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MTk5MDksImV4cCI6MjA1MjA5NTkwOX0.-DNcWotw6q35MLnS2d9O2ut4F7g_n6YlWwJz5sfkP5M';                // ← PASTE YOUR KEY HERE

// =============================================================================
// OPTION 2: Use .env file (more secure, but requires extra setup)
// =============================================================================
// Create a .env file with:
//   SUPABASE_URL=https://your-project.supabase.co
//   SUPABASE_ANON_KEY=your-anon-key-here

// Priority: .env file first, then hardcoded values
const supabaseUrl = process.env.SUPABASE_URL || HARDCODED_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || HARDCODED_KEY;

// Check if Supabase is configured (and not using placeholder values)
function isSupabaseConfigured() {
  const hasValues = !!(supabaseUrl && supabaseAnonKey);
  const notPlaceholders = 
    supabaseUrl !== 'https://your-project.supabase.co' && 
    supabaseAnonKey !== 'your-anon-key-here';
  return hasValues && notPlaceholders;
}

// Create Supabase client (only if configured)
let supabase = null;

if (isSupabaseConfigured()) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // CLI doesn't need session persistence
      autoRefreshToken: false,
    },
  });
  console.log('✅ Supabase client initialized');
} else {
  console.log('⚠️  Supabase not configured. Sync commands will not work.');
  console.log('   Option 1: Edit src/lib/supabase.js and paste your credentials (lines 7-8)');
  console.log('   Option 2: Create a .env file with SUPABASE_URL and SUPABASE_ANON_KEY');
}

module.exports = {
  supabase,
  isSupabaseConfigured
};

