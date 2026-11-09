import type { User } from '@supabase/supabase-js'
import type { AppleHealthDay } from '../../domain/appleHealth'
import type { ActivityLevel, Sex } from '../../domain/body'
import { supabase } from '../../lib/supabase'

export type TrainingGoal = 'hypertrophy' | 'strength' | 'cut' | 'fitness'

/** Werte einer Messung. Jedes Feld ist freiwillig. Umfänge in cm. */
export type MeasurementValues = {
  weightKg: number | null
  bodyFatPct: number | null
  neckCm: number | null
  chestCm: number | null
  waistCm: number | null
  hipsCm: number | null
  armCm: number | null
  thighCm: number | null
  calfCm: number | null
}

export type BodyMeasurement = MeasurementValues & { date: string }

export const MEASUREMENT_COLUMNS = {
  weightKg: 'weight_kg',
  bodyFatPct: 'body_fat_pct',
  neckCm: 'neck_cm',
  chestCm: 'chest_cm',
  waistCm: 'waist_cm',
  hipsCm: 'hips_cm',
  armCm: 'arm_cm',
  thighCm: 'thigh_cm',
  calfCm: 'calf_cm',
} as const satisfies Record<keyof MeasurementValues, string>

export type UserProfile = {
  displayName: string
  bio: string
  goal: TrainingGoal
  weeklyTarget: number
  heightCm: number | null
  targetWeightKg: number | null
  /** Wunschtermin fürs Zielgewicht (YYYY-MM-DD), null = ohne Termin. */
  targetDate: string | null
  sex: Sex | null
  birthYear: number | null
  activityLevel: ActivityLevel | null
  /** Alle Messungen, älteste zuerst. */
  measurements: BodyMeasurement[]
}

const AVATAR_SIZE = 320

function defaultDisplayName(email?: string): string {
  if (!email) return 'Athlet'
  const prefix = email.split('@')[0] ?? 'Athlet'
  return prefix.charAt(0).toUpperCase() + prefix.slice(1)
}

/** Lädt Profil und alle Messungen. Ohne gespeichertes Profil gelten Standardwerte. */
export async function loadProfile(user: User, defaultWeeklyTarget: number): Promise<UserProfile> {
  const [profile, weights] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, bio, goal, weekly_target, height_cm, target_weight_kg, target_date, sex, birth_year, activity_level')
      .maybeSingle(),
    supabase
      .from('body_measurements')
      .select('measured_on, weight_kg, body_fat_pct, neck_cm, chest_cm, waist_cm, hips_cm, arm_cm, thigh_cm, calf_cm')
      .order('measured_on'),
  ])
  if (profile.error) throw profile.error
  if (weights.error) throw weights.error

  const row = profile.data
  return {
    displayName: row?.display_name ?? defaultDisplayName(user.email),
    bio: row?.bio ?? '',
    // Die Datenbank erlaubt nur diese vier Werte, der generierte Typ kennt sie aber nicht.
    goal: (row?.goal as TrainingGoal | undefined) ?? 'hypertrophy',
    weeklyTarget: row?.weekly_target ?? Math.min(7, Math.max(1, defaultWeeklyTarget)),
    heightCm: row?.height_cm ?? null,
    targetWeightKg: row?.target_weight_kg ?? null,
    targetDate: row?.target_date ?? null,
    // Die Datenbank erlaubt nur die bekannten Werte, der generierte Typ kennt sie aber nicht.
    sex: (row?.sex as Sex | null | undefined) ?? null,
    birthYear: row?.birth_year ?? null,
    activityLevel: (row?.activity_level as ActivityLevel | null | undefined) ?? null,
    measurements: weights.data.map((entry) => ({
      date: entry.measured_on,
      weightKg: entry.weight_kg,
      bodyFatPct: entry.body_fat_pct,
      neckCm: entry.neck_cm,
      chestCm: entry.chest_cm,
      waistCm: entry.waist_cm,
      hipsCm: entry.hips_cm,
      armCm: entry.arm_cm,
      thighCm: entry.thigh_cm,
      calfCm: entry.calf_cm,
    })),
  }
}

