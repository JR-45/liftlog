import { type FormEvent, useState } from 'react'
import type { TrackingType } from '../../domain/sets'
import { addExerciseToPlanDay, type PlanEntry } from './api'

const fieldClass =
  'h-11 rounded-xl border border-transparent bg-control px-3 text-base text-foreground outline-none transition-colors focus:border-accent focus:bg-control-hover disabled:opacity-50'

type Props = {
  planDayId: string
  nextPosition: number
  onAdded: (entry: PlanEntry) => void
}

export function AddExerciseForm({ planDayId, nextPosition, onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [trackingType, setTrackingType] = useState<TrackingType>('weight_reps')
  const [sets, setSets] = useState('3')
  const [repsMin, setRepsMin] = useState('8')
  const [repsMax, setRepsMax] = useState('12')
  const [durationSec, setDurationSec] = useState('60')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <div className="mt-4">
        <button
          type="button"
          className="min-h-11 w-full rounded-2xl border border-dashed border-line/[0.14] bg-surface/60 px-4 py-3 text-sm font-semibold text-accent-ink transition-colors hover:bg-surface active:scale-[0.99]"
          onClick={() => setOpen(true)}
        >
          + Übung zum Trainingstag hinzufügen
        </button>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    const parsedSets = Number(sets)
    if (!trimmed) {
      setError('Bitte gib einen Übungsnamen ein.')
      return
    }
    if (!Number.isInteger(parsedSets) || parsedSets < 1 || parsedSets > 20) {
      setError('Sätze prüfen (1 bis 20).')
      return
    }

    const isDuration = trackingType === 'duration'
    const parsedMin = Number(repsMin)
    const parsedMax = Number(repsMax)
    const parsedDur = Number(durationSec)

    if (isDuration) {
      if (!Number.isInteger(parsedDur) || parsedDur < 5 || parsedDur > 3600) {
        setError('Dauer in Sekunden prüfen (5 bis 3600).')
        return
      }
    } else if (!Number.isInteger(parsedMin) || !Number.isInteger(parsedMax) || parsedMin < 1 || parsedMax < parsedMin) {
      setError('Wiederholungsbereich prüfen.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const created = await addExerciseToPlanDay({
        planDayId,
        name: trimmed,
        trackingType,
        sets: parsedSets,
        repsMin: isDuration ? null : parsedMin,
        repsMax: isDuration ? null : parsedMax,
        durationSeconds: isDuration ? parsedDur : null,
        position: nextPosition,
      })
      onAdded(created)
      setName('')
      setOpen(false)
    } catch {
      setError('Die Übung konnte nicht hinzugefügt werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mt-4 space-y-3 rounded-2xl border border-line/[0.1] bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Neue Übung hinzufügen</h3>
        <button
          type="button"
          className="min-h-11 px-2 text-sm text-muted"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
        >
          Abbrechen
        </button>
      </div>

      <label className="block text-sm font-medium text-foreground/85">
        Name der Übung
        <input
          className={`${fieldClass} mt-1 w-full`}
          placeholder="z. B. Seitheben"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>

      <label className="flex items-center justify-between gap-3 text-sm font-medium text-foreground/85">
        Erfassung
        <select
          className={fieldClass}
          value={trackingType}
          onChange={(event) => setTrackingType(event.target.value as TrackingType)}
        >
          <option value="weight_reps">Mit Gewicht</option>
          <option value="assisted_reps">Mit Gewichtshilfe</option>
          <option value="reps">Ohne Gewicht</option>
          <option value="duration">Nach Dauer</option>
        </select>
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="block text-xs font-medium text-muted">
          Sätze
          <input
            className={`${fieldClass} mt-1 w-full text-center tabular-nums`}
            inputMode="numeric"
            value={sets}
            onChange={(event) => setSets(event.target.value)}
          />
        </label>
        {trackingType === 'duration' ? (
          <label className="col-span-2 block text-xs font-medium text-muted">
            Dauer (Sek.)
            <input
              className={`${fieldClass} mt-1 w-full text-center tabular-nums`}
              inputMode="numeric"
              value={durationSec}
              onChange={(event) => setDurationSec(event.target.value)}
            />
          </label>
        ) : (
          <>
            <label className="block text-xs font-medium text-muted">
              Min. Wdh.
              <input
                className={`${fieldClass} mt-1 w-full text-center tabular-nums`}
                inputMode="numeric"
                value={repsMin}
                onChange={(event) => setRepsMin(event.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-muted">
              Max. Wdh.
              <input
                className={`${fieldClass} mt-1 w-full text-center tabular-nums`}
                inputMode="numeric"
                value={repsMax}
                onChange={(event) => setRepsMax(event.target.value)}
              />
            </label>
          </>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="min-h-11 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition-transform active:scale-[0.99] disabled:opacity-50"
      >
        {busy ? 'Wird gespeichert …' : 'Hinzufügen'}
      </button>
    </form>
  )
}
