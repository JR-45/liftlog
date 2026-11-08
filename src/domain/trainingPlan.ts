import { EXERCISE_CATALOG } from './exerciseCatalog'
import type { TrackingType } from './sets'

export type PlanExerciseDraft = {
  name: string; tracking_type: TrackingType; alternative_exercise_id: string | null
  sets_min: number; sets_max: number; reps_min: number | null; reps_max: number | null
  duration_min: number | null; duration_max: number | null
  /** Bewegungen eines Zirkels, z. B. Swing, Clean, Thruster. Leer oder fehlend = normale Übung. */
  steps?: string[]
}
export type PlanDayDraft = { weekday: number; name: string; exercises: PlanExerciseDraft[] }

/** Entfernt leere Bewegungsfelder vor dem Speichern. Ohne Bewegungen bleibt eine normale Übung übrig. */
export function withCleanSteps(days: PlanDayDraft[]): PlanDayDraft[] {
  return days.map((day) => ({
    ...day,
    exercises: day.exercises.map(({ steps, ...exercise }) => {
      const filled = (steps ?? []).map((step) => step.trim()).filter(Boolean)
      return filled.length > 0 ? { ...exercise, steps: filled } : exercise
    }),
  }))
}

export const PLAN_SPLITS = [
  { id: 'custom', name: 'Individuell' },
  { id: 'full_body', name: 'Ganzkörper (3 Tage)' },
  { id: 'upper_lower', name: 'Oberkörper / Unterkörper (4 Tage)' },
  { id: 'push_pull_legs', name: 'Push / Pull / Beine (6 Tage)' },
]

export const TRAINING_METHODS = [
  { id: 'classic', name: 'Klassisches Satztraining', hint: 'Beende die Sätze einer Übung, bevor du zur nächsten wechselst. Starte mit 2–3 Sätzen und ausreichend Pause.' },
  { id: 'hypertrophy', name: 'Muskelaufbau', hint: 'Beispiel: 3 Sätze mit 8–12 Wiederholungen. Steigere die Belastung schrittweise, wenn du die Vorgabe sauber schaffst.' },
  { id: 'strength', name: 'Krafttraining', hint: 'Beispiel für Geübte: 3 Sätze mit 4–6 Wiederholungen bei Grundübungen. Plane längere Satzpausen und wähle ein kontrollierbares Gewicht.' },
  { id: 'endurance', name: 'Kraftausdauer', hint: 'Beispiel: 2 Sätze mit 15–20 Wiederholungen und leichterer Belastung. Saubere Bewegung geht vor Tempo.' },
  { id: 'supersets', name: 'Supersätze', hint: 'Beispiel: Brustpresse und Rudern abwechseln, ebenso Bizeps und Trizeps. Nach jedem Paar pausieren. Die App erfasst die Übungen einzeln.' },
  { id: 'circuit', name: 'Zirkeltraining', hint: 'Beispiel: eine Runde durch die vorgeschlagenen Übungen, danach pausieren. Wiederhole den Zirkel zweimal mit kontrollierter Belastung.' },
  { id: 'hiit', name: 'Intervalltraining / HIIT', hint: 'Beispiel für Geübte: auf dem Ergometer 6 Wechsel aus 30 Sekunden zügig und 90 Sekunden locker. Vorher aufwärmen, danach locker ausfahren.' },
  { id: 'cardio', name: 'Ausdauertraining', hint: 'Beispiel: 20 Minuten auf dem Ergometer in einem Tempo, bei dem du noch sprechen kannst. Dauer nach und nach erhöhen.' },
  { id: 'functional', name: 'Funktionelles Training', hint: 'Kombiniere Kniebeugen, Drücken, Ziehen und Tragen. Starte mit kontrollierten Bewegungen; Kettlebell-Technik vorher erlernen.' },
  { id: 'mobility', name: 'Mobilität & Beweglichkeit', hint: 'Beispiel: 10 Minuten ruhige Mobilitätsübungen. Bewege dich kontrolliert und ohne Schmerzen durch deinen verfügbaren Bewegungsumfang.' },
]

