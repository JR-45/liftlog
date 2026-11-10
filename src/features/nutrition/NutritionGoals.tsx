import { useState } from 'react'
import { DoneStamp } from '../../components/DoneStamp'
import type { AppleHealthDay } from '../../domain/appleHealth'
import { goalStatus, NUTRIENTS, type Nutrition, type NutritionTargets } from '../../domain/nutrition'
import { LINK } from '../../lib/ui'
import { NutritionTargetsForm } from './NutritionTargetsForm'

/**
 * Tagesziele ganz oben: pro Wert nur, was noch offen ist. Erreichte Ziele bekommen den DONE-Stempel.
 * source: Ziele aus dem Profil (ändern sich mit dem Profil) oder eigene Werte.
 */
export function NutritionGoals({ totals, targets, appleHealth, source, profileAvailable, missing, onSaved, onUseProfile, onOpenProfile }: {
  totals: Nutrition
  targets: NutritionTargets
  appleHealth?: AppleHealthDay | null
  source: 'profile' | 'own'
  profileAvailable: boolean
  missing: string[]
  onSaved: (targets: NutritionTargets) => void
  onUseProfile: () => void
  onOpenProfile: () => void
}) {
  const hasTargets = NUTRIENTS.every((key) => targets[key] !== null)
  const [editing, setEditing] = useState(false)
  const reached = NUTRIENTS.filter((key) => key !== 'sugar' && targets[key] !== null && totals[key] >= targets[key]!)
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
      : hasTargets && (
        <div className="mt-3 space-y-4">
          {/* Kalorien-Hero mit Donut-Ring im LiftLog-Design */}
          <div className="flex items-center gap-4 rounded-2xl bg-surface-raised p-4 ring-1 ring-line/[0.08]">
            {/* SVG Progress Ring */}
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 96 96" aria-hidden="true">
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className="stroke-control/60"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className={`transition-all duration-700 ease-out ${
                    totals.kcal >= targets.kcal! ? 'stroke-success' : 'stroke-neon'
                  }`}
                  strokeWidth="8"
                  strokeDasharray="238.76"
                  strokeDashoffset={238.76 * (1 - Math.min(1, totals.kcal / targets.kcal!))}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display text-2xl font-extrabold leading-none text-foreground tabular-nums tracking-tight">
                  {Math.round(Math.max(0, targets.kcal! - totals.kcal))}
                </span>
                <span className="mt-0.5 text-[11px] font-medium text-muted">
                  {totals.kcal > targets.kcal! ? 'drüber' : 'kcal übrig'}
                </span>
              </div>
            </div>

            {/* Kalorien-Zahlen */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-extrabold uppercase tracking-wide text-foreground">Kalorien</span>
                <span className="font-display text-sm font-bold tabular-nums text-accent-ink">
                  {Math.round((totals.kcal / targets.kcal!) * 100)} %
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs text-muted">
                <span>Gegessen: <strong className="font-display text-base font-bold text-foreground tabular-nums">{Math.round(totals.kcal)}</strong></span>
                <span>Ziel: <strong className="font-display text-base font-bold text-muted tabular-nums">{targets.kcal}</strong></span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-control">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    totals.kcal >= targets.kcal! ? 'bg-success' : 'bg-neon'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((totals.kcal / targets.kcal!) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3 Makro-Kacheln: Protein, Carbs, Fett im originalen LiftLog-Stil */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {([
              { key: 'protein' as const, label: 'Protein' },
              { key: 'carbs' as const, label: 'Carbs' },
              { key: 'fat' as const, label: 'Fett' },
            ]).map(({ key, label }) => {
              const current = Math.round(totals[key])
              const target = targets[key]!
              const fraction = Math.min(1, totals[key] / target)
              const percent = Math.round(fraction * 100)
              const isDone = totals[key] >= target
              const diff = target - totals[key]
              const stamp = reached.includes(key) ? seen.stamps[key] : undefined

              return (
                <div
                  key={key}
                  className="relative flex flex-col justify-between rounded-xl bg-surface-raised p-3 ring-1 ring-line/[0.08]"
                >
                  {stamp && <DoneStamp key={stamp} />}
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">
                      {label}
                    </span>
                    <span className={`font-display text-xs font-bold tabular-nums ${isDone ? 'text-success' : 'text-muted'}`}>
                      {percent}%
                    </span>
                  </div>

                  <div className="mt-2">
                    <p className="font-display text-2xl font-extrabold leading-none tracking-tight tabular-nums text-foreground">
                      {current}
                      <span className="font-sans text-xs font-normal text-muted">/{target}g</span>
                    </p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-control">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-success' : 'bg-neon'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className={`mt-1.5 text-xs tabular-nums ${isDone ? 'font-medium text-success' : 'text-muted'}`}>
                      {isDone ? '✓ erreicht' : `noch ${Math.round(diff)} g`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sekundäre Werte: Ballaststoffe & Zucker im ruhigen LiftLog-Design */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {([
              { key: 'fiber' as const, label: 'Ballaststoffe' },
              { key: 'sugar' as const, label: 'Zucker' },
            ]).map(({ key, label }) => {
              const status = goalStatus(totals[key], targets[key]!, key)
              const isOver = status.tone === 'over'
              const isDone = status.tone === 'done'
              const target = targets[key]!
              const current = Math.round(totals[key])
              const overDiff = Math.round(totals[key] - target)

              return (
                <div
                  key={key}
                  className={`rounded-xl p-3 transition-colors ${
                    isOver
                      ? 'bg-danger/10 ring-1 ring-danger/30'
                      : 'bg-surface-raised ring-1 ring-line/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">
                      {label}
                    </span>
                    {key === 'sugar' && isOver ? (
                      <span className="rounded bg-danger/15 px-1.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-danger">
                        Über Limit
                      </span>
                    ) : (
                      <span className="font-display text-xs font-bold tabular-nums text-muted">
                        Max. {target}g
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <p
                      className={`font-display text-xl font-extrabold leading-none tracking-tight tabular-nums ${
                        isOver ? 'text-danger' : 'text-foreground'
                      }`}
                    >
                      {current}
                      <span className="font-sans text-xs font-normal text-muted">/{target}g</span>
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-control">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-danger' : isDone ? 'bg-success' : 'bg-muted'
                        }`}
                        style={{ width: `${Math.min(100, Math.round(status.fraction * 100))}%` }}
                      />
                    </div>
                    <p
                      className={`mt-1.5 text-xs tabular-nums ${
                        isOver ? 'font-medium text-danger' : 'text-muted'
                      }`}
                    >
                      {key === 'sugar'
                        ? isOver
                          ? `+${overDiff} g über WHO-Limit`
                          : `noch ${Math.max(0, target - current)} g erlaubt`
                        : isDone
                        ? '✓ erreicht'
                        : `noch ${Math.max(0, target - current)} g`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    {appleHealth && (appleHealth.activeKcal > 0 || appleHealth.workoutMinutes > 0 || appleHealth.steps > 0) && (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/[0.06] pt-2.5 text-xs text-muted">
        <span className="font-medium text-foreground">Apple Watch</span>
        <span className="tabular-nums">
          {appleHealth.activeKcal > 0 && `${new Intl.NumberFormat('de-DE').format(appleHealth.activeKcal)} kcal aktiv`}
          {appleHealth.workoutMinutes > 0 && ` · ${appleHealth.workoutMinutes} Min. Training`}
          {appleHealth.steps > 0 && ` · ${new Intl.NumberFormat('de-DE').format(appleHealth.steps)} Schritte`}
        </span>
      </div>
    )}
  </section>
}
