import type { AuthError } from '@supabase/supabase-js'
import { type FormEvent, useState } from 'react'
import { supabase } from '../../lib/supabase'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-transparent bg-[#2C2C2E] px-3.5 py-3 text-base text-white outline-none transition-colors focus:border-[#FFD60A] focus:bg-[#3A3A3C]'

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="rounded-3xl border border-white/[0.08] bg-[#1C1C1E] p-6 shadow-2xl">
        <img className="h-14 w-14 rounded-2xl shadow-md ring-1 ring-white/10" src="/icons/icon-192.png" alt="" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">LiftLog</h1>
        <p className="mt-1 text-sm text-[#8E8E93]">Melde dich an, um dein Training zu starten.</p>

        <form className="mt-6" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-[#EBEBF5]/85">
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
          <label className="mt-4 block text-sm font-medium text-[#EBEBF5]/85">
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
          {error && <p role="alert" className="mt-3 text-sm text-[#FF453A]">{error}</p>}
          <button
            className="mt-6 min-h-12 w-full rounded-xl bg-[#FFD60A] px-4 py-3 font-semibold text-black shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Wird geprüft …' : 'Anmelden'}
          </button>
        </form>
      </div>
    </main>
  )
}
