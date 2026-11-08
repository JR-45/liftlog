// Erstellt aus den Onboarding-Antworten einen fertigen Trainingsplan. Ohne React und Datenbank.
// Beispielpläne für den Einstieg, keine individuelle Trainingsverordnung.

import { EXERCISE_CATALOG } from './exerciseCatalog'
import type { PlanDayDraft, PlanExerciseDraft } from './trainingPlan'

export type Goal = 'hypertrophy' | 'strength' | 'cut' | 'fitness'
export type Experience = 'beginner' | 'intermediate' | 'advanced'
export type Location = 'gym' | 'home' | 'bodyweight' | 'calisthenics'
/** balanced: klassisch, lower: Bauch, Beine & Po, athletic: schnellkräftig und funktionell. */
export type Focus = 'balanced' | 'lower' | 'athletic'
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
  /** Schwerpunkt des Plans. Ohne Angabe ausgewogen. */
  focus?: Focus
  /** Am Ende jedes Trainingstags zwei Mobilitätsübungen. */
  mobility?: boolean
  /** Ein zusätzlicher Tag nur mit Ausdauer, an einem freien Tag. */
  cardioDay?: boolean
}

export type GeneratedPlan = {
  days: PlanDayDraft[]
  /** Werte für training_plan_settings, passend zu Jetons Plan-Editor. */
  method: string
  split: string
  restSeconds: number
}

type DayKind = 'fullA' | 'fullB' | 'fullC' | 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'glutes'

const DAY_NAMES: Record<DayKind, string> = {
  fullA: 'Ganzkörper A',
  fullB: 'Ganzkörper B',
  fullC: 'Ganzkörper C',
  upper: 'Oberkörper',
  lower: 'Unterkörper',
  push: 'Push',
  pull: 'Pull',
  legs: 'Beine',
  glutes: 'Beine & Po',
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
  // Klimmzugstange und Dips-Barren bzw. Ringe, Fortschritt über schwerere Varianten und Halteübungen.
  calisthenics: {
    fullA: ['Klimmzüge (Körpergewicht)', 'Dips', 'Pistol Squats', 'Pike Push-ups', 'Rudern am Schlingentrainer', 'Beinheben hängend', 'Hollow Hold', 'L-Sit'],
    fullB: ['Chin-ups', 'Liegestütze', 'Ausfallschritte (Körpergewicht)', 'Dips', 'Rudern am Schlingentrainer', 'Glute Bridge', 'Handstand halten', 'Plank'],
    fullC: ['Klimmzüge (Körpergewicht)', 'Pike Push-ups', 'Kniebeugen (Körpergewicht)', 'Dips', 'Hyperextensions', 'Beinheben hängend', 'L-Sit', 'Hollow Hold'],
    upper: ['Klimmzüge (Körpergewicht)', 'Dips', 'Rudern am Schlingentrainer', 'Pike Push-ups', 'Chin-ups', 'Liegestütze', 'Handstand halten', 'L-Sit'],
    lower: ['Pistol Squats', 'Ausfallschritte (Körpergewicht)', 'Kniebeugen (Körpergewicht)', 'Glute Bridge', 'Hyperextensions', 'Beinheben hängend', 'Hollow Hold', 'Wandsitzen'],
  },
}

