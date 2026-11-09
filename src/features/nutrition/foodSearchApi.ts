import { normalizeFoodQuery, parseFoodSearch, type FoodSuggestion } from '../../domain/foodSearch'

/** Begrenzter Sitzungscache; keine Suchbegriffe oder Ernährungsdaten dauerhaft auf dem Gerät speichern. */
export function createFoodSearch(request: (query: string, signal: AbortSignal) => Promise<unknown>, now: () => number = Date.now) {
  const cache = new Map<string, { until: number; foods: FoodSuggestion[] }>()
  return async (text: string, signal?: AbortSignal): Promise<FoodSuggestion[]> => {
    const query = normalizeFoodQuery(text)
    if (text.trim().length < 2) return []
    const existing = cache.get(query)
    if (existing && existing.until > now()) return existing.foods
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (signal?.aborted) controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, 8000)
    try {
      const foods = parseFoodSearch(await request(query, controller.signal), query)
      if (controller.signal.aborted) throw new DOMException('Suche abgebrochen', 'AbortError')
      if (cache.size >= 100) cache.delete(cache.keys().next().value!)
      cache.set(query, { until: now() + 10 * 60_000, foods })
      return foods
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
    }
  }
}
