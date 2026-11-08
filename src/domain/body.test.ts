import { describe, expect, it } from 'vitest'
import { ageFromBirthYear, analyzeBody, type BodyInput, mifflinBmr, navyBodyFat } from './body'

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
