import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !publishableKey) {
  throw new Error('VITE_SUPABASE_URL oder VITE_SUPABASE_PUBLISHABLE_KEY fehlt. Siehe .env.example.')
}

// Der Publishable Key ist öffentlich und landet im Browser-Code. Die Daten schützt RLS.
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    // Login läuft über einen Code, Tokens kommen also nie über die URL.
    detectSessionInUrl: false,
  },
})
