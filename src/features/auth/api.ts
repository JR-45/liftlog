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
