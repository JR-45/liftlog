// Körperdaten-Berechnungen ohne React und Datenbank. Alle Werte sind Schätzungen für den
// Alltag, keine medizinische Diagnose.

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'hypertrophy' | 'strength' | 'cut' | 'fitness'

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Kaum Bewegung (Büro)',
  light: 'Leicht aktiv (1–2× Sport)',
  moderate: 'Aktiv (3–4× Sport)',
  active: 'Sehr aktiv (5–6× Sport)',
  very_active: 'Extrem aktiv (täglich + körperliche Arbeit)',
}

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/** Kalorien-Anpassung pro Ziel gegenüber dem Tagesbedarf. */
const GOAL_CALORIE_OFFSET: Record<Goal, number> = { hypertrophy: 300, strength: 200, cut: -500, fitness: 0 }
/** Eiweiß in g pro kg Körpergewicht, im üblichen Bereich von 1,4 bis 2,2 g/kg. */
const GOAL_PROTEIN_PER_KG: Record<Goal, number> = { hypertrophy: 1.8, strength: 1.8, cut: 2.2, fitness: 1.4 }

export type BodyInput = {
  weightKg: number | null
  heightCm: number | null
  sex: Sex | null
  /** Alter in Jahren, z. B. aus dem Geburtsjahr. */
  age: number | null
  activity: ActivityLevel | null
  goal: Goal
  targetWeightKg: number | null
  /** Gemessener Körperfettanteil, z. B. von einer Waage. Hat Vorrang vor der Schätzung. */
  bodyFatPct: number | null
  neckCm: number | null
  waistCm: number | null
  hipsCm: number | null
}

export type Rating = 'good' | 'elevated' | 'high'

export type BodyAnalysis = {
  bmi: number | null
  bmiCategory: 'Untergewicht' | 'Normalgewicht' | 'Übergewicht' | 'Adipositas' | null
  /** Taille geteilt durch Größe. Unter 0,5 gilt als günstig. */
  waistToHeight: number | null
  waistToHeightRating: Rating | null
  /** Taille geteilt durch Hüfte. */
  waistToHip: number | null
  waistToHipRating: Rating | null
  bodyFatPct: number | null
  bodyFatSource: 'measured' | 'navy' | null
  leanMassKg: number | null
  fatMassKg: number | null
  /** Fettfreie-Masse-Index, auf 1,80 m Größe normalisiert. */
  ffmi: number | null
  /** Grundumsatz nach Mifflin-St Jeor in kcal. */
  bmrKcal: number | null
  /** Tagesbedarf mit Aktivitätsfaktor in kcal. */
  tdeeKcal: number | null
  /** Tagesbedarf angepasst ans Ziel in kcal. */
  targetKcal: number | null
  proteinG: number | null
  diffToTargetKg: number | null
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function validHeight(heightCm: number | null): heightCm is number {
  return heightCm !== null && heightCm >= 100 && heightCm <= 250
}

function validWeight(weightKg: number | null): weightKg is number {
  return weightKg !== null && weightKg >= 20 && weightKg <= 350
}

/** Körperfett nach der US-Navy-Formel. Ohne passende Umfänge null. */
export function navyBodyFat(
  sex: Sex,
  heightCm: number,
  neckCm: number,
  waistCm: number,
  hipsCm: number | null,
): number | null {
  if (sex === 'male') {
    if (waistCm <= neckCm) return null
    const value = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450
    return value >= 2 && value <= 70 ? round(value, 1) : null
  }
  if (hipsCm === null || waistCm + hipsCm <= neckCm) return null
  const value =
    495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipsCm - neckCm) + 0.221 * Math.log10(heightCm)) - 450
  return value >= 2 && value <= 70 ? round(value, 1) : null
}

/** Grundumsatz nach Mifflin-St Jeor in kcal pro Tag. */
export function mifflinBmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161))
}

/**
 * Ziel, nach dem Kalorien und Eiweiß gerechnet werden. Ein Zielgewicht mindestens 1 kg unter dem
 * Gewicht heißt abnehmen, eins mindestens 1 kg darüber zunehmen, egal welches Trainingsziel gewählt ist.
 */
