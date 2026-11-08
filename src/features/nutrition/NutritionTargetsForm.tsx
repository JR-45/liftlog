import { useState, type FormEvent } from 'react'
import { NUTRIENTS, NUTRIENT_LABELS, parseNutritionNumber, TARGET_LIMITS, validateTargets, type NutritionTargets, type profileNutritionSuggestion } from '../../domain/nutrition'
import { saveNutritionTargets } from './api'
import { fieldClass, primaryClass, secondaryClass } from './NutritionValues'

export function NutritionTargetsForm({ targets, suggestion, onSaved, onOpenProfile }: {
  targets: NutritionTargets
  suggestion: ReturnType<typeof profileNutritionSuggestion> | null
  onSaved: (targets: NutritionTargets) => void
  onOpenProfile: () => void
}) {
  const [draft, setDraft] = useState(() => Object.fromEntries(NUTRIENTS.map((key) => [key, targets[key] === null ? '' : String(targets[key]).replace('.', ',')])) as Record<typeof NUTRIENTS[number], string>)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const values = Object.fromEntries(NUTRIENTS.map((key) => [key, parseNutritionNumber(draft[key], TARGET_LIMITS[key])])) as NutritionTargets
    if (!validateTargets(values)) { setMessage('Bitte alle fünf Ziele größer als 0 und innerhalb der angegebenen Grenzen eintragen.'); return }
    setBusy(true)
    setMessage('')
    try { await saveNutritionTargets(values); onSaved(values); setMessage('Tagesziele gespeichert.') }
    catch { setMessage('Tagesziele konnten nicht gespeichert werden. Bitte erneut versuchen.') }
    finally { setBusy(false) }
  }

  return <details className="rounded-2xl border border-line/10 bg-surface p-4">
    <summary className="min-h-11 cursor-pointer py-2 font-semibold">Tagesziele einstellen</summary>
    <p className="mt-2 text-sm text-muted">Lege deine persönlichen Ziele fest. Profilvorschläge sind Schätzungen und werden erst nach dem Speichern übernommen.</p>
    {suggestion && <div className="mt-3 rounded-xl bg-surface-inset p-3 text-sm">
      <p>{suggestion.kcal !== null ? `Profilvorschlag: ${suggestion.kcal} kcal` : 'Für einen Kalorienvorschlag fehlen Profilangaben.'}{suggestion.protein !== null && ` · ${suggestion.protein} g Protein`}</p>
      {suggestion.missing.length > 0 && <p className="mt-1 text-muted">Bitte ergänzen: {suggestion.missing.join(', ')}.</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {(suggestion.kcal !== null || suggestion.protein !== null) && <button type="button" disabled={busy} className={secondaryClass} onClick={() => setDraft((current) => ({
          ...current, ...(suggestion.kcal !== null ? { kcal: String(suggestion.kcal) } : {}), ...(suggestion.protein !== null ? { protein: String(suggestion.protein) } : {}),
        }))}>Vorschlag einsetzen</button>}
        {suggestion.missing.length > 0 && <button type="button" className={secondaryClass} onClick={onOpenProfile}>Profil ergänzen</button>}
      </div>
    </div>}
    <form className="mt-4 space-y-4" onSubmit={(event) => { void submit(event) }}>
      <fieldset disabled={busy} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {NUTRIENTS.map((key) => <label key={key} className="block text-sm">
          <span className="mb-1 block text-muted">{NUTRIENT_LABELS[key]} ({key === 'kcal' ? 'kcal' : 'g'})</span>
          <input className={fieldClass} inputMode="decimal" value={draft[key]} maxLength={9} required onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />
          <span className="mt-1 block text-xs text-muted">Mehr als 0, höchstens {TARGET_LIMITS[key]}</span>
        </label>)}
      </fieldset>
      {message && <p role="status" className="text-sm">{message}</p>}
      <button className={primaryClass} type="submit" disabled={busy}>{busy ? 'Wird gespeichert …' : 'Tagesziele speichern'}</button>
    </form>
  </details>
}
