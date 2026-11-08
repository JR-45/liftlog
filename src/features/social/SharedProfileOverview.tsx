import { ageFromBirthYear, analyzeBody } from '../../domain/body'
import { computeAthleteStats } from '../../domain/profile'
import { sumNutrition } from '../../domain/nutrition'
import { formatWeight } from '../../domain/sets'
import { CARD, SECTION_TITLE } from '../../lib/ui'
import { NutritionValues } from '../nutrition/NutritionValues'
import type { SharedOverview } from './api'

const MEASUREMENTS = { weightKg: ['Gewicht', 'kg'], bodyFatPct: ['Körperfett', '%'], neckCm: ['Hals', 'cm'], chestCm: ['Brust', 'cm'], waistCm: ['Taille', 'cm'], hipsCm: ['Hüfte', 'cm'], armCm: ['Oberarm', 'cm'], thighCm: ['Oberschenkel', 'cm'], calfCm: ['Wade', 'cm'] } as const

/** Dieselben Daten wie im eigenen Profil, ausschließlich lesbar und ohne Kontoverwaltung. */
export function SharedProfileOverview({ overview, today }: { overview: SharedOverview; today: string }) {
  const profile = overview.profile
  const stats = computeAthleteStats(overview.sets, today, profile.weeklyTarget)
  const latest = (key: keyof typeof MEASUREMENTS) => [...overview.measurements].reverse().find(row => row[key] !== null)?.[key] ?? null
  const analysis = analyzeBody({ weightKg: latest('weightKg'), heightCm: profile.heightCm, sex: profile.sex,
    age: ageFromBirthYear(profile.birthYear, today), activity: profile.activityLevel, goal: profile.goal,
    targetWeightKg: profile.targetWeightKg, bodyFatPct: latest('bodyFatPct'), neckCm: latest('neckCm'), waistCm: latest('waistCm'), hipsCm: latest('hipsCm') })
  const metrics = [
    ['BMI', analysis.bmi, ''], ['Körperfett', analysis.bodyFatPct, '%'], ['Fettfreie Masse', analysis.leanMassKg, 'kg'],
    ['Fettmasse', analysis.fatMassKg, 'kg'], ['FFMI', analysis.ffmi, ''], ['Grundumsatz', analysis.bmrKcal, 'kcal'],
    ['Tagesbedarf', analysis.tdeeKcal, 'kcal'], ['Kalorienziel', analysis.targetKcal, 'kcal'], ['Proteinziel', analysis.proteinG, 'g'],
    ['Taille/Größe', analysis.waistToHeight, ''], ['Taille/Hüfte', analysis.waistToHip, ''],
  ] as const
  return <>
    <div className={CARD}>
      <h3 className={SECTION_TITLE}>Profilübersicht</h3>
      {profile.bio && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{profile.bio}</p>}
      <p className="mt-2 text-sm text-muted">{({ hypertrophy: 'Muskelaufbau', strength: 'Maximalkraft', cut: 'Definition & Fettabbau', fitness: 'Allgemeine Fitness' })[profile.goal]}</p>
      <p className="mt-3 text-xl font-semibold tabular-nums">{stats.thisWeekWorkouts} / {profile.weeklyTarget} Trainings diese Woche</p>
      <p className="text-sm text-muted">{stats.activeWeeksStreak} Wochen Serie</p>
    </div>
    <div className={CARD}>
      <h3 className={SECTION_TITLE}>Körperdaten</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        {([['Gewicht', latest('weightKg'), 'kg'], ['Größe', profile.heightCm, 'cm'], ['Zielgewicht', profile.targetWeightKg, 'kg'], ['Geburtsjahr', profile.birthYear, ''], ...metrics] as const)
          .map(([name, value, unit]) => <div key={name}><dt className="text-xs text-muted">{name}</dt><dd className="tabular-nums">{value === null ? '–' : `${String(value).replace('.', ',')} ${unit}`}</dd></div>)}
        <div><dt className="text-xs text-muted">Geschlecht</dt><dd>{profile.sex === 'male' ? 'Männlich' : profile.sex === 'female' ? 'Weiblich' : '–'}</dd></div>
        <div><dt className="text-xs text-muted">Aktivität</dt><dd>{profile.activityLevel ? ({ sedentary: 'Kaum Bewegung', light: 'Leicht aktiv', moderate: 'Aktiv', active: 'Sehr aktiv', very_active: 'Extrem aktiv' })[profile.activityLevel] : '–'}</dd></div>
      </dl>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm text-accent-ink">Alle Messungen</summary>
        {!overview.measurements.length && <p className="text-sm text-muted">Noch keine Messungen.</p>}
        {[...overview.measurements].reverse().map(row => <div key={row.date} className="border-t border-line/[0.06] py-3"><p className="mb-2 text-sm font-semibold">{row.date.split('-').reverse().join('.')}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">{(Object.keys(MEASUREMENTS) as (keyof typeof MEASUREMENTS)[]).filter(key => row[key] !== null)
            .map(key => <div key={key}><dt className="text-xs text-muted">{MEASUREMENTS[key][0]}</dt><dd>{String(row[key]).replace('.', ',')} {MEASUREMENTS[key][1]}</dd></div>)}</dl></div>)}
      </details>
    </div>
    <div className={CARD}><h3 className={SECTION_TITLE}>Persönliche Rekorde</h3>
      {!stats.personalRecords.length && <p className="mt-2 text-sm text-muted">Noch keine Rekorde.</p>}
      <ul className="mt-2 divide-y divide-line/[0.06]">{stats.personalRecords.map(record => <li key={record.name} className="flex justify-between gap-3 py-2 text-sm"><span>{record.name}</span><span className="text-right text-success">{record.maxWeightKg !== null ? `${formatWeight(record.maxWeightKg)} × ${record.bestSetReps}` : `${record.maxRepsOnly} Wdh.`}</span></li>)}</ul>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm text-accent-ink">Trainingsverlauf</summary>
        <ul className="divide-y divide-line/[0.06]">{overview.sets.map((set, index) => <li key={index} className="py-2 text-sm"><p>{set.performed_on.split('-').reverse().join('.')} · {set.exercise} · Satz {set.set_number}</p><p className="text-muted">{set.weight_kg !== null && `${set.is_assisted ? 'Unterstützung ' : ''}${formatWeight(set.weight_kg)} · `}{set.reps !== null && `${set.reps} Wdh.`}{set.duration_seconds !== null && `${set.duration_seconds} s`}{set.distance_km !== null && ` · ${set.distance_km} km`}</p></li>)}</ul>
      </details>
    </div>
    <div className={CARD}><h3 className={SECTION_TITLE}>Ernährung</h3>
      {!overview.meals.length && <p className="mt-2 text-sm text-muted">Noch keine Mahlzeiten.</p>}
      {overview.meals.map(meal => <details key={meal.id} className="mt-2 border-t border-line/[0.06] pt-2"><summary className="min-h-11 cursor-pointer py-2 text-sm">{meal.consumed_on.split('-').reverse().join('.')} · {meal.title}</summary>
        <ul className="mb-3 space-y-1 text-sm text-muted">{meal.items.map((item, index) => <li key={index}>{item.name} · {item.grams} g{item.estimated ? ' · geschätzt' : ''}</li>)}</ul><NutritionValues values={sumNutrition(meal.items)} />
      </details>)}
    </div>
  </>
}
