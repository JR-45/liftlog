import { type DurationUnit, formatDuration, formatPlanned, formatWeight, type SetValues, type TrackingType } from './sets'

export type SummaryExercise = {
  id: string
  name: string
  tracking_type: TrackingType
  unit: DurationUnit
}

export type SummarySet = SetValues & {
  exercise_id: string
  set_number: number
}

export type ImprovedExercise = {
  exerciseId: string
  name: string
  detail: string
}

export type ProgressingExercise = {
  exerciseId: string
  name: string
  planned: string
}

export type WorkoutSummaryData = {
  totalSets: number
  totalReps: number
  totalVolumeKg: number
  improved: ImprovedExercise[]
  progressingNext: ProgressingExercise[]
}

function bestWeightedSet(sets: SummarySet[], assisted: boolean): SummarySet | null {
  const valid = sets.filter((set) => set.weight_kg !== null && set.reps !== null && set.is_assisted === assisted)
  if (valid.length === 0) return null
  return valid.reduce((best, current) => {
    const bestW = best.weight_kg ?? 0
    const curW = current.weight_kg ?? 0
    if (curW !== bestW) {
      return (assisted ? curW < bestW : curW > bestW) ? current : best
    }
    return (current.reps ?? 0) > (best.reps ?? 0) ? current : best
  })
}

function isBetterToday(todayBest: SummarySet, lastBest: SummarySet, assisted: boolean): boolean {
  const todayW = todayBest.weight_kg ?? 0
  const lastW = lastBest.weight_kg ?? 0
  if (todayW !== lastW) return assisted ? todayW < lastW : todayW > lastW
  return (todayBest.reps ?? 0) > (lastBest.reps ?? 0)
}

export function summarizeWorkout(input: {
  exercises: SummaryExercise[]
  todaySets: SummarySet[]
  lastSets: SummarySet[]
}): WorkoutSummaryData {
  const { exercises, todaySets, lastSets } = input
  let totalReps = 0
  let rawVolume = 0

  for (const set of todaySets) {
    if (set.reps !== null) {
      totalReps += set.reps
      if (!set.is_assisted && set.weight_kg !== null) {
        rawVolume += set.weight_kg * set.reps
      }
    }
  }

  const improved: ImprovedExercise[] = []
  const progressingNext: ProgressingExercise[] = []

  for (const exercise of exercises) {
    const todayForEx = todaySets
      .filter((set) => set.exercise_id === exercise.id)
      .sort((a, b) => a.set_number - b.set_number)
    if (todayForEx.length === 0) continue

    const lastForEx = lastSets.filter((set) => set.exercise_id === exercise.id)
    const assisted = exercise.tracking_type === 'assisted_reps'

    if (lastForEx.length > 0) {
      if (exercise.tracking_type === 'weight_reps' || assisted) {
        const todayBest = bestWeightedSet(todayForEx, assisted)
        const lastBest = bestWeightedSet(lastForEx, assisted)
        if (todayBest && lastBest && isBetterToday(todayBest, lastBest, assisted)) {
          const wLabel = assisted ? `Hilfe ${formatWeight(todayBest.weight_kg)}` : formatWeight(todayBest.weight_kg)
          improved.push({
            exerciseId: exercise.id,
            name: exercise.name,
            detail: `${wLabel} × ${todayBest.reps ?? 0}`,
          })
        }
      } else if (exercise.tracking_type === 'reps') {
        const todayMax = Math.max(0, ...todayForEx.map((set) => set.reps ?? 0))
        const lastMax = Math.max(0, ...lastForEx.map((set) => set.reps ?? 0))
        if (todayMax > lastMax) {
          improved.push({
            exerciseId: exercise.id,
            name: exercise.name,
            detail: `${todayMax} Wdh.`,
          })
        }
      } else if (exercise.tracking_type === 'duration') {
        const todayMax = Math.max(0, ...todayForEx.map((set) => set.duration_seconds ?? 0))
        const lastMax = Math.max(0, ...lastForEx.map((set) => set.duration_seconds ?? 0))
        if (todayMax > lastMax) {
          improved.push({
            exerciseId: exercise.id,
            name: exercise.name,
            detail: formatDuration(todayMax, exercise.unit),
          })
        }
      }
    }

    const willProgress = todayForEx.some((set) => {
      if (set.next_weight_kg == null || set.weight_kg === null) return false
      return assisted ? set.next_weight_kg < set.weight_kg : set.next_weight_kg > set.weight_kg
    })
    if (willProgress) {
      const planned = formatPlanned(todayForEx)
      progressingNext.push({
        exerciseId: exercise.id,
        name: exercise.name,
        planned: assisted ? `Hilfe ${planned}` : planned,
      })
    }
  }

  return {
    totalSets: todaySets.length,
    totalReps,
    totalVolumeKg: Math.round(rawVolume * 100) / 100,
    improved,
    progressingNext,
  }
}
