import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { formatNutrition, profileNutritionSuggestion, sumNutrition, type Meal } from '../../domain/nutrition'
import { TrashIcon } from '../../lib/icons'
import { deleteMeal, loadNutrition, loadNutritionProfile } from './api'
import { FoodScanner } from './FoodScanner'
import { NutritionTargetsForm } from './NutritionTargetsForm'
import { fieldClass, NutritionProgress, NutritionValues, secondaryClass } from './NutritionValues'

export function NutritionScreen({ user, today, onOpenProfile }: { user: User; today: string; onOpenProfile: () => void }) {
  const [date, setDate] = useState(today)
  const [data, setData] = useState<Awaited<ReturnType<typeof loadNutrition>> | null>(null)
  const [suggestion, setSuggestion] = useState<ReturnType<typeof profileNutritionSuggestion> | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    loadNutrition(date).then((result) => { if (!cancelled) setData(result) })
      .catch(() => { if (!cancelled) setError('Das Ernährungstagebuch konnte nicht geladen werden. Bitte erneut versuchen.') })
    return () => { cancelled = true }
  }, [date, user.id, attempt])

  useEffect(() => {
    let cancelled = false
    loadNutritionProfile(user).then((profile) => {
      if (!cancelled) setSuggestion(profileNutritionSuggestion(profile, today))
    }).catch(() => { if (!cancelled) setSuggestion(null) })
    return () => { cancelled = true }
  }, [user, today])

  function saved(meal: Meal) {
    setMessage(`„${meal.title}“ wurde für den ${new Intl.DateTimeFormat('de-DE').format(new Date(`${meal.consumed_on}T12:00:00`))} gespeichert.`)
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
      setMessage('Mahlzeit gelöscht.')
    } catch { setMessage('Die Mahlzeit konnte nicht gelöscht werden. Bitte erneut versuchen.') }
    finally { setDeleting(null) }
  }

  const totals = sumNutrition(data?.meals.flatMap((meal) => meal.items) ?? [])

  function selectDate(value: string) {
    if (!value || value === date) return
    setData(null)
    setError('')
    setMessage('')
    setConfirmDelete(null)
    setDate(value)
  }

  return <div className="mt-6 space-y-5 lg:mt-0">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-accent-ink">Dein Ernährungstagebuch</p><h1 className="mt-1 text-4xl lg:text-5xl">Energie für dein Training</h1></div>
      <label className="block w-full text-sm sm:w-auto"><span className="mb-1 block text-muted">Tag anzeigen</span><input className={fieldClass} type="date" value={date} onChange={(event) => selectDate(event.target.value)} /></label>
    </header>
    {error ? <div className="rounded-2xl bg-surface p-4"><p role="alert" className="text-sm text-danger">{error}</p><button className={`${secondaryClass} mt-3`} type="button" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Noch einmal versuchen</button></div>
      : !data ? <p role="status" className="text-sm text-muted">Ernährungstagebuch wird geladen …</p>
        : <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)]">
          <div className="min-w-0 space-y-5">
            <FoodScanner consent={data.settings.consent} date={date} targets={data.settings.targets} onConsent={(consent) => setData((current) => current ? { ...current, settings: { ...current.settings, consent } } : current)} onSaved={saved} />
            <section aria-labelledby="meals-heading" className="space-y-3">
              <h2 id="meals-heading" className="text-3xl">Deine Mahlzeiten</h2>
              {data.meals.length === 0 && <div className="rounded-2xl border border-dashed border-line/20 p-5"><p className="font-medium">Für diesen Tag ist noch nichts eingetragen.</p><p className="mt-1 text-sm text-muted">Scanne deine erste Mahlzeit. Erst deine Bestätigung speichert den Eintrag.</p></div>}
              {data.meals.map((meal) => <article key={meal.id} className="min-w-0 rounded-2xl border border-line/10 bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="text-2xl">{meal.title}</h3><p className="mt-1 text-xs text-muted">{formatNutrition(sumNutrition(meal.items).kcal, 'kcal')} · geschätzt</p></div>
                  <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-control" type="button" aria-label={`Mahlzeit ${meal.title} löschen`} onClick={() => setConfirmDelete(meal.id)} disabled={deleting !== null}><TrashIcon /></button>
                </div>
                {confirmDelete === meal.id && <div className="mt-3 rounded-xl border border-danger/30 p-3 text-sm"><p>Diese Mahlzeit und alle zugehörigen Lebensmittel löschen?</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" className={secondaryClass} disabled={deleting !== null} onClick={() => { void remove(meal.id) }}>{deleting === meal.id ? 'Wird gelöscht …' : 'Mahlzeit löschen'}</button><button type="button" className={secondaryClass} disabled={deleting !== null} onClick={() => setConfirmDelete(null)}>Behalten</button></div></div>}
                <div className="mt-4"><NutritionValues values={sumNutrition(meal.items)} /></div>
                <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm text-accent-ink">Lebensmittel und Tagesziel-Anteil anzeigen</summary>
                  <ul className="space-y-3">{meal.items.map((item, index) => <li key={index} className="rounded-xl bg-surface-inset p-3"><p className="mb-2 text-sm font-medium">{item.name} · {new Intl.NumberFormat('de-DE').format(item.grams)} g · geschätzt</p><NutritionValues values={sumNutrition([item])} /></li>)}</ul>
                  <div className="mt-4"><NutritionProgress values={sumNutrition(meal.items)} targets={data.settings.targets} label={`Tagesziel-Anteil: ${meal.title}`} /></div>
                </details>
              </article>)}
            </section>
          </div>
          <div className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-line/10 bg-surface p-4 sm:p-5" aria-labelledby="nutrition-day-heading">
              <p className="text-xs uppercase tracking-wider text-muted">{new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`))} · {data.meals.length} Mahlzeiten</p>
              <h2 id="nutrition-day-heading" className="mb-4 mt-1 text-3xl">Dein Tag im Blick</h2>
              <NutritionProgress values={totals} targets={data.settings.targets} label="Verbrauch und verbleibendes Tagesziel" />
              <p className="mt-4 text-xs text-muted">Tagessummen beruhen auf deinen bestätigten Schätzungen. Tagesziele sind persönliche Richtwerte.</p>
            </section>
            <NutritionTargetsForm targets={data.settings.targets} suggestion={suggestion} onOpenProfile={onOpenProfile} onSaved={(targets) => setData((current) => current ? { ...current, settings: { ...current.settings, targets } } : current)} />
          </div>
        </div>}
    {message && <p role="status" className="rounded-xl bg-surface p-3 text-sm">{message}</p>}
  </div>
}
