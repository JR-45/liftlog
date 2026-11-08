import type { User } from '@supabase/supabase-js'
import { FOOD_CONSENT_VERSION, parseFoodScan, type FoodScan } from '../../domain/foodScan'
import { EMPTY_TARGETS, NUTRIENTS, validateMealItems, validateTargets, type Meal, type Nutrition, type NutritionTargets } from '../../domain/nutrition'
import type { Json } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { loadProfile } from '../profile/api'

export type NutritionSettings = { targets: NutritionTargets; consent: boolean }

export async function loadNutrition(date: string): Promise<{ settings: NutritionSettings; meals: Meal[] }> {
  const [settings, meals] = await Promise.all([
    supabase.from('nutrition_settings').select('*').maybeSingle(),
    supabase.from('meals').select('id, consumed_on, title, meal_items(name, grams, kcal, protein, carbs, fat, fiber, estimated, position)').eq('consumed_on', date).order('created_at'),
  ])
  if (settings.error) throw settings.error
  if (meals.error) throw meals.error
  const targets = { ...EMPTY_TARGETS }
  for (const key of NUTRIENTS) targets[key] = settings.data?.[key] ?? null
  const rows = meals.data as unknown as {
    id: string; consumed_on: string; title: string
    meal_items: (Nutrition & { name: string; grams: number; estimated: boolean; position: number })[]
  }[]
  return {
    settings: { targets, consent: settings.data?.photo_consent_version === FOOD_CONSENT_VERSION },
    meals: rows.map((row) => ({
      id: row.id, consumed_on: row.consumed_on, title: row.title,
      items: row.meal_items.sort((a, b) => a.position - b.position).map((item) => ({
        name: item.name, grams: item.grams, estimated: item.estimated,
        per100g: { kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat, fiber: item.fiber },
      })),
    })),
  }
}

export async function saveNutritionTargets(targets: NutritionTargets): Promise<void> {
  if (!validateTargets(targets)) throw new Error('Bitte alle fünf Tagesziele prüfen.')
  const { error } = await supabase.from('nutrition_settings').upsert(targets, { onConflict: 'user_id' })
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

