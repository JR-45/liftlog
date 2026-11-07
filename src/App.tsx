import { useEffect, useState } from 'react'
import { readAuthRedirect } from './domain/auth'
import { clearAuthParamsFromUrl } from './features/auth/api'
import { LoginForm } from './features/auth/LoginForm'
import { NewPasswordForm } from './features/auth/NewPasswordForm'
import { useSession } from './features/auth/useSession'
import { needsOnboarding } from './features/onboarding/api'
import { Onboarding } from './features/onboarding/Onboarding'
import { HomeScreen } from './features/workout/HomeScreen'
import { supabase } from './lib/supabase'

// Einmal beim Laden lesen: Kam die App über einen Link aus einer Bestätigungs- oder Passwort-Mail?
const initialRedirect = readAuthRedirect(window.location.search, window.location.hash)

function App() {
  const session = useSession()
  const [recovering, setRecovering] = useState(false)
  // Je User einmal prüfen: Neue Konten ohne Plan starten im Onboarding.
  const [onboarding, setOnboarding] = useState<{ userId: string; needed: boolean } | null>(null)
  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    needsOnboarding()
      .then((needed) => {
        if (!cancelled) setOnboarding({ userId, needed })
      })
      .catch(() => {
        // Im Zweifel direkt in die App, dort gibt es den Plan-Editor als Rückfall.
        if (!cancelled) setOnboarding({ userId, needed: false })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    // Der Link aus der Passwort-Mail meldet an und löst dieses Ereignis aus.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Code oder Fehler aus dem Link nicht in der Adresszeile stehen lassen, sobald Supabase fertig ist.
  useEffect(() => {
    if (initialRedirect && session !== undefined) clearAuthParamsFromUrl()
  }, [session])

  if (session === undefined) return null
  if (recovering && session) return <NewPasswordForm onDone={() => setRecovering(false)} />
  if (session === null) return <LoginForm redirect={initialRedirect} />
  if (onboarding?.userId !== session.user.id) return null
  if (onboarding.needed) {
    return <Onboarding userId={session.user.id} onFinish={() => setOnboarding({ userId: session.user.id, needed: false })} />
  }
  // key: Ein Wechsel des Users setzt den Zustand der Ansicht vollständig zurück.
  return <HomeScreen key={session.user.id} session={session} />
}

export default App
