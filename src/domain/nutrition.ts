import { ageFromBirthYear, analyzeBody, type ActivityLevel, type Goal, type Sex } from './body.ts'

export const NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const
export type Nutrient = typeof NUTRIENTS[number]
export type Nutrition = Record<Nutrient, number>
export type NutritionTargets = Record<Nutrient, number | null>
export type MealItem = { name: string; grams: number; per100g: Nutrition; estimated: boolean }
export type Meal = { id: string; consumed_on: string; title: string; items: MealItem[] }

export const NUTRIENT_LABELS: Record<Nutrient, string> = {
  kcal: 'Kalorien', protein: 'Protein', carbs: 'Kohlenhydrate', fat: 'Fett', fiber: 'Ballaststoffe',
}
export const TARGET_LIMITS: Nutrition = { kcal: 15000, protein: 1000, carbs: 2000, fat: 1000, fiber: 300 }
export const EMPTY_TARGETS: NutritionTargets = { kcal: null, protein: null, carbs: null, fat: null, fiber: null }
const emptyNutrition = (): Nutrition => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })

export function nutritionFor(item: { grams: number; per100g: Nutrition }): Nutrition {
  return Object.fromEntries(NUTRIENTS.map((key) => [key, item.per100g[key] * item.grams / 100])) as Nutrition
}

export function sumNutrition(items: { grams: number; per100g: Nutrition }[]): Nutrition {
  return items.reduce((sum, item) => {
    const values = nutritionFor(item)
    for (const key of NUTRIENTS) sum[key] += values[key]
    return sum
  }, emptyNutrition())
}

export function nutrientProgress(consumed: number, target: number | null) {
  if (target === null || !Number.isFinite(target) || target <= 0) return null
  return { percent: Math.round(consumed / target * 100), remaining: Math.max(0, target - consumed), exceeded: Math.max(0, consumed - target) }
}

export function parseNutritionNumber(text: string, max: number): number | null {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text.trim())) return null
  const value = Number(text.trim().replace(',', '.'))
  return Number.isFinite(value) && value >= 0 && value <= max ? value : null
}

export function isNutrition(value: unknown): value is Nutrition {
  if (!value || typeof value !== 'object') return false
  return NUTRIENTS.every((key) => {
    const number = (value as Record<string, unknown>)[key]
    return typeof number === 'number' && Number.isFinite(number) && number >= 0 && number <= (key === 'kcal' ? 1000 : 100)
  })
}

export function validateMealItems(items: MealItem[]): boolean {
  return items.length > 0 && items.length <= 20 && items.every((item) =>
    typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 120 &&
    Number.isFinite(item.grams) && item.grams >= 0.1 && item.grams <= 5000 &&
    typeof item.estimated === 'boolean' && isNutrition(item.per100g))
}

export function parseMealDraftItem(draft: { name: string; grams: string; values: Record<Nutrient, string> }): MealItem | null {
  const grams = parseNutritionNumber(draft.grams, 5000)
  const values = Object.fromEntries(NUTRIENTS.map((key) => [key, parseNutritionNumber(draft.values[key], key === 'kcal' ? 1000 : 100)]))
  if (grams === null || NUTRIENTS.some((key) => values[key] === null)) return null
  const item = { name: draft.name.trim(), grams, per100g: values as Nutrition, estimated: true }
  return validateMealItems([item]) ? item : null
}

export function validateTargets(targets: NutritionTargets): targets is Nutrition {
  return NUTRIENTS.every((key) => targets[key] !== null && Number.isFinite(targets[key]) && targets[key]! > 0 && targets[key]! <= TARGET_LIMITS[key])
}

export function formatNutrition(value: number, key: Nutrient): string {
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: key === 'kcal' ? 0 : 1 }).format(value)} ${key === 'kcal' ? 'kcal' : 'g'}`
}

export function profileNutritionSuggestion(profile: {
  heightCm: number | null; sex: Sex | null; birthYear: number | null; activityLevel: ActivityLevel | null; goal: Goal
  measurements: { date: string; weightKg: number | null }[]
}, today: string): { kcal: number | null; protein: number | null; missing: string[] } {
  const weightKg = profile.measurements.filter((item) => item.date <= today && item.weightKg !== null).sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weightKg ?? null
  const missing = [
    [weightKg, 'Gewicht'], [profile.heightCm, 'Größe'], [profile.sex, 'Geschlecht'],
    [profile.birthYear, 'Geburtsjahr'], [profile.activityLevel, 'Aktivitätslevel'],
  ].filter(([value]) => value === null).map(([, label]) => String(label))
  const analysis = analyzeBody({
    weightKg, heightCm: profile.heightCm, sex: profile.sex, age: ageFromBirthYear(profile.birthYear, today),
    activity: profile.activityLevel, goal: profile.goal, targetWeightKg: null, bodyFatPct: null, neckCm: null, waistCm: null, hipsCm: null,
  })
  return { kcal: analysis.targetKcal, protein: analysis.proteinG, missing }
}
