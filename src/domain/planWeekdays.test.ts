import { describe, expect, it } from 'vitest'
import { copyTemplateDay, replaceTemplateDay } from './planWeekdays'
import { recommendPlan } from './trainingPlan'

describe('Wochentage der Vorlage', () => {
  it('ändert ausschließlich den im Popup ausgewählten Tag', () => {
    const days = recommendPlan('classic', 'upper_lower')
    const changed = replaceTemplateDay(days, 1, { ...days[0], name: 'Mein Montag' })
    expect(changed.find((day) => day.weekday === 1)?.name).toBe('Mein Montag')
    expect(changed.filter((day) => day.weekday !== 1)).toEqual(days.filter((day) => day.weekday !== 1))
  })
  it('erlaubt dieselbe Einheit an jedem der sieben Wochentage', () => {
    const source = recommendPlan('classic', 'upper_lower')[0]
    let days = [source]
    for (let weekday = 0; weekday < 7; weekday += 1) days = replaceTemplateDay(days, weekday, copyTemplateDay(source, weekday))
    expect(days).toHaveLength(7)
    expect(new Set(days.map((day) => day.weekday)).size).toBe(7)
    expect(days.every((day) => day.name === source.name)).toBe(true)
  })
  it('setzt einen Tag auf Ruhetag, ohne andere Tage zu löschen', () => {
    const days = recommendPlan('classic', 'upper_lower')
    expect(replaceTemplateDay(days, 1, null)).toEqual(days.filter((day) => day.weekday !== 1))
  })
  it('kopiert Übungen unabhängig vom Ursprungstag', () => {
    const source = recommendPlan('classic', 'upper_lower')[0]
    const copied = copyTemplateDay(source, 3)
    copied.exercises[0].name = 'Geändert'
    expect(source.exercises[0].name).not.toBe('Geändert')
    expect(copied.weekday).toBe(3)
  })
})
