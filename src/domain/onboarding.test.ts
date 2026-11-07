import { describe, expect, it } from 'vitest'
import { EXERCISE_CATALOG } from './exerciseCatalog'
import { buildOnboardingPlan, dayKinds, exercisesPerSession, isValidSessionMinutes, type OnboardingAnswers, suggestWeekdays } from './onboarding'

const base: OnboardingAnswers = {
  goal: 'hypertrophy',
  experience: 'intermediate',
  location: 'gym',
  weekdays: [1, 3, 5],
  minutes: 60,
}

describe('suggestWeekdays', () => {
  it('verteilt die Tage mit Pausen dazwischen', () => {
    expect(suggestWeekdays(3)).toEqual([1, 3, 5])
    expect(suggestWeekdays(4)).toEqual([1, 2, 4, 5])
  })

  it('begrenzt auf 1 bis 6 Tage', () => {
    expect(suggestWeekdays(0)).toEqual([1])
    expect(suggestWeekdays(9)).toHaveLength(6)
  })
})

describe('dayKinds', () => {
  it('wählt den Split nach Anzahl der Tage', () => {
    expect(dayKinds(3, 'gym').split).toBe('full_body')
    expect(dayKinds(4, 'gym')).toEqual({ kinds: ['upper', 'lower', 'upper', 'lower'], split: 'upper_lower' })
    expect(dayKinds(6, 'gym').split).toBe('push_pull_legs')
  })

  it('bleibt ohne Geräte bei Ober- und Unterkörper', () => {
    expect(dayKinds(6, 'bodyweight').split).toBe('upper_lower')
  })
})

describe('buildOnboardingPlan', () => {
  it('legt für jeden gewählten Tag einen Trainingstag an', () => {
    const plan = buildOnboardingPlan(base)
    expect(plan.days.map((day) => day.weekday)).toEqual([1, 3, 5])
    expect(plan.days.map((day) => day.name)).toEqual(['Ganzkörper A', 'Ganzkörper B', 'Ganzkörper C'])
    expect(plan.split).toBe('full_body')
    expect(plan.method).toBe('hypertrophy')
  })

  it('richtet die Anzahl der Übungen nach der Dauer', () => {
    expect(buildOnboardingPlan({ ...base, minutes: 30 }).days[0].exercises).toHaveLength(4)
    expect(buildOnboardingPlan({ ...base, minutes: 90 }).days[0].exercises).toHaveLength(8)
  })

  it('trainiert für Kraft schwer und mit langen Pausen', () => {
    const plan = buildOnboardingPlan({ ...base, goal: 'strength' })
    const first = plan.days[0].exercises[0]
    expect([first.reps_min, first.reps_max]).toEqual([4, 6])
    expect(first.sets_min).toBe(4)
    expect(plan.restSeconds).toBe(180)
  })

  it('gibt Einsteigern im Fitness-Ziel weniger Sätze', () => {
    const plan = buildOnboardingPlan({ ...base, goal: 'fitness', experience: 'beginner' })
    expect(plan.days[0].exercises[0].sets_min).toBe(2)
  })

  it('misst Halteübungen in Sekunden', () => {
    const plan = buildOnboardingPlan({ ...base, location: 'bodyweight', minutes: 90 })
    const plank = plan.days[0].exercises.find((exercise) => exercise.name === 'Plank')
    expect(plank).toMatchObject({ reps_min: null, duration_min: 30, duration_max: 60 })
  })

  it('nutzt nur Übungen aus dem Katalog, für jede Kombination', () => {
    const names = new Set(EXERCISE_CATALOG.map((exercise) => exercise.name))
    for (const location of ['gym', 'home', 'bodyweight'] as const) {
      for (let count = 1; count <= 6; count += 1) {
        const plan = buildOnboardingPlan({ ...base, location, minutes: 90, weekdays: suggestWeekdays(count) })
        for (const day of plan.days) {
          expect(day.exercises.length).toBeGreaterThan(0)
          for (const exercise of day.exercises) expect(names.has(exercise.name)).toBe(true)
        }
      }
    }
  })
})

describe('eigene Trainingsdauer', () => {
  it('bleibt bei den Schnellwahl-Werten wie bisher', () => {
    expect([30, 45, 60, 90].map(exercisesPerSession)).toEqual([4, 5, 6, 8])
  })

  it('passt die Übungen an freie Werte an, mit Grenzen', () => {
    expect(exercisesPerSession(10)).toBe(3)
    expect(exercisesPerSession(75)).toBe(7)
    expect(exercisesPerSession(240)).toBe(8)
  })

  it('gibt ab 2 Stunden einen Satz mehr, höchstens 5', () => {
    expect(buildOnboardingPlan({ ...base, minutes: 120 }).days[0].exercises[0].sets_min).toBe(4)
    expect(buildOnboardingPlan({ ...base, goal: 'strength', experience: 'advanced', minutes: 180 }).days[0].exercises[0].sets_min).toBe(5)
  })

  it('erlaubt 10 bis 240 ganze Minuten', () => {
    expect(isValidSessionMinutes(10)).toBe(true)
    expect(isValidSessionMinutes(240)).toBe(true)
    expect(isValidSessionMinutes(5)).toBe(false)
    expect(isValidSessionMinutes(250)).toBe(false)
    expect(isValidSessionMinutes(37.5)).toBe(false)
  })
})
