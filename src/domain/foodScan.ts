import { isNutrition, type Nutrition } from './nutrition.ts'

export const FOOD_CONSENT_VERSION = 'google-food-v1'
export const MAX_SCAN_BYTES = 2_000_000
export type ScannedFood = {
  name: string
  grams: number | null
  portion_uncertain: boolean
  question: string | null
  per100g: Nutrition
}
export type FoodScan = { foods: ScannedFood[]; note: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Auch bei schemaerzwungener Ausgabe bleiben KI-Antworten nicht vertrauenswürdig. */
export function parseFoodScan(value: unknown): FoodScan {
  const invalid = () => { throw new Error('Die KI-Antwort ist ungültig. Bitte erneut versuchen.') }
  if (!isRecord(value) || !Array.isArray(value.foods) || value.foods.length > 20 ||
    typeof value.note !== 'string' || value.note.length > 1000) return invalid()
  const foods = value.foods.map((food): ScannedFood => {
    if (!isRecord(food) || typeof food.name !== 'string' || !food.name.trim() || food.name.length > 120 ||
      typeof food.portion_uncertain !== 'boolean' || !isNutrition(food.per100g) ||
      !(food.grams === null || (typeof food.grams === 'number' && Number.isFinite(food.grams) && food.grams >= 0.1 && food.grams <= 5000)) ||
      !(food.question === null || (typeof food.question === 'string' && food.question.length <= 300)) ||
      ((food.portion_uncertain || food.grams === null) && (typeof food.question !== 'string' || !food.question.trim())) ||
      (food.grams === null && !food.portion_uncertain)) return invalid()
    return { name: food.name.trim(), grams: food.grams as number | null, portion_uncertain: food.portion_uncertain, question: food.question as string | null, per100g: food.per100g }
  })
  return { foods, note: value.note }
}

/** Nur neu kodierte JPEGs, keine entfernten URLs oder beliebigen Dateien. */
export function validateScanImage(mime: unknown, base64: unknown): base64 is string {
  if (mime !== 'image/jpeg' || typeof base64 !== 'string' || base64.length < 8 ||
    base64.length > Math.ceil(MAX_SCAN_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) return false
  return base64.startsWith('/9j/')
}

// Antwortformat für Gemini. Nur Typen und Pflichtfelder: Grenzen wie maxLength, minimum oder
// additionalProperties lehnt die API für Flash-Modelle mit „invalid argument“ ab. Die Grenzen prüft
// parseFoodScan danach selbst, sie gehen also nicht verloren.
const nutrientSchema = {
  type: 'object',
  properties: Object.fromEntries(['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar'].map((key) => [key, { type: 'number' }])),
  required: ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar'],
}

export const FOOD_SCAN_SCHEMA = {
  type: 'object',
  properties: {
    foods: { type: 'array', items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        grams: { type: ['number', 'null'] },
        portion_uncertain: { type: 'boolean' },
        question: { type: ['string', 'null'] },
        per100g: nutrientSchema,
      },
      required: ['name', 'grams', 'portion_uncertain', 'question', 'per100g'],
    } },
    note: { type: 'string' },
  },
  required: ['foods', 'note'],
}
