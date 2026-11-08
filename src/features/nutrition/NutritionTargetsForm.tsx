import { useState, type FormEvent } from 'react'
import { NUTRIENTS, NUTRIENT_LABELS, parseNutritionNumber, TARGET_LIMITS, validateTargets, type NutritionTargets } from '../../domain/nutrition'
import { saveNutritionTargets } from './api'
import { INPUT as fieldClass, PRIMARY_BUTTON as primaryClass } from '../../lib/ui'

/** Eigene Tagesziele. Speichern schaltet die Berechnung aus dem Profil ab. */
export function NutritionTargetsForm({ targets, onSaved }: { targets: NutritionTargets; onSaved: (targets: NutritionTargets) => void }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(NUTRIENTS.map((key) => [key, targets[key] === null ? '' : String(targets[key]).replace('.', ',')])) as Record<typeof NUTRIENTS[number], string>)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const values = Object.fromEntries(NUTRIENTS.map((key) => [key, parseNutritionNumber(draft[key], TARGET_LIMITS[key])])) as NutritionTargets
    if (!validateTargets(values)) { setMessage('Bitte alle fünf Ziele mit einer Zahl größer als 0 ausfüllen.'); return }
    setBusy(true)
    setMessage('')
    try { await saveNutritionTargets(values); onSaved(values) }
    catch { setMessage('Speichern hat nicht geklappt. Bitte erneut versuchen.'); setBusy(false) }
  }

  return <form className="mt-3 space-y-3" onSubmit={(event) => { void submit(event) }}>
    <fieldset disabled={busy} className="grid grid-cols-2 gap-3">
      {NUTRIENTS.map((key) => <label key={key} className={`block text-sm ${key === 'kcal' ? 'col-span-2' : ''}`}>
        <span className="mb-1 block text-muted">{NUTRIENT_LABELS[key]} ({key === 'kcal' ? 'kcal' : 'g'})</span>
        <input className={fieldClass} inputMode="decimal" enterKeyHint="done" value={draft[key]} maxLength={9} required onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />
      </label>)}
    </fieldset>
    {message && <p role="alert" className="text-sm text-danger">{message}</p>}
    <button className={`${primaryClass} w-full`} type="submit" disabled={busy}>{busy ? 'Wird gespeichert …' : 'Eigene Ziele speichern'}</button>
  </form>
}
