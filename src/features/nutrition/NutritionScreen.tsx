import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { formatNutrition, profileNutritionSuggestion, profileTargets, sumNutrition } from '../../domain/nutrition'
import { shiftDate } from '../../domain/week'
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon } from '../../lib/icons'
import { NAV_BUTTON } from '../../lib/ui'
import { deleteMeal, loadNutrition, loadNutritionProfile, enableProfileTargets } from './api'
import { FoodScanner } from './FoodScanner'
import { NutritionGoals } from './NutritionGoals'
import { secondaryClass } from './NutritionValues'
import { SupplementsCard } from './SupplementsCard'

const CARD = 'rounded-2xl border border-line/[0.08] bg-surface p-4'
const FULL = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const DAY = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Heute'
  if (date === shiftDate(today, -1)) return 'Gestern'
  return DAY.format(new Date(`${date}T12:00:00`))
}

/** Reihenfolge: Tag wählen, was noch offen ist, Supplemente, Essen eintragen, Mahlzeiten. */
export function NutritionScreen({ user, today, onOpenProfile }: { user: User; today: string; onOpenProfile: () => void }) {
  const [date, setDate] = useState(today)
  const [data, setData] = useState<Awaited<ReturnType<typeof loadNutrition>> | null>(null)
  // undefined: Profil wird noch geladen. null: Profil nicht ladbar.
  const [suggestion, setSuggestion] = useState<ReturnType<typeof profileNutritionSuggestion> | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    loadNutrition(date).then((result) => { if (!cancelled) setData(result) })
      .catch(() => { if (!cancelled) setError('Das Ernährungstagebuch konnte nicht geladen werden.') })
    return () => { cancelled = true }
  }, [date, user.id, attempt])

  useEffect(() => {
    let cancelled = false
    loadNutritionProfile(user).then((profile) => {
      if (!cancelled) setSuggestion(profileNutritionSuggestion(profile, today))
    }).catch(() => { if (!cancelled) setSuggestion(null) })
    return () => { cancelled = true }
  }, [user, today])

  function saved() {
    setMessage('')
    // Nach einem zwischenzeitlichen Datumswechsel immer den aktuell gewählten Tag laden.
    setAttempt((current) => current + 1)
  }

  async function remove(id: string) {
    if (deleting) return
    setDeleting(id)
    setMessage('')
    try {
      await deleteMeal(id)
      setData((current) => current ? { ...current, meals: current.meals.filter((meal) => meal.id !== id) } : current)
      setConfirmDelete(null)
    } catch { setMessage('Die Mahlzeit konnte nicht gelöscht werden.') }
    finally { setDeleting(null) }
  }

  function selectDate(value: string) {
    if (value > today || value === date) return
    setData(null)
    setError('')
    setMessage('')
    setConfirmDelete(null)
    setDate(value)
  }

  const totals = sumNutrition(data?.meals.flatMap((meal) => meal.items) ?? [])
  // Ziele aus dem Profil gelten, solange keine eigenen gespeichert sind und das Profil genug Angaben hat.
  const fromProfile = suggestion ? profileTargets(suggestion) : null
  const useProfile = Boolean(data?.settings.fromProfile && fromProfile)
  const targets = useProfile && fromProfile ? fromProfile : data?.settings.targets

  async function switchToProfile() {
    setData((current) => current ? { ...current, settings: { ...current.settings, fromProfile: true } } : current)
    try { await enableProfileTargets() }
    catch {
      setData((current) => current ? { ...current, settings: { ...current.settings, fromProfile: false } } : current)
      setMessage('Umschalten hat nicht geklappt. Bitte erneut versuchen.')
    }
  }

  return <div className="mt-4 space-y-4 lg:mt-0 lg:max-w-2xl">
    <nav className="flex items-center justify-between gap-2" aria-label="Tag wählen">
      <button className={NAV_BUTTON} type="button" aria-label="Vorheriger Tag" onClick={() => selectDate(shiftDate(date, -1))}><ChevronLeftIcon className="h-5 w-5" /></button>
      <div className="min-w-0 text-center">
        <h1 className="text-xl">{dayLabel(date, today)}</h1>
        <p className="text-sm tabular-nums text-muted">{FULL.format(new Date(`${date}T12:00:00`))}</p>
      </div>
      <button className={NAV_BUTTON} type="button" aria-label="Nächster Tag" disabled={date >= today} onClick={() => selectDate(shiftDate(date, 1))}><ChevronRightIcon className="h-5 w-5" /></button>
    </nav>
    {date !== today && <div className="-mt-2 text-center">
      <button className="min-h-11 px-2 text-sm font-medium text-muted" type="button" onClick={() => selectDate(today)}>Zurück zu heute</button>
    </div>}

    {error ? <div className={CARD}>
      <p role="alert" className="text-sm text-danger">{error}</p>
      <button className={`${secondaryClass} mt-3`} type="button" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Erneut laden</button>
    </div>
      : !data || !targets || suggestion === undefined ? <p role="status" className="text-sm text-muted">Wird geladen …</p>
        : <>
          <NutritionGoals totals={totals} targets={targets} source={useProfile ? 'profile' : 'own'} profileAvailable={fromProfile !== null}
            missing={suggestion?.missing ?? []} onOpenProfile={onOpenProfile} onUseProfile={() => void switchToProfile()}
            onSaved={(saved) => setData((current) => current ? { ...current, settings: { ...current.settings, targets: saved, fromProfile: false } } : current)} />
          <SupplementsCard key={date} date={date} />
          <FoodScanner consent={data.settings.consent} date={date} targets={targets}
            onConsent={(consent) => setData((current) => current ? { ...current, settings: { ...current.settings, consent } } : current)}
            onSaved={saved} />
          {data.meals.length > 0 && <section className={CARD} aria-labelledby="meals-heading">
            <h2 id="meals-heading" className="text-xl">Mahlzeiten</h2>
            <ul className="mt-2 divide-y divide-line/[0.06]">
              {data.meals.map((meal) => {
                const sum = sumNutrition(meal.items)
                return <li key={meal.id}>
                  <details className="group">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate font-medium text-foreground">{meal.title}</span>
                      <span className="shrink-0 text-sm tabular-nums text-muted">{formatNutrition(sum.kcal, 'kcal')} · {formatNutrition(sum.protein, 'protein')} Protein</span>
                    </summary>
                    <ul className="pb-2 text-sm text-muted">
                      {meal.items.map((item, index) => <li key={index} className="flex justify-between gap-3 py-0.5">
                        <span className="truncate">{item.name}</span><span className="shrink-0 tabular-nums">{new Intl.NumberFormat('de-DE').format(item.grams)} g</span>
                      </li>)}
                    </ul>
                    {confirmDelete === meal.id
                      ? <div className="flex gap-2 pb-3">
                        <button className="min-h-11 flex-1 rounded-xl bg-control px-3 text-sm font-medium text-foreground" type="button" onClick={() => setConfirmDelete(null)}>Behalten</button>
                        <button className="min-h-11 flex-1 rounded-xl bg-danger px-3 text-sm font-semibold text-white disabled:opacity-50" type="button" disabled={deleting === meal.id} onClick={() => void remove(meal.id)}>Ja, löschen</button>
                      </div>
                      : <button className="mb-2 flex min-h-11 items-center gap-1.5 text-sm font-medium text-danger" type="button" onClick={() => setConfirmDelete(meal.id)}>
                        <TrashIcon className="h-4 w-4" /> Mahlzeit löschen
                      </button>}
                  </details>
                </li>
              })}
            </ul>
          </section>}
        </>}
    {message && <p role="status" className="text-sm text-danger">{message}</p>}
  </div>
}
