import { useEffect, useState } from 'react'
import { loadPlan, loadPlanSettings, savePlan, type PlanDayDraft } from './api'
import { TemplateWeekdays } from './TemplateWeekdays'

const BUTTON = 'min-h-11 rounded-xl bg-[#2C2C2E] px-3 py-2 text-sm font-medium text-white disabled:opacity-50'

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

  async function deletePlan() {
    const message = await persist([])
    if (message) setError(message)
  }

  return (
    <section className="mt-4">
      {!hasPlan && <h2 className="text-xl font-bold tracking-tight text-white">Dein erster Trainingsplan</h2>}
      {error && <p role="alert" className="mt-4 text-sm text-[#FF453A]">{error}</p>}
      {loading ? <p className="mt-4 text-sm text-[#8E8E93]">Plan wird geladen …</p> : loadFailed ? null : (
        <>
          <TemplateWeekdays days={days} onSave={persist} />
          {hasPlan && !confirmDelete && <button className="mt-6 min-h-11 w-full text-sm font-medium text-[#FF453A]" type="button" disabled={busy}
            onClick={() => setConfirmDelete(true)}>Trainingsplan löschen</button>}
          {hasPlan && confirmDelete && <div className="mt-4 rounded-2xl bg-[#1C1C1E] p-3.5 ring-1 ring-[#FF453A]/40">
            <p className="text-sm text-white">Trainingsplan wirklich löschen? Deine bisherigen Trainingsdaten bleiben erhalten.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className={`${BUTTON} text-[#FF453A]`} type="button" disabled={busy} onClick={() => void deletePlan()}>Ja, Plan löschen</button>
              <button className={BUTTON} type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>Behalten</button>
            </div>
          </div>}
        </>
      )}
      {loadFailed && <button className={`${BUTTON} mt-3`} type="button" onClick={() => {
        setError(null); setLoadFailed(false); setLoading(true); setAttempt((value) => value + 1)
      }}>Erneut laden</button>}
    </section>
  )
}
