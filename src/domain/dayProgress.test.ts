import { describe, expect, it } from 'vitest'
import { dayProgress } from './dayProgress'

const open = { done: false, skipped: false }
const done = { done: true, skipped: false }
const skipped = { done: false, skipped: true }

describe('dayProgress', () => {
  it('zählt offene und fertige Übungen', () => {
    expect(dayProgress([done, open, open])).toEqual({ done: 1, total: 3, finished: false })
  })

  it('nimmt übersprungene Übungen aus der Zählung', () => {
    expect(dayProgress([done, skipped, open])).toEqual({ done: 1, total: 2, finished: false })
  })

  it('ist geschafft, wenn alle übrigen Übungen fertig sind', () => {
    expect(dayProgress([done, skipped])).toEqual({ done: 1, total: 1, finished: true })
  })

  it('zählt eine fertige Übung auch, wenn sie vorher übersprungen wurde', () => {
    expect(dayProgress([{ done: true, skipped: true }, open])).toEqual({ done: 1, total: 2, finished: false })
  })

  it('ist nicht geschafft, wenn alles übersprungen wurde', () => {
    expect(dayProgress([skipped, skipped])).toEqual({ done: 0, total: 0, finished: false })
  })

  it('ist ohne Übungen nicht geschafft', () => {
    expect(dayProgress([])).toEqual({ done: 0, total: 0, finished: false })
  })
})
