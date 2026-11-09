import { describe, expect, it } from 'vitest'
import { normalizeFoodQuery, parseFoodSearch, selectFood, portionFromDraft } from './foodSearch'

const nutrients = { 'energy-kcal_100g': 89, proteins_100g: 1.1, carbohydrates_100g: 22.8, fat_100g: 0.3, fiber_100g: 2.6, sugars_100g: 12.2 }
const hit = (code: string, name: string, extra = {}) => ({ code: code.padStart(8, '0'), product_name_de: name, nutriments: nutrients, ...extra })

describe('Lebensmittelsuche', () => {
  it('ergänzt deutsche Präfixe und vereinheitlicht häufige Schreibweisen', () => {
    expect(normalizeFoodQuery(' Ban ')).toBe('banane')
    expect(normalizeFoodQuery('Haehnchenbrust')).toBe('hähnchenbrust')
    expect(normalizeFoodQuery('Eier')).toBe('ei')
    expect(normalizeFoodQuery('Reis gekocht')).toBe('reis gekocht')
  })
  it('bevorzugt genaue Treffer, erhält Zubereitung und Marke und begrenzt Ergebnisse', () => {
    const hits = [hit('1', 'Bananenchips'), hit('2', 'Banane', { brands: ['Bio Hof'] }), hit('3', 'Reis gekocht'), ...Array.from({ length: 10 }, (_, index) => hit(`${100 + index}`, `Banane Marke ${index}`))]
    const result = parseFoodSearch({ hits }, 'Banane')
    expect(result).toHaveLength(6)
    expect(result[0]).toMatchObject({ id: '00000002', name: 'Banane', brand: 'Bio Hof', per100g: { sugar: 12.2, fiber: 2.6 } })
    expect(parseFoodSearch({ hits: [hit('3', 'Reis gekocht')] }, 'Reis')[0].name).toBe('Reis gekocht')
  })
  it('erfindet keine fehlenden Werte und lehnt ungeeignete Antworten ab', () => {
    const result = parseFoodSearch({ hits: [hit('1', 'Banane', { nutriments: { ...nutrients, fiber_100g: undefined, sugars_100g: -1 } }), hit('2', 'Leer', { nutriments: {} }), hit('3', 'Saft', { nutrition_data_per: '100ml' })] }, 'Banane')
    expect(result).toHaveLength(1)
    expect(result[0].per100g.fiber).toBeNull()
    expect(result[0].per100g.sugar).toBeNull()
    expect(parseFoodSearch(null, 'Banane')).toEqual([])
  })
  it('behält manuelle Korrekturen bis zur ausdrücklichen Auswahl eines neuen Lebensmittels', () => {
    const food = parseFoodSearch({ hits: [hit('1', 'Banane')] }, 'Banane')[0]
    const chosen = selectFood({ name: 'Alt', grams: '150', values: {} }, food)
    const corrected = { ...chosen, values: { ...chosen.values, protein: '2' } }
    expect(portionFromDraft(corrected)).toMatchObject({ kcal: 133.5, protein: 3, carbs: 34.2, fat: 0.45 })
    expect(portionFromDraft({ ...corrected, grams: '200' })).toMatchObject({ kcal: 178, protein: 4, sugar: 24.4 })
    expect(selectFood(corrected, food).values.protein).toBe('1,1')
  })
})
