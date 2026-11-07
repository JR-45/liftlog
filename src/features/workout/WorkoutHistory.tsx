import { useEffect, useState } from 'react'
import { formatPerformance } from '../../domain/sets'
import { loadWorkoutHistory } from './api'

export function WorkoutHistory({ workoutId }: { workoutId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadWorkoutHistory>> | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    loadWorkoutHistory(workoutId).then((rows) => {
      if (!cancelled) setData(rows)
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [workoutId, attempt])
  if (failed) return <div className="mt-4"><p role="alert" className="text-red-300">Trainingsdaten konnten nicht geladen werden.</p>
    <button type="button" className="min-h-11 underline" onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>Erneut versuchen</button></div>
  if (!data) return <p className="mt-4 text-neutral-400">Trainingsdaten werden geladen …</p>
  const exercises = [...new Set(data.map((set) => set.exercise_id))]
  return <ul className="mt-3 space-y-3">{exercises.map((id) => {
    const sets = data.filter((set) => set.exercise_id === id)
    return <li key={id} className="rounded-xl border border-neutral-700 p-3">
      <h4 className="font-medium">{sets[0].name}</h4>
      <p className="mt-1 text-sm text-neutral-400">{formatPerformance(sets, 'seconds')}</p>
    </li>
  })}</ul>
}
