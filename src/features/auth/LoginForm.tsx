import type { AuthError } from '@supabase/supabase-js'
import { type FormEvent, useState } from 'react'
import { supabase } from '../../lib/supabase'

const inputClass =
  'mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-3 text-base text-neutral-100 outline-none focus:border-emerald-400'

function loginErrorMessage(error: AuthError): string {
  if (error.status === 429) return 'Zu viele Versuche. Warte kurz und versuch es noch einmal.'
  if (error.code === 'invalid_credentials') return 'E-Mail oder Passwort ist falsch.'
  return 'Die Anmeldung hat nicht geklappt. Versuch es später noch einmal.'
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    // Bei Erfolg wechselt useSession automatisch zur App.
    if (loginError) setError(loginErrorMessage(loginError))
    setBusy(false)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <img className="h-14 w-14 rounded-2xl" src="/icons/icon-192.png" alt="" />
      <h1 className="mt-4 text-2xl font-semibold text-neutral-100">LiftLog</h1>

      <form className="mt-6" onSubmit={handleSubmit}>
        <label className="block text-sm text-neutral-300">
          E-Mail
          <input
            className={inputClass}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="mt-4 block text-sm text-neutral-300">
          Passwort
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
        <button
          className="mt-4 w-full rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-neutral-950 disabled:opacity-50"
          type="submit"
          disabled={busy}
        >
          {busy ? 'Wird geprüft …' : 'Anmelden'}
        </button>
      </form>
    </main>
  )
}
