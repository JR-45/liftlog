import { type FormEvent, useState } from 'react'
import { type AuthRedirect, authErrorMessage, MIN_PASSWORD_LENGTH, passwordProblem } from '../../domain/auth'
import { Wordmark } from '../../lib/Wordmark'
import { ACCOUNT_DELETED_FLAG, resendConfirmation, sendPasswordReset, signIn, signUp } from './api'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-transparent bg-control px-3.5 py-3 text-base text-foreground outline-none transition-colors focus:border-neon focus:bg-control-hover'
const linkClass = 'min-h-11 text-sm font-semibold text-accent-ink underline underline-offset-2'

type Mode = 'login' | 'signup' | 'forgot' | 'check-signup' | 'check-reset'

const INTRO: Record<Mode, string> = {
  login: 'Melde dich an, um dein Training zu starten.',
  signup: 'Erstelle dein Konto. Danach bestätigst du kurz deine E-Mail.',
  forgot: 'Gib deine E-Mail ein. Wir schicken dir einen Link für ein neues Passwort.',
  'check-signup': 'Fast geschafft!',
  'check-reset': 'Schau in dein Postfach.',
}

export function LoginForm({ redirect }: { redirect: AuthRedirect }) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(redirect?.kind === 'error' ? redirect.message : null)
  const [info, setInfo] = useState<string | null>(() => {
    if (redirect?.kind === 'confirmed') return 'Deine E-Mail ist bestätigt. Melde dich jetzt an.'
    try {
      // Einmalige Bestätigung direkt nach dem Löschen des Kontos.
      if (sessionStorage.getItem(ACCOUNT_DELETED_FLAG)) {
        sessionStorage.removeItem(ACCOUNT_DELETED_FLAG)
        return 'Dein Konto und alle Daten wurden gelöscht.'
      }
    } catch {
      // Ohne Speicherzugriff keine Meldung.
    }
    return null
  })
  const [unconfirmed, setUnconfirmed] = useState(false)

  function switchTo(next: Mode) {
    setMode(next)
    setError(null)
    setInfo(null)
    setUnconfirmed(false)
    setPassword('')
    setRepeat('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const cleanEmail = email.trim()
    setError(null)
    setInfo(null)

    if (mode === 'signup') {
      const problem = passwordProblem(password, repeat)
      if (problem) return setError(problem)
    }

    setBusy(true)
    if (mode === 'login') {
      // Bei Erfolg wechselt useSession automatisch zur App.
      const loginError = await signIn(cleanEmail, password)
      if (loginError) {
        setError(authErrorMessage(loginError, 'login'))
        setUnconfirmed(loginError.code === 'email_not_confirmed')
      }
    } else if (mode === 'signup') {
      const signUpError = await signUp(cleanEmail, password)
      if (signUpError) setError(authErrorMessage(signUpError, 'signup'))
      else switchTo('check-signup')
    } else if (mode === 'forgot') {
      const resetError = await sendPasswordReset(cleanEmail)
      if (resetError) setError(authErrorMessage(resetError, 'reset'))
      else switchTo('check-reset')
    }
    setBusy(false)
  }

  async function handleResend() {
    setBusy(true)
    setError(null)
    const resendError = await resendConfirmation(email.trim())
    if (resendError) setError(authErrorMessage(resendError, 'signup'))
    else setInfo('Wir haben dir den Link noch einmal geschickt.')
    setBusy(false)
  }

  const checking = mode === 'check-signup' || mode === 'check-reset'

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
        <p className="mt-1 text-sm text-muted">{INTRO[mode]}</p>

        {(mode === 'login' || mode === 'signup') && (
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-control p-1" role="tablist" aria-label="Anmelden oder registrieren">
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                onClick={() => switchTo(tab)}
                className={`min-h-10 rounded-lg text-sm font-semibold transition-colors ${
                  mode === tab ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'
                }`}
              >
                {tab === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>
        )}

        {checking ? (
          <div className="mt-6 space-y-4">
            <p className="text-base text-foreground">
              {mode === 'check-signup'
                ? 'Wir haben dir eine Mail geschickt. Tippe auf den Link darin, um deine E-Mail zu bestätigen. Danach kannst du dich anmelden.'
                : 'Falls es ein Konto mit dieser E-Mail gibt, haben wir dir einen Link für ein neues Passwort geschickt.'}
            </p>
            <p className="rounded-xl bg-control px-3.5 py-3 text-sm font-medium text-foreground">{email.trim()}</p>
            <p className="text-sm text-muted">Keine Mail da? Schau auch im Spam-Ordner nach.</p>
            {info && <p role="status" className="text-sm text-success">{info}</p>}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap gap-x-5">
              {mode === 'check-signup' && (
                <button type="button" className={linkClass} disabled={busy} onClick={() => void handleResend()}>
                  Mail erneut senden
                </button>
              )}
              <button type="button" className={linkClass} onClick={() => switchTo('login')}>
                Zur Anmeldung
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-5" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block text-sm font-medium text-foreground/85">
              E-Mail
              <input
                className={inputClass}
                type="email"
                autoComplete={mode === 'signup' ? 'email' : 'username'}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {mode !== 'forgot' && (
              <label className="mt-4 block text-sm font-medium text-foreground/85">
                Passwort
                <input
                  className={inputClass}
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            )}
            {mode === 'signup' && (
              <>
                <label className="mt-4 block text-sm font-medium text-foreground/85">
                  Passwort wiederholen
                  <input
                    className={inputClass}
                    type="password"
                    autoComplete="new-password"
                    required
                    value={repeat}
                    onChange={(event) => setRepeat(event.target.value)}
                  />
                </label>
                <p className="mt-2 text-xs text-muted">Mindestens {MIN_PASSWORD_LENGTH} Zeichen.</p>
              </>
            )}
            {info && <p role="status" className="mt-3 text-sm text-success">{info}</p>}
            {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
            {unconfirmed && (
              <button type="button" className={`${linkClass} mt-1`} disabled={busy} onClick={() => void handleResend()}>
                Bestätigungs-Mail erneut senden
              </button>
            )}
            <button
              className="mt-6 min-h-12 w-full rounded-xl bg-neon px-4 py-3 font-semibold text-black shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
              type="submit"
              disabled={busy}
            >
              {busy
                ? 'Einen Moment …'
                : mode === 'login'
                  ? 'Anmelden'
                  : mode === 'signup'
                    ? 'Konto erstellen'
                    : 'Link senden'}
            </button>
            {mode === 'login' && (
              <button type="button" className={`${linkClass} mt-3`} onClick={() => switchTo('forgot')}>
                Passwort vergessen?
              </button>
            )}
            {mode === 'forgot' && (
              <button type="button" className={`${linkClass} mt-3`} onClick={() => switchTo('login')}>
                Zurück zur Anmeldung
              </button>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
