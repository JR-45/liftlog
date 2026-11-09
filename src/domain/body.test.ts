import { describe, expect, it } from 'vitest'
import { ageFromBirthYear, analyzeBody, type BodyInput, mifflinBmr, navyBodyFat, weightPace, dateInMonths, daysUntil, describePace } from './body'

const base: BodyInput = {
  weightKg: 80,
  heightCm: 180,
  sex: 'male',
  age: 30,
  activity: 'moderate',
  goal: 'hypertrophy',
  targetWeightKg: 78,
  bodyFatPct: null,
  neckCm: 38,
  waistCm: 85,
  hipsCm: 98,
}

describe('navyBodyFat', () => {
  it('schätzt Männer aus Hals, Taille und Größe', () => {
    expect(navyBodyFat('male', 180, 38, 85, null)).toBeCloseTo(16.1, 0)
  })

  it('braucht bei Frauen die Hüfte', () => {
    expect(navyBodyFat('female', 165, 32, 72, null)).toBeNull()
    expect(navyBodyFat('female', 165, 32, 72, 98)).toBeCloseTo(27.4, 0)
  })

  it('gibt null, wenn die Taille nicht größer als der Hals ist', () => {
    expect(navyBodyFat('male', 180, 40, 40, null)).toBeNull()
  })
})

describe('mifflinBmr', () => {
  it('rechnet Männer und Frauen unterschiedlich', () => {
    expect(mifflinBmr('male', 80, 180, 30)).toBe(1780)
    expect(mifflinBmr('female', 80, 180, 30)).toBe(1614)
  })
})

describe('analyzeBody', () => {
  it('berechnet alle Werte, wenn alles vorhanden ist', () => {
    const result = analyzeBody(base)
    expect(result.bmi).toBe(24.7)
    expect(result.bmiCategory).toBe('Normalgewicht')
    expect(result.waistToHeight).toBe(0.47)
    expect(result.waistToHeightRating).toBe('good')
    expect(result.waistToHip).toBe(0.87)
    expect(result.waistToHipRating).toBe('elevated')
    expect(result.bodyFatSource).toBe('navy')
    expect(result.leanMassKg).not.toBeNull()
    expect(result.ffmi).not.toBeNull()
    expect(result.bmrKcal).toBe(1780)
    expect(result.tdeeKcal).toBe(Math.round(1780 * 1.55))
    // Zielgewicht 78 kg liegt unter 80 kg: Defizit trotz Ziel Muskelaufbau.
    expect(result.targetKcal).toBe(Math.round(1780 * 1.55) - 500)
    expect(result.proteinG).toBe(176)
    expect(result.diffToTargetKg).toBe(2)
  })

  it('bevorzugt gemessenes Körperfett vor der Schätzung', () => {
    const result = analyzeBody({ ...base, bodyFatPct: 12 })
    expect(result.bodyFatPct).toBe(12)
    expect(result.bodyFatSource).toBe('measured')
    expect(result.fatMassKg).toBe(9.6)
    expect(result.leanMassKg).toBe(70.4)
  })

  it('lässt Werte leer, wenn Angaben fehlen', () => {
    const result = analyzeBody({ ...base, sex: null, age: null, activity: null, neckCm: null, waistCm: null })
    expect(result.bmi).toBe(24.7)
    expect(result.bodyFatPct).toBeNull()
    expect(result.bmrKcal).toBeNull()
    expect(result.tdeeKcal).toBeNull()
    expect(result.waistToHeight).toBeNull()
  })

  it('braucht für den Tagesbedarf die Aktivität', () => {
    const result = analyzeBody({ ...base, activity: null })
    expect(result.bmrKcal).toBe(1780)
    expect(result.tdeeKcal).toBeNull()
    expect(result.targetKcal).toBeNull()
  })

  it('zieht im Fettabbau Kalorien ab und erhöht das Eiweiß', () => {
    const result = analyzeBody({ ...base, goal: 'cut' })
    expect(result.targetKcal).toBe(Math.round(1780 * 1.55) - 500)
    expect(result.proteinG).toBe(176)
  })

  it('nutzt ohne Zielgewicht das Trainingsziel', () => {
    const result = analyzeBody({ ...base, targetWeightKg: null })
    expect(result.targetKcal).toBe(Math.round(1780 * 1.55) + 300)
    expect(result.proteinG).toBe(144)
  })

  it('rechnet mit Überschuss, wenn das Zielgewicht über dem Gewicht liegt', () => {
    const result = analyzeBody({ ...base, goal: 'cut', targetWeightKg: 85 })
    expect(result.targetKcal).toBe(Math.round(1780 * 1.55) + 300)
    expect(result.proteinG).toBe(144)
  })

  it('folgt dem Trainingsziel, wenn das Zielgewicht fast erreicht ist', () => {
    expect(analyzeBody({ ...base, targetWeightKg: 79.5 }).targetKcal).toBe(Math.round(1780 * 1.55) + 300)
  })

  it('ignoriert unrealistische Größe', () => {
    expect(analyzeBody({ ...base, heightCm: 40 }).bmi).toBeNull()
  })
})

