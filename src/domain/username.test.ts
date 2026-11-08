import { describe, expect, it } from 'vitest'
import { normalizeUsername } from './username'

describe('normalizeUsername', () => {
  it('entfernt Leerzeichen außen und normalisiert Großschreibung', () => {
    expect(normalizeUsername('  Osman.01_  ')).toBe('osman.01_')
  })
  it('verlangt drei bis 40 erlaubte Zeichen', () => {
    for (const value of ['', 'ab', 'a'.repeat(41), 'a b', 'äbc', 'abc/def', '@osman']) expect(normalizeUsername(value)).toBeNull()
    expect(normalizeUsername('a'.repeat(40))).toBe('a'.repeat(40))
  })
})
