import { describe, expect, it } from 'vitest'
import { acceptedDistance, type GpsPoint } from './gps'

const point = (changes: Partial<GpsPoint> = {}): GpsPoint => ({ latitude: 52, longitude: 13, accuracy: 5, timestamp: 1000, ...changes })
describe('GPS-Strecke', () => {
  it('misst eine plausible Bewegung in Metern', () => {
    expect(acceptedDistance(point(), point({ latitude: 52.001, timestamp: 61000 }))).toBeCloseTo(111.2, 0)
  })
  it('filtert ungenaue Positionen, Stillstand und GPS-Sprünge', () => {
    expect(acceptedDistance(point(), point({ latitude: 52.001, accuracy: 150, timestamp: 61000 }))).toBeNull()
    expect(acceptedDistance(point(), point({ latitude: 52.00001, timestamp: 61000 }))).toBeNull()
    expect(acceptedDistance(point(), point({ latitude: 53, timestamp: 2000 }))).toBeNull()
    expect(acceptedDistance(point(), point({ timestamp: 1000 }))).toBeNull()
    expect(acceptedDistance(point(), point({ latitude: NaN, timestamp: 61000 }))).toBeNull()
  })
})
