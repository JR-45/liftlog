import { useEffect, useRef, useState } from 'react'
import { acceptedDistance, validGpsPoint, type GpsPoint } from '../../domain/gps'
import { formatPace } from '../../domain/cardio'
import { formatElapsed } from '../../domain/motivation'

export function GpsTracker({ onMeasured, onRunningChange }: {
  onMeasured: (meters: number, seconds: number) => void
  onRunningChange: (running: boolean) => void
}) {
  const watch = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const previous = useRef<GpsPoint | null>(null)
  const measurement = useRef({ meters: 0, startedAt: 0 })
  const active = useRef(false)
  const session = useRef(0)
  const [running, setRunning] = useState(false)
  const [meters, setMeters] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [message, setMessage] = useState('')

  function clear() {
    active.current = false
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current)
    if (timer.current !== null) clearInterval(timer.current)
    watch.current = null
    timer.current = null
  }

  useEffect(() => () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current)
    if (timer.current !== null) clearInterval(timer.current)
    active.current = false
  }, [])

  function stop() {
    const elapsed = measurement.current.startedAt ? Math.max(1, Math.round((Date.now() - measurement.current.startedAt) / 1000)) : 0
    clear()
    setRunning(false)
    onRunningChange(false)
    if (measurement.current.meters >= 1 && elapsed > 0) {
      onMeasured(measurement.current.meters, elapsed)
      setMessage('Strecke und Zeit übernommen. Mit dem Haken speichern.')
    } else setMessage('Noch keine messbare Strecke. Du kannst erneut starten oder die Strecke eingeben.')
  }

  function start() {
    if (!navigator.geolocation || !window.isSecureContext) {
      setMessage('GPS benötigt einen unterstützten Browser und HTTPS oder localhost.')
      return
    }
    previous.current = null
    measurement.current = { meters: 0, startedAt: 0 }
    setMeters(0)
    setSeconds(0)
    setMessage('GPS-Position wird gesucht …')
    active.current = true
    const currentSession = ++session.current
    setRunning(true)
    onRunningChange(true)
    timer.current = setInterval(() => {
      if (measurement.current.startedAt) setSeconds(Math.floor((Date.now() - measurement.current.startedAt) / 1000))
    }, 1000)
    watch.current = navigator.geolocation.watchPosition(position => {
      if (!active.current || session.current !== currentSession) return
      const point: GpsPoint = { latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, timestamp: position.timestamp }
      if (!validGpsPoint(point)) { setMessage('GPS-Signal ungenau. Warte auf eine genauere Position.'); return }
      if (!previous.current) {
        previous.current = point
        measurement.current.startedAt = Date.now()
      } else {
        const distance = acceptedDistance(previous.current, point)
        if (distance !== null) {
          measurement.current.meters += distance
          previous.current = point
          setMeters(measurement.current.meters)
        }
      }
      setMessage('GPS-Messung läuft. App im Vordergrund geöffnet lassen.')
    }, error => {
      if (!active.current || session.current !== currentSession) return
      if (error.code === 1) {
        stop()
        setMessage('Standortzugriff nicht erlaubt. Erlaube ihn im Browser oder gib die Strecke ein.')
      } else setMessage('Noch kein GPS-Signal. Die Messung wartet auf eine Position.')
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
  }

  return <div className="mt-3 rounded-xl bg-control/40 p-3">
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm font-medium tabular-nums text-foreground">
        {running ? <>{Math.round(meters).toLocaleString('de-DE')} m · {formatElapsed(seconds * 1000)}</> : 'Strecke per GPS messen'}
        {running && meters > 0 && <p className="mt-1 text-xs text-accent-ink">{formatPace(seconds, meters / 1000)}</p>}
      </div>
      <button type="button" className="min-h-11 shrink-0 rounded-xl bg-neon px-3 text-sm font-semibold text-black"
        onClick={running ? stop : start}>{running ? 'Stoppen' : 'Starten'}</button>
    </div>
    <p className="mt-2 text-xs text-muted" role="status">{message || 'Für Bewegung im Freien. Es werden nur Strecke und Dauer gespeichert, keine Route.'}</p>
  </div>
}
