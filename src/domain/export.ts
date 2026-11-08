// Baut die Backup-Datei. Trennzeichen und Dezimalkomma passen zu deutschem Excel und Numbers.

export type ExportRow = {
  performed_on: string
  plan_day: string | null
  exercise: string
  set_number: number
  weight_kg: number | null
  is_assisted: boolean
  reps: number | null
  duration_seconds: number | null
  distance_km?: number | null
  /** Satz gehört zu einem Zirkel: Er zählt als abgehakte Runde, nicht als Wiederholungen. */
  is_round?: boolean
}

const HEADER = ['Datum', 'Trainingstag', 'Übung', 'Satz', 'Gewicht (kg)', 'Gewichtshilfe', 'Wiederholungen', 'Dauer (Sek.)']
const BYTE_ORDER_MARK = '﻿'

function textCell(value: string): string {
  // Tabellenprogramme würden Texte mit diesen Anfangszeichen als Formel ausführen.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[;"\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

function numberCell(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',')
}

function compareRows(a: ExportRow, b: ExportRow): number {
  return (
    a.performed_on.localeCompare(b.performed_on) ||
    a.exercise.localeCompare(b.exercise, 'de') ||
    a.set_number - b.set_number
  )
}

/** Älteste Trainings zuerst. Die Marke am Anfang lässt Excel die Umlaute richtig lesen. */
export function buildCsv(rows: ExportRow[]): string {
  const withDistance = rows.some(row => row.distance_km != null)
  const lines = [...rows].sort(compareRows).map((row) =>
    [
      row.performed_on,
      textCell(row.plan_day ?? ''),
      textCell(row.exercise),
      String(row.set_number),
      numberCell(row.weight_kg),
      row.is_assisted ? 'ja' : 'nein',
      numberCell(row.reps),
      numberCell(row.duration_seconds),
      ...(withDistance ? [numberCell(row.distance_km ?? null)] : []),
    ].join(';'),
  )
  return `${BYTE_ORDER_MARK}${[[...HEADER, ...(withDistance ? ['Strecke (km)'] : [])].join(';'), ...lines].join('\r\n')}\r\n`
}

export function exportFileName(today: string): string {
  return `liftlog-backup-${today}.csv`
}
