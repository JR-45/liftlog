// Barcode-Nummern prüfen und Produktdaten von Open Food Facts in LiftLog-Nährwerte übersetzen.
import { NUTRIENTS, type Nutrient } from './nutrition'

export type BarcodeProduct = { name: string; grams: number; per100g: Record<Nutrient, number | null> }

/** EAN-8, EAN-13, UPC-A, GTIN-14: nur Ziffern, 8 bis 14 Stellen. */
export function isBarcode(text: string): boolean {
  return /^\d{8,14}$/.test(text.trim())
}

const FIELDS: Record<Nutrient, string> = {
  kcal: 'energy-kcal_100g', protein: 'proteins_100g', carbs: 'carbohydrates_100g', fat: 'fat_100g', fiber: 'fiber_100g',
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : null
}

/**
 * Antwort der Open-Food-Facts-API (v2) auswerten. null, wenn das Produkt fehlt oder keinen Namen hat.
 * Fehlende Nährwerte bleiben leer und werden im Formular von Hand ergänzt. Kalorien zur Not aus Kilojoule.
 */
export function parseOpenFoodFacts(response: unknown): BarcodeProduct | null {
  if (!response || typeof response !== 'object') return null
  const { status, product } = response as { status?: unknown; product?: Record<string, unknown> }
  if (status !== 1 || !product || typeof product !== 'object') return null
  const rawName = [product.product_name_de, product.product_name, product.brands].find((value) => typeof value === 'string' && value.trim())
  if (typeof rawName !== 'string') return null
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>
  const per100g = Object.fromEntries(NUTRIENTS.map((key) => [key, number(nutriments[FIELDS[key]])])) as Record<Nutrient, number | null>
  if (per100g.kcal === null) {
    const kj = number(nutriments.energy_100g ?? nutriments['energy-kj_100g'])
    if (kj !== null) per100g.kcal = Math.round(kj / 4.184)
  }
  const serving = number(product.serving_quantity)
  return { name: rawName.trim().slice(0, 120), grams: serving !== null && serving >= 0.1 && serving <= 5000 ? serving : 100, per100g }
}
