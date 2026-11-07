import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Prüft beim Start einmal beim Server, ob es den gespeicherten User noch gibt.
 * Ein gelöschter User (z. B. nach einem Reset der lokalen Datenbank) behält sonst ein gültiges
 * Token, sieht leere Daten und jedes Speichern scheitert. Ohne Netz wird nicht abgemeldet.
 */
async function signOutIfUserIsGone() {
  const { error } = await supabase.auth.getUser()
  if (error && (error.status === 401 || error.status === 403 || error.code === 'user_not_found')) {
    await supabase.auth.signOut({ scope: 'local' })
  }
}

/** undefined = wird noch geladen, null = nicht eingeloggt */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // Feuert sofort mit INITIAL_SESSION und danach bei Login, Logout und Token-Refresh.
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      // Supabase empfiehlt, im Callback keine weiteren Auth-Aufrufe abzuwarten.
      if (event === 'INITIAL_SESSION' && nextSession) setTimeout(() => void signOutIfUserIsGone(), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return session
}
