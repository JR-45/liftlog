import { describe, expect, it } from 'vitest'
import { buildCsv, exportFileName, type ExportRow } from './export'

const row = (changes: Partial<ExportRow> = {}): ExportRow => ({
  performed_on: '2026-11-05',
  plan_day: 'Arme + Beine',
  exercise: 'Preacher Curls',
  set_number: 1,
  weight_kg: 27.5,
  is_assisted: false,
  reps: 12,
  duration_seconds: null,
  ...changes,
})

const lines = (csv: string) => csv.replace('﻿', '').trimEnd().split('\r\n')

describe('buildCsv', () => {
  it('beginnt mit der Marke für Umlaute und der Kopfzeile', () => {
    const csv = buildCsv([])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(lines(csv)).toEqual(['Datum;Trainingstag;Übung;Satz;Gewicht (kg);Gewichtshilfe;Wiederholungen;Dauer (Sek.)'])
  })

  it('schreibt Dezimalzahlen mit Komma', () => {
    expect(lines(buildCsv([row()]))[1]).toBe('2026-11-05;Arme + Beine;Preacher Curls;1;27,5;nein;12;')
  })

  it('kennzeichnet Gewichtshilfe', () => {
    expect(lines(buildCsv([row({ is_assisted: true })]))[1]).toContain(';27,5;ja;')
  })

  it('lässt leere Werte leer', () => {
    const line = lines(buildCsv([row({ weight_kg: null, reps: null, duration_seconds: 45, plan_day: null })]))[1]
    expect(line).toBe('2026-11-05;;Preacher Curls;1;;nein;;45')
  })

  it('sortiert nach Datum, Übung und Satz', () => {
    const csv = buildCsv([
      row({ performed_on: '2026-11-06', exercise: 'Beinpresse' }),
      row({ set_number: 2 }),
      row({ exercise: 'Äpfel' }),
      row({ set_number: 1 }),
    ])
    expect(lines(csv).slice(1).map((line) => line.split(';').slice(0, 4).join('|'))).toEqual([
      '2026-11-05|Arme + Beine|Äpfel|1',
      '2026-11-05|Arme + Beine|Preacher Curls|1',
      '2026-11-05|Arme + Beine|Preacher Curls|2',
      '2026-11-06|Arme + Beine|Beinpresse|1',
    ])
  })

  it('ändert die Eingabe nicht', () => {
    const rows = [row({ performed_on: '2026-11-06' }), row()]
    buildCsv(rows)
    expect(rows[0].performed_on).toBe('2026-11-06')
  })

  it('schützt Trennzeichen, Anführungszeichen und Zeilenumbrüche', () => {
    const line = buildCsv([row({ exercise: 'Curl; "eng"\nKurz' })])
    expect(line).toContain('"Curl; ""eng""\nKurz"')
  })

  it.each(['=SUMME(A1)', '+1', '-1', '@cmd'])('entschärft Formeln in „%s“', (exercise) => {
    expect(lines(buildCsv([row({ exercise })]))[1].split(';')[2]).toBe(`'${exercise}`)
  })
})

describe('exportFileName', () => {
  it('enthält das Datum', () => {
    expect(exportFileName('2026-11-07')).toBe('liftlog-backup-2026-11-07.csv')
  })
})
