import { describe, expect, it } from 'vitest'
import type { ExportRow } from './export'
import { computeAthleteStats } from './profile'

const sampleRows: ExportRow[] = [
  {
    performed_on: '2026-11-02', // Montag derselben Woche wie 2026-11-07
    plan_day: 'Push',
    exercise: 'Bankdrücken',
    set_number: 1,
    weight_kg: 80,
    is_assisted: false,
    reps: 8,
    duration_seconds: null,
  },
  {
    performed_on: '2026-11-02',
    plan_day: 'Push',
    exercise: 'Bankdrücken',
    set_number: 2,
    weight_kg: 85,
    is_assisted: false,
    reps: 5,
    duration_seconds: null,
  },
  {
    performed_on: '2026-11-05', // Donnerstag derselben Woche
    plan_day: 'Pull',
    exercise: 'Klimmzüge',
    set_number: 1,
    weight_kg: null,
    is_assisted: false,
    reps: 12,
    duration_seconds: null,
  },
  {
    performed_on: '2026-10-29', // Vorwoche
    plan_day: 'Push',
    exercise: 'Bankdrücken',
    set_number: 1,
    weight_kg: 75,
    is_assisted: false,
    reps: 8,
    duration_seconds: null,
  },
]

describe('computeAthleteStats', () => {
  it('berechnet Trainings, Sätze, Volumen, Wochenziel und persönliche Rekorde', () => {
    const stats = computeAthleteStats(sampleRows, '2026-11-07', 3)
    // 80*8 (640) + 85*5 (425) + 75*8 (600) = 1665
    expect(stats.thisWeekWorkouts).toBe(2)
    expect(stats.weekProgress).toBeCloseTo(2 / 3)
    expect(stats.activeWeeksStreak).toBe(2)

    expect(stats.personalRecords).toHaveLength(2)
    const bench = stats.personalRecords.find((pr) => pr.name === 'Bankdrücken')
    expect(bench).toEqual({
      name: 'Bankdrücken',
      maxWeightKg: 85,
      bestSetReps: 5,
      // 80 * (1 + 8/30) = 101.3 vs 85 * (1 + 5/30) = 99.2 -> höchstes 1RM ist 101.3
      estimated1RmKg: 101.3,
      maxRepsOnly: null,
      date: '2026-11-02',
    })

    const pullups = stats.personalRecords.find((pr) => pr.name === 'Klimmzüge')
    expect(pullups).toEqual({
      name: 'Klimmzüge',
      maxWeightKg: null,
      bestSetReps: 12,
      estimated1RmKg: null,
      maxRepsOnly: 12,
      date: '2026-11-05',
    })
  })

  it('liefert Nullwerte ohne Trainingsdaten', () => {
    const stats = computeAthleteStats([], '2026-11-07', 4)
    expect(stats.thisWeekWorkouts).toBe(0)
    expect(stats.activeWeeksStreak).toBe(0)
    expect(stats.personalRecords).toEqual([])
  })
})