function exercise(name: string, method: string): PlanExerciseDraft {
  const item = EXERCISE_CATALOG.find((entry) => entry.name === name)
  if (!item) throw new Error(`Übung fehlt im Katalog: ${name}`)
  const duration = item.tracking_type === 'duration'
  const min = method === 'endurance' ? 15 : method === 'strength' ? 4 : 8
  const max = method === 'endurance' ? 20 : method === 'strength' ? 6 : 12
  const sets = ['endurance', 'circuit'].includes(method) ? 2 : 3
  return {
    ...item, alternative_exercise_id: null, sets_min: duration ? 1 : sets, sets_max: duration ? 1 : sets,
    reps_min: duration ? null : min, reps_max: duration ? null : max,
    duration_min: duration ? (name === 'Plank' ? 30 : method === 'mobility' ? 600 : method === 'hiit' ? 720 : 1200) : null,
    duration_max: duration ? (name === 'Plank' ? 60 : method === 'mobility' ? 600 : method === 'hiit' ? 720 : 1200) : null,
  }
}

/** Beispielpläne, keine individuelle Trainingsverordnung. Jede Übernahme erzeugt neue Entwürfe. */
export function recommendPlan(method: string, split: string): PlanDayDraft[] {
  const day = (weekday: number, name: string, names: string[]): PlanDayDraft => ({
    weekday, name, exercises: names.map((name) => exercise(name, method)),
  })
  if (['cardio', 'hiit', 'mobility'].includes(method)) {
    const name = method === 'mobility' ? 'Mobilität & Dehnen' : 'Fahrradergometer'
    return [1, 4].map((weekday) => day(weekday, TRAINING_METHODS.find((item) => item.id === method)!.name, [name]))
  }
  if (method === 'functional') return [1, 3, 5].map((weekday) => day(weekday, 'Funktionelles Training',
    ['Goblet Squats', 'Liegestütze', 'Rudern am Schlingentrainer', 'Farmer’s Walk', 'Plank']))
  if (method === 'supersets') return [1, 3, 5].map((weekday) => day(weekday, 'Ganzkörper · Supersätze',
    ['Brustpresse', 'Rudern sitzend', 'Beinpresse', 'Beinbeuger', 'Kabelcurls', 'Trizeps Extensions (nach unten)']))
  if (method === 'circuit') return [1, 3, 5].map((weekday) => day(weekday, 'Ganzkörper · Zirkel',
    ['Beinpresse', 'Brustpresse', 'Rudern sitzend', 'Beinbeuger', 'Schulterdrücken', 'Crunches']))
  if (split === 'upper_lower') return [
    ...[1, 4].map((weekday) => day(weekday, 'Oberkörper', ['Brustpresse', 'Rudern sitzend', 'Latziehen', 'Schulterdrücken', 'Kabelcurls', 'Trizeps Extensions (nach unten)'])),
    ...[2, 5].map((weekday) => day(weekday, 'Unterkörper', ['Beinpresse', 'Rumänisches Kreuzheben', 'Beinbeuger', 'Beinstrecker', 'Wadenheben stehend', 'Crunches'])),
  ].sort((a, b) => a.weekday - b.weekday)
  if (split === 'push_pull_legs') return [
    ...[1, 4].map((weekday) => day(weekday, 'Push', ['Bankdrücken', 'Schrägbankpresse', 'Schulterdrücken', 'Seitheben', 'Trizeps Extensions (nach unten)'])),
    ...[2, 5].map((weekday) => day(weekday, 'Pull', ['Latziehen', 'Rudern sitzend', 'Reverse Butterfly', 'Facepulls', 'Hammercurls'])),
    ...[3, 6].map((weekday) => day(weekday, 'Beine', ['Kniebeugen', 'Rumänisches Kreuzheben', 'Beinbeuger', 'Beinstrecker', 'Wadenheben stehend'])),
  ].sort((a, b) => a.weekday - b.weekday)
  return [1, 3, 5].map((weekday) => day(weekday, 'Ganzkörper',
    ['Beinpresse', 'Brustpresse', 'Rudern sitzend', 'Beinbeuger', 'Latziehen', 'Schulterdrücken', 'Wadenheben stehend', 'Crunches']))
}
