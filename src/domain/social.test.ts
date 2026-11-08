import { describe, expect, it } from 'vitest'
import { socialSearchPattern } from './social'

describe('socialSearchPattern', () => {
  it('verlangt mindestens zwei Zeichen und höchstens 50', () => {
    expect(socialSearchPattern(' A ')).toBeNull()
    expect(socialSearchPattern('')).toBeNull()
    expect(socialSearchPattern('a'.repeat(51))).toBeNull()
  })
  it('sucht nach dem getrimmten Namen unabhängig von Großschreibung', () => {
    expect(socialSearchPattern('  Lara  ')).toBe('%Lara%')
  })
  it('behandelt SQL-Platzhalter und Backslashes als normale Namenszeichen', () => {
    expect(socialSearchPattern('a%b_c\\d')).toBe('%a\\%b\\_c\\\\d%')
  })
})
