import { describe, expect, it } from 'vitest'
import { circuitPayload, circuitSteps, formatStepTarget, roundReps } from './circuit'

describe('Zirkel', () => {
  it('nimmt die Vorgabe der Übung, wenn eigene Wiederholungen fehlen', () => {
    expect(circuitSteps(['Swing', 'Clean'], null, null, 5))
      .toEqual([{ name: 'Swing', reps: 5, weightKg: null }, { name: 'Clean', reps: 5, weightKg: null }])
    expect(circuitSteps(['Swing', 'Clean'], [10, 5], [16, null], 5))
      .toEqual([{ name: 'Swing', reps: 10, weightKg: 16 }, { name: 'Clean', reps: 5, weightKg: null }])
    expect(circuitSteps(null, null, null, 5)).toEqual([])
  })

  it('zeigt Wiederholungen und Gewicht einer Bewegung', () => {
    expect(formatStepTarget({ name: 'Push-Up', reps: 5, weightKg: null })).toBe('5')
    expect(formatStepTarget({ name: 'Swing', reps: 10, weightKg: 16 })).toBe('10 × 16 kg')
    expect(formatStepTarget({ name: 'Swing', reps: 10, weightKg: 12.5 })).toBe('10 × 12,5 kg')
    expect(formatStepTarget({ name: 'Clean', reps: null, weightKg: null })).toBe('')
  })

  it('zählt die Wiederholungen einer Runde', () => {
    expect(roundReps([{ name: 'Swing', reps: 10, weightKg: 16 }, { name: 'Thruster', reps: 5, weightKg: null }])).toBe(15)
  })

  it('bereitet Zirkel fürs Speichern vor', () => {
    const base = { name: 'Kettlebell Complex', reps_min: 5, reps_max: 5 }
    expect(circuitPayload({ ...base, steps: [
      { name: ' Swing ', reps: 10, weightKg: 16 }, { name: '', reps: 3, weightKg: null }, { name: 'Clean', reps: null, weightKg: 0 },
    ] })).toEqual({ name: 'Kettlebell Complex', steps: ['Swing', 'Clean'], step_reps: [10, 1], step_weights: [16, null], reps_min: 11, reps_max: 11 })
    expect(circuitPayload({ ...base, steps: [{ name: '  ', reps: 5, weightKg: 10 }] })).toEqual(base)
    expect(circuitPayload({ ...base, steps: undefined })).toEqual(base)
  })
})

describe('Zirkel-Vorgabe', () => {
  it('nennt Runden und Anzahl der Bewegungen', async () => {
    const { circuitTarget } = await import('./circuit')
    expect(circuitTarget('4–5', 6)).toBe('4–5 Runden · 6 Bewegungen')
    expect(circuitTarget('3', 1)).toBe('3 Runden · 1 Bewegung')
  })
})

describe('Zirkel: letztes Mal', () => {
  const round = (weight_kg: number | null) => ({ weight_kg, reps: 15, duration_seconds: null, is_assisted: false })
  it('fasst die Runden zusammen', async () => {
    const { formatRounds } = await import('./circuit')
    expect(formatRounds([round(16), round(16), round(16), round(16)])).toBe('16 kg · 4 Runden')
    expect(formatRounds([round(16), round(20)])).toBe('16 / 20 kg · 2 Runden')
    expect(formatRounds([round(null)])).toBe('1 Runde')
  })
})
