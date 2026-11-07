import { describe, expect, it } from 'vitest'
import { firstName, greetingFor, headline } from './greeting'

describe('greetingFor', () => {
  it('wechselt mit der Tageszeit', () => {
    expect(greetingFor(5)).toBe('Guten Morgen')
    expect(greetingFor(10)).toBe('Guten Morgen')
    expect(greetingFor(11)).toBe('Hallo')
    expect(greetingFor(17)).toBe('Hallo')
    expect(greetingFor(18)).toBe('Guten Abend')
    expect(greetingFor(22)).toBe('Guten Abend')
  })

  it('sagt nachts Hallo', () => {
    expect(greetingFor(23)).toBe('Hallo')
    expect(greetingFor(2)).toBe('Hallo')
  })
})

describe('firstName', () => {
  it('nimmt das erste Wort', () => {
    expect(firstName('Onur Yahsi')).toBe('Onur')
    expect(firstName('  Jeton  ')).toBe('Jeton')
  })

  it('gibt ohne Namen null', () => {
    expect(firstName(null)).toBeNull()
    expect(firstName('   ')).toBeNull()
  })
})

describe('headline', () => {
  it('pusht an Trainingstagen', () => {
    expect(headline(true, 'Onur Yahsi')).toBe("Let's go, Onur.")
  })

  it('erinnert an Ruhetagen an die Erholung', () => {
    expect(headline(false, 'Onur')).toBe('Erholung, Onur.')
  })

  it('kommt ohne Namen aus', () => {
    expect(headline(true, null)).toBe("Let's go.")
  })
})
