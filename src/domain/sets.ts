// Reine Logik ohne React und Datenbank: Eingaben prüfen, Werte formatieren, Gewicht ändern.

export type TrackingType = 'weight_reps' | 'assisted_reps' | 'reps' | 'duration'
export type DurationUnit = 'seconds' | 'minutes'

export type SetDraft = { weight: string; reps: string; duration: string }
export type SetValues = {
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  is_assisted: boolean
}
export type ParseResult =
  | { kind: 'empty' }
  | { kind: 'invalid'; message: string }
  | { kind: 'ok'; values: SetValues }

const MAX_WEIGHT_KG = 9999.99
const MAX_REPS = 999
const MAX_DURATION_SECONDS = 86_400

/** Heutiges Datum in der Zeitzone des Geräts, nicht in UTC. */
export function localDateString(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Wandelt eine Eingabe um und akzeptiert auch das deutsche Komma. */
function parseNumber(input: string): number {
  return Number(input.trim().replace(',', '.'))
}

export function parseSetDraft(draft: SetDraft, tracking: TrackingType, unit: DurationUnit): ParseResult {
  if (tracking === 'duration') {
    if (draft.duration.trim() === '') return { kind: 'empty' }
    const value = parseNumber(draft.duration)
    const seconds = Math.round(unit === 'minutes' ? value * 60 : value)
    if (!Number.isFinite(value) || seconds <= 0 || seconds > MAX_DURATION_SECONDS) {
      return { kind: 'invalid', message: 'Dauer prüfen' }
    }
    return { kind: 'ok', values: { weight_kg: null, reps: null, duration_seconds: seconds, is_assisted: false } }
  }

  // Das Gewicht ist vorausgefüllt, ein Satz zählt also erst mit Wiederholungen als eingetragen.
  if (draft.reps.trim() === '') return { kind: 'empty' }
  const reps = parseNumber(draft.reps)
  if (!Number.isInteger(reps) || reps < 0 || reps > MAX_REPS) {
    return { kind: 'invalid', message: 'Wiederholungen prüfen' }
  }

  if (tracking === 'reps' || draft.weight.trim() === '') {
    return { kind: 'ok', values: { weight_kg: null, reps, duration_seconds: null, is_assisted: false } }
  }
  const weight = parseNumber(draft.weight)
  if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT_KG) {
    return { kind: 'invalid', message: 'Gewicht prüfen' }
  }
  return {
    kind: 'ok',
    values: { weight_kg: weight, reps, duration_seconds: null, is_assisted: tracking === 'assisted_reps' },
  }
}

export function setKey(exerciseId: string, setNumber: number): string {
  return `${exerciseId}:${setNumber}`
}

/** Anzahl gespeicherter Sätze. Bei einer Alternative zählt die Übung mit den meisten Sätzen. */
export function countLoggedSets(saved: Record<string, unknown>, exerciseIds: string[]): number {
  const keys = Object.keys(saved)
  return Math.max(0, ...exerciseIds.map((id) => keys.filter((key) => key.startsWith(`${id}:`)).length))
}

/** Gewicht und Gewichtshilfe werden gleich erfasst, nur ihre Bedeutung unterscheidet sich. */
export function usesWeight(tracking: TrackingType): boolean {
  return tracking === 'weight_reps' || tracking === 'assisted_reps'
}

/** Nächstes Arbeitsgewicht nach einem Klick auf + oder −. Ohne Gewicht startet + bei einer Schrittweite. */
export function stepWeight(current: number | null, step: number, direction: 1 | -1): number | null {
  if (current === null) return direction === 1 ? step : null
  return Math.max(0, Math.round((current + direction * step) * 100) / 100)
}

/** Liest eine Schrittweite. Die Datenbank erlaubt mehr als 0 und höchstens 99,99 kg. */
export function parseWeightStep(input: string): number | null {
  if (input.trim() === '') return null
  const rounded = Math.round(parseNumber(input) * 100) / 100
  return Number.isFinite(rounded) && rounded > 0 && rounded <= 99.99 ? rounded : null
}

function formatNumber(value: number): string {
  return String(value).replace('.', ',')
}

export function formatWeight(weight: number | null): string {
  return weight === null ? '– kg' : `${formatNumber(weight)} kg`
}

export function formatRange(min: number | null, max: number | null): string {
  if (min === null || max === null) return ''
  return min === max ? String(min) : `${min}–${max}`
}

export function formatDuration(seconds: number, unit: DurationUnit): string {
  return unit === 'minutes' ? `${formatNumber(Math.round(seconds / 6) / 10)} Min.` : `${seconds} Sek.`
}

function weightLabel(set: SetValues): string | null {
  if (set.weight_kg === null) return null
  return set.is_assisted ? `Hilfe ${formatWeight(set.weight_kg)}` : formatWeight(set.weight_kg)
}

/** „60 kg · 12 / 11 / 10“, mit Hilfe „Hilfe 30 kg · 8 / 7“, bei wechselndem Gewicht „60 kg × 12 / 55 kg × 10“. */
export function formatPerformance(sets: SetValues[], unit: DurationUnit): string {
  if (sets.length === 0) return ''
  if (sets[0].duration_seconds !== null) {
    return sets.flatMap((set) => (set.duration_seconds === null ? [] : [formatDuration(set.duration_seconds, unit)])).join(' / ')
  }
  const labels = new Set(sets.map(weightLabel))
  if (labels.size === 1) {
    const reps = sets.map((set) => set.reps ?? 0).join(' / ')
    const label = weightLabel(sets[0])
    return label === null ? reps : `${label} · ${reps}`
  }
  return sets
    .map((set) => {
      const label = weightLabel(set)
      return label === null ? String(set.reps ?? 0) : `${label} × ${set.reps ?? 0}`
    })
    .join(' / ')
}