/** Fokus Bauch, Beine & Po: Po und Beine zuerst und häufiger, Oberkörper und Bauch ergänzend. */
const LOWER_TEMPLATES: Record<Location, Partial<Record<DayKind, string[]>>> = {
  gym: {
    fullA: ['Hip Thrusts', 'Kniebeugen', 'Latziehen', 'Rumänisches Kreuzheben', 'Schulterdrücken (Kurzhanteln)', 'Abduktorenmaschine', 'Rudern sitzend', 'Plank'],
    fullB: ['Rumänisches Kreuzheben', 'Beinpresse', 'Brustpresse', 'Bulgarian Split Squats', 'Latziehen (enger Griff)', 'Glute Kickbacks', 'Seitheben', 'Crunches am Kabelzug'],
    fullC: ['Hip Thrusts', 'Goblet Squats', 'Rudern am Kabelzug', 'Ausfallschritte (Kurzhanteln)', 'Schulterdrücken', 'Beinbeuger', 'Abduktorenmaschine', 'Pallof Press'],
    lower: ['Kniebeugen', 'Rumänisches Kreuzheben', 'Beinpresse', 'Beinbeuger', 'Abduktorenmaschine', 'Wadenheben stehend', 'Crunches am Kabelzug', 'Plank'],
    glutes: ['Hip Thrusts', 'Bulgarian Split Squats', 'Rumänisches Kreuzheben', 'Glute Kickbacks', 'Abduktorenmaschine', 'Step-ups', 'Beinheben hängend', 'Pallof Press'],
    upper: ['Latziehen', 'Schulterdrücken (Kurzhanteln)', 'Rudern sitzend', 'Brustpresse', 'Seitheben', 'Facepulls', 'Trizeps Extensions (nach unten)', 'Bizepscurls (Kurzhanteln)'],
  },
  home: {
    fullA: ['Hip Thrusts', 'Goblet Squats', 'Kurzhantelrudern', 'Rumänisches Kreuzheben', 'Schulterdrücken (Kurzhanteln)', 'Glute Bridge', 'Bankdrücken (Kurzhanteln)', 'Plank'],
    fullB: ['Bulgarian Split Squats', 'Rumänisches Kreuzheben', 'Kurzhantelrudern', 'Hip Thrusts', 'Seitheben', 'Step-ups', 'Liegestütze', 'Russian Twists (mit Gewicht)'],
    fullC: ['Hip Thrusts', 'Ausfallschritte (Kurzhanteln)', 'Überzüge (Kurzhantel)', 'Goblet Squats', 'Arnold Press', 'Glute Bridge', 'Trizeps-Kickbacks', 'Side Plank'],
    lower: ['Goblet Squats', 'Rumänisches Kreuzheben', 'Bulgarian Split Squats', 'Step-ups', 'Wadenheben stehend', 'Glute Bridge', 'Russian Twists (mit Gewicht)', 'Plank'],
    glutes: ['Hip Thrusts', 'Bulgarian Split Squats', 'Rumänisches Kreuzheben', 'Glute Bridge', 'Ausfallschritte (Kurzhanteln)', 'Step-ups', 'Beinheben liegend', 'Side Plank'],
    upper: ['Kurzhantelrudern', 'Schulterdrücken (Kurzhanteln)', 'Bankdrücken (Kurzhanteln)', 'Seitheben', 'Reverse Butterfly', 'Bizepscurls (Kurzhanteln)', 'Trizeps-Kickbacks', 'Plank'],
  },
  bodyweight: {
    fullA: ['Glute Bridge', 'Kniebeugen (Körpergewicht)', 'Rudern am Schlingentrainer', 'Ausfallschritte (Körpergewicht)', 'Liegestütze', 'Hyperextensions', 'Crunches', 'Plank'],
    fullB: ['Ausfallschritte (Körpergewicht)', 'Glute Bridge', 'Rudern am Schlingentrainer', 'Wandsitzen', 'Liegestütze', 'Beinheben liegend', 'Mountain Climbers', 'Side Plank'],
    fullC: ['Kniebeugen (Körpergewicht)', 'Glute Bridge', 'Liegestütze', 'Ausfallschritte (Körpergewicht)', 'Hyperextensions', 'Crunches', 'Mountain Climbers', 'Plank'],
    lower: ['Kniebeugen (Körpergewicht)', 'Ausfallschritte (Körpergewicht)', 'Wandsitzen', 'Hyperextensions', 'Glute Bridge', 'Beinheben liegend', 'Mountain Climbers', 'Side Plank'],
    glutes: ['Glute Bridge', 'Ausfallschritte (Körpergewicht)', 'Kniebeugen (Körpergewicht)', 'Hyperextensions', 'Wandsitzen', 'Beinheben liegend', 'Crunches', 'Plank'],
    upper: ['Liegestütze', 'Rudern am Schlingentrainer', 'Dips', 'Mountain Climbers', 'Crunches', 'Plank', 'Side Plank', 'Burpees'],
  },
  calisthenics: {
    fullA: ['Pistol Squats', 'Klimmzüge (Körpergewicht)', 'Glute Bridge', 'Liegestütze', 'Ausfallschritte (Körpergewicht)', 'Rudern am Schlingentrainer', 'Hollow Hold', 'Plank'],
    fullB: ['Glute Bridge', 'Kniebeugen (Körpergewicht)', 'Chin-ups', 'Ausfallschritte (Körpergewicht)', 'Dips', 'Hyperextensions', 'Beinheben hängend', 'Side Plank'],
    fullC: ['Ausfallschritte (Körpergewicht)', 'Pistol Squats', 'Rudern am Schlingentrainer', 'Glute Bridge', 'Pike Push-ups', 'Hyperextensions', 'L-Sit', 'Hollow Hold'],
    lower: ['Pistol Squats', 'Kniebeugen (Körpergewicht)', 'Ausfallschritte (Körpergewicht)', 'Wandsitzen', 'Hyperextensions', 'Beinheben hängend', 'Hollow Hold', 'Plank'],
    glutes: ['Glute Bridge', 'Pistol Squats', 'Ausfallschritte (Körpergewicht)', 'Hyperextensions', 'Kniebeugen (Körpergewicht)', 'Beinheben hängend', 'L-Sit', 'Side Plank'],
    upper: ['Klimmzüge (Körpergewicht)', 'Liegestütze', 'Rudern am Schlingentrainer', 'Dips', 'Pike Push-ups', 'Chin-ups', 'Hollow Hold', 'Plank'],
  },
}

