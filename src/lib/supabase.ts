import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!rawUrl || !publishableKey) {
  throw new Error('VITE_SUPABASE_URL oder VITE_SUPABASE_PUBLISHABLE_KEY fehlt. Siehe .env.example.')
}

// Lokal passt sich die URL automatisch an den Host an, über den die App geladen wird
// (z. B. localhost am Rechner oder die Netzwerk-IP am Handy im selben WLAN).
function resolveSupabaseUrl(configuredUrl: string): string {
  try {
    const parsed = new URL(configuredUrl)
    if (
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.port === '54321') &&
      typeof window !== 'undefined' &&
      window.location.hostname
    ) {
      parsed.hostname = window.location.hostname
      return parsed.origin
    }
  } catch {
    // Bei Parsing-Fehlern den Originalwert nutzen.
  }
  return configuredUrl
}

// Der Publishable Key ist öffentlich und landet im Browser-Code. Die Daten schützt RLS.
export const supabase = createClient<Database>(resolveSupabaseUrl(rawUrl), publishableKey, {
  auth: {
    // Links aus Bestätigungs- und Passwort-Mails kommen mit einem einmaligen ?code= zurück.
    // PKCE tauscht ihn gegen eine Sitzung, Tokens stehen dabei nie in der URL.
    flowType: 'pkce',
    detectSessionInUrl: true,
  },
})
