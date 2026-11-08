import { computeAthleteStats } from '../../domain/profile'
import { formatWeight } from '../../domain/sets'
import { CARD, SECTION_TITLE } from '../../lib/ui'
import type { SharedOverview } from './api'

/** Nur freigegebenes Profil und Training; private Bereiche werden überhaupt nicht gerendert. */
export function SharedProfileOverview({ overview, today }: { overview: SharedOverview; today: string }) {
  const profile = overview.profile
  const stats = computeAthleteStats(overview.sets, today, profile.weeklyTarget)
  return <>
    <div className={CARD}>
      <h3 className={SECTION_TITLE}>Profilübersicht</h3>
      {profile.bio && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{profile.bio}</p>}
      <p className="mt-2 text-sm text-muted">{({ hypertrophy: 'Muskelaufbau', strength: 'Maximalkraft', cut: 'Definition & Fettabbau', fitness: 'Allgemeine Fitness' })[profile.goal]}</p>
      <p className="mt-3 text-xl font-semibold tabular-nums">{stats.thisWeekWorkouts} / {profile.weeklyTarget} Trainings diese Woche</p>
      <p className="text-sm text-muted">{stats.activeWeeksStreak} Wochen Serie</p>
    </div>
    <div className={CARD}><h3 className={SECTION_TITLE}>Persönliche Rekorde</h3>
      {!stats.personalRecords.length && <p className="mt-2 text-sm text-muted">Noch keine Rekorde.</p>}
      <ul className="mt-2 divide-y divide-line/[0.06]">{stats.personalRecords.map(record => <li key={record.name} className="flex justify-between gap-3 py-2 text-sm"><span>{record.name}</span><span className="text-right text-success">{record.maxWeightKg !== null ? `${formatWeight(record.maxWeightKg)} × ${record.bestSetReps}` : `${record.maxRepsOnly} Wdh.`}</span></li>)}</ul>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm text-accent-ink">Trainingsverlauf</summary>
        <ul className="divide-y divide-line/[0.06]">{overview.sets.map((set, index) => <li key={index} className="py-2 text-sm"><p>{set.performed_on.split('-').reverse().join('.')} · {set.exercise} · Satz {set.set_number}</p><p className="text-muted">{set.weight_kg !== null && `${set.is_assisted ? 'Unterstützung ' : ''}${formatWeight(set.weight_kg)} · `}{set.reps !== null && `${set.reps} Wdh.`}{set.duration_seconds !== null && `${set.duration_seconds} s`}{set.distance_km !== null && ` · ${set.distance_km} km`}</p></li>)}</ul>
      </details>
    </div>
  </>
}
