import { useEffect, useRef, useState } from 'react'
import { validatePlanDraft } from '../../domain/planEditing'
import { copyTemplateDay, replaceTemplateDay } from '../../domain/planWeekdays'
import type { PlanDayDraft } from '../../domain/trainingPlan'
import { newExercise } from './api'
import { ExercisePages } from './ExercisePages'

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const ORDER = [1, 2, 3, 4, 5, 6, 0]
const FIELD = 'mt-1 h-11 w-full min-w-0 rounded-xl bg-[#2C2C2E] px-3 text-base text-white outline-none focus:ring-2 focus:ring-neon'

/** Speichert den ganzen Plan. Liefert eine Fehlermeldung oder null bei Erfolg. */
export type SavePlan = (days: PlanDayDraft[]) => Promise<string | null>

export function TemplateWeekdays({ days, onSave }: { days: PlanDayDraft[]; onSave: SavePlan }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<PlanDayDraft | null>(null)
  const [isExisting, setIsExisting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reveal, setReveal] = useState<{ index: number } | undefined>()
  const [original, setOriginal] = useState('')
  const [ask, setAsk] = useState<'rest' | 'discard' | null>(null)

  useEffect(() => {
    if (draft && !dialog.current?.open) dialog.current?.showModal()
    if (!draft && dialog.current?.open) dialog.current.close()
  }, [draft])

  function open(weekday: number) {
    const existing = days.find((day) => day.weekday === weekday)
    const next = existing ? copyTemplateDay(existing, weekday) : { weekday, name: '', exercises: [newExercise()] }
    setDraft(next)
    setOriginal(JSON.stringify(next))
    setIsExisting(Boolean(existing))
    setError(null)
    setReveal(undefined)
    setAsk(null)
  }

  function edit(next: PlanDayDraft) {
    setDraft(next)
    setAsk(null)
  }

  function close() {
    if (busy) return
    // Ungespeicherte Eingaben gehen nie ohne Rückfrage verloren.
    if (JSON.stringify(draft) !== original) setAsk('discard')
    else setDraft(null)
  }

  async function save(replacement: PlanDayDraft | null, weekday: number) {
    setBusy(true)
    setError(null)
    setAsk(null)
    const message = await onSave(replaceTemplateDay(days, weekday, replacement))
    setBusy(false)
    if (message) setError(message)
    else setDraft(null)
  }

  function saveDay() {
    if (!draft) return
    const invalid = validatePlanDraft([draft])
    if (invalid) {
      setError(invalid.message)
      if (invalid.exercise !== undefined) setReveal({ index: invalid.exercise })
      return
    }
    void save(draft, draft.weekday)
  }

  const copySources = draft ? days.filter((day) => day.weekday !== draft.weekday) : []

  return <section className="mt-4" aria-label="Wochentage der Vorlage">
    <p className="mb-3 text-sm text-[#8E8E93]">Tippe auf einen Tag, um sein Training festzulegen.</p>
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
      {ORDER.map((weekday) => {
        const day = days.find((item) => item.weekday === weekday)
        return <button key={weekday} className={`min-h-24 min-w-0 rounded-xl px-1 py-3 text-center transition-transform active:scale-95 ${day ? 'bg-neon/10 text-neon ring-1 ring-neon/60' : 'bg-[#1C1C1E] text-[#8E8E93] ring-1 ring-white/[0.08]'}`}
          type="button" aria-label={`${WEEKDAYS[weekday]} bearbeiten`} aria-pressed={Boolean(day)} aria-haspopup="dialog"
          title={day ? `${WEEKDAYS[weekday]}: ${day.name}` : `${WEEKDAYS[weekday]}: Ruhetag`} onClick={() => open(weekday)}>
          <span className="block font-semibold">{WEEKDAYS[weekday].slice(0, 2)}</span>
          <span className="mt-2 block truncate px-0.5 text-xs">{day ? day.name : 'Ruhetag'}</span>
          {day && <span className="mt-0.5 block text-xs tabular-nums opacity-70">{day.exercises.length} {day.exercises.length === 1 ? 'Übung' : 'Übungen'}</span>}
        </button>
      })}
    </div>

    <dialog ref={dialog} className="template-day-dialog m-auto w-[calc(100%_-_2rem)] max-w-xl rounded-2xl bg-[#1C1C1E] p-0 text-white shadow-2xl ring-1 ring-white/[0.08]"
      aria-labelledby="template-day-title"
      onCancel={(event) => { event.preventDefault(); close() }}
      onClose={() => setDraft(null)}
      onKeyDown={(event) => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault() }}>
      {draft && <div className="template-day-layout">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 md:px-6">
          <h3 id="template-day-title" className="text-xl font-bold tracking-tight">{WEEKDAYS[draft.weekday]}</h3>
          <button className="h-11 w-11 rounded-xl bg-[#2C2C2E] text-[#8E8E93]" type="button" aria-label="Tages-Popup schließen" disabled={busy} onClick={close}>✕</button>
        </header>
        <div className="template-day-body min-h-0 min-w-0 overflow-y-auto p-4 md:p-6">
        <fieldset disabled={busy} className="min-w-0">
          {!isExisting && copySources.length > 0 && (
            <label className="mb-3 block text-sm text-[#8E8E93]">Von einem anderen Tag kopieren
              <select className={FIELD} value="" onChange={(event) => {
                const source = days.find((day) => day.weekday === Number(event.target.value))
                if (source) edit(copyTemplateDay(source, draft.weekday))
              }}>
                <option value="">Nicht kopieren</option>
                {copySources.map((day) => <option key={day.weekday} value={day.weekday}>{WEEKDAYS[day.weekday]} · {day.name}</option>)}
              </select>
            </label>
          )}
          <label className="block text-sm text-[#8E8E93]">Name
            <input className={FIELD} maxLength={100} value={draft.name} placeholder="z. B. Oberkörper"
              onChange={(event) => edit({ ...draft, name: event.target.value })} />
          </label>
          <ExercisePages exercises={draft.exercises} onChange={(exercises) => edit({ ...draft, exercises })} reveal={reveal} />
          {isExisting && (ask === 'rest' ? (
            <div className="mt-3 flex gap-2">
              <button className="min-h-11 flex-1 rounded-xl bg-[#2C2C2E] px-3 py-2 text-sm font-medium text-white" type="button" onClick={() => setAsk(null)}>Abbrechen</button>
              <button className="min-h-11 flex-1 rounded-xl bg-[#FF453A] px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => void save(null, draft.weekday)}>Ja, Ruhetag</button>
            </div>
          ) : (
            <button className="mt-3 min-h-11 w-full text-sm font-medium text-[#8E8E93]" type="button" onClick={() => setAsk('rest')}>
              Zum Ruhetag machen
            </button>
          ))}
          {error && <p role="alert" className="mt-3 text-sm text-[#FF453A]">{error}</p>}
        </fieldset>
        </div>
        <footer className="template-day-actions shrink-0 border-t border-white/[0.06] p-4 md:px-6">
          {ask === 'discard' ? <>
            <p role="alert" className="mb-3 text-sm text-white">Änderungen verwerfen?</p>
            <div className="flex gap-2">
              <button className="min-h-12 flex-1 rounded-xl bg-[#2C2C2E] px-3 py-2 text-sm font-semibold text-[#FF453A]" type="button" onClick={() => setDraft(null)}>Verwerfen</button>
              <button className="min-h-12 flex-1 rounded-xl bg-neon px-3 py-2 text-sm font-semibold text-black" type="button" onClick={() => setAsk(null)}>Weiter bearbeiten</button>
            </div>
          </> : (
            <button className="min-h-12 w-full rounded-xl bg-neon px-3 py-2 font-semibold text-black disabled:opacity-50" type="button" disabled={busy} onClick={saveDay}>
              {busy ? 'Wird gespeichert …' : 'Tag speichern'}
            </button>
          )}
        </footer>
      </div>}
    </dialog>
  </section>
}
