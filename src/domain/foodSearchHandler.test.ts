import { describe, expect, it, vi } from 'vitest'
import { createFoodSearchHandler } from '../../supabase/functions/food-search/handler.ts'

const request = (query: unknown = 'Banane', token = 'valid') => new Request('https://local/food-search', {
  method: 'POST', headers: { Origin: 'http://localhost:5176', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
})
function setup() {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ hits: [{ code: '12345678' }] }))
  return { fetcher, handler: createFoodSearchHandler({ origins: ['http://localhost:5176'], authenticate: async token => token === 'valid' ? 'user-a' : null, fetcher }) }
}
describe('Authentifizierte Lebensmittelsuche', () => {
  it('beantwortet Browser-Preflight und blockiert fremde Ursprünge', async () => {
    const { handler } = setup()
    const response = await handler(new Request('https://local', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5176' } }))
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5176')
    expect((await handler(new Request('https://local', { headers: { Origin: 'https://fremd.invalid' } }))).status).toBe(403)
  })
  it('prüft Anmeldung und Eingabe vor dem externen Aufruf', async () => {
    const { handler, fetcher } = setup()
    expect((await handler(request('Banane', 'invalid'))).status).toBe(401)
    expect((await handler(request('x'.repeat(81)))).status).toBe(400)
    expect((await handler(request({ url: 'https://fremd.invalid' }))).status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('begrenzt Upstream-Felder, gibt CORS frei und cached öffentliche Suchdaten', async () => {
    const { handler, fetcher } = setup()
    const response = await handler(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5176')
    await handler(request())
    expect(fetcher).toHaveBeenCalledTimes(1)
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.origin).toBe('https://search.openfoodfacts.org')
    expect(url.searchParams.get('fields')).toContain('nutriments')
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization')
  })
  it('behandelt Ausfälle als Fehler und cached keine Fehlerantworten', async () => {
    const { handler, fetcher } = setup()
    fetcher.mockResolvedValueOnce(new Response('', { status: 503 }))
    expect((await handler(request())).status).toBe(502)
    expect((await handler(request())).status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('weist zu große Anfragen ab und bremst wiederholte Anfragen trotz Cache', async () => {
    const { handler, fetcher } = setup()
    expect((await handler(request('a'.repeat(2000)))).status).toBe(400)
    for (let index = 0; index < 60; index++) expect((await handler(request())).status).toBe(200)
    expect((await handler(request())).status).toBe(429)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
