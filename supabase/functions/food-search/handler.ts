type Dependencies = {
  origins: string[]; authenticate: (token: string) => Promise<string | null>; fetcher?: typeof fetch; now?: () => number
}
const FIELDS = 'code,product_name,product_name_de,brands,nutriments,nutrition_data_per,product_quantity_unit'

async function readJson(body: ReadableStream<Uint8Array> | null, limit: number): Promise<unknown> {
  if (!body) throw new Error('Leere Antwort')
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) { await reader.cancel(); throw new Error('Zu groß') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder().decode(bytes))
}

export function createFoodSearchHandler(deps: Dependencies) {
  const fetcher = deps.fetcher ?? fetch
  const now = deps.now ?? Date.now
  const cache = new Map<string, { until: number; hits: unknown[] }>()
  const usage = new Map<string, { until: number; count: number }>()
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin')
    const headers: Record<string, string> = { 'Cache-Control': 'no-store', Vary: 'Origin' }
    if (origin && deps.origins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info'
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    }
    const reply = (status: number, error: string) => Response.json({ error }, { status, headers })
    if (origin && !deps.origins.includes(origin)) return reply(403, 'Dieser Ursprung ist nicht freigegeben.')
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return reply(405, 'Nur POST ist erlaubt.')
    const token = request.headers.get('Authorization')?.match(/^Bearer (\S{1,4096})$/i)?.[1]
    if (!token) return reply(401, 'Bitte erneut anmelden.')
    try {
      const userId = await deps.authenticate(token)
      if (!userId) return reply(401, 'Bitte erneut anmelden.')
      let payload: unknown
      try { payload = await readJson(request.body, 1024) } catch { return reply(400, 'Suchbegriff prüfen.') }
      const query = payload && typeof payload === 'object' && 'query' in payload ? payload.query : null
      if (typeof query !== 'string' || query.trim().length < 2 || query.length > 80 || !/^[\p{L}\p{N} ]+$/u.test(query)) return reply(400, 'Suchbegriff prüfen.')
      const key = query.toLocaleLowerCase('de-DE').trim().replace(/\s+/g, ' ')
      // Zusätzliche Bremse je Worker; Authentifizierung bleibt auch bei Cache-Treffern Pflicht.
      const bucket = usage.get(userId)
      if (bucket && bucket.until > now() && bucket.count >= 60) return reply(429, 'Zu viele Suchanfragen. Kurz warten.')
      if (usage.size >= 1000 && !bucket) usage.delete(usage.keys().next().value!)
      usage.set(userId, bucket && bucket.until > now() ? { ...bucket, count: bucket.count + 1 } : { until: now() + 60_000, count: 1 })
      const cached = cache.get(key)
      if (cached && cached.until > now()) return Response.json({ hits: cached.hits }, { headers })
      const url = new URL('https://search.openfoodfacts.org/search')
      url.search = new URLSearchParams({ q: key.includes(' ') ? key : `${key}*`, langs: 'de,en', page_size: '60', fields: FIELDS, boost_phrase: 'true' }).toString()
      const response = await fetcher(url.toString(), {
        signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'LiftLog/1.0 (https://github.com/JR-45/liftlog)' },
      })
      if (!response.ok) return reply(502, 'Lebensmittelsuche momentan nicht verfügbar.')
      const data = await readJson(response.body, 512_000)
      if (!data || typeof data !== 'object' || !('hits' in data) || !Array.isArray(data.hits)) return reply(502, 'Ungültige Suchantwort.')
      const hits = data.hits.slice(0, 60)
      if (cache.size >= 100) cache.delete(cache.keys().next().value!)
      cache.set(key, { until: now() + 10 * 60_000, hits })
      return Response.json({ hits }, { headers })
    } catch { return reply(503, 'Lebensmittelsuche momentan nicht verfügbar.') }
  }
}
