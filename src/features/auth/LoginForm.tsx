import type { AuthError } from '@supabase/supabase-js'
import { type FormEvent, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Wordmark } from '../../lib/Wordmark'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-transparent bg-control px-3.5 py-3 text-base text-foreground outline-none transition-colors focus:border-neon focus:bg-control-hover'

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
    <main className="login-shell mx-auto min-h-dvh px-4">
      <aside className="login-intro">
        <p className="text-sm font-medium uppercase tracking-widest text-accent-ink">Dein Training. Dein Fortschritt.</p>
        <h2>Mehr Überblick.<br />Mehr aus deinem Training.</h2>
        <p>Plane deine Woche, halte deine Sätze fest und sieh, wie du stärker wirst.</p>
        <div className="login-preview" aria-hidden="true">
          <span>DEINE TRAININGSWOCHE</span>
          <div><b>Mo</b><b>Di</b><b>Mi</b><b>Do</b><b>Fr</b><b>Sa</b><b>So</b></div>
          <p>Planen · Trainieren · Fortschritte sehen</p>
        </div>
      </aside>
      <div className="login-panel rounded-3xl border border-line/[0.08] bg-surface p-6 shadow-2xl">
        <img className="h-14 w-14 rounded-2xl shadow-md ring-1 ring-line/10" src="/icons/icon-192.png" alt="" />
        <h1 className="mt-4 text-4xl">
          <Wordmark />
        </h1>
        <p className="mt-1 text-sm text-muted">Melde dich an, um dein Training zu starten.</p>

        <form className="mt-6" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-foreground/85">
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
          <label className="mt-4 block text-sm font-medium text-foreground/85">
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
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
          <button
            className="mt-6 min-h-12 w-full rounded-xl bg-neon px-4 py-3 font-semibold text-black shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
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
