/**
 * Anleitungen, 2-Phasen-Animationen und Zielmuskeln für Übungen.
 * Bildmaterial orientiert sich an anatomischen 3D-Modellen mit Zielmuskel-Hervorhebung.
 */

export type ExerciseGuide = {
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  /** [Frame 1 (Start/Dehnung), Frame 2 (Endposition/Kontraktion)] */
  frames: [string, string]
  tips: string[]
}

const GUIDES: Record<string, ExerciseGuide> = {
  bankdruecken: {
    name: 'Bankdrücken',
    primaryMuscles: ['Brust (Pectoralis major)'],
    secondaryMuscles: ['Trizeps', 'Vordere Schulter'],
    frames: [
      'https://static.strengthlevel.com/images/exercises/bench-press/howto/bench-press-howto-1-800.jpg',
      'https://static.strengthlevel.com/images/exercises/bench-press/howto/bench-press-howto-2-800.jpg',
    ],
    tips: [
      'Schulterblätter auf der Bank zusammenziehen und fixieren.',
      'Hantel kontrolliert bis auf die untere Brust absenken.',
      'Ellenbogen nicht 90° abspreizen, sondern leicht nach innen führen (ca. 45–70°).',
    ],
  },
  schraegbankpresse: {
    name: 'Schrägbankpresse',
    primaryMuscles: ['Obere Brust (Clavicular head)'],
    secondaryMuscles: ['Vordere Schulter', 'Trizeps'],
    frames: [
      'https://static.strengthlevel.com/images/exercises/incline-bench-press/howto/incline-bench-press-howto-1-800.jpg',
      'https://static.strengthlevel.com/images/exercises/incline-bench-press/howto/incline-bench-press-howto-2-800.jpg',
    ],
    tips: [
      'Bankwinkel auf 30–45 Grad einstellen.',
      'Stange kontrolliert zum Schlüsselbein / oberen Brustbereich führen.',
      'Füße fest im Boden verankern.',
    ],
  },
  kniebeugen: {
    name: 'Kniebeugen',
    primaryMuscles: ['Quadrizeps (Beinstrecker)', 'Gesäß (Gluteus maximus)'],
    secondaryMuscles: ['Beinbeuger', 'Unterer Rücken', 'Core'],
    frames: [
      'https://static.strengthlevel.com/images/exercises/squat/howto/squat-howto-1-800.jpg',
      'https://static.strengthlevel.com/images/exercises/squat/howto/squat-howto-2-800.jpg',
    ],
    tips: [
      'Schulterbreiter Stand, Fußspitzen leicht nach außen gedreht.',
      'Hüfte nach hinten und unten schieben, Brust aufrecht halten.',
      'Mindestens parallel zum Boden absenken, Knie folgen den Zehen.',
    ],
  },
  kreuzheben: {
    name: 'Kreuzheben',
    primaryMuscles: ['Beinbeuger (Hamstrings)', 'Gesäß (Gluteus)', 'Unterer Rücken'],
    secondaryMuscles: ['Latissimus', 'Nacken (Trapez)', 'Griffkraft'],
    frames: [
      'https://static.strengthlevel.com/images/exercises/deadlift/howto/deadlift-howto-1-800.jpg',
      'https://static.strengthlevel.com/images/exercises/deadlift/howto/deadlift-howto-2-800.jpg',
    ],
    tips: [
      'Stange liegt mittig über dem Fuß, nah an den Schienbeinen.',
      'Rücken gerade, Brust raus, Schultern über oder leicht vor der Stange.',
      'Gewicht aus Beinen und Hüfte heben, oben die Hüfte durchstrecken.',
    ],
  },
  schulterdruecken: {
    name: 'Schulterdrücken',
    primaryMuscles: ['Vordere & seitliche Schulter (Deltoideus)'],
    secondaryMuscles: ['Trizeps', 'Oberer Trapez'],
    frames: [
      'https://static.strengthlevel.com/images/exercises/shoulder-press/howto/shoulder-press-howto-1-800.jpg',
      'https://static.strengthlevel.com/images/exercises/shoulder-press/howto/shoulder-press-howto-2-800.jpg',
    ],
    tips: [
      'Core anspannen und Po festmachen, um ein Hohlkreuz zu vermeiden.',
      'Stange vertikal nach oben drücken, Kopf leicht nach hinten ausweichen lassen.',
      'Oben Kopf wieder nach vorne und Arme stabil durchdrücken.',
    ],
  },
  klimmzuege: {
    name: 'Klimmzüge',
    primaryMuscles: ['Latissimus (Breiter Rückenmuskel)'],
    secondaryMuscles: ['Bizeps', 'Trapez', 'Hintere Schulter'],
    frames: [
      'https://static.strengthlevel.com/images/exercises/pull-ups/howto/pull-ups-howto-1-800.jpg',
      'https://static.strengthlevel.com/images/exercises/pull-ups/howto/pull-ups-howto-2-800.jpg',
    ],
    tips: [
      'Volle Streckung in der Dehnung, Schulterblätter vor dem Zug nach unten ziehen.',
      'Brust zur Stange ziehen, nicht nur das Kinn drüberwürgen.',
      'Bewegung kontrolliert und ohne Schwung ausführen.',
    ],
  },
  rudernsitzend: {
    name: 'Rudern sitzend',
    primaryMuscles: ['Mittlerer Rücken (Rhomboiden, Trapez)', 'Latissimus'],
    secondaryMuscles: ['Bizeps', 'Hintere Schulter'],
    frames: [
      'https://static.strengthlevel.com/images/exercises/seated-cable-row/howto/seated-cable-row-howto-1-800.jpg',
      'https://static.strengthlevel.com/images/exercises/seated-cable-row/howto/seated-cable-row-howto-2-800.jpg',
    ],
    tips: [
      'Aufrechte Sitzposition mit leicht gebeugten Knien.',
      'Griff zum Bauchnabel ziehen und die Schulterblätter hinten zusammendrücken.',
      'Oberkörper nicht mit Schwung nach hinten werfen.',
    ],
  },
  seitheben: {
    name: 'Seitheben',
    primaryMuscles: ['Seitliche Schulter (Lateral deltoid)'],
    secondaryMuscles: ['Trapez', 'Vordere Schulter'],
    frames: [
      'https://static.strengthlevel.com/images/exercises/dumbbell-lateral-raise/howto/dumbbell-lateral-raise-howto-1-800.jpg',
      'https://static.strengthlevel.com/images/exercises/dumbbell-lateral-raise/howto/dumbbell-lateral-raise-howto-2-800.jpg',
    ],
    tips: [
      'Leichte Vorneigung des Oberkörpers (ca. 10–15°).',
      'Kurzhanteln kontrolliert bis auf Schulterhöhe anheben.',
      'Ellenbogen führen die Bewegung, nicht die Hände.',
    ],
  },
}

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '')
}

export function findExerciseGuide(exerciseName: string): ExerciseGuide | null {
  const key = normalizeKey(exerciseName)
  if (GUIDES[key]) return GUIDES[key]

  // Alias-Suche (z. B. "Flachbankdrücken" -> "bankdruecken", "Squats" -> "kniebeugen")
  if (key.includes('bankdrueck') && !key.includes('schraeg')) return GUIDES.bankdruecken
  if (key.includes('schraegbank')) return GUIDES.schraegbankpresse
  if (key.includes('kniebeug') || key.includes('squat')) return GUIDES.kniebeugen
  if (key.includes('kreuzheb') || key.includes('deadlift')) return GUIDES.kreuzheben
  if (key.includes('schulterdrueck') || key.includes('militarypress')) return GUIDES.schulterdruecken
  if (key.includes('klimmzug') || key.includes('klimmzuege') || key.includes('pullup')) return GUIDES.klimmzuege
  if (key.includes('rudern')) return GUIDES.rudernsitzend
  if (key.includes('seitheb')) return GUIDES.seitheben

  return null
}
