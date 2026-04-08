import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.toString().trim() ?? ''
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.toString().trim() ??
  import.meta.env.VITE_SUPABASE_ANON_KEY?.toString().trim() ??
  ''

export const supabaseConfigError =
  supabaseUrl && supabasePublishableKey
    ? null
    : 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in the frontend environment.'

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
