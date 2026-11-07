import { type FormEvent, useState } from 'react'
import { authErrorMessage, MIN_PASSWORD_LENGTH, passwordProblem } from '../../domain/auth'
import { Wordmark } from '../../lib/Wordmark'
import { updatePassword } from './api'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-transparent bg-control px-3.5 py-3 text-base text-foreground outline-none transition-colors focus:border-neon focus:bg-control-hover'

/** Erscheint nach dem Link aus der Passwort-Mail. Der User ist dann schon angemeldet. */
export function NewPasswordForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problem = passwordProblem(password, repeat)
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    const updateError = await updatePassword(password)
    setBusy(false)
    if (updateError) setError(authErrorMessage(updateError, 'update'))
    else onDone()
  }

  return (
    <main className="login-shell mx-auto min-h-dvh px-4">
      <div className="login-panel rounded-3xl border border-line/[0.08] bg-surface p-6 shadow-2xl">
        <h1 className="text-4xl">
          <Wordmark />
        </h1>
        <p className="mt-1 text-sm text-muted">Wähle ein neues Passwort.</p>
        <form className="mt-5" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block text-sm font-medium text-foreground/85">
            Neues Passwort
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
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
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
          <button
            className="mt-6 min-h-12 w-full rounded-xl bg-neon px-4 py-3 font-semibold text-black disabled:opacity-50"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Einen Moment …' : 'Passwort speichern'}
          </button>
        </form>
      </div>
    </main>
  )
}
