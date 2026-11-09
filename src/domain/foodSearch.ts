import { NUTRIENTS, parseNutritionNumber, type Nutrient } from './nutrition'

export type FoodSuggestion = {
  id: string; name: string; brand: string; url: string
  per100g: Record<Nutrient, number | null>
}
export type FoodValues = Record<Nutrient, string>

const simple = (value: string) => value.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('ß', 'ss')
const aliases: Record<string, string> = {
  banane: 'banane', bananen: 'banane', mandarine: 'mandarine', mandarinen: 'mandarine', apfel: 'apfel', apfelmus: 'apfelmus',
  reis: 'reis', hahnchenbrust: 'hähnchenbrust', haehnchenbrust: 'hähnchenbrust', hanchenbrust: 'hähnchenbrust',
  haferflocken: 'haferflocken', eier: 'ei', ei: 'ei', milch: 'milch', kartoffel: 'kartoffel', kartoffeln: 'kartoffel',
}

/** Nur Suchbegriffe vereinheitlichen; Zubereitungsangaben und Produktnamen bleiben erhalten. */
export function normalizeFoodQuery(value: string): string {
  const clean = value.toLocaleLowerCase('de-DE').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  const key = simple(clean)
  return aliases[key] ?? (key.length >= 3 && !key.includes(' ') ? Object.entries(aliases).find(([alias]) => alias.startsWith(key))?.[1] : undefined) ?? clean
}

const fields: Record<Nutrient, string> = { kcal: 'energy-kcal_100g', protein: 'proteins_100g', carbs: 'carbohydrates_100g', fat: 'fat_100g', fiber: 'fiber_100g', sugar: 'sugars_100g' }
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
function number(value: unknown, max: number): number | null {
  if (typeof value !== 'number' && typeof value !== 'string' || typeof value === 'string' && !value.trim()) return null
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : value
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? Math.round(parsed * 100) / 100 : null
}

/** Open-Food-Facts-Suchtreffer: ausschließlich vorhandene Werte pro 100 g übernehmen. */
export function parseFoodSearch(response: unknown, query: string): FoodSuggestion[] {
  const hits = record(response).hits
  if (!Array.isArray(hits)) return []
  const found = new Map<string, FoodSuggestion>()
  for (const value of hits.slice(0, 100)) {
    const hit = record(value)
    if (hit.nutrition_data_per === '100ml' || hit.product_quantity_unit === 'ml') continue
    const name = [hit.product_name_de, hit.product_name].find(item => typeof item === 'string' && item.trim())
    if (typeof name !== 'string' || typeof hit.code !== 'string' || !/^\d{4,24}$/.test(hit.code)) continue
    const nutrients = record(hit.nutriments)
    const per100g = Object.fromEntries(NUTRIENTS.map(key => [key, number(nutrients[fields[key]], key === 'kcal' ? 1000 : 100)])) as FoodSuggestion['per100g']
    if (per100g.kcal === null) {
      const kj = number(nutrients['energy-kj_100g'] ?? nutrients.energy_100g, 4184)
      if (kj !== null) per100g.kcal = Math.round(kj / 4.184 * 100) / 100
    }
    if (['kcal', 'protein', 'carbs', 'fat'].some(key => per100g[key as Nutrient] === null)) continue
    const brand = (Array.isArray(hit.brands) ? hit.brands.filter(item => typeof item === 'string').join(', ') : typeof hit.brands === 'string' ? hit.brands : '').slice(0, 100)
    const product = { id: hit.code, name: name.trim().slice(0, 120), brand, per100g, url: `https://world.openfoodfacts.org/product/${hit.code}` }
    const identity = simple(`${product.name}|${brand}`)
    if (!found.has(identity)) found.set(identity, product)
  }
  const needle = simple(normalizeFoodQuery(query))
  const score = (food: FoodSuggestion) => {
    const name = simple(food.name)
    return (name === needle ? 100 : name.startsWith(needle) ? 50 : name.includes(needle) ? 20 : 0)
      + NUTRIENTS.filter(key => food.per100g[key] !== null).length
  }
  return [...found.values()].sort((a, b) => score(b) - score(a)).slice(0, 6)
}

export function selectFood(draft: { name: string; grams: string; values: Partial<FoodValues> }, food: FoodSuggestion): { name: string; grams: string; values: FoodValues } {
  return { name: food.name, grams: draft.grams || '100', values: Object.fromEntries(NUTRIENTS.map(key => [key, food.per100g[key] === null ? '' : String(food.per100g[key]).replace('.', ',')])) as FoodValues }
}

/** Vorschau funktioniert auch, wenn einzelne Datenbankwerte noch fehlen. */
export function portionFromDraft(draft: { grams: string; values: Partial<FoodValues> }): Record<Nutrient, number | null> {
  const grams = parseNutritionNumber(draft.grams, 5000)
  return Object.fromEntries(NUTRIENTS.map(key => {
    const base = parseNutritionNumber(draft.values[key] ?? '', key === 'kcal' ? 1000 : 100)
    return [key, grams === null || grams <= 0 || base === null ? null : Math.round(base * grams / 100 * 10000) / 10000]
  })) as Record<Nutrient, number | null>
}
