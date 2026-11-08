import { describe, expect, it } from 'vitest'
import type { ExportRow } from './export'
import { buildDayHistory, buildExerciseProgress } from './progress'

const SAMPLE_ROWS: ExportRow[] = [
  {
    performed_on: '2026-10-01',
    plan_day: 'Oberkörper A',
    exercise: 'Bankdrücken',
    set_number: 1,
    weight_kg: 75,
    is_assisted: false,
    reps: 10,
    duration_seconds: null,
  },
  {
    performed_on: '2026-10-01',
    plan_day: 'Oberkörper A',
    exercise: 'Bankdrücken',
    set_number: 2,
    weight_kg: 75,
    is_assisted: false,
    reps: 8,
    duration_seconds: null,
  },
  {
    performed_on: '2026-10-08',
    plan_day: 'Oberkörper A',
    exercise: 'Bankdrücken',
    set_number: 1,
    weight_kg: 77.5,
    is_assisted: false,
    reps: 10,
    duration_seconds: null,
  },
  {
    performed_on: '2026-10-15',
    plan_day: 'Oberkörper A',
    exercise: 'Bankdrücken',
    set_number: 1,
    weight_kg: 80,
    is_assisted: false,
    reps: 9,
    duration_seconds: null,
  },
  {
    performed_on: '2026-10-01',
    plan_day: 'Oberkörper A',
    exercise: 'Klimmzüge',
    set_number: 1,
    weight_kg: 25,
    is_assisted: true,
    reps: 8,
    duration_seconds: null,
  },
  {
    performed_on: '2026-10-15',
    plan_day: 'Oberkörper A',
    exercise: 'Klimmzüge',
    set_number: 1,
    weight_kg: 15,
    is_assisted: true,
    reps: 8,
    duration_seconds: null,
  },
]

describe('buildExerciseProgress', () => {
  it('berechnet Datenpunkte, Bestwert und Veränderung für normales Gewicht', () => {
    const progress = buildExerciseProgress(SAMPLE_ROWS, 'Bankdrücken')
    expect(progress).not.toBeNull()
    expect(progress?.points.map((p) => p.value)).toEqual([75, 77.5, 80])
    expect(progress?.points[0].normY).toBe(0)
    expect(progress?.points[2].normY).toBe(1)
    expect(progress?.latestLabel).toBe('80 kg × 9')
    expect(progress?.bestLabel).toBe('80 kg × 9')
    expect(progress?.deltaLabel).toBe('+5 kg')
  })

  it('invertiert die Kurve bei Gewichtshilfe, sodass weniger Hilfe oben liegt', () => {
    const progress = buildExerciseProgress(SAMPLE_ROWS, 'Klimmzüge')
    expect(progress).not.toBeNull()
    expect(progress?.points.map((p) => p.value)).toEqual([25, 15])
    // 25 kg Hilfe ist der Start (unten = 0), 15 kg Hilfe ist besser (oben = 1)
    expect(progress?.points[0].normY).toBe(0)
    expect(progress?.points[1].normY).toBe(1)
    expect(progress?.bestLabel).toBe('Hilfe 15 kg × 8')
    expect(progress?.deltaLabel).toBe('−10 kg Hilfe')
  })
})

describe('buildDayHistory', () => {
  it('gruppiert alle Sätze eines Kalendertags nach Übung', () => {
    const history = buildDayHistory(SAMPLE_ROWS, '2026-10-01')
    expect(history?.planDay).toBe('Oberkörper A')
    expect(history?.exercises).toEqual([
      { name: 'Bankdrücken', summary: '75 kg · 10 / 8' },
      { name: 'Klimmzüge', summary: 'Hilfe 25 kg · 8' },
    ])
  })
})

describe('Zirkel in der Statistik', () => {
  const round = (performed_on: string, set_number: number): ExportRow => ({
    performed_on, plan_day: 'Kettlebell', exercise: 'Kettlebell Complex', set_number,
    weight_kg: null, is_assisted: false, reps: 30, duration_seconds: null, is_round: true,
  })
  const rows = [round('2026-11-01', 1), round('2026-11-01', 2), round('2026-11-01', 3), round('2026-11-08', 1), round('2026-11-08', 2), round('2026-11-08', 3), round('2026-11-08', 4), round('2026-11-08', 5)]

  it('zählt Runden pro Training statt Wiederholungen', () => {
    const progress = buildExerciseProgress(rows, 'Kettlebell Complex')
    expect(progress?.unitLabel).toBe('Runden')
    expect(progress?.points.map((point) => point.label)).toEqual(['3 Runden', '5 Runden'])
    expect(progress?.bestLabel).toBe('5 Runden')
    expect(progress?.deltaLabel).toBe('+2 Runden')
  })

  it('zeigt im Tagesverlauf die Runden', () => {
    expect(buildDayHistory(rows, '2026-11-08')?.exercises).toEqual([{ name: 'Kettlebell Complex', summary: '5 Runden' }])
  })
})
