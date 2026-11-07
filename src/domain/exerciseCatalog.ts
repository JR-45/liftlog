import type { TrackingType } from './sets'

export type CatalogExercise = { name: string; group: string; tracking_type: TrackingType }

const groups: { group: string; tracking_type: TrackingType; names: string[] }[] = [
  { group: 'Brust', tracking_type: 'weight_reps', names: [
    'Bankdrücken', 'Bankdrücken (Kurzhanteln)', 'Schrägbankdrücken', 'Schrägbankpresse',
    'Brustpresse', 'Butterfly', 'Butterfly am Kabelzug', 'Fliegende (Kurzhanteln)', 'Überzüge (Kurzhantel)',
  ] },
  { group: 'Rücken', tracking_type: 'weight_reps', names: [
    'Latziehen', 'Latziehen (enger Griff)', 'Rudern sitzend', 'Rudern am Kabelzug', 'Langhantelrudern',
    'Kurzhantelrudern', 'T-Bar-Rudern', 'Rudermaschine', 'Lat-Überzüge', 'Kreuzheben', 'Rack Pulls',
  ] },
  { group: 'Schultern', tracking_type: 'weight_reps', names: [
    'Schulterdrücken', 'Schulterdrücken (Kurzhanteln)', 'Arnold Press', 'Seitheben', 'Seitheben am Kabelzug',
    'Seitheben an der Maschine', 'Frontheben', 'Reverse Butterfly', 'Facepulls', 'Shrugs',
  ] },
  { group: 'Bizeps', tracking_type: 'weight_reps', names: [
    'Bizepscurls (Kurzhanteln)', 'Langhantelcurls', 'SZ-Curls', 'Hammercurls', 'Preacher Curls',
    'Kabelcurls', 'Face Away Cable Curls', 'Konzentrationscurls', 'Schrägbankcurls',
  ] },
  { group: 'Trizeps', tracking_type: 'weight_reps', names: [
    'Trizeps Extensions (nach unten)', 'Trizepsdrücken über Kopf', 'French Press', 'Skull Crushers',
    'Trizeps-Kickbacks', 'Enges Bankdrücken', 'Trizepsmaschine',
  ] },
  { group: 'Beine & Gesäß', tracking_type: 'weight_reps', names: [
    'Kniebeugen', 'Frontkniebeugen', 'Goblet Squats', 'Hackenschmidt-Kniebeugen', 'Kniebeugen an der Multipresse',
    'Beinpresse', 'Beinstrecker', 'Beinbeuger', 'Beinbeuger sitzend', 'Rumänisches Kreuzheben',
    'Ausfallschritte (Kurzhanteln)', 'Bulgarian Split Squats', 'Step-ups', 'Hip Thrusts', 'Glute Kickbacks',
    'Abduktorenmaschine', 'Adduktorenmaschine', 'Wadenheben stehend', 'Wadenheben sitzend',
  ] },
  { group: 'Bauch & Rumpf', tracking_type: 'weight_reps', names: [
    'Crunches am Kabelzug', 'Bauchmaschine', 'Russian Twists (mit Gewicht)', 'Pallof Press', 'Woodchoppers',
  ] },
  { group: 'Körpergewicht', tracking_type: 'reps', names: [
    'Liegestütze', 'Dips', 'Kniebeugen (Körpergewicht)', 'Ausfallschritte (Körpergewicht)',
    'Crunches', 'Situps (Schrägbank)', 'Beinheben hängend', 'Beinheben liegend', 'Hyperextensions',
    'Glute Bridge', 'Burpees', 'Mountain Climbers', 'Rudern am Schlingentrainer',
  ] },
  { group: 'Gewichtshilfe', tracking_type: 'assisted_reps', names: ['Klimmzüge mit Gewichtshilfe', 'Dips mit Gewichtshilfe'] },
  { group: 'Körpergewicht mit Zusatzgewicht', tracking_type: 'weight_reps', names: ['Klimmzüge', 'Klimmzüge mit Zusatzgewicht', 'Dips mit Zusatzgewicht'] },
  { group: 'Funktionelles Training', tracking_type: 'weight_reps', names: [
    'Kettlebell Swings', 'Kettlebell Complex', 'Kettlebell Clean', 'Kettlebell Press', 'Thrusters', 'Medizinball-Slams',
  ] },
  { group: 'Ausdauer & Halteübungen', tracking_type: 'duration', names: [
    'Laufband', 'Fahrradergometer', 'Liegeergometer', 'Spinning-Bike', 'Crosstrainer', 'Ruderergometer',
    'Stairmaster', 'Air Bike', 'SkiErg', 'Seilspringen', 'Battle Ropes', 'Plank', 'Side Plank',
    'Wandsitzen', 'Farmer’s Walk', 'Schlitten schieben', 'Mobilität & Dehnen',
  ] },
]

export const EXERCISE_CATALOG: CatalogExercise[] = groups.flatMap(({ group, tracking_type, names }) =>
  names.map((name) => ({ name, group, tracking_type })),
)

function normalize(value: string): string {
  return value.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('ß', 'ss')
}

export function findExercises(query: string, group = ''): CatalogExercise[] {
  const words = normalize(query).trim().split(/\s+/)
  return EXERCISE_CATALOG.filter((exercise) => (!group || exercise.group === group) &&
    words.every((word) => normalize(`${exercise.name} ${exercise.group}`).includes(word)))
}
