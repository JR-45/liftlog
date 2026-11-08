import { describe, expect, it } from 'vitest'
import { circuitPayload, circuitSteps, formatCircuit, roundReps } from './circuit'

describe('Zirkel', () => {
  it('nimmt die Vorgabe der Übung, wenn eigene Wiederholungen fehlen', () => {
    expect(circuitSteps(['Swing', 'Clean'], null, 5)).toEqual([{ name: 'Swing', reps: 5 }, { name: 'Clean', reps: 5 }])
    expect(circuitSteps(['Swing', 'Clean'], [10, 5], 5)).toEqual([{ name: 'Swing', reps: 10 }, { name: 'Clean', reps: 5 }])
    expect(circuitSteps(null, null, 5)).toEqual([])
  })

  it('zeigt die Bewegungen in einer Zeile', () => {
    expect(formatCircuit([{ name: 'Swing', reps: 10 }, { name: 'Clean', reps: null }])).toBe('10 Swing · Clean')
  })

  it('zählt die Wiederholungen einer Runde', () => {
    expect(roundReps([{ name: 'Swing', reps: 10 }, { name: 'Thruster', reps: 5 }])).toBe(15)
  })

  it('bereitet Zirkel fürs Speichern vor', () => {
    const base = { name: 'Kettlebell Complex', reps_min: 5, reps_max: 5 }
    expect(circuitPayload({ ...base, steps: [{ name: ' Swing ', reps: 10 }, { name: '', reps: 3 }, { name: 'Clean', reps: null }] }))
      .toEqual({ name: 'Kettlebell Complex', steps: ['Swing', 'Clean'], step_reps: [10, 1], reps_min: 11, reps_max: 11 })
    expect(circuitPayload({ ...base, steps: [{ name: '  ', reps: 5 }] })).toEqual(base)
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
