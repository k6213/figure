/**
 * src/lib/supabaseClient.js
 * Single shared Supabase client — import `supabase` everywhere you need it.
 *
 * Required env vars (frontend/.env):
 *   VITE_SUPABASE_URL      = https://ozqibwgvljetuwzynrmv.supabase.co
 *   VITE_SUPABASE_ANON_KEY = <anon public key from Supabase Dashboard>
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon || supabaseAnon === 'your_supabase_anon_key_here') {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.\n' +
    'Go to Supabase Dashboard → Settings → API → copy the anon/public key\n' +
    'and add it to frontend/.env as VITE_SUPABASE_ANON_KEY=...'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnon ?? '')
