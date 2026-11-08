import { describe, expect, it } from 'vitest'
import { FOOD_SCAN_SCHEMA, parseFoodScan, validateScanImage } from './foodScan'

const food = {
  name: 'Reis, gekocht', grams: 150, portion_uncertain: false, question: null,
  per100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1 },
}

describe('Gemini-Ausgabevalidierung', () => {
  it('akzeptiert validierte Lebensmittel und ein leeres Ergebnis ohne Essen', () => {
    expect(parseFoodScan({ foods: [food], note: 'Öl ist nicht erkennbar.' }).foods).toHaveLength(1)
    expect(parseFoodScan({ foods: [], note: 'Kein Essen erkannt.' }).foods).toEqual([])
  })
  it('fordert bei unklaren Portionen eine Rückfrage', () => {
    expect(() => parseFoodScan({ foods: [{ ...food, grams: null }], note: '' })).toThrow()
    expect(() => parseFoodScan({ foods: [{ ...food, portion_uncertain: true }], note: '' })).toThrow()
    expect(parseFoodScan({ foods: [{ ...food, grams: null, portion_uncertain: true, question: 'Wie viele Gramm Reis?' }], note: '' }).foods[0].grams).toBeNull()
  })
  it('weist fremde Datentypen, übergroße Listen und erfundene Grenzwerte zurück', () => {
    for (const value of [null, {}, { foods: 'Reis', note: '' }, { foods: Array(21).fill(food), note: '' },
      { foods: [{ ...food, grams: '150' }], note: '' },
      { foods: [{ ...food, per100g: { ...food.per100g, protein: -1 } }], note: '' },
      { foods: [{ ...food, grams: 0 }], note: '' }]) {
      expect(() => parseFoodScan(value)).toThrow()
    }
  })
  it('prüft Bildsignatur, Format und Größenlimit statt nur Dateiendung', () => {
    expect(validateScanImage('image/jpeg', '/9j/AA==')).toBe(true)
    expect(validateScanImage('image/png', '/9j/AA==')).toBe(false)
    expect(validateScanImage('image/svg+xml', 'PHN2Zz4=')).toBe(false)
    expect(validateScanImage('image/jpeg', 'kein bild')).toBe(false)
    expect(validateScanImage('image/jpeg', '/9j/' + 'A'.repeat(2_800_000))).toBe(false)
  })
})

describe('Antwortformat für Gemini', () => {
  it('enthält nur Angaben, die die API akzeptiert', () => {
    // Mit maxLength, minimum oder additionalProperties antwortet Gemini mit 400 „invalid argument“.
    expect(JSON.stringify(FOOD_SCAN_SCHEMA)).not.toMatch(/maxLength|maxItems|minimum|maximum|additionalProperties/)
  })
})
