import { TimeWheelInput } from '../../components/TimeWheelInput'
import { DistanceWheelInput } from '../../components/DistanceWheelInput'
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
import { CheckIcon, PlusIcon } from '../../lib/icons'
import { formatPace, formatSpeed } from '../../domain/cardio'
import { GpsTracker } from './GpsTracker'
import { removeDraft, writeDraft } from './drafts'

const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-transparent bg-control px-1 text-center text-base font-medium tabular-nums text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-neon focus:bg-control-hover'
const stepClass =
  'h-11 w-11 shrink-0 rounded-xl bg-control text-lg font-medium text-foreground transition-all active:scale-95 active:bg-control-hover disabled:opacity-35 disabled:active:scale-100'

type Props = {
  label: string
  rowNumber: number
  userId: string
  date: string
  exerciseId: string
  setNumber: number
  tracking: TrackingType
  unit: DurationUnit
  legacyUnit?: DurationUnit
  distanceEnabled?: boolean
  gpsEnabled?: boolean
  metricMode?: 'pace' | 'speed'
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

function draftFromSaved(saved: SetValues, unit: DurationUnit, distanceUnit: 'm' | 'km'): SetDraft {
  const duration = saved.duration_seconds === null ? '' : unit === 'minutes' ? saved.duration_seconds / 60 : saved.duration_seconds
  return {
    weight: saved.weight_kg === null ? '' : String(saved.weight_kg).replace('.', ','),
    reps: saved.reps === null ? '' : String(saved.reps),
    duration: String(duration).replace('.', ','),
    distance: saved.distance_km == null ? '' : String(saved.distance_km * (distanceUnit === 'm' ? 1000 : 1)).replace('.', ','),
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
    legacyUnit = unit,
    distanceEnabled = false,
    gpsEnabled = false,
    metricMode = 'pace',
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
  const [distanceUnit] = useState<'m' | 'km'>(initialDraft?.distanceUnit ?? (initialDraft ? 'km' : 'm'))
  const [gpsRunning, setGpsRunning] = useState(false)
  const [draft, setDraft] = useState<{ weight: string | null; reps: string; duration: string; distance?: string }>(() => {
    if (initialDraft) {
      const oldUnit = initialDraft.durationUnit ?? legacyUnit
      const value = Number(initialDraft.duration.replace(',', '.'))
      return oldUnit !== unit && initialDraft.duration.trim() && Number.isFinite(value)
        ? { ...initialDraft, duration: String(unit === 'minutes' ? value / 60 : value * 60).replace('.', ',') }
        : initialDraft
    }
    if (saved) return draftFromSaved(saved, unit, distanceUnit)
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
      distance: draft.distance,
      distanceUnit,
      durationUnit: unit,
    })
  }, [dirty, shownWeight, draft.reps, draft.duration, draft.distance, distanceUnit, unit, userId, date, exerciseId, setNumber])

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

  /** Ein leeres Feld übernimmt zuerst den Wert vom letzten Mal, danach zählt jeder Tipp eins hoch. */
  function handleRepsIncrement() {
    const current = Number(draft.reps.trim())
    if (draft.reps.trim() !== '' && Number.isInteger(current)) {
      change({ reps: String(Math.max(1, current + 1)) })
      return
    }
    const fromLast = Number(placeholder)
    change({ reps: String(placeholder !== '' && Number.isInteger(fromLast) && fromLast > 0 ? fromLast : 1) })
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
    const parsed = parseSetDraft({ weight: shownWeight, reps: draft.reps, duration: draft.duration,
      ...(tracking === 'duration' && distanceEnabled ? { distance: draft.distance ?? '', distanceUnit } : {}),
    }, tracking, unit)
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
  const distanceKm = Number(draft.distance?.replace(',', '.')) / (distanceUnit === 'm' ? 1000 : 1)
  const metric = tracking === 'duration' ? (metricMode === 'speed' ? formatSpeed : formatPace)(Number(draft.duration.replace(',', '.')) * (unit === 'minutes' ? 60 : 1), distanceKm) : null

  return (
    <li className="mt-2">
      <div
        className={`flex items-center gap-1 rounded-xl p-1 transition-colors ${
          isSaved ? 'bg-success/10' : ''
        }`}
      >
        {!distanceEnabled && <span
          className={`w-4 shrink-0 text-center text-xs font-semibold tabular-nums ${
            isSaved ? 'text-success' : 'text-muted'
          }`}
        >
          {rowNumber}
        </span>}

        {tracking === 'duration' ? (
          <><TimeWheelInput
            className={`${inputClass} flex-1`}
            aria-label={`${label} Dauer`}
            valueSeconds={draft.duration.trim() && Number.isFinite(Number(draft.duration.replace(',', '.'))) ? Number(draft.duration.replace(',', '.')) * (unit === 'minutes' ? 60 : 1) : null}
            placeholderSeconds={placeholder ? Number(placeholder.replace(',', '.')) * (unit === 'minutes' ? 60 : 1) : null}
            disabled={gpsRunning}
            onSecondsChange={seconds => change({ duration: seconds === null ? '' : String(seconds / (unit === 'minutes' ? 60 : 1)) })}
          />
          {distanceEnabled && <DistanceWheelInput className={`${inputClass} flex-1`} aria-label={`${label} Strecke`}
            disabled={gpsRunning} placeholder="Strecke" valueKm={draft.distance?.trim() && Number.isFinite(distanceKm) ? distanceKm : null}
            onKilometersChange={kilometers => change({ distance: kilometers === null ? '' : String(distanceUnit === 'm' ? Math.round(kilometers * 1000) : kilometers) })} />}</>
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
                  enterKeyHint="done"
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
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <input
                className={inputClass}
                aria-label={`${label} Wiederholungen`}
                inputMode="numeric"
                enterKeyHint="done"
                placeholder={placeholder}
                value={draft.reps}
                onChange={(event) => change({ reps: event.target.value })}
              />
              <button
                className={`${stepClass} flex items-center justify-center`}
                type="button"
                aria-label={`${label} eine Wiederholung mehr`}
                onClick={handleRepsIncrement}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        <button
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-50 ${
            isSaved
              ? 'bg-success-fill text-black shadow-sm shadow-[#30D158]/20'
              : 'bg-control text-muted hover:text-foreground'
          }`}
          type="button"
          aria-label={isSaved ? `${label} gespeichert, Haken entfernen` : `${label} speichern`}
          aria-pressed={isSaved}
          disabled={busy || gpsRunning}
          onClick={() => void (isSaved ? handleUncheck() : handleSave())}
        >
          <CheckIcon className="h-5 w-5 stroke-[2.5]" />
        </button>
      </div>
      {metric && <p className="mt-1 text-right text-xs font-medium tabular-nums text-accent-ink" aria-live="polite">{metricMode === 'speed' ? 'Geschwindigkeit' : 'Pace'}: {metric}</p>}
      {gpsEnabled && <GpsTracker onRunningChange={setGpsRunning} onMeasured={(meters, seconds) => change({
        distance: String(Math.round(meters) / (distanceUnit === 'km' ? 1000 : 1)).replace('.', ','),
        duration: String(unit === 'minutes' ? Number((seconds / 60).toFixed(3)) : seconds).replace('.', ','),
      })} />}
      {error && <p role="alert" className="mt-1 text-sm text-danger">{error}</p>}
    </li>
  )
}
