import { describe, expect, it } from 'vitest'
import { progressionHint } from './progression'
import type { SetValues } from './sets'

function set(reps: number | null, weight: number | null = 60, isAssisted = false): SetValues {
  return { reps, weight_kg: weight, duration_seconds: null, is_assisted: isAssisted }
}

const base = {
  tracking: 'weight_reps' as const,
  currentWeight: 60,
  setsMin: 3,
  repsMin: 8,
  repsMax: 12,
  lastSets: [set(12), set(12), set(12)],
}

describe('progressionHint', () => {
  it('empfiehlt mehr Gewicht, wenn alle Sätze die obere Grenze erreichen', () => {
    expect(progressionHint(base)).toBe('increase_weight')
  })

  it('zählt auch mehr Wiederholungen als die obere Grenze', () => {
    expect(progressionHint({ ...base, lastSets: [set(13), set(12), set(14)] })).toBe('increase_weight')
  })

  it('schweigt, wenn schon pro Satz entschieden wurde', () => {
    const lastSets = [{ ...set(12), next_weight_kg: 62.5 }, set(12), set(12)]
    expect(progressionHint({ ...base, lastSets })).toBeNull()
  })

  it('empfiehlt weiter, wenn die Entscheidung dem Gewicht entspricht', () => {
    const lastSets = [{ ...set(12), next_weight_kg: 60 }, set(12), set(12)]
    expect(progressionHint({ ...base, lastSets })).toBe('increase_weight')
  })

  it('schweigt, wenn ein Satz die obere Grenze verfehlt', () => {
    expect(progressionHint({ ...base, lastSets: [set(12), set(12), set(11)] })).toBeNull()
  })

  it('schweigt, wenn Sätze fehlen', () => {
    expect(progressionHint({ ...base, lastSets: [set(12), set(12)] })).toBeNull()
  })

  it('schweigt ohne letztes Training', () => {
    expect(progressionHint({ ...base, lastSets: [] })).toBeNull()
  })

  it('verschwindet, sobald das Gewicht erhöht wurde', () => {
    expect(progressionHint({ ...base, currentWeight: 62.5 })).toBeNull()
  })

  it('bleibt bestehen, wenn das Gewicht gesenkt wurde', () => {
    expect(progressionHint({ ...base, currentWeight: 57.5 })).toBe('increase_weight')
  })

  it('nimmt bei wechselndem Gewicht den leichtesten Satz als Maßstab', () => {
    const lastSets = [set(12, 60), set(12, 60), set(12, 55)]
    expect(progressionHint({ ...base, lastSets })).toBeNull()
    expect(progressionHint({ ...base, lastSets, currentWeight: 55 })).toBe('increase_weight')
  })

  it('schweigt bei fester Wiederholungszahl', () => {
    expect(progressionHint({ ...base, repsMin: 15, repsMax: 15 })).toBeNull()
  })

  it('schweigt ohne Wiederholungsbereich', () => {
    expect(progressionHint({ ...base, repsMin: null, repsMax: null })).toBeNull()
  })

  it('schweigt bei Übungen ohne Gewicht und bei Dauer', () => {
    expect(progressionHint({ ...base, tracking: 'reps' })).toBeNull()
    expect(progressionHint({ ...base, tracking: 'duration' })).toBeNull()
  })

  it('schweigt, wenn Sätze ohne Gewicht gespeichert wurden', () => {
    expect(progressionHint({ ...base, lastSets: [set(12, null), set(12, null), set(12, null)] })).toBeNull()
  })

  describe('mit Gewichtshilfe', () => {
    const assisted = {
      ...base,
      tracking: 'assisted_reps' as const,
      currentWeight: 30,
      lastSets: [set(12, 30, true), set(12, 30, true), set(12, 30, true)],
    }

    it('empfiehlt weniger Hilfe', () => {
      expect(progressionHint(assisted)).toBe('decrease_assist')
    })

    it('verschwindet, sobald die Hilfe gesenkt wurde', () => {
      expect(progressionHint({ ...assisted, currentWeight: 27.5 })).toBeNull()
    })

    it('nimmt bei wechselnder Hilfe den Satz mit der meisten Hilfe als Maßstab', () => {
      const lastSets = [set(12, 25, true), set(12, 25, true), set(12, 30, true)]
      expect(progressionHint({ ...assisted, lastSets, currentWeight: 30 })).toBe('decrease_assist')
      expect(progressionHint({ ...assisted, lastSets, currentWeight: 25 })).toBeNull()
    })

    it('schweigt, wenn keine Hilfe mehr übrig ist', () => {
      const lastSets = [set(12, 0, true), set(12, 0, true), set(12, 0, true)]
      expect(progressionHint({ ...assisted, lastSets, currentWeight: 0 })).toBeNull()
    })

    it('vergleicht nicht mit Sätzen aus normalem Gewicht', () => {
      expect(progressionHint({ ...assisted, lastSets: [set(12), set(12), set(12)] })).toBeNull()
    })
  })
})
