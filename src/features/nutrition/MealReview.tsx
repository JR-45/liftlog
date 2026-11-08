import { useRef, useState, type FormEvent } from 'react'
import { NUTRIENTS, NUTRIENT_LABELS, parseMealDraftItem, sumNutrition, type Meal, type MealItem, type Nutrient, type NutritionTargets } from '../../domain/nutrition'
import { TrashIcon } from '../../lib/icons'
import { saveMeal } from './api'
import { INPUT as fieldClass, PRIMARY_BUTTON as primaryClass, SECONDARY_BUTTON as secondaryClass } from '../../lib/ui'
import { NutritionProgress, NutritionValues } from './NutritionValues'

type Draft = { id: string; name: string; grams: string; values: Record<typeof NUTRIENTS[number], string>; question: string | null; confirmed: boolean }

/** Ein Lebensmittel zum Prüfen, egal ob aus Foto, Barcode oder leer zum Selbst-Eintragen. Fehlende Werte bleiben leer. */
export type ReviewFood = { name: string; grams: number | null; per100g: Record<Nutrient, number | null>; question: string | null; uncertain: boolean }

/** photo: KI-Schätzung, muss bestätigt werden. barcode: Werte aus Open Food Facts. manual: selbst eingetragen. */
export type ReviewSource = 'photo' | 'barcode' | 'manual'

const toText = (value: number | null) => value === null ? '' : String(Math.round(value * 100) / 100).replace('.', ',')

