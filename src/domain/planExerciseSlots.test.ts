import { describe, expect, it } from 'vitest'
import { createExerciseSlots, updateExerciseSlot } from './planExerciseSlots'
import { recommendPlan } from './trainingPlan'

const names = ['Bankdrücken', 'Brustpresse', 'Butterfly', 'Schulterdrücken', 'French Press', 'Trizepsdrücken über Kopf']
function slots(count = 6) {
  let next = 0
  const example = recommendPlan('classic', 'full_body')[0].exercises[0]
  return createExerciseSlots(Array.from({ length: count }, (_, index) => ({ ...example, name: names[index % names.length] })), () => `slot-${++next}`)
}

describe('Unabhängige Übungsslots der Wochenvorlage', () => {
  it('erkennt die Kabelzugvarianten beim Laden als Trizepsübungen', () => {
    const example = slots()[0]
    const names = ['Trizepsdrücken am Kabelzug mit Seil', 'Trizepsdrücken am Kabelzug mit Stange', 'Einarmiges Trizepsdrücken am Kabelzug', 'Trizepsstrecken über Kopf am Kabelzug']
    let id = 0
    const restored = createExerciseSlots(names.map(name => ({ ...example, name })), () => `kabel-${++id}`)
    expect(restored.map(slot => slot.muscleGroup)).toEqual(names.map(() => 'Trizeps'))
  })
  it('stellt Muskelgruppen aus den gespeicherten Übungsnamen in gleicher Reihenfolge wieder her', () => {
    const result = slots()
    expect(result.map(slot => slot.name)).toEqual(names)
    expect(result.map(slot => slot.muscleGroup)).toEqual(['Brust', 'Brust', 'Brust', 'Schultern', 'Trizeps', 'Trizeps'])
    expect(new Set(result.map(slot => slot.slotId)).size).toBe(6)
  })
  it.each([4, 6, 8, 12])('ändert bei %i Übungen nur den anhand seiner ID ausgewählten Slot', count => {
    const original = slots(count)
    const changed = updateExerciseSlot(original, original[3].slotId, { muscleGroup: 'Trizeps' })
    expect(changed[3]).toEqual({ ...original[3], muscleGroup: 'Trizeps' })
    expect(changed[3].name).toBe(original[3].name)
    expect(changed.filter((_, index) => index !== 3)).toEqual(original.filter((_, index) => index !== 3))
    expect(changed.map(slot => slot.slotId)).toEqual(original.map(slot => slot.slotId))
  })
  it('behält nach dem Löschen eines früheren Slots die Zuordnung zur ID', () => {
    const original = slots()
    const remaining = original.filter(slot => slot.slotId !== original[0].slotId)
    const changed = updateExerciseSlot(remaining, original[3].slotId, { name: 'Seitheben', muscleGroup: 'Schultern' })
    expect(changed[2].name).toBe('Seitheben')
    expect(changed.filter(slot => slot.slotId !== original[3].slotId)).toEqual(remaining.filter(slot => slot.slotId !== original[3].slotId))
    expect(original[3].name).toBe('Schulterdrücken')
  })
})
