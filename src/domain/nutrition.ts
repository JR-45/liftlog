import { ageFromBirthYear, analyzeBody, daysUntil, type ActivityLevel, type Goal, type Sex } from './body.ts'

export const NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar'] as const
export type Nutrient = typeof NUTRIENTS[number]
export type Nutrition = Record<Nutrient, number>
export type NutritionTargets = Record<Nutrient, number | null>
export type MealItem = { name: string; grams: number; per100g: Nutrition; estimated: boolean }
export type Meal = { id: string; consumed_on: string; title: string; items: MealItem[] }

export const NUTRIENT_LABELS: Record<Nutrient, string> = {
  kcal: 'Kalorien', protein: 'Protein', carbs: 'Kohlenhydrate', fat: 'Fett', fiber: 'Ballaststoffe', sugar: 'Zucker',
}
export const TARGET_LIMITS: Nutrition = { kcal: 15000, protein: 1000, carbs: 2000, fat: 1000, fiber: 300, sugar: 500 }
export const EMPTY_TARGETS: NutritionTargets = { kcal: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null }
const emptyNutrition = (): Nutrition => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 })

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
  targetWeightKg?: number | null
  targetDate?: string | null
  measurements: { date: string; weightKg: number | null }[]
}, today: string): { kcal: number | null; protein: number | null; missing: string[] } {
  const weightKg = profile.measurements.filter((item) => item.date <= today && item.weightKg !== null).sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weightKg ?? null
  const missing = [
    [weightKg, 'Gewicht'], [profile.heightCm, 'Größe'], [profile.sex, 'Geschlecht'],
    [profile.birthYear, 'Geburtsjahr'], [profile.activityLevel, 'Aktivitätslevel'],
  ].filter(([value]) => value === null).map(([, label]) => String(label))
  const analysis = analyzeBody({
    weightKg, heightCm: profile.heightCm, sex: profile.sex, age: ageFromBirthYear(profile.birthYear, today),
    activity: profile.activityLevel, goal: profile.goal, targetWeightKg: profile.targetWeightKg ?? null, bodyFatPct: null, neckCm: null, waistCm: null, hipsCm: null,
    daysToTarget: profile.targetDate ? daysUntil(today, profile.targetDate) : null,
  })
  return { kcal: analysis.targetKcal, protein: analysis.proteinG, missing }
}

export type GoalStatus = { reached: boolean; fraction: number; label: string; tone: 'open' | 'done' | 'over' }

/**
 * Kurzer Stand eines Tagesziels für die Übersicht: „noch 38 g“, „erreicht“ oder bei Kalorien
 * und Zucker „120 kcal drüber“ bzw. „12 g drüber“. Zucker ist eine WHO-Obergrenze, kein Mindestziel.
 */
export function goalStatus(consumed: number, target: number, key: Nutrient): GoalStatus {
  const fraction = Math.max(0, Math.min(1, consumed / target))
  if (key === 'sugar') {
    if (consumed > target) return { reached: true, fraction, label: `${formatNutrition(consumed - target, key)} drüber`, tone: 'over' }
    return { reached: false, fraction, label: `${formatNutrition(consumed, key)} / max. ${formatNutrition(target, key)}`, tone: 'open' }
  }
  if (consumed < target) return { reached: false, fraction, label: `noch ${formatNutrition(target - consumed, key)}`, tone: 'open' }
  if (key === 'kcal' && consumed > target) return { reached: true, fraction, label: `${formatNutrition(consumed - target, key)} drüber`, tone: 'over' }
  return { reached: true, fraction, label: 'erreicht', tone: 'done' }
}

/**
 * Vollständige Tagesziele aus dem Profilvorschlag (Kalorien und Protein aus der Körperanalyse).
 * Fett: 25 % der Kalorien. Kohlenhydrate: der Rest. Ballaststoffe: 14 g je 1000 kcal, mindestens 25 g.
 * Zucker: WHO-Obergrenze von 10 % der Kalorien (4 kcal/g), mindestens 10 g.
 * null, solange im Profil Angaben fehlen.
 */
export function profileTargets(suggestion: { kcal: number | null; protein: number | null } | null): Nutrition | null {
  if (!suggestion || suggestion.kcal === null || suggestion.protein === null || suggestion.kcal <= 0) return null
  const kcal = Math.round(suggestion.kcal)
  const protein = Math.round(suggestion.protein)
  const fat = Math.round(kcal * 0.25 / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  const fiber = Math.max(25, Math.round(kcal / 1000 * 14))
  const sugar = Math.max(10, Math.round(kcal * 0.10 / 4))
  return { kcal, protein, carbs, fat, fiber, sugar }
}
