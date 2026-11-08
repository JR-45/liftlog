import { EXERCISE_CATALOG } from './exerciseCatalog'
import type { PlanExerciseDraft } from './trainingPlan'

/** Stabile IDs und Gruppen gelten nur für den Editor; gespeichert wird weiterhin die gewählte Übung. */
export type PlanExerciseSlot = PlanExerciseDraft & { slotId: string; muscleGroup: string }

export function createExerciseSlots(exercises: PlanExerciseDraft[], createId: () => string): PlanExerciseSlot[] {
  return exercises.map(exercise => ({
    ...exercise, slotId: createId(),
    muscleGroup: EXERCISE_CATALOG.find(item => item.name === exercise.name)?.group ?? '',
  }))
}

export function updateExerciseSlot(slots: PlanExerciseSlot[], slotId: string, changes: Partial<PlanExerciseDraft> & { muscleGroup?: string }): PlanExerciseSlot[] {
  return slots.map(slot => slot.slotId === slotId ? { ...slot, ...changes } : slot)
}
