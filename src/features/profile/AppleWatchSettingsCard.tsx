import { useEffect, useState, type FormEvent } from 'react'
import {
  parseAppleHealthInput,
  SHORTCUT_FILE_PATH,
  SHORTCUT_NAME,
  SHORTCUTS_AUTOMATION_URL,
  shortcutRunUrl,
  type AppleHealthDay,
} from '../../domain/appleHealth'
import { CheckIcon } from '../../lib/icons'
import { CARD, INPUT, LINK, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from '../../lib/ui'
import { createAppleHealthToken, disconnectAppleWatch, loadAppleHealthStatus, saveAppleHealthDay } from './api'

const INT = new Intl.NumberFormat('de-DE')

export function AppleWatchSettingsCard({ today }: { today: string }) {
  const [connected, setConnected] = useState(false)
  const [day, setDay] = useState<AppleHealthDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState({ activeKcal: '', workoutMinutes: '', steps: '' })
  // Neuer Schlüssel, nur solange die Einrichtung offen ist. Danach kennt ihn nur noch der Kurzbefehl.
  const [setupToken, setSetupToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadAppleHealthStatus(today)
      .then((status) => {
        if (cancelled) return
        setConnected(status.connected)
        setDay(status.day)
        if (status.day) {
          setDraft({
            activeKcal: String(status.day.activeKcal),
            workoutMinutes: String(status.day.workoutMinutes),
            steps: String(status.day.steps),
          })
        }
      })
      .catch(() => {
        if (!cancelled) setError('Apple-Health-Status konnte nicht geladen werden.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [today])

  useEffect(() => {
    if (!confirmDisconnect) return
    const timer = window.setTimeout(() => setConfirmDisconnect(false), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmDisconnect])

  function handleRunShortcut() {
    setError('')
    window.location.href = shortcutRunUrl()
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
    } catch {
      // Ohne Zwischenablage (z. B. kein HTTPS): Schlüssel bleibt markierbar sichtbar.
      setCopied(false)
    }
  }

  async function handleStartSetup() {
    setBusy(true)
    setError('')
    setFeedback('')
    try {
      const token = await createAppleHealthToken()
      setSetupToken(token)
      setConnected(true)
      await copyToken(token)
    } catch {
      setError('Verbindung konnte nicht vorbereitet werden.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveManual(event: FormEvent) {
    event.preventDefault()
    const parsed = parseAppleHealthInput(draft, today)
    if (!parsed) {
      setError('Bitte gültige Werte für Kalorien, Minuten oder Schritte eingeben.')
      return
    }
    setBusy(true)
    setError('')
    setFeedback('')
    try {
      const saved = await saveAppleHealthDay(parsed)
      setDay(saved)
      setConnected(true)
      setEditing(false)
      setFeedback('Apple-Watch-Werte gespeichert.')
    } catch {
      setError('Werte konnten nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true)
      return
    }
    setConfirmDisconnect(false)
    setBusy(true)
    setError('')
    setFeedback('')
    try {
      await disconnectAppleWatch()
      setConnected(false)
      setSetupToken(null)
      setEditing(false)
      setFeedback('Verbindung getrennt.')
    } catch {
      setError('Verbindung konnte nicht getrennt werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={CARD} aria-labelledby="apple-watch-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="apple-watch-heading" className={SECTION_TITLE}>
          Apple Watch & Health
        </h2>
        {!loading && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              connected ? 'bg-success/15 text-success' : 'bg-control text-muted'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-success' : 'bg-muted'}`} aria-hidden="true" />
            {connected ? 'Verbunden' : 'Nicht verbunden'}
          </span>
        )}
      </div>

      <div className="relative mt-3 overflow-hidden rounded-xl border border-line/[0.08] bg-surface-inset">
        <img
          src="/apple-watch.jpg"
          alt="Apple Watch mit Aktivitätsringen, Herzfrequenz und aktiven Kalorien"
          className="h-44 w-full object-cover object-center sm:h-52"
          loading="lazy"
        />
        <div className="flex items-center justify-between gap-3 border-t border-line/[0.08] bg-surface px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-foreground">Apple Health Synchronisation</span>
          <span className="text-muted">Aktive kcal · Training · Schritte</span>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-muted">Wird geladen …</p>
      ) : (
        <div className="mt-3 space-y-3">
          {day ? (
            <dl className="grid grid-cols-3 gap-2 rounded-xl bg-surface-inset p-3 text-center">
              <div>
                <dt className="text-xs text-muted">Aktive Energie</dt>
                <dd className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                  {INT.format(day.activeKcal)} <span className="text-xs font-normal text-muted">kcal</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Training</dt>
                <dd className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                  {INT.format(day.workoutMinutes)} <span className="text-xs font-normal text-muted">Min.</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Schritte</dt>
                <dd className="mt-0.5 text-base font-bold tabular-nums text-foreground">{INT.format(day.steps)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted">
              Holt aktive Kalorien und Trainingsminuten jeden Tag automatisch aus Apple Health.
            </p>
          )}

          {editing ? (
            <form className="space-y-3" onSubmit={(event) => void handleSaveManual(event)}>
              <div className="grid grid-cols-3 gap-2">
                <label className="block text-xs text-muted">
                  <span className="mb-1 block">Aktive kcal</span>
                  <input
                    className={INPUT}
                    inputMode="numeric"
                    enterKeyHint="done"
                    placeholder="485"
                    value={draft.activeKcal}
                    onChange={(event) => setDraft((current) => ({ ...current, activeKcal: event.target.value }))}
                  />
                </label>
                <label className="block text-xs text-muted">
                  <span className="mb-1 block">Training (Min.)</span>
                  <input
                    className={INPUT}
                    inputMode="numeric"
                    enterKeyHint="done"
                    placeholder="52"
                    value={draft.workoutMinutes}
                    onChange={(event) => setDraft((current) => ({ ...current, workoutMinutes: event.target.value }))}
                  />
                </label>
                <label className="block text-xs text-muted">
                  <span className="mb-1 block">Schritte</span>
                  <input
                    className={INPUT}
                    inputMode="numeric"
                    enterKeyHint="done"
                    placeholder="8420"
                    value={draft.steps}
                    onChange={(event) => setDraft((current) => ({ ...current, steps: event.target.value }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
                  {busy ? 'Speichert …' : 'Werte speichern'}
                </button>
                <button type="button" disabled={busy} className={SECONDARY_BUTTON} onClick={() => setEditing(false)}>
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <>
              {setupToken ? (
                <ol className="space-y-3">
                  <li className="rounded-xl bg-surface-inset p-3">
                    <p className="text-sm font-semibold text-foreground">1. Kurzbefehl hinzufügen</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {copied ? 'Dein Schlüssel ist kopiert. ' : ''}Laden, dann „Kurzbefehl hinzufügen“ tippen.
                    </p>
                    {!copied && (
                      <input
                        readOnly
                        aria-label="Dein Schlüssel"
                        className={`${INPUT} mt-2 font-mono text-xs`}
                        value={setupToken}
                        onFocus={(event) => event.target.select()}
                      />
                    )}
                    <a
                      href={SHORTCUT_FILE_PATH}
                      // Eigener Tab: Safari merkt sich das Laden der Datei sonst als letzten Seitenaufruf,
                      // und jedes Neuladen der App installiert den Kurzbefehl erneut.
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${PRIMARY_BUTTON} mt-2 flex items-center justify-center text-center`}
                    >
                      Kurzbefehl laden
                    </a>
                    {copied && (
                      <button type="button" className={`${LINK} mt-2 text-xs`} onClick={() => void copyToken(setupToken)}>
                        Schlüssel nochmal kopieren
                      </button>
                    )}
                  </li>
                  <li className="rounded-xl bg-surface-inset p-3">
                    <p className="text-sm font-semibold text-foreground">2. Einmal starten</p>
                    <p className="mt-0.5 text-xs text-muted">Schlüssel einfügen, dann Health und Verbindung erlauben. Danach fragt er nie wieder.</p>
                    <button type="button" className={`${SECONDARY_BUTTON} mt-2 w-full`} onClick={handleRunShortcut}>
                      Jetzt ausführen
                    </button>
                  </li>
                  <li className="rounded-xl bg-surface-inset p-3">
                    <p className="text-sm font-semibold text-foreground">3. Täglich automatisch</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Neue Automation → Tageszeit (z. B. 21:00) → „{SHORTCUT_NAME}“ → Sofort ausführen.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <a href={SHORTCUTS_AUTOMATION_URL} className={`${SECONDARY_BUTTON} flex items-center justify-center text-center`}>
                        Automation einrichten
                      </a>
                      <button type="button" className={SECONDARY_BUTTON} onClick={() => setSetupToken(null)}>
                        Fertig
                      </button>
                    </div>
                  </li>
                </ol>
              ) : connected ? (
                <button type="button" disabled={busy} className={`${PRIMARY_BUTTON} w-full`} onClick={handleRunShortcut}>
                  Jetzt synchronisieren
                </button>
              ) : (
                <button type="button" disabled={busy} className={`${PRIMARY_BUTTON} w-full`} onClick={() => void handleStartSetup()}>
                  {busy ? 'Wird vorbereitet …' : 'Mit Apple Watch verbinden'}
                </button>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  className={LINK}
                  onClick={() => {
                    setError('')
                    setEditing(true)
                  }}
                >
                  {day ? 'Werte anpassen' : 'Werte manuell eintragen'}
                </button>
                {connected && !setupToken && (
                  <button type="button" disabled={busy} className={LINK} onClick={() => void handleStartSetup()}>
                    Neu einrichten
                  </button>
                )}
              </div>
              {connected && (
                <button
                  type="button"
                  disabled={busy}
                  className={`min-h-11 w-full border-t border-line/[0.06] pt-2.5 text-left text-sm font-medium ${
                    confirmDisconnect ? 'rounded-xl bg-danger/15 px-3 text-danger' : 'text-danger'
                  }`}
                  onClick={() => void handleDisconnect()}
                >
                  {confirmDisconnect ? 'Sicher? Nochmal tippen' : 'Apple Watch trennen'}
                </button>
              )}
            </>
          )}

          {feedback && (
            <p role="status" className="flex items-center gap-1.5 text-xs font-semibold text-success">
              <CheckIcon className="h-4 w-4" />
              {feedback}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
