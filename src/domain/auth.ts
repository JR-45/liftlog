// Prüfungen und Texte rund um Registrierung und Passwort. Ohne React und Supabase.

export const MIN_PASSWORD_LENGTH = 8

/** Fehlertext fürs neue Passwort oder null, wenn alles passt. Gleiche Regel wie in Supabase. */
export function passwordProblem(password: string, repeat: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`
  if (password !== repeat) return 'Die Passwörter stimmen nicht überein.'
  return null
}

type AuthErrorLike = { status?: number; code?: string }

/** Verständliche Meldung für Fehler von Supabase Auth. */
export function authErrorMessage(error: AuthErrorLike, action: 'login' | 'signup' | 'reset' | 'update'): string {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return 'Zu viele Versuche. Warte kurz und versuch es noch einmal.'
  }
  if (error.code === 'invalid_credentials') return 'E-Mail oder Passwort ist falsch.'
  if (error.code === 'email_not_confirmed') return 'Bitte bestätige zuerst deine E-Mail. Den Link findest du in deinem Postfach.'
  if (error.code === 'weak_password') return `Das Passwort ist zu schwach. Nimm mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`
  if (error.code === 'same_password') return 'Das neue Passwort muss sich vom alten unterscheiden.'
  if (error.code === 'signup_disabled') return 'Registrieren ist gerade nicht möglich.'
  if (error.code === 'email_address_invalid' || error.code === 'validation_failed') return 'Bitte prüf deine E-Mail-Adresse.'
  const fallback = {
    login: 'Die Anmeldung hat nicht geklappt. Versuch es später noch einmal.',
    signup: 'Das Registrieren hat nicht geklappt. Versuch es später noch einmal.',
    reset: 'Die Mail konnte nicht gesendet werden. Versuch es später noch einmal.',
    update: 'Das Passwort wurde nicht gespeichert. Versuch es noch einmal.',
  }
  return fallback[action]
}

export type AuthRedirect = { kind: 'error'; message: string } | { kind: 'confirmed' } | null

/**
 * Liest, womit ein Link aus einer Auth-Mail die App geöffnet hat. Supabase hängt bei Fehlern
 * error_description an, bei Erfolg einen code. Abgelaufene Links bekommen einen eigenen Text.
 */
export function readAuthRedirect(search: string, hash: string): AuthRedirect {
  const params = new URLSearchParams(search)
  new URLSearchParams(hash.replace(/^#/, '')).forEach((value, key) => params.set(key, value))
  const code = params.get('error_code')
  if (params.has('error') || code) {
    if (code === 'otp_expired') {
      return { kind: 'error', message: 'Der Link ist abgelaufen oder wurde schon benutzt. Fordere einfach einen neuen an.' }
    }
    return { kind: 'error', message: 'Der Link hat nicht funktioniert. Fordere einfach einen neuen an.' }
  }
  if (params.has('code')) return { kind: 'confirmed' }
  return null
}
