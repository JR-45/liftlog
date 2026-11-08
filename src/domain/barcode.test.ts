import { describe, expect, it } from 'vitest'
import { isBarcode, parseOpenFoodFacts } from './barcode'

describe('isBarcode', () => {
  it('erkennt übliche Barcodes', () => {
    expect(isBarcode('4006381333931')).toBe(true)
    expect(isBarcode(' 96385074 ')).toBe(true)
  })

  it('lehnt alles andere ab', () => {
    expect(isBarcode('1234567')).toBe(false)
    expect(isBarcode('40063813339a1')).toBe(false)
    expect(isBarcode('123456789012345')).toBe(false)
  })
})

describe('parseOpenFoodFacts', () => {
  const product = {
    product_name: 'Skyr Natur', product_name_de: 'Skyr', brands: 'Hofmarke', serving_quantity: 150,
    nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, carbohydrates_100g: '4,1', fat_100g: 0.2 },
  }

  it('übernimmt Name, Portion und Nährwerte pro 100 g', () => {
    expect(parseOpenFoodFacts({ status: 1, product })).toEqual({
      name: 'Skyr', grams: 150, per100g: { kcal: 63, protein: 11, carbs: 4.1, fat: 0.2, fiber: null },
    })
  })

  it('rechnet fehlende Kalorien aus Kilojoule um und nimmt sonst 100 g', () => {
    const result = parseOpenFoodFacts({ status: 1, product: { product_name: 'Haferflocken', nutriments: { energy_100g: 1548 } } })
    expect(result).toMatchObject({ name: 'Haferflocken', grams: 100, per100g: { kcal: 370, protein: null } })
  })

  it('meldet unbekannte Produkte als null', () => {
    expect(parseOpenFoodFacts({ status: 0, status_verbose: 'product not found' })).toBeNull()
    expect(parseOpenFoodFacts({ status: 1, product: { nutriments: {} } })).toBeNull()
    expect(parseOpenFoodFacts(null)).toBeNull()
  })
})