/** Athletisch: Grundübungen, Sprung- und Schwungkraft, Tragen. Calisthenics ist schon athletisch. */
const ATHLETIC_TEMPLATES: Partial<Record<Location, Partial<Record<DayKind, string[]>>>> = {
  gym: {
    fullA: ['Kreuzheben', 'Klimmzüge', 'Bankdrücken', 'Kettlebell Swings', 'Ausfallschritte (Kurzhanteln)', 'Schulterdrücken', 'Farmer’s Walk', 'Plank'],
    fullB: ['Frontkniebeugen', 'Langhantelrudern', 'Thrusters', 'Dips', 'Rumänisches Kreuzheben', 'Medizinball-Slams', 'Hammercurls', 'Hollow Hold'],
    fullC: ['Kniebeugen', 'Bankdrücken', 'Kettlebell Clean', 'Latziehen', 'Bulgarian Split Squats', 'Burpees', 'Facepulls', 'Pallof Press'],
    upper: ['Bankdrücken', 'Klimmzüge', 'Schulterdrücken', 'Langhantelrudern', 'Dips', 'Medizinball-Slams', 'Facepulls', 'Hollow Hold'],
    lower: ['Kniebeugen', 'Kreuzheben', 'Bulgarian Split Squats', 'Kettlebell Swings', 'Hip Thrusts', 'Wadenheben stehend', 'Farmer’s Walk', 'Pallof Press'],
    push: ['Bankdrücken', 'Schulterdrücken', 'Dips', 'Thrusters', 'Schrägbankdrücken', 'Seitheben', 'Trizepsdrücken über Kopf', 'Medizinball-Slams'],
    pull: ['Klimmzüge', 'Langhantelrudern', 'Kettlebell Clean', 'Latziehen', 'Facepulls', 'Hammercurls', 'Farmer’s Walk', 'Hollow Hold'],
    legs: ['Kniebeugen', 'Rumänisches Kreuzheben', 'Kettlebell Swings', 'Bulgarian Split Squats', 'Hip Thrusts', 'Step-ups', 'Wadenheben stehend', 'Beinheben hängend'],
  },
  bodyweight: {
    fullA: ['Burpees', 'Liegestütze', 'Kniebeugen (Körpergewicht)', 'Rudern am Schlingentrainer', 'Ausfallschritte (Körpergewicht)', 'Mountain Climbers', 'Hollow Hold', 'Plank'],
    fullB: ['Ausfallschritte (Körpergewicht)', 'Dips', 'Burpees', 'Glute Bridge', 'Rudern am Schlingentrainer', 'Mountain Climbers', 'Side Plank', 'Wandsitzen'],
    fullC: ['Kniebeugen (Körpergewicht)', 'Pike Push-ups', 'Burpees', 'Hyperextensions', 'Liegestütze', 'Mountain Climbers', 'Hollow Hold', 'Crunches'],
    upper: ['Liegestütze', 'Rudern am Schlingentrainer', 'Pike Push-ups', 'Dips', 'Burpees', 'Mountain Climbers', 'Hollow Hold', 'Plank'],
    lower: ['Kniebeugen (Körpergewicht)', 'Ausfallschritte (Körpergewicht)', 'Pistol Squats', 'Glute Bridge', 'Burpees', 'Wandsitzen', 'Mountain Climbers', 'Side Plank'],
  },
}

