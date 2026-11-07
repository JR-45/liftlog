export type GpsPoint = { latitude: number; longitude: number; accuracy: number; timestamp: number }

export function validGpsPoint(point: GpsPoint): boolean {
  return Object.values(point).every(Number.isFinite) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180
    && point.accuracy >= 0 && point.accuracy <= 50
}

/** Haversine-Distanz; ungenaue Fixes, Stillstandsrauschen und Sprünge werden verworfen. */
export function acceptedDistance(previous: GpsPoint, next: GpsPoint): number | null {
  if (!validGpsPoint(previous) || !validGpsPoint(next) || next.timestamp <= previous.timestamp) return null
  const radians = Math.PI / 180
  const latitude = (next.latitude - previous.latitude) * radians
  const longitude = (next.longitude - previous.longitude) * radians
  const a = Math.sin(latitude / 2) ** 2 + Math.cos(previous.latitude * radians) * Math.cos(next.latitude * radians) * Math.sin(longitude / 2) ** 2
  const distance = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)))
  const seconds = (next.timestamp - previous.timestamp) / 1000
  if (distance < Math.max(5, (previous.accuracy + next.accuracy) / 2) || distance / seconds > 20) return null
  return distance
}