export function MealReview({ foods, note, source, defaultTitle, date, targets, onSaved, onCancel }: {
  foods: ReviewFood[]; note?: string; source: ReviewSource; defaultTitle: string
  date: string; targets: NutritionTargets; onSaved: (meal: Meal) => void; onCancel: () => void
}) {
  const [id] = useState(() => crypto.randomUUID())
  const [title, setTitle] = useState(defaultTitle)
  const [mealDate, setMealDate] = useState(date)
  const [drafts, setDrafts] = useState<Draft[]>(() => foods.map((food) => ({
    id: crypto.randomUUID(), name: food.name, grams: toText(food.grams),
    values: Object.fromEntries(NUTRIENTS.map((key) => [key, toText(food.per100g[key])])) as Draft['values'],
    question: food.question, confirmed: !food.uncertain,
  })))
  // Nur KI-Schätzungen muss man ausdrücklich bestätigen.
  const isPhoto = source === 'photo'
  const [reviewed, setReviewed] = useState(!isPhoto)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const items = drafts.map((draft) => {
    const item = parseMealDraftItem(draft)
    return item && { ...item, estimated: isPhoto }
  })
  const valid = drafts.length > 0 && items.every((item) => item !== null) && drafts.every((draft) => draft.confirmed)
  const totals = sumNutrition(items.filter((item): item is MealItem => item !== null))

  function update(index: number, change: Partial<Draft>) {
    if (isPhoto) setReviewed(false)
    setDrafts((current) => current.map((draft, i) => i === index ? { ...draft, ...change } : draft))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current || !valid || !reviewed) return
    lock.current = true
    setBusy(true)
    setError('')
    const meal = { id, title, consumed_on: mealDate, items: items as MealItem[] }
    try { await saveMeal(meal); onSaved(meal) }
    catch { setError('Die Mahlzeit konnte nicht gespeichert werden. Deine Korrekturen bleiben erhalten. Bitte erneut versuchen.') }
    finally { lock.current = false; setBusy(false) }
  }

  return <form className="mt-5 space-y-5" onSubmit={(event) => { void submit(event) }}>
    <div>
      <h3 className="text-xl">{isPhoto ? 'Ergebnis prüfen' : source === 'barcode' ? 'Produkt prüfen' : 'Selbst eintragen'}</h3>
      {isPhoto && <p className="mt-1 text-sm text-muted">Fotowerte sind Schätzungen. Prüf auch Öl, Saucen und versteckte Zutaten.</p>}
      {source === 'barcode' && <p className="mt-1 text-sm text-muted">Werte von Open Food Facts. Pass die Menge an.</p>}
      {note && <p className="mt-2 rounded-xl bg-surface-inset p-3 text-sm">{note}</p>}
    </div>
    <fieldset disabled={busy} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className="mb-1 block text-muted">Mahlzeit</span><input className={fieldClass} maxLength={80} required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="block text-sm"><span className="mb-1 block text-muted">Datum der Mahlzeit</span><input className={fieldClass} type="date" required value={mealDate} onChange={(event) => setMealDate(event.target.value)} /></label>
      </div>
      {drafts.map((draft, index) => <fieldset key={draft.id} className="min-w-0 rounded-xl border border-line/15 p-3">
        <legend className="px-1 text-sm font-semibold">Lebensmittel {index + 1}{isPhoto ? ' · geschätzt' : ''}</legend>
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
          <label className="block text-sm"><span className="mb-1 block text-muted">Lebensmittel</span><input className={fieldClass} maxLength={120} required value={draft.name} onChange={(event) => update(index, { name: event.target.value })} /></label>
          <label className="block text-sm"><span className="mb-1 block text-muted">Menge in g</span><input className={fieldClass} inputMode="decimal" placeholder="Gramm angeben" required value={draft.grams} maxLength={8} onChange={(event) => update(index, { grams: event.target.value, confirmed: draft.question ? false : draft.confirmed })} /></label>
          <button type="button" className={`${secondaryClass} self-end`} aria-label={`Lebensmittel ${index + 1} entfernen`} onClick={() => { setDrafts((current) => current.filter((_, i) => i !== index)); if (isPhoto) setReviewed(false) }}><TrashIcon /></button>
        </div>
        {draft.question && <div className="mt-3 rounded-xl border border-warning/40 p-3 text-sm">
          <p>{draft.question}</p>
          <label className="mt-2 flex min-h-11 items-center gap-3"><input className="h-5 w-5 shrink-0 accent-neon" type="checkbox" checked={draft.confirmed} onChange={(event) => update(index, { confirmed: event.target.checked })} />Ich habe die Rückfrage geprüft und die Menge in Gramm angegeben.</label>
        </div>}
        <details className="mt-3" open={!isPhoto && NUTRIENTS.some((key) => draft.values[key] === '') ? true : undefined}>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-accent-ink">Nährwerte pro 100 g korrigieren</summary>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {NUTRIENTS.map((key) => <label key={key} className="block text-xs text-muted">
              <span className="mb-1 block">{NUTRIENT_LABELS[key]} ({key === 'kcal' ? 'kcal' : 'g'})</span>
              <input className={fieldClass} inputMode="decimal" value={draft.values[key]} maxLength={8} required onChange={(event) => update(index, { values: { ...draft.values, [key]: event.target.value } })} />
            </label>)}
          </div>
        </details>
        {items[index] ? <div className="mt-2"><p className="mb-2 text-xs text-muted">Für diese Portion{isPhoto ? ' · geschätzt' : ''}</p><NutritionValues values={sumNutrition([items[index]!])} /></div>
          : <p className="mt-2 text-sm text-warning">Name, Menge (0,1–5000 g) und Nährwerte prüfen. Pro 100 g: 0–1000 kcal, übrige Werte 0–100 g.</p>}
      </fieldset>)}
      <button type="button" disabled={drafts.length >= 20} className={secondaryClass} onClick={() => {
        if (isPhoto) setReviewed(false)
        setDrafts((current) => [...current, { id: crypto.randomUUID(), name: '', grams: '', values: { kcal: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '' }, question: null, confirmed: true }])
      }}>Fehlendes Lebensmittel ergänzen</button>
      {/* Anteil am Tagesziel nur, wenn Ziele gesetzt sind. */}
      {NUTRIENTS.some((key) => targets[key] !== null) && <div className="rounded-xl bg-surface-inset p-4">
        <h4 className="mb-3 text-xl">{isPhoto ? 'Mahlzeit · geschätzt' : 'Mahlzeit'}</h4>
        {!valid && <p className="mb-3 text-sm text-warning">Vorschau enthält nur gültige Portionen. Offene Rückfragen und Eingaben zuerst prüfen.</p>}
        <NutritionProgress values={totals} targets={targets} label="Anteil dieser Mahlzeit am Tagesziel" />
      </div>}
      {isPhoto && <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-0.5 h-5 w-5 shrink-0 accent-neon" type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />Ich habe Lebensmittel, Mengen und geschätzte Nährwerte geprüft.</label>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button className={primaryClass} type="submit" disabled={busy || !valid || !reviewed || !title.trim() || !mealDate}>{busy ? 'Wird gespeichert …' : 'Mahlzeit speichern'}</button>
      <button className={secondaryClass} type="button" disabled={busy} onClick={onCancel}>Verwerfen</button>
    </div>
  </form>
}
