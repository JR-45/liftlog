import { describe, expect, it, vi } from 'vitest'
import { createFoodSearch } from '../features/nutrition/foodSearchApi'

const response = () => ({ hits: [{ code: '12345678', product_name_de: 'Apfel', nutriments: { 'energy-kcal_100g': 52, proteins_100g: 0.3, carbohydrates_100g: 14, fat_100g: 0.2, fiber_100g: 2.4, sugars_100g: 10 } }] })

describe('Suchdienst mit Cache', () => {
  it('verwendet normalisierte Suchbegriffe, Cache und Ablaufzeit ohne Mengenanfragen', async () => {
    let now = 0
    const fetcher = vi.fn().mockImplementation(async () => response())
    const search = createFoodSearch(fetcher, () => now)
    expect(await search('A')).toEqual([])
    expect(fetcher).not.toHaveBeenCalled()
    const found = await search('Äpfel')
    expect(found[0].name).toBe('Apfel')
    await search('apfel')
    expect(fetcher).toHaveBeenCalledTimes(1)
    now = 11 * 60_000
    await search('apfel')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('speichert Fehler nicht im Cache und erlaubt erneute Suche', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('Suche nicht verfügbar')).mockImplementation(async () => response())
    const search = createFoodSearch(fetcher)
    await expect(search('apfel')).rejects.toThrow('Suche nicht verfügbar')
    expect(await search('apfel')).toHaveLength(1)
  })
  it('verwirft eine abgebrochene Antwort auch wenn der Transport trotzdem antwortet', async () => {
    const controller = new AbortController()
    const search = createFoodSearch(vi.fn().mockImplementation(async () => { controller.abort(); return response() }))
    await expect(search('apfel', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
