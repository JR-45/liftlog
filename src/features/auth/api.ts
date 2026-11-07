import { supabase } from '../../lib/supabase'

/** Adresse, zu der Links aus Auth-Mails zurückführen: immer die Startseite der App. */
function redirectUrl(): string {
  return `${window.location.origin}/`
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error
}

/**
 * Legt ein Konto an und schickt die Bestätigungs-Mail. Supabase meldet bei einer schon
 * registrierten Adresse bewusst keinen Fehler, damit niemand fremde Adressen abfragen kann.
 */
export async function signUp(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl() } })
  return error
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl() } })
  return error
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() })
  return error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  return error
}

/** Entfernt code oder Fehler aus der Adresszeile, damit ein Neuladen nichts doppelt auslöst. */
export function clearAuthParamsFromUrl() {
  window.history.replaceState(null, '', window.location.pathname)
}

/** Merker für den Login-Screen, damit er nach dem Löschen eine Bestätigung zeigt. */
export const ACCOUNT_DELETED_FLAG = 'liftlog-account-deleted'

/**
 * Löscht das eigene Konto mit allen Daten. Das Passwort wird vorher geprüft, damit ein offen
 * liegendes, eingeloggtes Handy nicht reicht. Danach bleiben auf dem Gerät keine LiftLog-Daten.
 */
export async function deleteOwnAccount(email: string, password: string): Promise<'wrong_password' | 'failed' | null> {
  const { error: checkError } = await supabase.auth.signInWithPassword({ email, password })
  if (checkError) return checkError.code === 'invalid_credentials' ? 'wrong_password' : 'failed'

  const { error } = await supabase.rpc('delete_own_account')
  if (error) return 'failed'

  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('liftlog:')) localStorage.removeItem(key)
    }
    sessionStorage.setItem(ACCOUNT_DELETED_FLAG, '1')
  } catch {
    // Ohne Speicherzugriff gibt es eben nichts aufzuräumen.
  }
  // Das Konto gibt es nicht mehr, deshalb nur die lokale Sitzung beenden.
  await supabase.auth.signOut({ scope: 'local' })
  return null
}
