// Reine Timer-Logik. Gerechnet wird mit der Endzeit statt mit einem Zähler, damit die Zeit
// stimmt, auch wenn das iPhone die App im Hintergrund anhält.

/** Sekunden bis zum Ende, aufgerundet. Negativ bedeutet: Die Pause ist schon überzogen. */
export function restSecondsLeft(endsAt: number, now: number): number {
  return Math.ceil((endsAt - now) / 1000)
}

/** Verbleibender Anteil von 1 bis 0 für den Balken. */
export function restFraction(endsAt: number, totalMs: number, now: number): number {
  if (totalMs <= 0) return 0
  return Math.min(1, Math.max(0, (endsAt - now) / totalMs))
}

/** 75 wird zu „1:15“. Das Vorzeichen zeigt die Anzeige selbst an. */
export function formatClock(seconds: number): string {
  const total = Math.abs(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
