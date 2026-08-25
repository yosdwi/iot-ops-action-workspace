import { createClient } from '@supabase/supabase-js'

const fallbackUrl = 'https://spzqgzhmrvhdsfngpsfk.supabase.co'
const fallbackPublishableKey = 'sb_publishable_e_1jvLBPpgLIHboDJq0NMA_Scqe3ko-'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
