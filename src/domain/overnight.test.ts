import { describe, expect, it } from 'vitest'
import { continuesOvernight } from './overnight'

const now = new Date('2026-11-22T00:30:00')

describe('Training über Mitternacht', () => {
  it('läuft weiter, wenn es gestern Abend gestartet und nicht beendet wurde', () => {
    const startedAt = new Date('2026-11-21T23:10:00').toISOString()
    expect(continuesOvernight({ started_at: startedAt, finished_at: null }, now)).toBe(true)
  })

  it('gilt nicht, wenn es schon beendet ist', () => {
    const startedAt = new Date('2026-11-21T23:10:00').toISOString()
    const finishedAt = new Date('2026-11-22T00:10:00').toISOString()
    expect(continuesOvernight({ started_at: startedAt, finished_at: finishedAt }, now)).toBe(false)
  })

  it('gilt nicht ohne gestartete Stoppuhr', () => {
    expect(continuesOvernight({ started_at: null, finished_at: null }, now)).toBe(false)
  })

  it('gilt nicht für ein vergessenes Training von gestern Vormittag', () => {
    const startedAt = new Date('2026-11-21T10:00:00').toISOString()
    expect(continuesOvernight({ started_at: startedAt, finished_at: null }, now)).toBe(false)
  })
})
