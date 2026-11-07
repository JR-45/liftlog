import { useEffect, useState } from 'react'
import {
  type DurationUnit,
  parseSetDraft,
  parseWeightInput,
  type SetDraft,
  type SetValues,
  stepWeight,
  type TrackingType,
  usesWeight,
} from '../../domain/sets'
import { removeDraft, writeDraft } from './drafts'

const inputClass =
  'h-11 w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-900 px-1 text-center text-base tabular-nums text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-yellow-400'
const stepClass =
  'h-11 w-9 shrink-0 rounded-lg border border-neutral-700 bg-neutral-900 text-lg text-neutral-100 disabled:opacity-40'

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
  /** Gewicht dieses Satzes vom letzten Training, damit jeder Satz dort weitermacht. */
  plannedWeight: number | null
  /** Ändert sich bei einem Wechsel der Erfassungsart. Offene Sätze verwerfen dann ihr altes Gewicht. */
  resetRequest: number
  weightStep: number
  onSave: (setNumber: number, values: SetValues | null) => Promise<void>
  /** Meldet der Karte, dass es jetzt Eingaben gibt, die sich zurücksetzen lassen. */
  onEdit: () => void
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
    plannedWeight,
    resetRequest,
    weightStep,
    onSave,
    onEdit,
  } = props

  // weight === null: Das Feld zeigt das Arbeitsgewicht, z. B. im ersten Training nach dem ersten Satz.
  const [draft, setDraft] = useState<{ weight: string | null; reps: string; duration: string }>(() => {
    if (initialDraft) return initialDraft
    if (saved) return draftFromSaved(saved, unit)
    return { weight: plannedWeight === null ? null : String(plannedWeight).replace('.', ','), reps: '', duration: '' }
  })
  const [dirty, setDirty] = useState(initialDraft !== null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workingWeightText = workingWeight === null ? '' : String(workingWeight).replace('.', ',')
  const shownWeight = draft.weight ?? workingWeightText
  const weightValue = parseWeightInput(shownWeight)
  const weightName = tracking === 'assisted_reps' ? 'Gewichtshilfe' : 'Gewicht'

  const [followedRequest, setFollowedRequest] = useState(resetRequest)
  if (followedRequest !== resetRequest) {
    setFollowedRequest(resetRequest)
    if (!saved) setDraft({ ...draft, weight: null })
  }

  // Hält den Entwurf aktuell, damit er auch das Schließen der App übersteht.
  useEffect(() => {
    if (!dirty) return
    writeDraft(userId, date, exerciseId, setNumber, {
      weight: shownWeight,
      reps: draft.reps,
      duration: draft.duration,
    })
  }, [dirty, shownWeight, draft.reps, draft.duration, userId, date, exerciseId, setNumber])

  function change(changes: Partial<SetDraft>) {
    setDraft({ ...draft, ...changes })
    setDirty(true)
    setError(null)
    onEdit()
  }

  function handleWeightStep(direction: 1 | -1) {
    const next = stepWeight(weightValue, weightStep, direction)
    if (next !== null) change({ weight: String(next).replace('.', ',') })
  }

  /** Nimmt den Haken zurück. Die Werte bleiben stehen, damit ein weiterer Tipp sie wieder speichert. */
  async function handleUncheck() {
    setBusy(true)
    setError(null)
    try {
      await onSave(setNumber, null)
      setDraft((current) => ({ ...current, weight: shownWeight }))
      setDirty(true)
      onEdit()
    } catch {
      setError('Der Haken konnte nicht entfernt werden. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
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
      setDirty(false)
      removeDraft(userId, date, exerciseId, setNumber)
      setDraft((current) => ({ ...current, weight: parsed.kind === 'ok' ? shownWeight : null }))
    } catch {
      setError('Nicht gespeichert. Deine Eingabe bleibt erhalten, tippe noch einmal auf den Haken.')
    } finally {
      setBusy(false)
    }
  }

  const isSaved = saved !== null && !dirty

  return (
    <li className="mt-2">
      <div className="flex items-center gap-1.5">
        <span className="w-4 shrink-0 text-center text-sm tabular-nums text-neutral-500">{rowNumber}</span>

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
              <div className="flex min-w-0 flex-[2] items-center gap-1">
                <button
                  className={stepClass}
                  type="button"
                  aria-label={`${label} ${weightName} um ${weightStep} kg senken`}
                  disabled={!weightValue}
                  onClick={() => handleWeightStep(-1)}
                >
                  −
                </button>
                <input
                  className={inputClass}
                  aria-label={`${label} ${weightName} in kg`}
                  inputMode="decimal"
                  value={shownWeight}
                  onChange={(event) => change({ weight: event.target.value })}
                />
                <button
                  className={stepClass}
                  type="button"
                  aria-label={`${label} ${weightName} um ${weightStep} kg erhöhen`}
                  onClick={() => handleWeightStep(1)}
                >
                  +
                </button>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <input
                className={inputClass}
                aria-label={`${label} Wiederholungen`}
                inputMode="numeric"
                placeholder={placeholder}
                value={draft.reps}
                onChange={(event) => change({ reps: event.target.value })}
              />
            </div>
          </>
        )}

        <button
          className={`h-11 w-10 shrink-0 rounded-lg border text-lg transition-colors disabled:opacity-50 ${
            isSaved ? 'border-yellow-400 bg-yellow-400 text-neutral-950' : 'border-neutral-700 text-neutral-400'
          }`}
          type="button"
          aria-label={isSaved ? `${label} gespeichert, Haken entfernen` : `${label} speichern`}
          aria-pressed={isSaved}
          disabled={busy}
          onClick={() => void (isSaved ? handleUncheck() : handleSave())}
        >
          ✓
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-red-300">{error}</p>}
    </li>
  )
}
