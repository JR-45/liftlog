import { describe, expect, it, vi } from 'vitest'
import { createFoodScanHandler } from '../../supabase/functions/food-scan/handler'
import { FOOD_CONSENT_VERSION } from './foodScan'

const result = { foods: [{ name: 'Apfel', grams: 150, portion_uncertain: false, question: null, per100g: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10.4 } }], note: '' }
const request = (body: unknown = { mime: 'image/jpeg', image: '/9j/AA==' }, token = 'test') => new Request('https://local.test/food-scan', {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
function setup(options: Record<string, unknown> = {}) {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(result) }] } }] }))
  const reserve = vi.fn(async () => true)
  const authenticate = vi.fn(async () => ({ id: 'user-a', consentVersion: FOOD_CONSENT_VERSION }))
  const handler = createFoodScanHandler({ apiKey: 'test-only', model: 'gemini-test', origins: ['http://localhost:5173'], authenticate, reserve, fetcher, ...options })
  return { handler, fetcher, reserve }
}

describe('Geschützter Foodscanner', () => {
  it('überträgt nur das Bild und liefert validierte Lebensmittel', async () => {
    const { handler, fetcher } = setup()
    const response = await handler(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(result)
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).contents[0].parts[0].inlineData).toEqual({ mimeType: 'image/jpeg', data: '/9j/AA==' })
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('user-a')
  })
  it('blockt ohne Anmeldung und Einwilligung vor jedem Google-Aufruf', async () => {
    for (const authenticate of [async () => null, async () => ({ id: 'a', consentVersion: null })]) {
      const { handler, fetcher, reserve } = setup({ authenticate })
      expect([401, 403]).toContain((await handler(request())).status)
      expect(fetcher).not.toHaveBeenCalled()
      expect(reserve).not.toHaveBeenCalled()
    }
  })
  it('weist ungültige Bilder und fremde Ursprünge vor Kosten zurück', async () => {
    const { handler, fetcher, reserve } = setup()
    expect((await handler(request({ mime: 'image/jpeg', image: 'https://example.com/a.jpg' }))).status).toBe(400)
    const foreign = request()
    foreign.headers.set('Origin', 'https://foreign.test')
    expect((await handler(foreign)).status).toBe(403)
    expect(fetcher).not.toHaveBeenCalled()
    expect(reserve).not.toHaveBeenCalled()
  })
  it('beachtet Tageslimits und verrät keine Anbieterfehler', async () => {
    const limited = setup({ reserve: async () => false })
    expect((await limited.handler(request())).status).toBe(429)
    expect(limited.fetcher).not.toHaveBeenCalled()
    const failed = setup({ fetcher: async () => new Response('internal secret provider message', { status: 500 }) })
    const response = await failed.handler(request())
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('secret')
  })
  it('behandelt Zeitüberschreitungen, ungültige Ausgaben und fehlende Einrichtung', async () => {
    expect((await setup({ fetcher: async () => { throw new DOMException('Timeout', 'TimeoutError') } }).handler(request())).status).toBe(504)
    expect((await setup({ fetcher: async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] }) }).handler(request())).status).toBe(502)
    expect((await setup({ apiKey: '' }).handler(request())).status).toBe(503)
  })
  it('meldet ein überlastetes Modell verständlich', async () => {
    const overloaded = setup({ fetcher: async () => Response.json({ error: { code: 503, status: 'UNAVAILABLE' } }, { status: 503 }) })
    const response = await overloaded.handler(request())
    expect(response.status).toBe(503)
    expect(await response.text()).toContain('überlastet')
  })
})
