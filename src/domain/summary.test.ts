import { describe, expect, it } from 'vitest'
import { summarizeWorkout } from './summary'

describe('summarizeWorkout', () => {
  it('berechnet Sätze, Wiederholungen und Gesamtvolumen ohne Gewichtshilfe', () => {
    const result = summarizeWorkout({
      exercises: [
        { id: 'bench', name: 'Bankdrücken', tracking_type: 'weight_reps', unit: 'seconds' },
        { id: 'pullup', name: 'Klimmzüge', tracking_type: 'assisted_reps', unit: 'seconds' },
      ],
      todaySets: [
        { exercise_id: 'bench', set_number: 1, weight_kg: 80, reps: 10, duration_seconds: null, is_assisted: false },
        { exercise_id: 'bench', set_number: 2, weight_kg: 80, reps: 8, duration_seconds: null, is_assisted: false },
        { exercise_id: 'pullup', set_number: 1, weight_kg: 20, reps: 8, duration_seconds: null, is_assisted: true },
      ],
      lastSets: [],
    })

    expect(result.totalSets).toBe(3)
    expect(result.totalReps).toBe(26)
    // 80 * 10 + 80 * 8 = 1440 kg (Gewichtshilfe zählt nicht zum bewegten Volumen)
    expect(result.totalVolumeKg).toBe(1440)
  })

  it('erkennt Steigerungen gegenüber dem letzten Training bei Gewicht, Hilfe, Wdh. und Dauer', () => {
    const result = summarizeWorkout({
      exercises: [
        { id: 'bench', name: 'Bankdrücken', tracking_type: 'weight_reps', unit: 'seconds' },
        { id: 'dips', name: 'Dips', tracking_type: 'assisted_reps', unit: 'seconds' },
        { id: 'plank', name: 'Plank', tracking_type: 'duration', unit: 'seconds' },
      ],
      todaySets: [
        { exercise_id: 'bench', set_number: 1, weight_kg: 82.5, reps: 8, duration_seconds: null, is_assisted: false },
        { exercise_id: 'dips', set_number: 1, weight_kg: 15, reps: 10, duration_seconds: null, is_assisted: true },
        { exercise_id: 'plank', set_number: 1, weight_kg: null, reps: null, duration_seconds: 75, is_assisted: false },
      ],
      lastSets: [
        { exercise_id: 'bench', set_number: 1, weight_kg: 80, reps: 10, duration_seconds: null, is_assisted: false },
        { exercise_id: 'dips', set_number: 1, weight_kg: 20, reps: 10, duration_seconds: null, is_assisted: true },
        { exercise_id: 'plank', set_number: 1, weight_kg: null, reps: null, duration_seconds: 60, is_assisted: false },
      ],
    })

    expect(result.improved).toEqual([
      { exerciseId: 'bench', name: 'Bankdrücken', detail: '82,5 kg × 8' },
      { exerciseId: 'dips', name: 'Dips', detail: 'Hilfe 15 kg × 10' },
      { exerciseId: 'plank', name: 'Plank', detail: '75 Sek.' },
    ])
  })

  it('listet Übungen auf, die beim nächsten Training schwerer werden', () => {
    const result = summarizeWorkout({
      exercises: [
        { id: 'squat', name: 'Kniebeuge', tracking_type: 'weight_reps', unit: 'seconds' },
        { id: 'pullup', name: 'Klimmzüge', tracking_type: 'assisted_reps', unit: 'seconds' },
        { id: 'curl', name: 'Bizeps-Curls', tracking_type: 'weight_reps', unit: 'seconds' },
      ],
      todaySets: [
        {
          exercise_id: 'squat',
          set_number: 1,
          weight_kg: 100,
          reps: 8,
          duration_seconds: null,
          is_assisted: false,
          next_weight_kg: 102.5,
        },
        {
          exercise_id: 'pullup',
          set_number: 1,
          weight_kg: 25,
          reps: 10,
          duration_seconds: null,
          is_assisted: true,
          next_weight_kg: 20,
        },
        {
          exercise_id: 'curl',
          set_number: 1,
          weight_kg: 15,
          reps: 10,
          duration_seconds: null,
          is_assisted: false,
          next_weight_kg: 15,
        },
      ],
      lastSets: [],
    })

    expect(result.progressingNext).toEqual([
      { exerciseId: 'squat', name: 'Kniebeuge', planned: '102,5 kg' },
      { exerciseId: 'pullup', name: 'Klimmzüge', planned: 'Hilfe 20 kg' },
    ])
  })
})
