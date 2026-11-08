import { useEffect, useState } from 'react'
import { formatRange } from '../../domain/sets'
import { isCardioExercise } from '../../domain/cardio'
import { loadDay, type PlanEntry } from './api'

function target(entry: PlanEntry): string {
  if (entry.exercise.tracking_type === 'duration' && isCardioExercise(entry.exercise.name)) {
    const minutes = formatRange(entry.duration_min === null ? null : entry.duration_min / 60, entry.duration_max === null ? null : entry.duration_max / 60)
    return minutes ? `${minutes} Min.` : 'Minuten frei'
  }
  const sets = formatRange(entry.sets_min, entry.sets_max)
  const reps = formatRange(entry.reps_min, entry.reps_max)
  const duration = formatRange(entry.duration_min, entry.duration_max)
  if (reps) return `${sets}${entry.sets_min !== entry.sets_max || (entry.steps?.length ?? 0) > 0 ? ' Runden' : ''} × ${reps}`
  return duration ? `${sets} × ${duration} Sek.` : 'Dauer frei'
}

/** Zeigt einen anderen Trainingstag nur an. Hier wird nichts gespeichert. */
export function DayPreview({ planDayId, today, dayName, dayLabel, resume, onTakeOver }: {
  planDayId: string; today: string; dayName: string; dayLabel: string
  /** Ob ein heute schon begonnener Tag direkt geöffnet wird. Aus, wenn bewusst zur Vorschau gewechselt wurde. */
  resume: boolean; onTakeOver: (planDayId: string) => void
}) {
  const [entries, setEntries] = useState<PlanEntry[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadDay(planDayId, today).then((data) => {
      if (cancelled) return
      // Mit heute gespeicherten Sätzen geht es direkt weiter. Ein nur gestartetes Training zählt nicht.
      if (resume && data.todaySets.length > 0) onTakeOver(planDayId)
      else setEntries(data.entries)
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [planDayId, today, resume, onTakeOver])

  if (failed) return <p role="alert" className="mt-6 text-sm text-danger">Der Tag konnte nicht geladen werden.</p>
  if (!entries) return <p className="mt-6 text-sm text-muted">Wird geladen …</p>

  return <section className="mt-4" aria-label={`Vorschau ${dayLabel}`}>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted">{dayLabel} · Vorschau</p>
    <h2 className="mt-1 text-2xl text-foreground">{dayName}</h2>
    <ul className="mt-3 divide-y divide-line/[0.06] rounded-2xl border border-line/[0.08] bg-surface px-4">
      {entries.map((entry) => <li key={entry.id} className="py-3">
        <span className="block font-medium text-foreground">{entry.exercise.name}</span>
        <span className="block text-sm tabular-nums text-muted">{target(entry)}</span>
      </li>)}
    </ul>
    <p className="mt-4 text-sm text-muted">Trainieren und abhaken geht nur für heute.</p>
    <button type="button" className="mt-2 min-h-11 text-sm font-medium text-neon" onClick={() => onTakeOver(planDayId)}>Stattdessen heute trainieren</button>
  </section>
}
