import { useEffect, useState } from 'react'
import { loadPlan, loadPlanSettings, savePlan, type PlanDayDraft } from './api'
import { TemplateWeekdays } from './TemplateWeekdays'

const BUTTON = 'min-h-11 rounded-xl bg-control px-3 py-2 text-sm font-medium text-foreground disabled:opacity-50'

export function PlanEditor({ hasPlan, onSaved }: { hasPlan: boolean; onSaved: () => void }) {
  const [days, setDays] = useState<PlanDayDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [method, setMethod] = useState('classic')
  const [split, setSplit] = useState('custom')

  useEffect(() => {
    let cancelled = false
    Promise.all([loadPlan(), loadPlanSettings()]).then(([plan, settings]) => {
      if (!cancelled) {
        setDays(plan); setMethod(settings.method); setSplit(settings.split); setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) { setError('Dein Plan konnte nicht geladen werden.'); setLoadFailed(true); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [attempt])

  /** Speichert den ganzen Plan und meldet einen Fehlertext zurück, statt zu werfen. */
  async function persist(nextDays: PlanDayDraft[]): Promise<string | null> {
    setBusy(true)
    setError(null)
    try {
      await savePlan(nextDays, method, split)
      onSaved()
      return null
    } catch (cause) {
      setBusy(false)
      return cause && typeof cause === 'object' && 'code' in cause && cause.code === '22023' && 'message' in cause
        ? String(cause.message) : 'Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.'
    }
  }

  // Wie bei der Stoppuhr: Der erste Tipp fragt nach, nach 3 Sekunden ohne zweiten Tipp passiert nichts.
  useEffect(() => {
    if (!confirmDelete) return
    const timer = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(timer)
  }, [confirmDelete])

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setConfirmDelete(false)
    const message = await persist([])
    if (message) setError(message)
  }

  return (
    <section className="mt-4">
      {hasPlan
        ? <h2 className="mt-4 border-t border-line/[0.08] pt-6 text-xl">Wochenvorlage</h2>
        : <h2 className="text-xl font-bold tracking-tight text-foreground">Dein erster Trainingsplan</h2>}
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      {loading ? <p className="mt-4 text-sm text-muted">Plan wird geladen …</p> : loadFailed ? null : (
        <>
          <TemplateWeekdays days={days} onSave={persist} />
          {hasPlan && <div className="mt-6 text-center">
            <button className={`min-h-11 w-full rounded-xl text-sm transition-colors ${confirmDelete ? 'bg-danger/15 font-semibold text-danger' : 'font-medium text-danger'}`}
              type="button" disabled={busy} onClick={() => void handleDelete()}>
              {confirmDelete ? 'Sicher? Nochmal tippen' : 'Trainingsplan löschen'}
            </button>
            {confirmDelete && <p role="status" className="mt-1 text-xs text-muted">Deine bisherigen Trainingsdaten bleiben erhalten.</p>}
          </div>}
        </>
      )}
      {loadFailed && <button className={`${BUTTON} mt-3`} type="button" onClick={() => {
        setError(null); setLoadFailed(false); setLoading(true); setAttempt((value) => value + 1)
      }}>Erneut laden</button>}
    </section>
  )
}
