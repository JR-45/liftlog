import { describe, expect, it } from 'vitest'
import { EXERCISE_CATALOG } from './exerciseCatalog'
import { findExerciseGuide } from './exerciseGuides'

describe('findExerciseGuide', () => {
  it('deckt ausnahmslos jede Übung im gesamten EXERCISE_CATALOG sowie Ausdauer ab', () => {
    const allNames = [...EXERCISE_CATALOG.map((entry) => entry.name), 'Ausdauer']
    for (const name of allNames) {
      const guide = findExerciseGuide(name)
      expect(guide, `Guide fehlt für Übung: ${name}`).not.toBeNull()
      expect(guide!.primaryMuscles.length, `Primärmuskeln fehlen bei: ${name}`).toBeGreaterThan(0)
      expect(guide!.secondaryMuscles.length, `Sekundärmuskeln fehlen bei: ${name}`).toBeGreaterThan(0)
      expect(guide!.frames).toHaveLength(2)
      expect(guide!.frames[0]).not.toBe(guide!.frames[1])
      expect(guide!.tips.length, `Tipps fehlen bei: ${name}`).toBe(3)
    }
  })

  it('funktioniert unabhängig von Groß-/Kleinschreibung und Trim', () => {
    const guide = findExerciseGuide('  bankdrücken ')
    expect(guide?.name).toBe('Bankdrücken')
  })

  it('ordnet auch frei benannte Varianten über Schlüsselwörter sinnvoll zu', () => {
    expect(findExerciseGuide('Flachbankdrücken')?.name).toBe('Bankdrücken')
    expect(findExerciseGuide('Scott Curls')?.name).toBe('Preacher Curls')
    expect(findExerciseGuide('RDL mit Langhantel')?.name).toBe('Rumänisches Kreuzheben')
    expect(findExerciseGuide('TRX Rudern')?.name).toBe('Rudern am Schlingentrainer')
  })

  it('gibt null für unbekannte Fantasie-Begriffe zurück', () => {
    expect(findExerciseGuide('Unbekannte Fantasieübung 123')).toBeNull()
    expect(findExerciseGuide('   ')).toBeNull()
  })
})
