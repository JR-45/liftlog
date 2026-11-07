// Erstellt aus den Onboarding-Antworten einen fertigen Trainingsplan. Ohne React und Datenbank.
// Beispielpläne für den Einstieg, keine individuelle Trainingsverordnung.

import { EXERCISE_CATALOG } from './exerciseCatalog'
import type { PlanDayDraft, PlanExerciseDraft } from './trainingPlan'

export type Goal = 'hypertrophy' | 'strength' | 'cut' | 'fitness'
export type Experience = 'beginner' | 'intermediate' | 'advanced'
export type Location = 'gym' | 'home' | 'bodyweight'
/** Trainingsdauer in Minuten, 10 bis 240. Die Schnellauswahl bietet 30, 45, 60 und 90. */
export type SessionMinutes = number

export const PRESET_MINUTES = [30, 45, 60, 90] as const
export const MIN_SESSION_MINUTES = 10
export const MAX_SESSION_MINUTES = 240

/** Gleiche Grenzen wie in der Datenbank. */
export function isValidSessionMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= MIN_SESSION_MINUTES && minutes <= MAX_SESSION_MINUTES
}

export type OnboardingAnswers = {
  goal: Goal
  experience: Experience
  location: Location
  /** Wochentage, 0 = Sonntag. */
  weekdays: number[]
  minutes: SessionMinutes
}

export type GeneratedPlan = {
  days: PlanDayDraft[]
  /** Werte für training_plan_settings, passend zu Jetons Plan-Editor. */
  method: string
  split: string
  restSeconds: number
}

type DayKind = 'fullA' | 'fullB' | 'fullC' | 'upper' | 'lower' | 'push' | 'pull' | 'legs'

const DAY_NAMES: Record<DayKind, string> = {
  fullA: 'Ganzkörper A',
  fullB: 'Ganzkörper B',
  fullC: 'Ganzkörper C',
  upper: 'Oberkörper',
  lower: 'Unterkörper',
  push: 'Push',
  pull: 'Pull',
  legs: 'Beine',
}

