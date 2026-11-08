import { formatWeight, type SetValues } from './sets'

/** Eine Bewegung eines Zirkels, z. B. 10 Swings mit 16 kg. null = nicht eingetragen bzw. ohne Gewicht. */
export type CircuitStep = { name: string; reps: number | null; weightKg: number | null }

/** Baut die Bewegungen aus den DB-Spalten. Ohne eigene Angabe gilt die Wiederholungsvorgabe der Übung. */
export function circuitSteps(
  names: string[] | null, reps: number[] | null, weights: (number | null)[] | null, fallbackReps: number | null,
): CircuitStep[] {
  return (names ?? []).map((name, i) => ({ name, reps: reps?.[i] ?? fallbackReps, weightKg: weights?.[i] ?? null }))
}

/** Vorgabe einer Bewegung fürs Training: „5“ oder „10 × 16 kg“. */
export function formatStepTarget(step: CircuitStep): string {
  if (step.reps === null) return step.weightKg === null ? '' : formatWeight(step.weightKg)
  return step.weightKg === null ? String(step.reps) : `${step.reps} × ${formatWeight(step.weightKg)}`
}

/** Wiederholungen einer ganzen Runde. Damit wird jede abgehakte Runde als ein Satz gespeichert. */
export function roundReps(steps: CircuitStep[]): number {
  return steps.reduce((sum, step) => sum + (step.reps ?? 0), 0)
}

/**
 * Bereitet Zirkel fürs Speichern vor: leere Bewegungen fallen weg, fehlende Wiederholungen werden 1.
 * Die Vorgabe der Übung ist die Summe einer Runde. Ohne Bewegungen bleibt eine normale Übung übrig.
 */
export function circuitPayload<T extends { steps?: CircuitStep[] }>(exercise: T):
  Omit<T, 'steps'> | (Omit<T, 'steps'> & {
    steps: string[]; step_reps: number[]; step_weights: (number | null)[]; reps_min: number; reps_max: number
  }) {
  const { steps, ...rest } = exercise
  const filled = (steps ?? [])
    .map((step) => ({
      name: step.name.trim(),
      reps: step.reps !== null && step.reps > 0 ? Math.round(step.reps) : 1,
      weightKg: step.weightKg !== null && Number.isFinite(step.weightKg) && step.weightKg > 0 ? step.weightKg : null,
    }))
    .filter((step) => step.name !== '')
  if (filled.length === 0) return rest
  const total = roundReps(filled)
  return { ...rest, steps: filled.map((step) => step.name), step_reps: filled.map((step) => step.reps),
    step_weights: filled.map((step) => step.weightKg), reps_min: total, reps_max: total }
}

/** Vorgabe eines Zirkels, auch im zugeklappten Zustand: „4–5 Runden · 6 Bewegungen“. */
export function circuitTarget(rounds: string, stepCount: number): string {
  return `${rounds} Runden · ${stepCount} ${stepCount === 1 ? 'Bewegung' : 'Bewegungen'}`
}

/** „Letztes Mal“ eines Zirkels: „16 kg · 4 Runden“, bei wechselndem Gewicht „16 / 20 kg · 4 Runden“. */
export function formatRounds(sets: SetValues[]): string {
  const rounds = `${sets.length} ${sets.length === 1 ? 'Runde' : 'Runden'}`
  const weights = [...new Set(sets.flatMap((set) => (set.weight_kg === null ? [] : [set.weight_kg])))]
  if (weights.length === 0) return rounds
  const prefix = sets.some((set) => set.is_assisted) ? 'Hilfe ' : ''
  const label = weights.length === 1 ? formatWeight(weights[0]) : `${weights.map((w) => formatWeight(w).replace(' kg', '')).join(' / ')} kg`
  return `${prefix}${label} · ${rounds}`
}
