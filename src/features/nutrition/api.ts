import type { User } from '@supabase/supabase-js'
import type { AppleHealthDay } from '../../domain/appleHealth'
import { parseOpenFoodFacts, type BarcodeProduct } from '../../domain/barcode'
import { FOOD_CONSENT_VERSION, parseFoodScan, type FoodScan } from '../../domain/foodScan'
import { EMPTY_TARGETS, NUTRIENTS, validateMealItems, validateTargets, type Meal, type Nutrition, type NutritionTargets } from '../../domain/nutrition'
import type { Json } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { loadProfile } from '../profile/api'

/** fromProfile: Ziele werden live aus dem Profil berechnet, gespeicherte eigene Ziele gelten dann nicht. */
export type NutritionSettings = { targets: NutritionTargets; consent: boolean; fromProfile: boolean }

export async function loadNutrition(date: string): Promise<{ settings: NutritionSettings; meals: Meal[]; appleHealth: AppleHealthDay | null }> {
  const [settings, meals, health] = await Promise.all([
    supabase.from('nutrition_settings').select('*').maybeSingle(),
    supabase.from('meals').select('id, consumed_on, title, meal_items(name, grams, kcal, protein, carbs, fat, fiber, sugar, estimated, position)').eq('consumed_on', date).order('created_at'),
    supabase.from('apple_health_daily').select('synced_on, active_kcal, workout_minutes, steps, updated_at').eq('synced_on', date).maybeSingle(),
  ])
  if (settings.error) throw settings.error
  if (meals.error) throw meals.error
  if (health.error) throw health.error
  const targets = { ...EMPTY_TARGETS }
  for (const key of NUTRIENTS) targets[key] = settings.data?.[key] ?? null
  const rows = meals.data as unknown as {
    id: string; consumed_on: string; title: string
    meal_items: (Nutrition & { name: string; grams: number; estimated: boolean; position: number })[]
  }[]
  const appleHealth = health.data
    ? {
        date: health.data.synced_on,
        activeKcal: health.data.active_kcal,
        workoutMinutes: health.data.workout_minutes,
        steps: health.data.steps,
        updatedAt: health.data.updated_at,
      }
    : null
  return {
    settings: { targets, consent: settings.data?.photo_consent_version === FOOD_CONSENT_VERSION, fromProfile: settings.data?.targets_from_profile ?? true },
    meals: rows.map((row) => ({
      id: row.id, consumed_on: row.consumed_on, title: row.title,
      items: row.meal_items.sort((a, b) => a.position - b.position).map((item) => ({
        name: item.name, grams: item.grams, estimated: item.estimated,
        per100g: { kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat, fiber: item.fiber, sugar: item.sugar },
      })),
    })),
    appleHealth,
  }
}

export async function saveNutritionTargets(targets: NutritionTargets): Promise<void> {
  if (!validateTargets(targets)) throw new Error('Bitte alle sechs Tagesziele prüfen.')
  const { error } = await supabase.from('nutrition_settings').upsert({ ...targets, targets_from_profile: false }, { onConflict: 'user_id' })
  if (error) throw error
}

/** Schaltet zurück auf Ziele aus dem Profil. Die eigenen Werte bleiben gespeichert. */
export async function enableProfileTargets(): Promise<void> {
  const { error } = await supabase.from('nutrition_settings').upsert({ targets_from_profile: true }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function setPhotoConsent(consent: boolean): Promise<void> {
  const { error } = await supabase.from('nutrition_settings').upsert({
    photo_consent_version: consent ? FOOD_CONSENT_VERSION : null,
    photo_consent_at: consent ? new Date().toISOString() : null,
  }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function saveMeal(meal: Meal): Promise<void> {
  if (!validateMealItems(meal.items) || !meal.title.trim() || meal.title.length > 80) throw new Error('Bitte die Mahlzeit prüfen.')
  const { error } = await supabase.rpc('save_meal', {
    p_id: meal.id, p_date: meal.consumed_on, p_title: meal.title.trim(), p_items: meal.items as unknown as Json,
  })
  if (error) throw error
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', id)
  if (error) throw error
}

export async function analyzeFood(image: string, signal: AbortSignal): Promise<FoodScan> {
  const { data, error } = await supabase.functions.invoke('food-scan', {
    body: { mime: 'image/jpeg', image }, signal, timeout: 35_000,
  })
  if (error) {
    let message = 'Die Fotoanalyse ist nicht erreichbar. Bitte später erneut versuchen.'
    if ('context' in error && error.context instanceof Response) {
      try {
        const body: unknown = await error.context.json()
        if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' && body.error.length <= 400) message = body.error
      } catch { /* Ohne lesbare Fehlerantwort gilt der allgemeine Hinweis. */ }
    }
    throw new Error(message)
  }
  return parseFoodScan(data)
}

export async function loadNutritionProfile(user: User) {
  return loadProfile(user, 3)
}


/** weekdays: an welchen Tagen (0 = Sonntag), null heißt täglich. */
export type Supplement = { id: string; name: string; dose: string | null; weekdays: number[] | null }

/** Liste der Supplemente und welche davon am Tag schon abgehakt sind. */
export async function loadSupplements(date: string): Promise<{ list: Supplement[]; taken: Set<string> }> {
  const [list, intakes] = await Promise.all([
    supabase.from('supplements').select('id, name, dose, weekdays').order('created_at'),
    supabase.from('supplement_intakes').select('supplement_id').eq('taken_on', date),
  ])
  if (list.error) throw list.error
  if (intakes.error) throw intakes.error
  return { list: list.data, taken: new Set(intakes.data.map((row) => row.supplement_id)) }
}

/** Menge und Tage ändern. */
export async function updateSupplement(id: string, changes: { dose: string | null; weekdays: number[] | null }): Promise<void> {
  const { error } = await supabase.from('supplements').update(changes).eq('id', id)
  if (error) throw error
}

export async function addSupplement(name: string, dose: string | null, weekdays: number[] | null): Promise<Supplement> {
  const { data, error } = await supabase.from('supplements').insert({ name, dose, weekdays }).select('id, name, dose, weekdays').single()
  if (error) throw error
  return data
}

export async function removeSupplement(id: string): Promise<void> {
  const { error } = await supabase.from('supplements').delete().eq('id', id)
  if (error) throw error
}

/** Haken setzen legt eine Zeile an, Haken entfernen löscht sie. Doppelt setzen ist harmlos. */
export async function setSupplementTaken(id: string, date: string, taken: boolean): Promise<void> {
  const { error } = taken
    ? await supabase.from('supplement_intakes').upsert({ supplement_id: id, taken_on: date }, { onConflict: 'supplement_id,taken_on', ignoreDuplicates: true })
    : await supabase.from('supplement_intakes').delete().eq('supplement_id', id).eq('taken_on', date)
  if (error) throw error
}

/**
 * Produkt zu einem Barcode aus Open Food Facts (offene Datenbank, ohne Schlüssel). Übertragen wird nur die Nummer.
 * null, wenn das Produkt dort nicht bekannt ist.
 */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<BarcodeProduct | null> {
  const fields = 'product_name,product_name_de,brands,serving_quantity,nutriments'
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`, {
    signal: signal ?? AbortSignal.timeout(10_000),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Die Produktdatenbank ist gerade nicht erreichbar. Bitte später erneut versuchen.')
  return parseOpenFoodFacts(await response.json())
}
