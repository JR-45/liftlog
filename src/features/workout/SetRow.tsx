import { useEffect, useState } from 'react'
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
  'h-11 w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-900 px-2 text-center text-base tabular-nums text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-yellow-400'

type Props = {
  label: string
  rowNumber: number
  userId: string
  date: string
  exerciseId: string
  setNumber: number
  tracking: TrackingType
  unit: DurationUnit
  workingWeight: number | null
  saved: SetValues | null
  initialDraft: SetDraft | null
  /** Wert vom letzten Training als Orientierung. Er wird nicht gespeichert. */
  placeholder: string
  onSave: (setNumber: number, values: SetValues | null) => Promise<void>
  onWeightInput: (text: string) => void
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
  const {
    label,
    rowNumber,
    userId,
    date,
    exerciseId,
    setNumber,
    tracking,
    unit,
    workingWeight,
    saved,
    initialDraft,
    placeholder,
    onSave,
    onWeightInput,
  } = props

  // weight === null: Das Feld folgt dem Arbeitsgewicht. Eingetippte Werte gelten bis zum nächsten + oder −.
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

  // + und − gelten für alle offenen Sätze. Gespeicherte behalten ihr Gewicht, sonst stimmt die Historie nicht.
  const [followedWeight, setFollowedWeight] = useState(workingWeight)
  if (followedWeight !== workingWeight) {
    setFollowedWeight(workingWeight)
    if (!saved) setDraft({ ...draft, weight: null })
  }

  // Hält den Entwurf eines offenen Satzes aktuell, damit er auch nach + oder − das Schließen der App übersteht.
  useEffect(() => {
    if (!dirty || saved) return
    writeDraft(userId, date, exerciseId, setNumber, {
      weight: shownWeight,
      reps: draft.reps,
      duration: draft.duration,
    })
  }, [dirty, saved, shownWeight, draft.reps, draft.duration, userId, date, exerciseId, setNumber])

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
      removeDraft(userId, date, exerciseId, setNumber)
      setDraft((current) => ({ ...current, weight: parsed.kind === 'ok' ? shownWeight : null }))
      setDirty(false)
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
        <span className="w-6 shrink-0 text-center text-sm tabular-nums text-neutral-500">{rowNumber}</span>

        {tracking === 'duration' ? (
          <input
            className={inputClass}
            aria-label={`${label} Dauer in ${unit === 'minutes' ? 'Minuten' : 'Sekunden'}`}
            inputMode="decimal"
            placeholder={placeholder}
            value={draft.duration}
            onChange={(event) => change({ duration: event.target.value })}
          />
        ) : (
          <>
            {usesWeight(tracking) && (
              <input
                className={inputClass}
                aria-label={`${label} ${tracking === 'assisted_reps' ? 'Gewichtshilfe' : 'Gewicht'} in kg`}
                inputMode="decimal"
                value={shownWeight}
                onChange={(event) => {
                  change({ weight: event.target.value })
                  onWeightInput(event.target.value)
                }}
              />
            )}
            <input
              className={inputClass}
              aria-label={`${label} Wiederholungen`}
              inputMode="numeric"
              placeholder={placeholder}
              value={draft.reps}
              onChange={(event) => change({ reps: event.target.value })}
            />
          </>
        )}

        <button
          className={`h-11 w-11 shrink-0 rounded-lg border text-lg transition-colors disabled:opacity-50 ${
            isSaved ? 'border-yellow-400 bg-yellow-400 text-neutral-950' : 'border-neutral-700 text-neutral-400'
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
