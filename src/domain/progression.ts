import type { SetValues, TrackingType } from './sets'

export type ProgressionHint = 'increase_weight' | 'decrease_assist' | null

type Input = {
  tracking: TrackingType
  currentWeight: number | null
  setsMin: number
  repsMin: number | null
  repsMax: number | null
  lastSets: SetValues[]
}

/**
 * Doppelte Progression: Wer letztes Mal in allen Vorgabesätzen die obere Wiederholungszahl
 * geschafft hat, bekommt den Hinweis. Mit Gewichtshilfe bedeutet Fortschritt weniger Hilfe.
 * Der Hinweis verschwindet, sobald das Gewicht schon angepasst wurde.
 */
export function progressionHint(input: Input): ProgressionHint {
  const { tracking, currentWeight, setsMin, repsMin, repsMax, lastSets } = input
  const assisted = tracking === 'assisted_reps'
  if (tracking !== 'weight_reps' && !assisted) return null

  // Ohne Wiederholungsbereich, z. B. fest 15 Situps, gibt es keine obere Grenze zu erreichen.
  if (repsMin === null || repsMax === null || repsMin === repsMax) return null
  if (lastSets.length < setsMin) return null
  if (!lastSets.every((set) => set.reps !== null && set.reps >= repsMax)) return null

  // Sätze aus einer anderen Erfassungsart, z. B. vor dem Wechsel auf Hilfe, sind nicht vergleichbar.
  const weights: number[] = []
  for (const set of lastSets) {
    if (set.weight_kg === null || set.is_assisted !== assisted) return null
    weights.push(set.weight_kg)
  }

  // Maßstab ist der schwerste Satz: das niedrigste Gewicht bzw. die höchste Hilfe.
  if (assisted) {
    const reference = Math.max(...weights)
    if (reference === 0) return null
    return currentWeight !== null && currentWeight < reference ? null : 'decrease_assist'
  }
  const reference = Math.min(...weights)
  return currentWeight !== null && currentWeight > reference ? null : 'increase_weight'
}