/** Übungen je Tag und Ort, Grundübungen zuerst. Kürzere Einheiten nehmen die ersten Übungen. */
const TEMPLATES: Record<Location, Partial<Record<DayKind, string[]>>> = {
  gym: {
    fullA: ['Kniebeugen', 'Bankdrücken', 'Rudern sitzend', 'Schulterdrücken', 'Beinbeuger', 'Latziehen', 'Kabelcurls', 'Trizeps Extensions (nach unten)'],
    fullB: ['Beinpresse', 'Schrägbankdrücken', 'Latziehen', 'Seitheben', 'Rumänisches Kreuzheben', 'Kurzhantelrudern', 'Hammercurls', 'Crunches am Kabelzug'],
    fullC: ['Kreuzheben', 'Brustpresse', 'Langhantelrudern', 'Schulterdrücken (Kurzhanteln)', 'Ausfallschritte (Kurzhanteln)', 'Facepulls', 'Bizepscurls (Kurzhanteln)', 'Plank'],
    upper: ['Bankdrücken', 'Rudern sitzend', 'Schulterdrücken', 'Latziehen', 'Seitheben', 'Kabelcurls', 'Trizeps Extensions (nach unten)', 'Facepulls'],
    lower: ['Kniebeugen', 'Rumänisches Kreuzheben', 'Beinpresse', 'Beinbeuger', 'Beinstrecker', 'Wadenheben stehend', 'Crunches am Kabelzug', 'Plank'],
    push: ['Bankdrücken', 'Schrägbankpresse', 'Schulterdrücken', 'Seitheben', 'Butterfly', 'Trizeps Extensions (nach unten)', 'Trizepsdrücken über Kopf', 'Dips'],
    pull: ['Latziehen', 'Langhantelrudern', 'Rudern sitzend', 'Facepulls', 'Reverse Butterfly', 'Langhantelcurls', 'Hammercurls', 'Shrugs'],
    legs: ['Kniebeugen', 'Rumänisches Kreuzheben', 'Beinpresse', 'Beinbeuger', 'Beinstrecker', 'Hip Thrusts', 'Wadenheben stehend', 'Beinheben hängend'],
  },
  home: {
    fullA: ['Goblet Squats', 'Bankdrücken (Kurzhanteln)', 'Kurzhantelrudern', 'Schulterdrücken (Kurzhanteln)', 'Rumänisches Kreuzheben', 'Bizepscurls (Kurzhanteln)', 'Trizeps-Kickbacks', 'Plank'],
    fullB: ['Bulgarian Split Squats', 'Fliegende (Kurzhanteln)', 'Kurzhantelrudern', 'Seitheben', 'Hip Thrusts', 'Hammercurls', 'French Press', 'Russian Twists (mit Gewicht)'],
    fullC: ['Ausfallschritte (Kurzhanteln)', 'Bankdrücken (Kurzhanteln)', 'Überzüge (Kurzhantel)', 'Arnold Press', 'Step-ups', 'Konzentrationscurls', 'Skull Crushers', 'Side Plank'],
    upper: ['Bankdrücken (Kurzhanteln)', 'Kurzhantelrudern', 'Schulterdrücken (Kurzhanteln)', 'Überzüge (Kurzhantel)', 'Seitheben', 'Bizepscurls (Kurzhanteln)', 'French Press', 'Liegestütze'],
    lower: ['Goblet Squats', 'Rumänisches Kreuzheben', 'Bulgarian Split Squats', 'Hip Thrusts', 'Step-ups', 'Wadenheben stehend', 'Russian Twists (mit Gewicht)', 'Plank'],
    push: ['Bankdrücken (Kurzhanteln)', 'Fliegende (Kurzhanteln)', 'Arnold Press', 'Seitheben', 'Liegestütze', 'French Press', 'Trizeps-Kickbacks', 'Dips'],
    pull: ['Kurzhantelrudern', 'Überzüge (Kurzhantel)', 'Reverse Butterfly', 'Shrugs', 'Bizepscurls (Kurzhanteln)', 'Hammercurls', 'Konzentrationscurls', 'Hyperextensions'],
    legs: ['Goblet Squats', 'Rumänisches Kreuzheben', 'Bulgarian Split Squats', 'Ausfallschritte (Kurzhanteln)', 'Hip Thrusts', 'Step-ups', 'Wadenheben stehend', 'Beinheben liegend'],
  },
  bodyweight: {
    fullA: ['Kniebeugen (Körpergewicht)', 'Liegestütze', 'Rudern am Schlingentrainer', 'Ausfallschritte (Körpergewicht)', 'Glute Bridge', 'Crunches', 'Plank', 'Mountain Climbers'],
    fullB: ['Ausfallschritte (Körpergewicht)', 'Dips', 'Rudern am Schlingentrainer', 'Glute Bridge', 'Hyperextensions', 'Beinheben liegend', 'Side Plank', 'Wandsitzen'],
    fullC: ['Kniebeugen (Körpergewicht)', 'Liegestütze', 'Burpees', 'Rudern am Schlingentrainer', 'Hyperextensions', 'Mountain Climbers', 'Crunches', 'Plank'],
    upper: ['Liegestütze', 'Rudern am Schlingentrainer', 'Dips', 'Burpees', 'Mountain Climbers', 'Crunches', 'Plank', 'Side Plank'],
    lower: ['Kniebeugen (Körpergewicht)', 'Ausfallschritte (Körpergewicht)', 'Glute Bridge', 'Wandsitzen', 'Hyperextensions', 'Beinheben liegend', 'Mountain Climbers', 'Side Plank'],
  },
}

/** Etwa eine Übung pro Viertelstunde plus zwei, mindestens 3 und höchstens 8 (so viele hat eine Vorlage). */
export function exercisesPerSession(minutes: number): number {
  return Math.min(8, Math.max(3, Math.round(minutes / 15) + 2))
}

