import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { createFoodScanHandler } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')!
const key = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!
const admin = createClient(url, Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(createFoodScanHandler({
  apiKey: Deno.env.get('GEMINI_API_KEY') ?? '',
  model: Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash',
  origins: (Deno.env.get('FOOD_SCAN_ALLOWED_ORIGINS') ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim()).filter(Boolean),
  async authenticate(token) {
    const client = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user || data.user.is_anonymous) return null
    const consent = await client.from('nutrition_settings').select('photo_consent_version').maybeSingle()
    if (consent.error) throw consent.error
    return { id: data.user.id, consentVersion: consent.data?.photo_consent_version ?? null }
  },
  async reserve(userId) {
    const { data, error } = await admin.rpc('reserve_food_scan', { p_user_id: userId })
    if (error) throw error
    return data === true
  },
}))