export function effectiveGoal(goal: Goal, weightKg: number | null, targetWeightKg: number | null): Goal {
  if (weightKg === null || !validWeight(targetWeightKg)) return goal
  if (weightKg - targetWeightKg >= 1) return 'cut'
  if (targetWeightKg - weightKg >= 1 && (goal === 'cut' || goal === 'fitness')) return 'hypertrophy'
  return goal
}

export function analyzeBody(input: BodyInput): BodyAnalysis {
  const { weightKg, heightCm, sex, age, activity, targetWeightKg, neckCm, waistCm, hipsCm } = input
  const weight = validWeight(weightKg) ? weightKg : null
  const goal = effectiveGoal(input.goal, weight, targetWeightKg)
  const height = validHeight(heightCm) ? heightCm : null
  const meters = height === null ? null : height / 100

  let bmi: number | null = null
  let bmiCategory: BodyAnalysis['bmiCategory'] = null
  if (weight !== null && meters !== null) {
    bmi = round(weight / (meters * meters), 1)
    bmiCategory = bmi < 18.5 ? 'Untergewicht' : bmi < 25 ? 'Normalgewicht' : bmi < 30 ? 'Übergewicht' : 'Adipositas'
  }

  let waistToHeight: number | null = null
  let waistToHeightRating: Rating | null = null
  if (waistCm !== null && height !== null) {
    waistToHeight = round(waistCm / height, 2)
    waistToHeightRating = waistToHeight < 0.5 ? 'good' : waistToHeight < 0.6 ? 'elevated' : 'high'
  }

  // Grenzen der WHO: Ab 0,90 (Männer) bzw. 0,85 (Frauen) steigt das Risiko deutlich.
  let waistToHip: number | null = null
  let waistToHipRating: Rating | null = null
  if (waistCm !== null && hipsCm !== null && hipsCm > 0) {
    waistToHip = round(waistCm / hipsCm, 2)
    if (sex !== null) {
      const limit = sex === 'male' ? 0.9 : 0.85
      waistToHipRating = waistToHip < limit - 0.05 ? 'good' : waistToHip < limit ? 'elevated' : 'high'
    }
  }

  let bodyFatPct: number | null = null
  let bodyFatSource: BodyAnalysis['bodyFatSource'] = null
  if (input.bodyFatPct !== null) {
    bodyFatPct = input.bodyFatPct
    bodyFatSource = 'measured'
  } else if (sex !== null && height !== null && neckCm !== null && waistCm !== null) {
    bodyFatPct = navyBodyFat(sex, height, neckCm, waistCm, hipsCm)
    bodyFatSource = bodyFatPct === null ? null : 'navy'
  }

  let leanMassKg: number | null = null
  let fatMassKg: number | null = null
  let ffmi: number | null = null
  if (weight !== null && bodyFatPct !== null) {
    fatMassKg = round((weight * bodyFatPct) / 100, 1)
    leanMassKg = round(weight - fatMassKg, 1)
    if (meters !== null) ffmi = round(leanMassKg / (meters * meters) + 6.1 * (1.8 - meters), 1)
  }

  let bmrKcal: number | null = null
  let tdeeKcal: number | null = null
  let targetKcal: number | null = null
  if (weight !== null && height !== null && sex !== null && age !== null && age >= 10 && age <= 120) {
    bmrKcal = mifflinBmr(sex, weight, height, age)
    if (activity !== null) {
      tdeeKcal = Math.round(bmrKcal * ACTIVITY_FACTORS[activity])
      targetKcal = tdeeKcal + GOAL_CALORIE_OFFSET[goal]
    }
  }

  return {
    bmi,
    bmiCategory,
    waistToHeight,
    waistToHeightRating,
    waistToHip,
    waistToHipRating,
    bodyFatPct,
    bodyFatSource,
    leanMassKg,
    fatMassKg,
    ffmi,
    bmrKcal,
    tdeeKcal,
    targetKcal,
    proteinG: weight === null ? null : Math.round(weight * GOAL_PROTEIN_PER_KG[goal]),
    diffToTargetKg: weight !== null && validWeight(targetWeightKg) ? round(weight - targetWeightKg, 1) : null,
  }
}

/** Alter in vollen Jahren aus dem Geburtsjahr, gerechnet zum Jahr des angegebenen Datums. */
export function ageFromBirthYear(birthYear: number | null, today: string): number | null {
  if (birthYear === null) return null
  const age = Number(today.slice(0, 4)) - birthYear
  return age >= 0 ? age : null
}