/** Cardio je Ort: kurz nach dem Training beim Fettabbau, lang am Cardio-Tag. Ohne Studio wird gejoggt. */
const CARDIO: Record<Location, { finisher: string; day: string }> = {
  gym: { finisher: 'Crosstrainer', day: 'Laufband' },
  home: { finisher: 'Seilspringen', day: 'Joggen' },
  bodyweight: { finisher: 'Joggen', day: 'Joggen' },
  calisthenics: { finisher: 'Joggen', day: 'Joggen' },
}
/** Freie Tage für den Cardio-Tag, Wochenende zuerst. 0 = Sonntag. */
const CARDIO_DAY_ORDER = [6, 0, 3, 5, 2, 4, 1]

/** Einsteiger bekommen leichtere Varianten schwerer Übungen. Im Studio gibt es Gewichtshilfen. */
function beginnerVariant(name: string, location: Location): string {
  const gym = location === 'gym'
  const swaps: Record<string, string> = {
    'Klimmzüge (Körpergewicht)': gym ? 'Klimmzüge mit Gewichtshilfe' : 'Rudern am Schlingentrainer',
    Klimmzüge: 'Klimmzüge mit Gewichtshilfe',
    'Chin-ups': gym ? 'Klimmzüge mit Gewichtshilfe' : 'Rudern am Schlingentrainer',
    Dips: gym ? 'Dips mit Gewichtshilfe' : 'Liegestütze',
    'Pistol Squats': 'Ausfallschritte (Körpergewicht)',
    'Pike Push-ups': 'Liegestütze',
    Kreuzheben: 'Rumänisches Kreuzheben',
    'L-Sit': 'Plank',
    'Handstand halten': 'Plank',
  }
  return swaps[name] ?? name
}

/** Zwei Mobilitätsübungen zum Abschluss, passend zu dem, was an dem Tag trainiert wurde. */
const MOBILITY_FINISHER: Record<'lower' | 'upper' | 'full', string[]> = {
  lower: ['90/90 Hüftrotation', 'Couch Stretch'],
  upper: ['Thorax-Rotation', 'Wall Slides'],
  full: ['Weltbeste Dehnung', 'Thorax-Rotation'],
}
const FINISHER_FOR: Record<DayKind, keyof typeof MOBILITY_FINISHER> = {
  fullA: 'full', fullB: 'full', fullC: 'full', upper: 'upper', push: 'upper', pull: 'upper',
  lower: 'lower', legs: 'lower', glutes: 'lower',
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
/** Halteübungen in Sätzen mit Sekunden statt einmal am Stück. Schwere Skills kürzer. */
const HOLD_SECONDS: Record<string, [number, number]> = {
  Plank: [30, 60], 'Side Plank': [30, 60], Wandsitzen: [30, 60],
  'Hollow Hold': [20, 40], 'L-Sit': [10, 20], 'Handstand halten': [15, 30], 'Farmer’s Walk': [30, 45],
}
const MOBILITY_NAMES = new Set(EXERCISE_CATALOG.filter((entry) => entry.group === 'Mobilität').map((entry) => entry.name))

/** Vorschlag, welche Tage bei n Trainings pro Woche gut verteilt sind. 0 = Sonntag. */
export function suggestWeekdays(count: number): number[] {
  const presets: Record<number, number[]> = {
    1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6],
  }
  return presets[Math.min(6, Math.max(1, count))]
}

/** Welche Tagesart an welchem Trainingstag dran ist, abhängig von Anzahl und Ort. */
export function dayKinds(count: number, location: Location, focus: Focus = 'balanced'): { kinds: DayKind[]; split: string } {
  const cycle = (kinds: DayKind[]) => Array.from({ length: count }, (_, index) => kinds[index % kinds.length])
  if (count <= 3) return { kinds: cycle(['fullA', 'fullB', 'fullC']), split: 'full_body' }
  // Fokus Bauch, Beine & Po: ab 4 Tagen zwei Unterkörper-Tage pro Woche, einer davon mit Fokus Po.
  if (focus === 'lower') return { kinds: cycle(['lower', 'upper', 'glutes', 'upper', 'lower', 'glutes']), split: 'custom' }
  if (count === 4 || location === 'bodyweight' || location === 'calisthenics') return { kinds: cycle(['upper', 'lower']), split: 'upper_lower' }
  if (count === 5) return { kinds: ['push', 'pull', 'legs', 'upper', 'lower'], split: 'custom' }
  return { kinds: cycle(['push', 'pull', 'legs']), split: 'push_pull_legs' }
}

