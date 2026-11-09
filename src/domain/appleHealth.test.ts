import { describe, expect, it } from 'vitest'
import { parseAppleHealthInput, shortcutRunUrl } from './appleHealth'

describe('Apple Health & Apple Watch Synchronisation', () => {
  it('prüft manuelle Eingaben und verlangt mindestens einen positiven Wert', () => {
    expect(parseAppleHealthInput({ activeKcal: '420', workoutMinutes: '45', steps: '6000' }, '2026-11-09')).toEqual({
      date: '2026-11-09',
      activeKcal: 420,
      workoutMinutes: 45,
      steps: 6000,
    })
    expect(parseAppleHealthInput({ activeKcal: '0', workoutMinutes: '', steps: '0' }, '2026-11-09')).toBeNull()
  })

  it('erzeugt den direkten Start-Link für den installierten iOS-Kurzbefehl', () => {
    expect(shortcutRunUrl()).toBe('shortcuts://run-shortcut?name=LiftLog-Apple-Watch')
  })

  it('weist unplausible manuelle Werte zurück', () => {
    expect(parseAppleHealthInput({ activeKcal: '-5', workoutMinutes: '', steps: '' }, '2026-11-09')).toBeNull()
    expect(parseAppleHealthInput({ activeKcal: '', workoutMinutes: '1500', steps: '' }, '2026-11-09')).toBeNull()
    expect(parseAppleHealthInput({ activeKcal: 'abc', workoutMinutes: '', steps: '' }, '2026-11-09')).toBeNull()
  })
})
