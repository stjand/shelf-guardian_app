import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// This will help diagnose the issue in the browser console
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('CRITICAL ERROR: Supabase environment variables are missing!')
    console.error('VITE_SUPABASE_URL:', SUPABASE_URL)
    console.error('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '[REDACTED]' : 'MISSING')
    console.info('Please ensure you have set these variables in your .env file (local) or your deployment dashboard (production).')
}

// Use a valid URL format even for placeholder to avoid initialization errors
const finalUrl = SUPABASE_URL || 'https://placeholder-please-set-your-supabase-url.supabase.co'
const finalKey = SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(finalUrl, finalKey)
