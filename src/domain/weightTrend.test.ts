import { describe, expect, it } from 'vitest'
import { weightTrend } from './weightTrend'

const entries = [
  { date: '2026-06-01', weightKg: 95 },
  { date: '2026-09-01', weightKg: 90 },
  { date: '2026-10-01', weightKg: null },
  { date: '2026-10-15', weightKg: 88.5 },
  { date: '2026-11-08', weightKg: 87 },
]

describe('weightTrend', () => {
  it('nimmt nur die letzten 90 Tage und rechnet die Veränderung', () => {
    const trend = weightTrend(entries, '2026-11-08', null)!
    expect(trend.points.map((point) => point.date)).toEqual(['2026-09-01', '2026-10-15', '2026-11-08'])
    expect(trend.latestKg).toBe(87)
    expect(trend.changeKg).toBe(-3)
  })

  it('verteilt die Punkte nach Datum und Gewicht', () => {
    const trend = weightTrend(entries, '2026-11-08', null)!
    expect(trend.points[0].x).toBe(0)
    expect(trend.points[2].x).toBe(1)
    // Schwerster Wert oben, leichtester unten, beide mit Rand.
    expect(trend.points[0].y).toBeGreaterThan(0)
    expect(trend.points[2].y).toBeLessThan(1)
    expect(trend.points[0].y).toBeLessThan(trend.points[2].y)
  })

  it('zeigt das Zielgewicht immer im Bereich', () => {
    const trend = weightTrend(entries, '2026-11-08', 80)!
    expect(trend.targetY).toBeGreaterThan(trend.points[2].y)
    expect(trend.targetY).toBeLessThan(1)
  })

  it('nimmt die letzte ältere Messung, wenn im Zeitraum keine ist', () => {
    const trend = weightTrend(entries.slice(0, 1), '2026-11-08', null)!
    expect(trend.points).toHaveLength(1)
    expect(trend.points[0].x).toBe(0.5)
    expect(trend.changeKg).toBeNull()
  })

  it('ignoriert Messungen in der Zukunft und liefert ohne Gewicht null', () => {
    expect(weightTrend([{ date: '2026-12-01', weightKg: 80 }], '2026-11-08', null)).toBeNull()
    expect(weightTrend([], '2026-11-08', 80)).toBeNull()
  })
})
