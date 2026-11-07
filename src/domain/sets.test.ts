import { describe, expect, it } from 'vitest'
import {
  countLoggedSets,
  formatPerformance,
  localDateString,
  parseSetDraft,
  parseWeightStep,
  setKey,
  type SetValues,
  stepWeight,
} from './sets'

const draft = (changes: Partial<{ weight: string; reps: string; duration: string }>) => ({
  weight: '',
  reps: '',
  duration: '',
  ...changes,
})

describe('stepWeight', () => {
  it('erhöht und senkt um die Schrittweite', () => {
    expect(stepWeight(60, 2.5, 1)).toBe(62.5)
    expect(stepWeight(60, 2.5, -1)).toBe(57.5)
  })

  it('stoppt bei 0 kg', () => {
    expect(stepWeight(1, 2.5, -1)).toBe(0)
    expect(stepWeight(0, 2.5, -1)).toBe(0)
  })

  it('startet ohne Gewicht bei einer Schrittweite', () => {
    expect(stepWeight(null, 4, 1)).toBe(4)
    expect(stepWeight(null, 4, -1)).toBeNull()
  })

  it('vermeidet Rundungsfehler', () => {
    expect(stepWeight(0.1, 0.2, 1)).toBe(0.3)
  })
})

describe('parseWeightStep', () => {
  it('akzeptiert Punkt und Komma', () => {
    expect(parseWeightStep('2,5')).toBe(2.5)
    expect(parseWeightStep('3.5')).toBe(3.5)
  })

  it.each(['', '0', '-1', 'abc', '100', '0,001'])('lehnt "%s" ab', (input) => {
    expect(parseWeightStep(input)).toBeNull()
  })
})

describe('parseSetDraft', () => {
  it('liest Gewicht mit Komma und Wiederholungen', () => {
    expect(parseSetDraft(draft({ weight: '27,5', reps: '10' }), 'weight_reps', 'seconds')).toEqual({
      kind: 'ok',
      values: { weight_kg: 27.5, reps: 10, duration_seconds: null, is_assisted: false },
    })
  })

  it('markiert Gewichtshilfe', () => {
    const result = parseSetDraft(draft({ weight: '30', reps: '8' }), 'assisted_reps', 'seconds')
    expect(result).toMatchObject({ kind: 'ok', values: { weight_kg: 30, is_assisted: true } })
  })

  it('markiert Hilfe ohne Gewicht nicht als Hilfe', () => {
    const result = parseSetDraft(draft({ reps: '8' }), 'assisted_reps', 'seconds')
    expect(result).toMatchObject({ kind: 'ok', values: { weight_kg: null, is_assisted: false } })
  })

  it('zählt vorausgefülltes Gewicht ohne Wiederholungen als leer', () => {
    expect(parseSetDraft(draft({ weight: '60' }), 'weight_reps', 'seconds')).toEqual({ kind: 'empty' })
  })

  it('ignoriert das Gewicht bei Erfassung ohne Gewicht', () => {
    const result = parseSetDraft(draft({ weight: '60', reps: '8' }), 'reps', 'seconds')
    expect(result).toMatchObject({ kind: 'ok', values: { weight_kg: null, reps: 8 } })
  })

  it.each(['abc', '-1', '1,5', '1000'])('lehnt Wiederholungen "%s" ab', (reps) => {
    expect(parseSetDraft(draft({ reps }), 'reps', 'seconds').kind).toBe('invalid')
  })

  it.each(['abc', '-1', '10000'])('lehnt Gewicht "%s" ab', (weight) => {
    expect(parseSetDraft(draft({ weight, reps: '8' }), 'weight_reps', 'seconds').kind).toBe('invalid')
  })

  it('rechnet Minuten in Sekunden um', () => {
    const result = parseSetDraft(draft({ duration: '1,5' }), 'duration', 'minutes')
    expect(result).toMatchObject({ kind: 'ok', values: { duration_seconds: 90 } })
  })

  it('lehnt Dauer 0 ab', () => {
    expect(parseSetDraft(draft({ duration: '0' }), 'duration', 'seconds').kind).toBe('invalid')
  })
})

describe('formatPerformance', () => {
  const set = (reps: number, weight: number | null, isAssisted = false): SetValues => ({
    reps,
    weight_kg: weight,
    duration_seconds: null,
    is_assisted: isAssisted,
  })

  it('fasst gleiches Gewicht zusammen', () => {
    expect(formatPerformance([set(12, 27.5), set(11, 27.5)], 'seconds')).toBe('27,5 kg · 12 / 11')
  })

  it('zeigt wechselndes Gewicht pro Satz', () => {
    expect(formatPerformance([set(12, 60), set(10, 55)], 'seconds')).toBe('60 kg × 12 / 55 kg × 10')
  })

  it('kennzeichnet Gewichtshilfe', () => {
    expect(formatPerformance([set(8, 30, true), set(7, 30, true)], 'seconds')).toBe('Hilfe 30 kg · 8 / 7')
  })

  it('zeigt nur Wiederholungen ohne Gewicht', () => {
    expect(formatPerformance([set(15, null), set(14, null)], 'seconds')).toBe('15 / 14')
  })

  it('zeigt Dauer in der passenden Einheit', () => {
    const duration = (seconds: number): SetValues => ({
      reps: null,
      weight_kg: null,
      duration_seconds: seconds,
      is_assisted: false,
    })
    expect(formatPerformance([duration(45)], 'seconds')).toBe('45 Sek.')
    expect(formatPerformance([duration(1800)], 'minutes')).toBe('30 Min.')
  })
})

describe('countLoggedSets', () => {
  const saved = { [setKey('a', 1)]: {}, [setKey('a', 2)]: {}, [setKey('b', 1)]: {}, [setKey('ab', 1)]: {} }

  it('zählt nur die Sätze der Übung', () => {
    expect(countLoggedSets(saved, ['a'])).toBe(2)
  })

  it('nimmt bei einer Alternative die Übung mit den meisten Sätzen', () => {
    expect(countLoggedSets(saved, ['b', 'a'])).toBe(2)
  })

  it('liefert 0 ohne Sätze', () => {
    expect(countLoggedSets({}, ['a'])).toBe(0)
  })
})

describe('localDateString', () => {
  it('nutzt das lokale Datum', () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
