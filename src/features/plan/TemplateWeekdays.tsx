import { useEffect, useRef, useState } from 'react'
import { validatePlanDraft } from '../../domain/planEditing'
import { copyTemplateDay, replaceTemplateDay } from '../../domain/planWeekdays'
import type { PlanDayDraft } from '../../domain/trainingPlan'
import { newExercise } from './api'
import { ExercisePages } from './ExercisePages'

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const ORDER = [1, 2, 3, 4, 5, 6, 0]
const BUTTON = 'min-h-11 rounded-lg border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40'

export function TemplateWeekdays({ days, onChange }: { days: PlanDayDraft[]; onChange: (days: PlanDayDraft[]) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<PlanDayDraft | null>(null)
  const [rest, setRest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reveal, setReveal] = useState<{ index: number } | undefined>()

  useEffect(() => {
    if (draft && !dialog.current?.open) dialog.current?.showModal()
    if (!draft && dialog.current?.open) dialog.current.close()
  }, [draft])

  function open(weekday: number) {
    const existing = days.find((day) => day.weekday === weekday)
    setDraft(existing ? copyTemplateDay(existing, weekday) : { weekday, name: '', exercises: [newExercise()] })
    setRest(false)
    setError(null)
    setReveal(undefined)
  }

  function apply() {
    if (!draft) return
    if (!rest) {
      const invalid = validatePlanDraft([draft])
      if (invalid) {
        setError(invalid.message)
        if (invalid.exercise !== undefined) setReveal({ index: invalid.exercise })
        return
      }
    }
    onChange(replaceTemplateDay(days, draft.weekday, rest ? null : draft))
    setDraft(null)
  }

  return <section className="mt-5" aria-label="Wochentage der Vorlage">
    <p className="mb-3 text-sm text-neutral-400">Klicke auf die Tage, an denen du trainieren möchtest, und erstelle jeweils deinen Trainingsplan. Markierte Tage haben eine Trainingseinheit.</p>
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
      {ORDER.map((weekday) => {
        const day = days.find((item) => item.weekday === weekday)
        return <button key={weekday} className={`min-h-24 min-w-0 rounded-xl border px-1 py-3 text-center ${day ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300' : 'border-neutral-700 bg-neutral-800/30 text-neutral-400'}`}
          type="button" aria-label={`${WEEKDAYS[weekday]} bearbeiten`} aria-pressed={Boolean(day)} aria-haspopup="dialog"
          title={day ? `${WEEKDAYS[weekday]}: ${day.name}` : `${WEEKDAYS[weekday]}: Ruhetag`} onClick={() => open(weekday)}>
          <span className="block font-semibold">{WEEKDAYS[weekday].slice(0, 2)}</span>
          <span className="mt-2 block text-xs">{day ? '✓ Training' : 'Ruhetag'}</span>
        </button>
      })}
    </div>
    <dialog ref={dialog} className="template-day-dialog m-auto w-[calc(100%_-_2rem)] max-w-xl rounded-2xl border border-neutral-700 bg-neutral-900 p-0 text-neutral-100 shadow-2xl"
      aria-labelledby="template-day-title" aria-describedby="template-day-description"
      onCancel={(event) => { event.preventDefault(); setDraft(null) }}
      onClose={() => setDraft(null)}
      onKeyDown={(event) => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault() }}>
      {draft && <div className="template-day-layout">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-700 p-4 md:px-6">
          <h3 id="template-day-title" className="text-xl font-semibold">{WEEKDAYS[draft.weekday]}</h3>
          <button className={BUTTON} type="button" aria-label="Tages-Popup schließen" onClick={() => setDraft(null)}>✕</button>
        </header>
        <div className="template-day-body min-h-0 overflow-y-auto p-4 md:p-6">
        <p id="template-day-description" className="mt-2 text-sm text-neutral-400">Änderungen gelten für deine Wochenvorlage. Anschließend den Trainingsplan speichern.</p>
        <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="Tag festlegen">
          <button className={`${BUTTON} ${!rest ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300' : ''}`} type="button" aria-pressed={!rest} onClick={() => { setRest(false); setError(null) }}>Trainingstag</button>
          <button className={`${BUTTON} ${rest ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300' : ''}`} type="button" aria-pressed={rest} onClick={() => { setRest(true); setError(null) }}>Ruhetag</button>
        </div>
        {rest ? <p className="mt-5 text-sm text-neutral-400">Für {WEEKDAYS[draft.weekday]} ist kein Training in der Vorlage vorgesehen.</p> : <>
          <label className="mt-4 block text-sm text-neutral-400">Einheit von anderem Tag übernehmen
            <select className="mt-1 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base" value="" onChange={(event) => {
              if (event.target.value === '') return
              const source = days.find((day) => day.weekday === Number(event.target.value))
              if (source) setDraft(copyTemplateDay(source, draft.weekday))
            }}>
              <option value="">Eigene Einheit erstellen oder kopieren …</option>
              {days.filter((day) => day.weekday !== draft.weekday).map((day) => <option key={day.weekday} value={day.weekday}>{WEEKDAYS[day.weekday]} · {day.name}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-sm text-neutral-400">Name des Trainingstags
            <input className="mt-1 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base" maxLength={100}
              value={draft.name} placeholder="z. B. Oberkörper" onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <ExercisePages exercises={draft.exercises} onChange={(exercises) => setDraft({ ...draft, exercises })} reveal={reveal} />
        </>}
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
        </div>
        <footer className="template-day-actions grid shrink-0 grid-cols-2 gap-2 border-t border-neutral-700 bg-neutral-900 p-4 md:px-6">
          <button className="min-h-11 rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-neutral-950" type="button" aria-label={`Für ${WEEKDAYS[draft.weekday]} übernehmen`} onClick={apply}>Tag übernehmen</button>
          <button className={BUTTON} type="button" onClick={() => setDraft(null)}>Abbrechen</button>
        </footer>
      </div>}
    </dialog>
  </section>
}
