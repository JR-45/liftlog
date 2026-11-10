import { useState, type FormEvent } from 'react'
import { NUTRIENTS, NUTRIENT_LABELS, parseNutritionNumber, TARGET_LIMITS, validateTargets, type NutritionTargets } from '../../domain/nutrition'
import { saveNutritionTargets } from './api'
import { INPUT as fieldClass, PRIMARY_BUTTON as primaryClass } from '../../lib/ui'

/** Eigene Tagesziele. Speichern schaltet die Berechnung aus dem Profil ab. Zucker bleibt nach WHO gekoppelt. */
export function NutritionTargetsForm({ targets, onSaved }: { targets: NutritionTargets; onSaved: (targets: NutritionTargets) => void }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(NUTRIENTS.map((key) => [key, targets[key] === null ? '' : String(targets[key]).replace('.', ',')])) as Record<typeof NUTRIENTS[number], string>)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  // Zucker-Obergrenze wird immer automatisch nach WHO (10 % der Kalorien) ermittelt
  const parsedKcal = parseNutritionNumber(draft.kcal, TARGET_LIMITS.kcal)
  const autoSugar = parsedKcal !== null && parsedKcal > 0 ? Math.max(10, Math.round((parsedKcal * 0.10) / 4)) : (targets.sugar ?? 50)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const values = Object.fromEntries(
      NUTRIENTS.map((key) => [
        key,
        key === 'sugar' ? autoSugar : parseNutritionNumber(draft[key], TARGET_LIMITS[key]),
      ]),
    ) as NutritionTargets
    if (!validateTargets(values)) { setMessage('Bitte alle Werte mit einer Zahl größer als 0 ausfüllen.'); return }
    setBusy(true)
    setMessage('')
    try { await saveNutritionTargets(values); onSaved(values) }
    catch { setMessage('Speichern hat nicht geklappt. Bitte erneut versuchen.'); setBusy(false) }
  }

  return <form className="mt-3 space-y-3" onSubmit={(event) => { void submit(event) }}>
    <fieldset disabled={busy} className="grid grid-cols-2 gap-3">
      {NUTRIENTS.map((key) => {
        if (key === 'sugar') {
          return (
            <div key={key} className="block text-sm">
              <span className="mb-1 block text-muted">Zucker-Max. (g)</span>
              <div className="flex h-11 items-center justify-between rounded-xl bg-control/40 px-3 ring-1 ring-line/[0.04] text-muted">
                <span className="font-display font-bold tabular-nums text-foreground">{autoSugar} g</span>
                <span className="text-[10px] uppercase font-semibold text-muted">WHO 10%</span>
              </div>
            </div>
          )
        }
        return (
          <label key={key} className="block text-sm">
            <span className="mb-1 block text-muted">{NUTRIENT_LABELS[key]} ({key === 'kcal' ? 'kcal' : 'g'})</span>
            <input
              className={fieldClass}
              inputMode="decimal"
              enterKeyHint="done"
              value={draft[key]}
              maxLength={9}
              required
              onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
            />
          </label>
        )
      })}
    </fieldset>
    <p className="text-[11px] text-muted">Zucker-Limit wird automatisch nach WHO-Richtlinie (max. 10 % der Kalorien) festgesetzt.</p>
    {message && <p role="alert" className="text-sm text-danger">{message}</p>}
    <button className={`${primaryClass} w-full`} type="submit" disabled={busy}>{busy ? 'Wird gespeichert …' : 'Eigene Ziele speichern'}</button>
  </form>
}
