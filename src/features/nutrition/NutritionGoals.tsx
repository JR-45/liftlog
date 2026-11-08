import { useState } from 'react'
import { DoneStamp } from '../../components/DoneStamp'
import { goalStatus, NUTRIENTS, NUTRIENT_LABELS, type Nutrition, type NutritionTargets } from '../../domain/nutrition'
import { LINK } from '../../lib/ui'
import { NutritionTargetsForm } from './NutritionTargetsForm'

const TONE = { open: 'text-foreground', done: 'text-success', over: 'text-danger' }
const BAR = { open: 'bg-neon', done: 'bg-success', over: 'bg-danger' }

/**
 * Tagesziele ganz oben: pro Wert nur, was noch offen ist. Erreichte Ziele bekommen den DONE-Stempel.
 * source: Ziele aus dem Profil (ändern sich mit dem Profil) oder eigene Werte.
 */
export function NutritionGoals({ totals, targets, source, profileAvailable, missing, onSaved, onUseProfile, onOpenProfile }: {
  totals: Nutrition
  targets: NutritionTargets
  source: 'profile' | 'own'
  profileAvailable: boolean
  missing: string[]
  onSaved: (targets: NutritionTargets) => void
  onUseProfile: () => void
  onOpenProfile: () => void
}) {
  const hasTargets = NUTRIENTS.every((key) => targets[key] !== null)
  const [editing, setEditing] = useState(false)
  const reached = NUTRIENTS.filter((key) => targets[key] !== null && totals[key] >= targets[key]!)
  const reachedKey = reached.join(',')
  // Nur beim Erreichen stempeln, nicht beim Öffnen eines Tages, an dem das Ziel schon erreicht ist.
  const [seen, setSeen] = useState<{ reached: string; stamps: Partial<Record<typeof NUTRIENTS[number], number>> }>({ reached: reachedKey, stamps: {} })
  if (seen.reached !== reachedKey) {
    const before = seen.reached.split(',')
    const stamps = { ...seen.stamps }
    for (const key of reached) if (!before.includes(key)) stamps[key] = (stamps[key] ?? 0) + 1
    setSeen({ reached: reachedKey, stamps })
  }

  return <section className="rounded-2xl border border-line/[0.08] bg-surface p-4" aria-labelledby="goals-heading">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 id="goals-heading" className="text-xl">{hasTargets && !editing ? 'Noch offen' : 'Deine Tagesziele'}</h2>
        {hasTargets && !editing && <p className="text-xs text-muted">{source === 'profile' ? 'Aus deinem Profil berechnet' : 'Eigene Ziele'}</p>}
      </div>
      {(hasTargets || editing) && <button className={`${LINK} shrink-0 px-1`} type="button" onClick={() => setEditing((value) => !value)}>
        {editing ? 'Abbrechen' : 'Ziele ändern'}
      </button>}
    </div>
    {/* Ohne Ziele kein offenes Formular, nur ein kurzer Hinweis. Eintragen geht über „Ziele selbst festlegen“. */}
    {!hasTargets && !editing && <>
      <p className="mt-2 text-sm text-muted">
        {missing.length > 0 ? `Trag im Profil ${missing.join(', ')} ein, dann rechnet die App deine Ziele aus.` : 'Noch keine Ziele.'}
      </p>
      <div className="mt-1 flex flex-wrap gap-x-4">
        {missing.length > 0 && <button className={LINK} type="button" onClick={onOpenProfile}>Zum Profil</button>}
        <button className={LINK} type="button" onClick={() => setEditing(true)}>Ziele selbst festlegen</button>
      </div>
    </>}
    {editing
      ? <>
        <NutritionTargetsForm targets={targets} onSaved={(next) => { setEditing(false); onSaved(next) }} />
        {editing && source === 'own' && profileAvailable && <button className={`${LINK} mt-1 w-full`} type="button"
          onClick={() => { setEditing(false); onUseProfile() }}>Wieder aus dem Profil berechnen</button>}
      </>
      : hasTargets && <ul className="mt-2 space-y-3">
        {NUTRIENTS.map((key) => {
          const status = goalStatus(totals[key], targets[key]!, key)
          const stamp = reached.includes(key) ? seen.stamps[key] : undefined
          return <li key={key} className="relative">
            {stamp && <DoneStamp key={stamp} />}
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted">{NUTRIENT_LABELS[key]}</span>
              <span className={`font-semibold tabular-nums ${TONE[status.tone]}`}>{status.tone === 'done' ? '✓ erreicht' : status.label}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-control" aria-hidden="true">
              <div className={`h-full rounded-full transition-[width] duration-500 ${BAR[status.tone]}`} style={{ width: `${Math.round(status.fraction * 100)}%` }} />
            </div>
          </li>
        })}
      </ul>}
  </section>
}
