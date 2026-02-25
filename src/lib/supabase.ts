import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('CRITICAL ERROR: Supabase environment variables are missing!')
}

const finalUrl = SUPABASE_URL || 'https://placeholder-please-set-your-supabase-url.supabase.co'
const finalKey = SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(finalUrl, finalKey, {
    auth: {
        // Persist session in localStorage so users stay logged in
        // across page refreshes, tab closures, and PWA restarts
        persistSession: true,
        storageKey: 'shelfguard-auth',
        storage: window.localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
})
