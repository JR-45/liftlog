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
    for (const location of ['gym', 'home', 'bodyweight', 'calisthenics'] as const) {
      for (const focus of ['balanced', 'lower', 'athletic'] as const) {
        for (const goal of ['hypertrophy', 'cut'] as const) {
          for (const experience of ['beginner', 'advanced'] as const) for (let count = 1; count <= 6; count += 1) {
            const plan = buildOnboardingPlan({ ...base, goal, focus, location, experience, mobility: true, cardioDay: true, minutes: 90, weekdays: suggestWeekdays(count) })
            for (const day of plan.days) {
              expect(day.exercises.length).toBeGreaterThan(0)
              for (const exercise of day.exercises) expect(names.has(exercise.name)).toBe(true)
              // Keine Übung doppelt am selben Tag.
              expect(new Set(day.exercises.map((exercise) => exercise.name)).size).toBe(day.exercises.length)
            }
          }
        }
      }
    }
  })

  it('setzt beim Fokus Bauch, Beine & Po den Po an den Anfang und trainiert die Beine öfter', () => {
    const three = buildOnboardingPlan({ ...base, focus: 'lower' })
    expect(three.days[0].exercises[0].name).toBe('Hip Thrusts')
    const four = buildOnboardingPlan({ ...base, focus: 'lower', weekdays: [1, 2, 4, 5] })
    expect(four.days.map((day) => day.name)).toEqual(['Unterkörper', 'Oberkörper', 'Beine & Po', 'Oberkörper'])
    // Ausgewogen bleibt der bisherige Plan.
    expect(buildOnboardingPlan({ ...base, focus: 'balanced' }).days[0].exercises[0].name).toBe('Kniebeugen')
  })

  it('baut athletisch mit Kreuzheben, Schwung- und Tragübungen', () => {
    const names = buildOnboardingPlan({ ...base, focus: 'athletic', minutes: 90 }).days[0].exercises.map((exercise) => exercise.name)
    expect(names[0]).toBe('Kreuzheben')
    expect(names).toContain('Kettlebell Swings')
    const walk = buildOnboardingPlan({ ...base, focus: 'athletic', minutes: 90 }).days[0].exercises.find((exercise) => exercise.name === 'Farmer’s Walk')
    expect(walk).toMatchObject({ duration_min: 30, duration_max: 45 })
    // Calisthenics ist schon athletisch und bleibt gleich.
    expect(buildOnboardingPlan({ ...base, focus: 'athletic', location: 'calisthenics' }).days)
      .toEqual(buildOnboardingPlan({ ...base, location: 'calisthenics' }).days)
  })

  it('baut für Calisthenics mit Stange und wenigen Wiederholungen bei schweren Übungen', () => {
    const plan = buildOnboardingPlan({ ...base, location: 'calisthenics' })
    const pullUps = plan.days[0].exercises.find((exercise) => exercise.name === 'Klimmzüge (Körpergewicht)')
    expect(pullUps).toMatchObject({ reps_min: 5, reps_max: 10 })
    const lSit = buildOnboardingPlan({ ...base, location: 'calisthenics', minutes: 90 }).days[0].exercises.find((exercise) => exercise.name === 'L-Sit')
    expect(lSit).toMatchObject({ duration_min: 10, duration_max: 20, sets_min: 3 })
  })

  it('gibt Einsteigern leichtere Varianten schwerer Übungen', () => {
    const park = buildOnboardingPlan({ ...base, location: 'calisthenics', experience: 'beginner', minutes: 90 })
    const names = park.days.flatMap((day) => day.exercises.map((exercise) => exercise.name))
    for (const hard of ['Klimmzüge (Körpergewicht)', 'Chin-ups', 'Pistol Squats', 'L-Sit', 'Handstand halten']) expect(names).not.toContain(hard)
    const gym = buildOnboardingPlan({ ...base, focus: 'athletic', experience: 'beginner', minutes: 90 }).days[0].exercises.map((exercise) => exercise.name)
    expect(gym.slice(0, 2)).toEqual(['Rumänisches Kreuzheben', 'Klimmzüge mit Gewichtshilfe'])
  })

  it('hängt beim Fettabbau Cardio an, ohne Studio Joggen', () => {
    const gym = buildOnboardingPlan({ ...base, goal: 'cut' }).days[0].exercises.at(-1)
    expect(gym).toMatchObject({ name: 'Crosstrainer', duration_min: 600, duration_max: 900 })
    expect(buildOnboardingPlan({ ...base, goal: 'cut', location: 'bodyweight' }).days[0].exercises.at(-1)?.name).toBe('Joggen')
    expect(buildOnboardingPlan(base).days[0].exercises.some((exercise) => exercise.name === 'Crosstrainer')).toBe(false)
  })

  it('legt den Cardio-Tag auf einen freien Tag, am liebsten Samstag', () => {
    const plan = buildOnboardingPlan({ ...base, location: 'bodyweight', cardioDay: true })
    expect(plan.days.map((day) => day.weekday)).toEqual([1, 3, 5, 6])
    expect(plan.days[3]).toMatchObject({ name: 'Cardio' })
    expect(plan.days[3].exercises[0]).toMatchObject({ name: 'Joggen', duration_min: 1800, duration_max: 2700 })
    expect(buildOnboardingPlan({ ...base, cardioDay: true }).days[3].exercises[0].name).toBe('Laufband')
    expect(buildOnboardingPlan({ ...base, cardioDay: true, weekdays: [1, 2, 3, 4, 5, 6] }).days).toHaveLength(6)
    expect(buildOnboardingPlan({ ...base, cardioDay: true, weekdays: [1, 2, 4, 5, 6] }).days.map((day) => day.weekday)).toEqual([0, 1, 2, 4, 5, 6])
  })

  it('hängt mit Mobility-Zusatz zwei passende Übungen ans Ende', () => {
    const plain = buildOnboardingPlan({ ...base, weekdays: [1, 2, 4, 5] })
    const plan = buildOnboardingPlan({ ...base, weekdays: [1, 2, 4, 5], mobility: true })
    expect(plan.days[0].exercises).toHaveLength(plain.days[0].exercises.length + 2)
    expect(plan.days[0].exercises.slice(-2).map((exercise) => exercise.name)).toEqual(['Thorax-Rotation', 'Wall Slides'])
    expect(plan.days[1].exercises.slice(-2).map((exercise) => exercise.name)).toEqual(['90/90 Hüftrotation', 'Couch Stretch'])
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
