import type { ActivityLevel } from '../../domain/body'
import type { Experience, Goal, Location, SessionMinutes } from '../../domain/onboarding'
import { supabase } from '../../lib/supabase'

/** Ob jemand ins Onboarding gehört: ohne Plan und ohne abgeschlossenes Onboarding. */
export async function needsOnboarding(): Promise<boolean> {
  const [profile, days] = await Promise.all([
    supabase.from('profiles').select('onboarding_completed_at').maybeSingle(),
    supabase.from('plan_days').select('id', { count: 'exact', head: true }),
  ])
  if (profile.error) throw profile.error
  if (days.error) throw days.error
  return !profile.data?.onboarding_completed_at && (days.count ?? 0) === 0
}

export type OnboardingProfile = {
  displayName?: string
  goal?: Goal
  experience?: Experience
  location?: Location
  minutes?: SessionMinutes
  weeklyTarget?: number
  heightCm?: number | null
  sex?: 'male' | 'female' | null
  birthYear?: number | null
  targetWeightKg?: number | null
  activityLevel?: ActivityLevel | null
}

/** Speichert die bisherigen Antworten ins Profil. Fehlende Felder bleiben unverändert. */
export async function saveOnboardingProfile(values: OnboardingProfile): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (values.displayName !== undefined) row.display_name = values.displayName
  if (values.goal !== undefined) row.goal = values.goal
  if (values.experience !== undefined) row.experience_level = values.experience
  if (values.location !== undefined) row.training_location = values.location
  if (values.minutes !== undefined) row.session_minutes = values.minutes
  if (values.weeklyTarget !== undefined) row.weekly_target = values.weeklyTarget
  if (values.heightCm !== undefined) row.height_cm = values.heightCm
  if (values.sex !== undefined) row.sex = values.sex
  if (values.birthYear !== undefined) row.birth_year = values.birthYear
  if (values.targetWeightKg !== undefined) row.target_weight_kg = values.targetWeightKg
  if (values.activityLevel !== undefined) row.activity_level = values.activityLevel
  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}

export async function completeOnboarding(): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('profiles')
    .upsert({ onboarding_completed_at: now, updated_at: now }, { onConflict: 'user_id' })
  if (error) throw error
}
