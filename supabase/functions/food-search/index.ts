import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { createFoodSearchHandler } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')!
const key = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!
const defaults = 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5176,http://127.0.0.1:5176'

Deno.serve(createFoodSearchHandler({
  origins: (Deno.env.get('FOOD_SEARCH_ALLOWED_ORIGINS') ?? Deno.env.get('FOOD_SCAN_ALLOWED_ORIGINS') ?? defaults).split(',').map(origin => origin.trim()).filter(Boolean),
  async authenticate(token) {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await client.auth.getUser(token)
    return error || !data.user || data.user.is_anonymous ? null : data.user.id
  },
}))