/** Ab 2 Stunden reichen 8 Übungen nicht, dann gibt es einen Satz mehr, höchstens 5. */
function extraSets(minutes: number): number {
  return minutes >= 120 ? 1 : 0
}
const REST_SECONDS: Record<Goal, number> = { strength: 180, hypertrophy: 90, cut: 60, fitness: 60 }
/** Halteübungen, die in Sätzen mit Sekunden trainiert werden statt einmal am Stück. */
const HOLDS = new Set(['Plank', 'Side Plank', 'Wandsitzen'])

/** Vorschlag, welche Tage bei n Trainings pro Woche gut verteilt sind. 0 = Sonntag. */
export function suggestWeekdays(count: number): number[] {
  const presets: Record<number, number[]> = {
    1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6],
  }
  return presets[Math.min(6, Math.max(1, count))]
}

/** Welche Tagesart an welchem Trainingstag dran ist, abhängig von Anzahl und Ort. */
export function dayKinds(count: number, location: Location): { kinds: DayKind[]; split: string } {
  const cycle = (kinds: DayKind[]) => Array.from({ length: count }, (_, index) => kinds[index % kinds.length])
  if (count <= 3) return { kinds: cycle(['fullA', 'fullB', 'fullC']), split: 'full_body' }
  if (count === 4 || location === 'bodyweight') return { kinds: cycle(['upper', 'lower']), split: 'upper_lower' }
  if (count === 5) return { kinds: ['push', 'pull', 'legs', 'upper', 'lower'], split: 'custom' }
  return { kinds: cycle(['push', 'pull', 'legs']), split: 'push_pull_legs' }
}

function setsFor(goal: Goal, experience: Experience): number {
  if (goal === 'strength') return experience === 'beginner' ? 3 : 4
  if (goal === 'hypertrophy') return experience === 'advanced' ? 4 : 3
  if (goal === 'fitness') return experience === 'beginner' ? 2 : 3
  return 3
}

function repsFor(goal: Goal, position: number, bodyweight: boolean): [number, number] {
  if (bodyweight) return goal === 'strength' ? [8, 12] : [10, 15]
  if (goal === 'strength') return position < 2 ? [4, 6] : [6, 10]
  if (goal === 'hypertrophy') return [8, 12]
  if (goal === 'cut') return [10, 15]
  return [12, 15]
}

function buildExercise(name: string, position: number, answers: OnboardingAnswers): PlanExerciseDraft {
  const item = EXERCISE_CATALOG.find((entry) => entry.name === name)
  if (!item) throw new Error(`Übung fehlt im Katalog: ${name}`)
  const sets = Math.min(5, setsFor(answers.goal, answers.experience) + extraSets(answers.minutes))
  if (item.tracking_type === 'duration') {
    const hold = HOLDS.has(name)
    return {
      name, tracking_type: item.tracking_type, alternative_exercise_id: null,
      sets_min: hold ? Math.min(sets, 3) : 1, sets_max: hold ? Math.min(sets, 3) : 1,
      reps_min: null, reps_max: null,
      duration_min: hold ? 30 : 600, duration_max: hold ? 60 : 900,
    }
  }
  const [repsMin, repsMax] = repsFor(answers.goal, position, item.tracking_type === 'reps')
  return {
    name, tracking_type: item.tracking_type, alternative_exercise_id: null,
    sets_min: sets, sets_max: sets, reps_min: repsMin, reps_max: repsMax,
    duration_min: null, duration_max: null,
  }
}

export function buildOnboardingPlan(answers: OnboardingAnswers): GeneratedPlan {
  const weekdays = [...new Set(answers.weekdays)].sort((a, b) => a - b)
  const { kinds, split } = dayKinds(weekdays.length, answers.location)
  const perDay = exercisesPerSession(answers.minutes)
  const days = weekdays.map((weekday, index) => {
    const kind = kinds[index]
    const names = (TEMPLATES[answers.location][kind] ?? []).slice(0, perDay)
    return {
      weekday,
      name: DAY_NAMES[kind],
      exercises: names.map((name, position) => buildExercise(name, position, answers)),
    }
  })
  const method = answers.goal === 'strength' ? 'strength' : answers.goal === 'hypertrophy' ? 'hypertrophy' : 'classic'
  return { days, method, split, restSeconds: REST_SECONDS[answers.goal] }
}
