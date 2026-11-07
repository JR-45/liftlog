import { describe, expect, it } from 'vitest'
import { validatePlanDraft, trainingSetCount } from './planEditing'
import { recommendPlan } from './trainingPlan'

describe('validatePlanDraft', () => {
  it('beschränkt benannte Übungsgruppen auf ihre eigenen Übungen', () => {
    const day = recommendPlan('classic', 'full_body')[0]
    day.name = 'Bizeps'
    day.exercises = [day.exercises[0]]
    expect(validatePlanDraft([day], true)).toMatchObject({ day: 0, exercise: 0 })
    day.exercises[0].name = 'Kabelcurls'
    expect(validatePlanDraft([day], true)).toBeNull()
  })
  it('erhält gemischte Pläne mit eigenen Tagesnamen', () => {
    const days = recommendPlan('classic', 'full_body')
    expect(validatePlanDraft(days, true)).toBeNull()
  })
  it('akzeptiert vollständige Pläne', () => {
    expect(validatePlanDraft(recommendPlan('classic', 'full_body'))).toBeNull()
  })
  it('findet eine leere Übung auch auf einer nicht sichtbaren Seite', () => {
    const days = recommendPlan('classic', 'full_body')
    days[0].exercises[2].name = ' '
    expect(validatePlanDraft(days)).toMatchObject({ day: 0, exercise: 2 })
  })
  it('erkennt doppelte Übungen nach dem Kürzen von Leerzeichen', () => {
    const days = recommendPlan('classic', 'full_body')
    days[0].exercises[1].name = ` ${days[0].exercises[0].name} `
    expect(validatePlanDraft(days)).toMatchObject({ day: 0, exercise: 1 })
  })
  it('erkennt ungültige und unvollständige Vorgaben', () => {
    const days = recommendPlan('classic', 'full_body')
    days[0].exercises[1].sets_min = 0
    expect(validatePlanDraft(days)).toMatchObject({ day: 0, exercise: 1 })
    days[0].exercises[1].sets_min = 3
    days[0].exercises[1].reps_max = null
    expect(validatePlanDraft(days)).toMatchObject({ day: 0, exercise: 1 })
    days[0].exercises[1].reps_max = 2
    expect(validatePlanDraft(days)).toMatchObject({ day: 0, exercise: 1 })
  })
})

describe('trainingSetCount', () => {
  it('beginnt mit drei Sätzen', () => expect(trainingSetCount(null, [])).toBe(3))
  it('behält eine angepasste Anzahl auch unter drei bei', () => {
    expect(trainingSetCount(1, [])).toBe(1)
    expect(trainingSetCount(5, [])).toBe(5)
  })
  it('versteckt keine bereits gespeicherten Sätze', () => {
    expect(trainingSetCount(2, [1, 5])).toBe(5)
  })
  it('ignoriert beschädigte gespeicherte Anzahlen', () => {
    for (const count of [0, -1, 1.5, NaN, 101]) expect(trainingSetCount(count, [])).toBe(3)
  })
})
