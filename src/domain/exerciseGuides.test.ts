import { describe, expect, it } from 'vitest'
import { findExerciseGuide } from './exerciseGuides'

describe('findExerciseGuide', () => {
  it('findet Guide für Bankdrücken', () => {
    const guide = findExerciseGuide('Bankdrücken')
    expect(guide).not.toBeNull()
    expect(guide?.primaryMuscles).toContain('Brust (Pectoralis major)')
    expect(guide?.frames).toHaveLength(2)
    expect(guide?.tips.length).toBeGreaterThan(0)
  })

  it('funktioniert unabhängig von Groß-/Kleinschreibung und Trim', () => {
    const guide = findExerciseGuide('  bankdrücken ')
    expect(guide?.name).toBe('Bankdrücken')
  })

  it('findet Guide für Kniebeugen', () => {
    const guide = findExerciseGuide('Kniebeugen')
    expect(guide).not.toBeNull()
    expect(guide?.primaryMuscles).toContain('Quadrizeps (Beinstrecker)')
  })

  it('findet Guide für Kreuzheben, Schulterdrücken und Klimmzüge', () => {
    expect(findExerciseGuide('Kreuzheben')).not.toBeNull()
    expect(findExerciseGuide('Schulterdrücken')).not.toBeNull()
    expect(findExerciseGuide('Klimmzüge')).not.toBeNull()
  })

  it('gibt null für unbekannte Übungen zurück', () => {
    expect(findExerciseGuide('Unbekannte Fantasieübung 123')).toBeNull()
  })
})
