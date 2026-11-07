import { describe, expect, it } from 'vitest'
import { formatPace, formatSpeed, exerciseDefaults, durationUnitForTarget, supportsGps } from './cardio'
import { parseSetDraft, formatPerformance } from './sets'
import { EXERCISE_CATALOG } from './exerciseCatalog'
import { buildCsv } from './export'

describe('Cardio und Calisthenics', () => {
  it('aktiviert GPS für Outdoor-Cardio, nicht für stationäre Geräte', () => {
    for (const name of ['Joggen', 'Laufen (Outdoor)', 'Gehen / Walking', 'Radfahren (Outdoor)', 'Fahrrad fahren', 'Wandern', 'Nordic Walking', 'Inlineskaten']) {
      expect(supportsGps(name)).toBe(true)
    }
    for (const name of ['Laufband', 'Fahrradergometer', 'Crosstrainer', 'Plank']) expect(supportsGps(name)).toBe(false)
  })
  it('zeigt beim Laufband Geschwindigkeit statt Pace', () => {
    expect(formatSpeed(1500, 5)).toBe('12 km/h')
    expect(formatSpeed(0, 5)).toBeNull()
  })
  it('berechnet Pace mit korrektem Sekundenübertrag', () => {
    expect(formatPace(1500, 5)).toBe('5:00 min/km')
    expect(formatPace(359.8, 1)).toBe('6:00 min/km')
    expect(formatPace(0, 5)).toBeNull()
    expect(formatPace(1200, 0)).toBeNull()
  })
  it('speichert Minuten und deutsches Kilometer-Komma', () => {
    expect(parseSetDraft({ weight: '', reps: '', duration: '25', distance: '5,5' }, 'duration', 'minutes')).toMatchObject({
      kind: 'ok', values: { duration_seconds: 1500, distance_km: 5.5, weight_kg: null },
    })
  })
  it('rechnet Meter für die Speicherung in Kilometer um', () => {
    expect(parseSetDraft({ weight: '', reps: '', duration: '25', distance: '5000', distanceUnit: 'm' }, 'duration', 'minutes')).toMatchObject({
      kind: 'ok', values: { duration_seconds: 1500, distance_km: 5 },
    })
  })
  it('verhindert ungültige Kilometer und Strecke ohne Dauer', () => {
    for (const distance of ['0', '-2', 'NaN', 'Infinity', '2001']) {
      expect(parseSetDraft({ weight: '', reps: '', duration: '20', distance }, 'duration', 'minutes').kind).toBe('invalid')
    }
    expect(parseSetDraft({ weight: '', reps: '', duration: '', distance: '5' }, 'duration', 'minutes').kind).toBe('invalid')
  })
  it('zeigt Strecke und Pace auch bei gespeicherten Leistungen', () => {
    expect(formatPerformance([{ weight_kg: null, reps: null, duration_seconds: 1500, is_assisted: false, distance_km: 5 }], 'minutes')).toBe('25 Min. · 5 km · 5:00 min/km')
  })
  it('sichert Kilometer im CSV-Export', () => {
    const csv = buildCsv([{ performed_on: '2026-11-07', plan_day: 'Cardio', exercise: 'Joggen', set_number: 1,
      weight_kg: null, reps: null, duration_seconds: 1500, is_assisted: false, distance_km: 5.5 }])
    expect(csv).toContain('Strecke (km)')
    expect(csv).toContain(';1500;5,5')
  })
  it('bietet Joggen und Calisthenics ohne Gewicht an', () => {
    expect(EXERCISE_CATALOG.find(item => item.name === 'Joggen')?.tracking_type).toBe('duration')
    expect(EXERCISE_CATALOG.find(item => item.name === 'Klimmzüge (Körpergewicht)')?.tracking_type).toBe('reps')
    expect(exerciseDefaults('Joggen', 'duration')).toMatchObject({ sets_min: 1, sets_max: 1, duration_min: null })
    expect(exerciseDefaults('Plank', 'duration')).toMatchObject({ sets_min: 3, duration_min: 30 })
    expect(durationUnitForTarget(1200)).toBe('minutes')
    expect(durationUnitForTarget(30)).toBe('seconds')
  })
})
