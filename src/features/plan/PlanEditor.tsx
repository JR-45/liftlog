import { useEffect, useState, type FormEvent } from 'react'
import { validatePlanDraft } from '../../domain/planEditing'
import { loadPlan, loadPlanSettings, savePlan, type PlanDayDraft } from './api'
import { PLAN_SPLITS, TRAINING_METHODS, recommendPlan } from '../../domain/trainingPlan'
import { TemplateWeekdays } from './TemplateWeekdays'

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const INPUT = 'mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-neutral-100'
const BUTTON = 'rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200 disabled:opacity-50'

export function PlanEditor({ hasPlan, onSaved, onCancel }: {
  hasPlan: boolean; onSaved: () => void; onCancel: () => void
}) {
  const [days, setDays] = useState<PlanDayDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [method, setMethod] = useState('classic')
  const [split, setSplit] = useState('custom')
  const recommendation = recommendPlan(method, split)
  const selectedMethod = TRAINING_METHODS.find((item) => item.id === method)!

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



  async function persist(nextDays: PlanDayDraft[]) {
    setBusy(true)
    setError(null)
    try {
      await savePlan(nextDays, method, split)
      onSaved()
    } catch (cause) {
      const message = cause && typeof cause === 'object' && 'code' in cause && cause.code === '22023' && 'message' in cause
        ? String(cause.message) : 'Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.'
      setError(message)
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const invalid = validatePlanDraft(days)
    if (invalid) {
      setError(`${WEEKDAYS[days[invalid.day]?.weekday ?? 1]}${invalid.exercise === undefined ? '' : `, Übung ${invalid.exercise + 1}`}: ${invalid.message}`)
      return
    }
    void persist(days)
  }

  return (
    <section className="plan-editor mt-6">
      <h2 className="text-xl font-semibold">{hasPlan ? 'Trainingsplan bearbeiten' : 'Dein erster Trainingsplan'}</h2>
      <p className="mt-2 text-sm text-neutral-400">Lege deine Trainingstage und Übungen fest. Deinen Plan kannst du jederzeit ändern.</p>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      {loading ? <p className="mt-4 text-neutral-400">Plan wird geladen …</p> : loadFailed ? null : (
        <form onSubmit={submit} noValidate>
          <fieldset disabled={busy} className="plan-fields disabled:opacity-60">
            <section className="plan-config mt-5 rounded-xl border border-neutral-700 p-3">
              <h3 className="font-medium">Trainingsmethode & Empfehlungen</h3>
              <label className="mt-3 block text-sm text-neutral-400">Trainingsmethode
                <select className={INPUT} value={method} onChange={(event) => setMethod(event.target.value)}>
                  {TRAINING_METHODS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="mt-3 block text-sm text-neutral-400">Planaufteilung
                <select className={INPUT} value={split} onChange={(event) => setSplit(event.target.value)}>
                  {PLAN_SPLITS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <div className="mt-4 rounded-lg bg-neutral-800 p-3" aria-live="polite">
                <h4 className="text-sm font-medium text-yellow-300">Empfehlung: {selectedMethod.name}</h4>
                <p className="mt-2 text-sm text-neutral-300">{selectedMethod.hint}</p>
                <p className="mt-2 text-sm text-neutral-400">Beispiel für gesunde Erwachsene. Passe Belastung und Umfang an deine Erfahrung an.</p>
                <p className="mt-2 text-sm text-neutral-400">Krafttraining: alle großen Muskelgruppen möglichst mindestens zweimal pro Woche trainieren.</p>
                <a className="mt-2 inline-block text-xs text-neutral-400 underline" href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noreferrer">Grundlagen: ACSM 2026</a>
                <ul className="mt-3 space-y-2 text-sm text-neutral-300">
                  {recommendation.map((day) => <li key={day.weekday}>
                    <span className="font-medium">{WEEKDAYS[day.weekday]} · {day.name}</span>
                    <p className="text-neutral-400">{day.exercises.map((exercise) => `${exercise.name} (${exercise.sets_min} × ${exercise.reps_min === null ? `${exercise.duration_min} Sek.` : `${exercise.reps_min}–${exercise.reps_max}`})`).join(', ')}</p>
                  </li>)}
                </ul>
                <p className="mt-3 text-xs text-neutral-400">Die Übernahme ersetzt die aktuellen Trainingstage im Entwurf. Erst Speichern ändert deinen gespeicherten Plan. Methoden mit festem Ablauf haben eigene Beispieltage.</p>
                <button className={`${BUTTON} mt-3 w-full`} type="button" onClick={() => setDays(recommendPlan(method, split))}>Vorschlag übernehmen</button>
              </div>
            </section>
            <div className="plan-days-area min-w-0">
            <h3 className="mt-6 text-lg font-medium">Trainingstage & Übungen</h3>
            <TemplateWeekdays days={days} onChange={setDays} />
            <button className="mt-5 w-full rounded-lg bg-yellow-400 px-4 py-3 font-semibold text-neutral-950 disabled:opacity-50"
              type="submit" disabled={days.length === 0 || loading}>{busy ? 'Wird gespeichert …' : 'Trainingsplan speichern'}</button>
            {hasPlan && <button className={`${BUTTON} mt-3 w-full`} type="button" onClick={onCancel}>Abbrechen</button>}
            {hasPlan && !confirmDelete && <button className="mt-6 w-full py-2 text-sm text-red-300" type="button"
              onClick={() => setConfirmDelete(true)}>Trainingsplan löschen</button>}
            {hasPlan && confirmDelete && <div className="mt-4 rounded-lg border border-red-900 p-3">
              <p className="text-sm">Trainingsplan wirklich löschen? Deine bisherigen Trainingsdaten bleiben erhalten.</p>
              <div className="mt-3 flex gap-2">
                <button className={`${BUTTON} text-red-300`} type="button" onClick={() => void persist([])}>Ja, Plan löschen</button>
                <button className={BUTTON} type="button" onClick={() => setConfirmDelete(false)}>Behalten</button>
              </div>
            </div>}
            </div>
          </fieldset>
        </form>
      )}
      {loadFailed && <button className={`${BUTTON} mt-3`} type="button" onClick={() => {
        setError(null); setLoadFailed(false); setLoading(true); setAttempt((value) => value + 1)
      }}>Erneut laden</button>}
    </section>
  )
}
