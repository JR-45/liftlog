import { type FormEvent, useState } from 'react'
import { deleteOwnAccount } from '../auth/api'

/**
 * Konto löschen: aufklappbar, mit Hinweis auf den CSV-Export und Passwortabfrage.
 * Löscht Konto und alle Trainingsdaten endgültig.
 */
export function DeleteAccountCard({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await deleteOwnAccount(email, password)
    // Bei Erfolg meldet sich die App ab und zeigt den Login, diese Karte verschwindet.
    if (result === 'wrong_password') setError('Das Passwort stimmt nicht.')
    else if (result === 'failed') setError('Das Konto konnte nicht gelöscht werden. Versuch es später noch einmal.')
    setBusy(false)
  }

  return (
    <div className="rounded-2xl border border-danger/30 bg-surface p-4">
      {!open ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Konto löschen</p>
            <p className="text-xs text-muted">Entfernt dein Konto und alle Trainingsdaten endgültig.</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-danger underline underline-offset-2"
          >
            Löschen …
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)}>
          <h3 className="text-xl text-danger">Konto endgültig löschen?</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/85">
            <li>Dein Konto, dein Plan, alle Trainings, Sätze, Körperdaten und dein Profil werden gelöscht.</li>
            <li>Das lässt sich <strong>nicht rückgängig</strong> machen.</li>
            <li>Sichere deine Daten vorher mit dem CSV-Export oben, wenn du sie behalten willst.</li>
          </ul>
          <label className="mt-4 block text-sm font-medium text-foreground/85">
            Zur Bestätigung dein Passwort
            <input
              className="mt-1.5 w-full rounded-xl border border-transparent bg-control px-3.5 py-3 text-base text-foreground outline-none focus:border-danger"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={busy || password === ''}
              className="min-h-12 flex-1 rounded-xl bg-danger-fill px-4 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Wird gelöscht …' : 'Konto endgültig löschen'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false)
                setPassword('')
                setError(null)
              }}
              className="min-h-12 flex-1 rounded-xl bg-control px-4 font-semibold text-foreground"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
