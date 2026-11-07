import { useState } from 'react'
import {
  type DurationUnit,
  parseSetDraft,
  type SetDraft,
  type SetValues,
  type TrackingType,
  usesWeight,
} from '../../domain/sets'
import { removeDraft, writeDraft } from './drafts'

const inputClass =
  'h-11 w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-center text-base text-neutral-100 outline-none focus:border-neutral-400'

type Props = {
  label: string
  userId: string
  date: string
  exerciseId: string
  setNumber: number
  tracking: TrackingType
  unit: DurationUnit
  workingWeight: number | null
  saved: SetValues | null
  initialDraft: SetDraft | null
  onSave: (setNumber: number, values: SetValues | null) => Promise<void>
}

function draftFromSaved(saved: SetValues, unit: DurationUnit): SetDraft {
  const duration = saved.duration_seconds === null ? '' : unit === 'minutes' ? saved.duration_seconds / 60 : saved.duration_seconds
  return {
    weight: saved.weight_kg === null ? '' : String(saved.weight_kg).replace('.', ','),
    reps: saved.reps === null ? '' : String(saved.reps),
    duration: String(duration).replace('.', ','),
  }
}

export function SetRow(props: Props) {
  const { label, userId, date, exerciseId, setNumber, tracking, unit, workingWeight, saved, initialDraft, onSave } = props

  // weight === null: Das Feld folgt dem Arbeitsgewicht, bis der Satz abweicht oder gespeichert ist.
  const [draft, setDraft] = useState<{ weight: string | null; reps: string; duration: string }>(() => {
    if (initialDraft) return initialDraft
    if (saved) return draftFromSaved(saved, unit)
    return { weight: null, reps: '', duration: '' }
  })
  const [dirty, setDirty] = useState(initialDraft !== null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workingWeightText = workingWeight === null ? '' : String(workingWeight).replace('.', ',')
  const shownWeight = draft.weight ?? workingWeightText

  function change(changes: Partial<SetDraft>) {
    const next = { ...draft, ...changes }
    setDraft(next)
    setDirty(true)
    setError(null)
    writeDraft(userId, date, exerciseId, setNumber, { ...next, weight: next.weight ?? shownWeight })
  }

  async function handleSave() {
    const parsed = parseSetDraft({ weight: shownWeight, reps: draft.reps, duration: draft.duration }, tracking, unit)
    if (parsed.kind === 'invalid') {
      setError(parsed.message)
      return
    }
    // Ein geleerter, schon gespeicherter Satz wird gelöscht. Ein leerer neuer Satz bleibt einfach leer.
    if (parsed.kind === 'empty' && !saved) {
      setDirty(false)
      removeDraft(userId, date, exerciseId, setNumber)
      return
    }

    setBusy(true)
    setError(null)
    try {
      await onSave(setNumber, parsed.kind === 'ok' ? parsed.values : null)
      setDraft((current) => ({ ...current, weight: parsed.kind === 'ok' ? shownWeight : null }))
      setDirty(false)
      removeDraft(userId, date, exerciseId, setNumber)
    } catch {
      setError('Nicht gespeichert. Deine Eingabe bleibt erhalten, tippe noch einmal auf den Haken.')
      writeDraft(userId, date, exerciseId, setNumber, { weight: shownWeight, reps: draft.reps, duration: draft.duration })
    } finally {
      setBusy(false)
    }
  }

  const isSaved = saved !== null && !dirty

  return (
    <li className="mt-2">
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-sm text-neutral-400">{label}</span>

        {tracking === 'duration' ? (
          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-neutral-400">
            <input
              className={inputClass}
              aria-label={`${label} Dauer in ${unit === 'minutes' ? 'Minuten' : 'Sekunden'}`}
              inputMode="decimal"
              value={draft.duration}
              onChange={(event) => change({ duration: event.target.value })}
            />
            {unit === 'minutes' ? 'Min.' : 'Sek.'}
          </label>
        ) : (
          <>
            {usesWeight(tracking) && (
              <label className="flex min-w-0 flex-1 items-center gap-1 text-sm text-neutral-400">
                <input
                  className={inputClass}
                  aria-label={`${label} ${tracking === 'assisted_reps' ? 'Gewichtshilfe' : 'Gewicht'} in kg`}
                  inputMode="decimal"
                  value={shownWeight}
                  onChange={(event) => change({ weight: event.target.value })}
                />
                kg
              </label>
            )}
            <label className="flex min-w-0 flex-1 items-center gap-1 text-sm text-neutral-400">
              <input
                className={inputClass}
                aria-label={`${label} Wiederholungen`}
                inputMode="numeric"
                value={draft.reps}
                onChange={(event) => change({ reps: event.target.value })}
              />
              Wdh.
            </label>
          </>
        )}

        <button
          className={`h-11 w-11 shrink-0 rounded-lg border text-lg disabled:opacity-50 ${
            isSaved ? 'border-neutral-300 bg-neutral-200 text-neutral-900' : 'border-neutral-700 text-neutral-300'
          }`}
          type="button"
          aria-label={isSaved ? `${label} gespeichert, erneut speichern` : `${label} speichern`}
          disabled={busy}
          onClick={() => void handleSave()}
        >
          ✓
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-red-300">{error}</p>}
    </li>
  )
}
