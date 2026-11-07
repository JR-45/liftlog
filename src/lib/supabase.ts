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
    // Links aus Bestätigungs- und Passwort-Mails kommen mit einem einmaligen ?code= zurück.
    // PKCE tauscht ihn gegen eine Sitzung, Tokens stehen dabei nie in der URL.
    flowType: 'pkce',
    detectSessionInUrl: true,
  },
})
