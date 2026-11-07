import type { ExportRow } from './export'
import { formatDuration, formatPerformance, formatWeight } from './sets'

export type ProgressPoint = {
  date: string
  value: number
  label: string
  normX: number
  normY: number
}

export type ExerciseProgress = {
  exercise: string
  isAssisted: boolean
  unitLabel: string
  points: ProgressPoint[]
  latestLabel: string
  bestLabel: string
  deltaLabel: string | null
}

export type DayHistory = {
  date: string
  planDay: string | null
  exercises: { name: string; summary: string }[]
}

function formatNum(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',')
}

/** Liste aller Übungsnamen, zu denen bereits Sätze gespeichert wurden, nach Häufigkeit sortiert. */
export function listTrackedExercises(rows: ExportRow[]): string[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.exercise, (counts.get(row.exercise) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de')).map(([name]) => name)
}

export function buildExerciseProgress(rows: ExportRow[], exerciseName: string): ExerciseProgress | null {
  const matching = rows.filter((row) => row.exercise === exerciseName)
  if (matching.length === 0) return null

  const latestRow = matching.reduce((latest, current) =>
    current.performed_on >= latest.performed_on ? current : latest,
  )
  const isDuration = latestRow.duration_seconds !== null
  const isWeighted = !isDuration && latestRow.weight_kg !== null
  const isAssisted = isWeighted && latestRow.is_assisted

  // Nur vergleichbare Sätze derselben Erfassungsart berücksichtigen
  const compatible = matching.filter((row) => {
    if (isDuration) return row.duration_seconds !== null
    if (isWeighted) return row.weight_kg !== null && row.is_assisted === isAssisted
    return row.weight_kg === null && row.reps !== null
  })
  if (compatible.length === 0) return null

  const byDate = new Map<string, ExportRow[]>()
  for (const row of compatible) {
    const list = byDate.get(row.performed_on)
    if (list) list.push(row)
    else byDate.set(row.performed_on, [row])
  }

  const dates = [...byDate.keys()].sort()
  const rawPoints = dates.map((date) => {
    const daySets = byDate.get(date)!
    const best = daySets.reduce((prev, cur) => {
      if (isDuration) {
        return (cur.duration_seconds ?? 0) > (prev.duration_seconds ?? 0) ? cur : prev
      }
      if (isWeighted) {
        const prevW = prev.weight_kg ?? 0
        const curW = cur.weight_kg ?? 0
        if (curW !== prevW) return (isAssisted ? curW < prevW : curW > prevW) ? cur : prev
        return (cur.reps ?? 0) > (prev.reps ?? 0) ? cur : prev
      }
      return (cur.reps ?? 0) > (prev.reps ?? 0) ? cur : prev
    })

    if (isDuration) {
      const sec = best.duration_seconds ?? 0
      return { date, value: sec, reps: 0, label: formatDuration(sec, sec >= 120 ? 'minutes' : 'seconds') }
    }
    if (isWeighted) {
      const w = best.weight_kg ?? 0
      const r = best.reps ?? 0
      const wText = isAssisted ? `Hilfe ${formatWeight(w)}` : formatWeight(w)
      return { date, value: w, reps: r, label: `${wText} × ${r}` }
    }
    const r = best.reps ?? 0
    return { date, value: r, reps: r, label: `${r} Wdh.` }
  })

  const values = rawPoints.map((p) => p.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const span = maxVal - minVal

  const points: ProgressPoint[] = rawPoints.map((p, index) => {
    const normX = rawPoints.length === 1 ? 0.5 : index / (rawPoints.length - 1)
    let normY = 0.5
    if (span > 0) {
      normY = isAssisted ? (maxVal - p.value) / span : (p.value - minVal) / span
    }
    return {
      date: p.date,
      value: p.value,
      label: p.label,
      normX,
      normY,
    }
  })

  const bestPoint = rawPoints.reduce((best, cur) => {
    if (cur.value !== best.value) {
      return (isAssisted ? cur.value < best.value : cur.value > best.value) ? cur : best
    }
    return cur.reps > best.reps ? cur : best
  })

  let deltaLabel: string | null = null
  if (rawPoints.length >= 2) {
    const first = rawPoints[0].value
    const last = rawPoints[rawPoints.length - 1].value
    const diff = Math.round((last - first) * 100) / 100
    if (diff !== 0) {
      const sign = diff > 0 ? '+' : '−'
      const absText = formatNum(Math.abs(diff))
      if (isDuration) deltaLabel = `${sign}${absText} Sek.`
      else if (isAssisted) deltaLabel = `${sign}${absText} kg Hilfe`
      else if (isWeighted) deltaLabel = `${sign}${absText} kg`
      else deltaLabel = `${sign}${absText} Wdh.`
    } else {
      deltaLabel = '±0'
    }
  }

  return {
    exercise: exerciseName,
    isAssisted,
    unitLabel: isDuration ? 'Sek.' : isAssisted ? 'kg Hilfe' : isWeighted ? 'kg' : 'Wdh.',
    points,
    latestLabel: rawPoints[rawPoints.length - 1].label,
    bestLabel: bestPoint.label,
    deltaLabel,
  }
}

export function buildDayHistory(rows: ExportRow[], date: string): DayHistory | null {
  const dayRows = rows.filter((row) => row.performed_on === date)
  if (dayRows.length === 0) return null

  const byExercise = new Map<string, ExportRow[]>()
  for (const row of dayRows) {
    const list = byExercise.get(row.exercise)
    if (list) list.push(row)
    else byExercise.set(row.exercise, [row])
  }

  const exercises = [...byExercise.entries()].map(([name, sets]) => {
    const sorted = [...sets].sort((a, b) => a.set_number - b.set_number)
    const unit = sorted.some((s) => (s.duration_seconds ?? 0) >= 120) ? 'minutes' : 'seconds'
    return {
      name,
      summary: formatPerformance(sorted, unit, name === 'Laufband' ? 'speed' : 'pace'),
    }
  })

  return {
    date,
    planDay: dayRows[0].plan_day,
    exercises,
  }
}
