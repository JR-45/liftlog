import { formatWeight, type SetValues } from './sets'

/** Eine Bewegung eines Zirkels, z. B. 10 Swings. reps null = noch nicht eingetragen. */
export type CircuitStep = { name: string; reps: number | null }

/** Baut die Bewegungen aus den DB-Spalten. Ohne eigene Angabe gilt die Wiederholungsvorgabe der Übung. */
export function circuitSteps(names: string[] | null, reps: number[] | null, fallbackReps: number | null): CircuitStep[] {
  return (names ?? []).map((name, i) => ({ name, reps: reps?.[i] ?? fallbackReps }))
}

/** Kurze Zeile fürs Training: „5 Push-Up · 10 Swing · Clean“. */
export function formatCircuit(steps: CircuitStep[]): string {
  return steps.map((step) => (step.reps === null ? step.name : `${step.reps} ${step.name}`)).join(' · ')
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
  Omit<T, 'steps'> | (Omit<T, 'steps'> & { steps: string[]; step_reps: number[]; reps_min: number; reps_max: number }) {
  const { steps, ...rest } = exercise
  const filled = (steps ?? [])
    .map((step) => ({ name: step.name.trim(), reps: step.reps !== null && step.reps > 0 ? Math.round(step.reps) : 1 }))
    .filter((step) => step.name !== '')
  if (filled.length === 0) return rest
  const total = roundReps(filled)
  return { ...rest, steps: filled.map((step) => step.name), step_reps: filled.map((step) => step.reps), reps_min: total, reps_max: total }
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
