import { useCallback, useEffect, useRef, useState } from 'react'
import { restSecondsLeft } from '../../domain/timer'

const STORAGE_KEY = 'liftlog:rest-seconds'
const RUNNING_KEY = 'liftlog:rest-running'
const DEFAULT_SECONDS = 90
const MAX_OVERTIME_SECONDS = 600

export const REST_OPTIONS = [60, 90, 120, 180] as const

function readDuration(): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return (REST_OPTIONS as readonly number[]).includes(stored) ? stored : DEFAULT_SECONDS
  } catch {
    return DEFAULT_SECONDS
  }
}

type RunningTimer = { endsAt: number; totalMs: number }

/** iOS beendet Apps im Hintergrund gern. So läuft die Pause nach dem erneuten Öffnen weiter. */
function readRunning(): RunningTimer | null {
  try {
    const stored = JSON.parse(localStorage.getItem(RUNNING_KEY) ?? 'null') as RunningTimer | null
    if (typeof stored?.endsAt !== 'number' || typeof stored.totalMs !== 'number') return null
    return restSecondsLeft(stored.endsAt, Date.now()) < -MAX_OVERTIME_SECONDS ? null : stored
  } catch {
    return null
  }
}

function writeRunning(running: RunningTimer | null) {
  try {
    if (running) localStorage.setItem(RUNNING_KEY, JSON.stringify(running))
    else localStorage.removeItem(RUNNING_KEY)
  } catch {
    // Ohne Speicher geht die laufende Pause beim Schließen der App verloren.
  }
}

function playAlert(context: AudioContext | null) {
  if (typeof navigator.vibrate === 'function') navigator.vibrate([200, 100, 200])
  if (!context) return
  // Zwei kurze Töne. Der Stumm-Schalter des iPhones kann sie unterdrücken.
  for (const startsIn of [0, 0.25]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 880
    gain.gain.value = 0.2
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(context.currentTime + startsIn)
    oscillator.stop(context.currentTime + startsIn + 0.15)
  }
}

export function useRestTimer() {
  const [duration, setDuration] = useState(readDuration)
  const [restored] = useState(readRunning)
  const [endsAt, setEndsAt] = useState<number | null>(restored?.endsAt ?? null)
  const [totalMs, setTotalMs] = useState(restored?.totalMs ?? 0)
  const [now, setNow] = useState(() => Date.now())
  const alerted = useRef(false)
  const audio = useRef<AudioContext | null>(null)

  useEffect(() => {
    writeRunning(endsAt === null ? null : { endsAt, totalMs })
  }, [endsAt, totalMs])

  // Der Timer startet erst nach dem Speichern. iOS erlaubt Ton aber nur nach einer Berührung,
  // deshalb wird die Ausgabe schon beim ersten Tippen freigeschaltet.
  useEffect(() => {
    function unlock() {
      try {
        audio.current ??= new AudioContext()
        void audio.current.resume()
      } catch {
        audio.current = null
      }
    }
    document.addEventListener('pointerdown', unlock)
    return () => document.removeEventListener('pointerdown', unlock)
  }, [])

  const running = endsAt !== null

  useEffect(() => {
    if (endsAt === null) return
    function tick() {
      const current = Date.now()
      setNow(current)
      const left = restSecondsLeft(endsAt as number, current)
      if (left <= 0 && !alerted.current) {
        alerted.current = true
        // Kein Signal, wenn die Pause längst vorbei war, als die App wieder geöffnet wurde.
        if (left > -3) playAlert(audio.current)
      }
      if (left < -MAX_OVERTIME_SECONDS) setEndsAt(null)
    }
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [endsAt])

  // Der Bildschirm bleibt während der Pause an, soweit das Gerät das unterstützt.
  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    async function acquire() {
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) void next.release()
        else lock = next
      } catch {
        // Ohne Wake Lock läuft der Timer trotzdem.
      }
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      void lock?.release()
    }
  }, [running])

  const start = useCallback(
    (seconds?: number) => {
      const ms = (seconds ?? duration) * 1000
      const current = Date.now()
      alerted.current = false
      setNow(current)
      setTotalMs(ms)
      setEndsAt(current + ms)
    },
    [duration],
  )

  const stop = useCallback(() => setEndsAt(null), [])

  const addSeconds = useCallback((seconds: number) => {
    setEndsAt((current) => (current === null ? null : current + seconds * 1000))
    setTotalMs((current) => current + seconds * 1000)
  }, [])

  const chooseDuration = useCallback((seconds: number) => {
    setDuration(seconds)
    try {
      localStorage.setItem(STORAGE_KEY, String(seconds))
    } catch {
      // Die Auswahl gilt dann nur bis zum Schließen der App.
    }
  }, [])

  return { duration, endsAt, totalMs, now, start, stop, addSeconds, chooseDuration }
}

export type RestTimer = ReturnType<typeof useRestTimer>
