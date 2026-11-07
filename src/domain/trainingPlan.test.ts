import { describe, expect, it } from 'vitest'
import { EXERCISE_CATALOG, findExercises } from './exerciseCatalog'
import { PLAN_SPLITS, TRAINING_METHODS, recommendPlan } from './trainingPlan'

describe('Übungskatalog', () => {
  it('enthält eindeutige Übungen und findet deutsche Schreibvarianten', () => {
    expect(new Set(EXERCISE_CATALOG.map((exercise) => exercise.name)).size).toBe(EXERCISE_CATALOG.length)
    expect(findExercises('rucken rudern').some((exercise) => exercise.name === 'Rudern sitzend')).toBe(true)
    expect(findExercises('BEINPRESSE').map((exercise) => exercise.name)).toContain('Beinpresse')
    expect(findExercises('', 'Ausdauer & Halteübungen').every((exercise) => exercise.tracking_type === 'duration')).toBe(true)
    expect(findExercises('nicht-vorhandene-übung')).toEqual([])
  })
})

describe('Methodenempfehlungen', () => {
  for (const method of TRAINING_METHODS) {
    for (const split of PLAN_SPLITS) {
      it(`${method.id} / ${split.id}: vollständiger speicherbarer Vorschlag`, () => {
        const days = recommendPlan(method.id, split.id)
        expect(days.length).toBeGreaterThan(0)
        expect(new Set(days.map((day) => day.weekday)).size).toBe(days.length)
        for (const day of days) {
          expect(day.weekday).toBeGreaterThanOrEqual(0)
          expect(day.weekday).toBeLessThanOrEqual(6)
          expect(new Set(day.exercises.map((exercise) => exercise.name)).size).toBe(day.exercises.length)
          for (const exercise of day.exercises) {
            expect(EXERCISE_CATALOG.some((entry) => entry.name === exercise.name)).toBe(true)
            expect(exercise.sets_min).toBeGreaterThan(0)
            expect(exercise.sets_max).toBeGreaterThanOrEqual(exercise.sets_min)
            if (exercise.tracking_type === 'duration') {
              expect(exercise.reps_min).toBeNull()
              expect(exercise.duration_min).toBeGreaterThan(0)
            } else {
              expect(exercise.duration_min).toBeNull()
              expect(exercise.reps_max).toBeGreaterThanOrEqual(exercise.reps_min!)
            }
          }
        }
      })
    }
  }
  it('liefert voneinander unabhängige Entwürfe', () => {
    const first = recommendPlan('classic', 'full_body')
    first[0].exercises[0].name = 'Geändert'
    expect(recommendPlan('classic', 'full_body')[0].exercises[0].name).toBe('Beinpresse')
  })
})
