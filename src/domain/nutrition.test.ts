import { describe, expect, it } from 'vitest'
import { goalStatus, nutrientProgress, profileTargets, nutritionFor, parseMealDraftItem, parseNutritionNumber, profileNutritionSuggestion, sumNutrition, validateMealItems, validateTargets } from './nutrition'

const per100g = { kcal: 200, protein: 10, carbs: 20, fat: 8, fiber: 3, sugar: 5 }

describe('Ernährungsberechnungen', () => {
  it('skaliert alle Nährwerte mit der bestätigten Portion', () => {
    expect(nutritionFor({ grams: 150, per100g })).toEqual({ kcal: 300, protein: 15, carbs: 30, fat: 12, fiber: 4.5, sugar: 7.5 })
  })
  it('summiert ohne vorzeitige Rundung und liefert eine leere Tagessumme', () => {
    expect(sumNutrition([{ grams: 33.3, per100g }, { grams: 66.7, per100g }])).toEqual(per100g)
    expect(sumNutrition([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 })
  })
  it('zeigt Überschreitungen und behandelt fehlende Ziele', () => {
    expect(nutrientProgress(120, 100)).toEqual({ percent: 120, remaining: 0, exceeded: 20 })
    expect(nutrientProgress(25, 100)).toEqual({ percent: 25, remaining: 75, exceeded: 0 })
    expect(nutrientProgress(25, null)).toBeNull()
    expect(nutrientProgress(25, 0)).toBeNull()
  })
  it('liest deutsche Dezimalzahlen, aber keine Leerwerte, Exponenten oder negativen Werte', () => {
    expect(parseNutritionNumber('12,5', 100)).toBe(12.5)
    for (const value of ['', ' ', '-1', '1e2', 'Infinity', '0x10', '100,1']) {
      expect(parseNutritionNumber(value, 100)).toBeNull()
    }
    expect(parseNutritionNumber('0', 100)).toBe(0)
  })
  it('verlangt positive Portionsgrößen und gültige Lebensmittel', () => {
    const item = { name: 'Reis', grams: 150, per100g, estimated: true }
    expect(validateMealItems([item])).toBe(true)
    expect(validateMealItems([])).toBe(false)
    expect(validateMealItems([{ ...item, grams: 0 }])).toBe(false)
    expect(validateMealItems([{ ...item, name: ' ' }])).toBe(false)
    expect(validateMealItems([{ ...item, per100g: { ...per100g, fat: 101 } }])).toBe(false)
    expect(validateMealItems([{ ...item, per100g: { ...per100g, kcal: NaN } }])).toBe(false)
  })
  it('verlangt sechs positive Tagesziele innerhalb der erlaubten Grenzen', () => {
    expect(validateTargets({ kcal: 2200, protein: 140, carbs: 250, fat: 70, fiber: 30, sugar: 55 })).toBe(true)
    expect(validateTargets({ kcal: 0, protein: 140, carbs: 250, fat: 70, fiber: 30, sugar: 55 })).toBe(false)
    expect(validateTargets({ kcal: 2200, protein: 140, carbs: 250, fat: 70, fiber: Infinity, sugar: 55 })).toBe(false)
    expect(validateTargets({ kcal: 2200, protein: 140, carbs: 250, fat: 70, fiber: 30, sugar: 501 })).toBe(false)
  })
  it('nutzt die letzte bekannte Gewichtsmessung und benennt fehlende Profilangaben', () => {
    const suggestion = profileNutritionSuggestion({ heightCm: null, sex: null, birthYear: null, activityLevel: null, goal: 'fitness', measurements: [
      { date: '2026-11-07', weightKg: 80 }, { date: '2026-11-08', weightKg: null }, { date: '2026-11-09', weightKg: 100 },
    ] }, '2026-11-08')
    expect(suggestion).toEqual({ kcal: null, protein: 112, missing: ['Größe', 'Geschlecht', 'Geburtsjahr', 'Aktivitätslevel'] })
  })
  it('validiert die korrigierten Lebensmitteleingaben vollständig', () => {
    const draft = { name: ' Reis ', grams: '150,5', values: { kcal: '130', protein: '2,7', carbs: '28', fat: '0,3', fiber: '0,4', sugar: '0,1' } }
    expect(parseMealDraftItem(draft)).toEqual({ name: 'Reis', grams: 150.5, per100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1 }, estimated: true })
    expect(parseMealDraftItem({ ...draft, grams: '' })).toBeNull()
    expect(parseMealDraftItem({ ...draft, values: { ...draft.values, protein: '' } })).toBeNull()
  })
})

describe('goalStatus', () => {
  it('zeigt, wie viel noch offen ist', () => {
    expect(goalStatus(12, 50, 'protein')).toEqual({ reached: false, fraction: 0.24, label: 'noch 38 g', tone: 'open' })
  })

  it('meldet ein erreichtes Ziel, auch wenn es überschritten ist', () => {
    expect(goalStatus(62, 50, 'protein')).toMatchObject({ reached: true, fraction: 1, label: 'erreicht', tone: 'done' })
  })

  it('warnt bei zu vielen Kalorien', () => {
    expect(goalStatus(2120, 2000, 'kcal')).toMatchObject({ reached: true, label: '120 kcal drüber', tone: 'over' })
  })

  it('zählt genau das Ziel als erreicht', () => {
    expect(goalStatus(2000, 2000, 'kcal')).toMatchObject({ reached: true, label: 'erreicht', tone: 'done' })
  })

  it('behandelt Zucker als WHO-Obergrenze ohne Erfolgsstempel und warnt bei Überschreitung', () => {
    expect(goalStatus(18, 50, 'sugar')).toEqual({ reached: false, fraction: 0.36, label: '18 g / max. 50 g', tone: 'open' })
    expect(goalStatus(50, 50, 'sugar')).toEqual({ reached: false, fraction: 1, label: '50 g / max. 50 g', tone: 'open' })
    expect(goalStatus(62, 50, 'sugar')).toEqual({ reached: true, fraction: 1, label: '12 g drüber', tone: 'over' })
  })
})

describe('profileTargets', () => {
  it('leitet alle sechs Ziele inklusive WHO-Zuckergrenze (10 % der Kalorien) ab', () => {
    // 2400 kcal, 160 g Protein: Fett 67 g (25 %), Kohlenhydrate = Rest, Ballaststoffe 34 g, Zucker 60 g (10 % = 240 kcal / 4)
    expect(profileTargets({ kcal: 2400, protein: 160 })).toEqual({ kcal: 2400, protein: 160, fat: 67, carbs: 289, fiber: 34, sugar: 60 })
  })

  it('gibt mindestens 25 g Ballaststoffe vor', () => {
    expect(profileTargets({ kcal: 1500, protein: 100 })?.fiber).toBe(25)
  })

  it('braucht Kalorien und Protein aus dem Profil', () => {
    expect(profileTargets({ kcal: null, protein: 150 })).toBeNull()
    expect(profileTargets({ kcal: 2200, protein: null })).toBeNull()
    expect(profileTargets(null)).toBeNull()
  })
})