describe('ageFromBirthYear', () => {
  it('rechnet das Alter zum aktuellen Jahr', () => {
    expect(ageFromBirthYear(1996, '2026-11-07')).toBe(30)
    expect(ageFromBirthYear(null, '2026-11-07')).toBeNull()
  })
})

describe('Zielgewicht mit Termin', () => {
  // 80 kg, 1,80 m, 30 Jahre, Mann, aktiv: Grundumsatz 1780, Bedarf 2759 kcal.
  it('rechnet das Kalorienziel aus Zielgewicht und Zeitraum', () => {
    const in3Months = analyzeBody({ ...base, targetWeightKg: 77, daysToTarget: 90 })
    expect(in3Months.pace).toEqual({ kgPerWeek: -0.23, status: 'ok', recommendedWeeks: 5, floored: false })
    expect(in3Months.targetKcal).toBe(2510)
    const in1Month = analyzeBody({ ...base, targetWeightKg: 77, daysToTarget: 30 })
    expect(in1Month.pace?.kgPerWeek).toBe(-0.7)
    expect(in1Month.targetKcal).toBe(1990)
  })

  it('warnt bei mehr als 1 % pro Woche und hebt auf die Untergrenze', () => {
    const crash = analyzeBody({ ...base, targetWeightKg: 72, daysToTarget: 30 })
    expect(crash.pace?.status).toBe('too_fast')
    expect(crash.pace?.floored).toBe(true)
    expect(crash.targetKcal).toBe(1780)
  })

  it('warnt beim Zunehmen schon ab 0,5 % pro Woche', () => {
    expect(weightPace(80, 84, 30).status).toBe('too_fast')
    expect(weightPace(80, 82, 120).status).toBe('ok')
  })

  it('bleibt ohne Termin oder bei weniger als 1 kg beim festen Ziel', () => {
    expect(analyzeBody({ ...base, targetWeightKg: 77 }).pace).toBeNull()
    expect(analyzeBody({ ...base, targetWeightKg: 79.5, daysToTarget: 30 }).pace).toBeNull()
    expect(analyzeBody({ ...base, targetWeightKg: 77, daysToTarget: 0 }).pace).toBeNull()
  })
})

describe('Wunschtermin', () => {
  it('rechnet Monate und Tage', () => {
    expect(dateInMonths('2026-11-09', 3)).toBe('2027-02-09')
    expect(dateInMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(daysUntil('2026-11-09', '2026-12-09')).toBe(30)
    expect(daysUntil('2026-11-09', '2026-11-01')).toBe(-8)
  })
})

describe('describePace', () => {
  it('beschreibt Tempo und warnt mit gesundem Termin', () => {
    expect(describePace({ kgPerWeek: -0.7, status: 'ok', recommendedWeeks: 5, floored: false }, '2026-11-09'))
      .toEqual({ rate: '−0,7 kg pro Woche', warning: null, healthyDate: '2026-12-14' })
    const tooFast = describePace({ kgPerWeek: -1.87, status: 'too_fast', recommendedWeeks: 14, floored: true }, '2026-11-09')
    expect(tooFast.warning).toBe('Zu schnell und ungesund. Gesund wäre bis 15. Feb. 2027.')
    expect(describePace({ kgPerWeek: 0.2, status: 'ok', recommendedWeeks: 10, floored: true }, '2026-11-09').warning)
      .toBe('Kalorienziel auf die gesunde Untergrenze angehoben.')
  })
})