/** Speichert die Profilfelder. Die Messungen haben eigene Funktionen. */
export async function saveProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(
    {
      display_name: profile.displayName,
      bio: profile.bio,
      goal: profile.goal,
      weekly_target: profile.weeklyTarget,
      height_cm: profile.heightCm,
      target_weight_kg: profile.targetWeightKg,
      target_date: profile.targetDate,
      sex: profile.sex,
      birth_year: profile.birthYear,
      activity_level: profile.activityLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

/** Speichert die Messung eines Tages. Eine zweite Messung am selben Tag ersetzt die erste. */
export async function saveMeasurement(date: string, values: MeasurementValues): Promise<void> {
  const row = Object.fromEntries(
    Object.entries(MEASUREMENT_COLUMNS).map(([key, column]) => [column, values[key as keyof MeasurementValues]]),
  )
  const { error } = await supabase
    .from('body_measurements')
    .upsert({ measured_on: date, ...row }, { onConflict: 'user_id,measured_on' })
  if (error) throw error
}

/** Name und Bild für Kopfzeile und Begrüßung. Ohne gespeicherten Namen ist displayName null. */
export async function loadProfileHeader(): Promise<{ displayName: string | null; avatar: string | null }> {
  const { data, error } = await supabase.from('profiles').select('display_name, avatar').maybeSingle()
  if (error) throw error
  return { displayName: data?.display_name ?? null, avatar: data?.avatar ?? null }
}

/** Lädt das Profilbild als Data-URL, null ohne Bild. */
export async function loadAvatar(): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('avatar').maybeSingle()
  if (error) throw error
  return data?.avatar ?? null
}

/** Speichert oder löscht das Profilbild. Legt das Profil an, falls es noch keins gibt. */
export async function saveAvatar(dataUrl: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ avatar: dataUrl, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

/** Schneidet ein hochgeladenes Bild mittig quadratisch zu und skaliert es auf 320×320 px. */
export function cropSquareAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'))
      img.onload = () => {
        const size = Math.min(img.width, img.height)
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2
        const canvas = document.createElement('canvas')
        canvas.width = AVATAR_SIZE
        canvas.height = AVATAR_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Bildverarbeitung nicht verfügbar.'))
          return
        }
        ctx.drawImage(img, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

/** Lädt, ob ein Import-Schlüssel existiert (= verbunden), und die heutigen Apple-Health-Werte. */
export async function loadAppleHealthStatus(date: string): Promise<{ connected: boolean; day: AppleHealthDay | null }> {
  const [token, entry] = await Promise.all([
    supabase.from('apple_health_tokens').select('created_at').maybeSingle(),
    supabase
      .from('apple_health_daily')
      .select('synced_on, active_kcal, workout_minutes, steps, updated_at')
      .eq('synced_on', date)
      .maybeSingle(),
  ])
  if (token.error) throw token.error
  if (entry.error) throw entry.error
  const day = entry.data
    ? {
        date: entry.data.synced_on,
        activeKcal: entry.data.active_kcal,
        workoutMinutes: entry.data.workout_minutes,
        steps: entry.data.steps,
        updatedAt: entry.data.updated_at,
      }
    : null
  return {
    connected: Boolean(token.data),
    day,
  }
}

/** Speichert die Apple-Watch-Tageswerte und markiert die Verbindung als aktiv. */
export async function saveAppleHealthDay(day: Omit<AppleHealthDay, 'updatedAt'>): Promise<AppleHealthDay> {
  const updatedAt = new Date().toISOString()
  const [health, profile] = await Promise.all([
    supabase
      .from('apple_health_daily')
      .upsert(
        {
          synced_on: day.date,
          active_kcal: day.activeKcal,
          workout_minutes: day.workoutMinutes,
          steps: day.steps,
          updated_at: updatedAt,
        },
        { onConflict: 'user_id,synced_on' },
      ),
    supabase.from('profiles').upsert({ apple_watch_connected: true, updated_at: updatedAt }, { onConflict: 'user_id' }),
  ])
  if (health.error) throw health.error
  if (profile.error) throw profile.error
  return { ...day, updatedAt }
}

/**
 * Erzeugt einen neuen Import-Schlüssel für den Kurzbefehl (ein alter wird ungültig).
 * Der Schlüssel wird nur dieses eine Mal zurückgegeben, gespeichert ist nur sein Hash.
 */
export async function createAppleHealthToken(): Promise<string> {
  const { data, error } = await supabase.rpc('create_apple_health_token')
  if (error) throw error
  return data
}

/** Trennt die Apple Watch: Schlüssel löschen, damit der Kurzbefehl nichts mehr schreiben kann. */
export async function disconnectAppleWatch(): Promise<void> {
  const [token, profile] = await Promise.all([
    supabase.from('apple_health_tokens').delete().not('user_id', 'is', null),
    supabase
      .from('profiles')
      .upsert({ apple_watch_connected: false, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
  ])
  if (token.error) throw token.error
  if (profile.error) throw profile.error
}