function setsFor(goal: Goal, experience: Experience): number {
  if (goal === 'strength') return experience === 'beginner' ? 3 : 4
  if (goal === 'hypertrophy') return experience === 'advanced' ? 4 : 3
  if (goal === 'fitness') return experience === 'beginner' ? 2 : 3
  return 3
}

/** Schwere Körpergewichtsübungen: wenige Wiederholungen, sonst schafft sie kaum jemand. */
const HARD_BODYWEIGHT = new Set(['Klimmzüge (Körpergewicht)', 'Chin-ups', 'Muscle-ups', 'Dips', 'Pistol Squats', 'Pike Push-ups'])

function repsFor(goal: Goal, position: number, bodyweight: boolean, name: string): [number, number] {
  if (HARD_BODYWEIGHT.has(name)) return goal === 'strength' ? [3, 6] : [5, 10]
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
    // Mobilität: 2 ruhige Sätze à 30–60 Sekunden zum Abschluss.
    const mobility = MOBILITY_NAMES.has(name)
    const hold = mobility ? [30, 60] : HOLD_SECONDS[name]
    const holdSets = mobility ? 2 : Math.min(sets, 3)
    return {
      name, tracking_type: item.tracking_type, alternative_exercise_id: null,
      sets_min: hold ? holdSets : 1, sets_max: hold ? holdSets : 1,
      reps_min: null, reps_max: null,
      duration_min: hold ? hold[0] : 600, duration_max: hold ? hold[1] : 900,
    }
  }
  const [repsMin, repsMax] = repsFor(answers.goal, position, item.tracking_type === 'reps', name)
  return {
    name, tracking_type: item.tracking_type, alternative_exercise_id: null,
    sets_min: sets, sets_max: sets, reps_min: repsMin, reps_max: repsMax,
    duration_min: null, duration_max: null,
  }
}

export function buildOnboardingPlan(answers: OnboardingAnswers): GeneratedPlan {
  const weekdays = [...new Set(answers.weekdays)].sort((a, b) => a - b)
  const focus = answers.focus ?? 'balanced'
  const { kinds, split } = dayKinds(weekdays.length, answers.location, focus)
  const perDay = exercisesPerSession(answers.minutes)
  const templates = focus === 'lower' ? LOWER_TEMPLATES[answers.location]
    : (focus === 'athletic' && ATHLETIC_TEMPLATES[answers.location]) || TEMPLATES[answers.location]
  const cardio = CARDIO[answers.location]
  const days: PlanDayDraft[] = weekdays.map((weekday, index) => {
    const kind = kinds[index]
    let main = templates[kind] ?? []
    // Leichtere Varianten können doppelt vorkommen, dann bleibt die erste.
    if (answers.experience === 'beginner') main = [...new Set(main.map((name) => beginnerVariant(name, answers.location)))]
    const names = [
      ...main.slice(0, perDay),
      ...(answers.goal === 'cut' ? [cardio.finisher] : []),
      ...(answers.mobility ? MOBILITY_FINISHER[FINISHER_FOR[kind]] : []),
    ]
    return {
      weekday,
      name: DAY_NAMES[kind],
      exercises: names.map((name, position) => buildExercise(name, position, answers)),
    }
  })
  // Cardio-Tag nur, wenn danach noch ein Ruhetag bleibt.
  const cardioWeekday = answers.cardioDay && weekdays.length < 6 ? CARDIO_DAY_ORDER.find((day) => !weekdays.includes(day)) : undefined
  if (cardioWeekday !== undefined) {
    const item = EXERCISE_CATALOG.find((entry) => entry.name === cardio.day)!
    days.push({
      weekday: cardioWeekday,
      name: 'Cardio',
      exercises: [{
        name: cardio.day, tracking_type: item.tracking_type, alternative_exercise_id: null,
        sets_min: 1, sets_max: 1, reps_min: null, reps_max: null, duration_min: 1800, duration_max: 2700,
      }],
    })
    days.sort((a, b) => a.weekday - b.weekday)
  }
  const method = answers.goal === 'strength' ? 'strength' : answers.goal === 'hypertrophy' ? 'hypertrophy' : 'classic'
  return { days, method, split, restSeconds: REST_SECONDS[answers.goal] }
}
