import { NUTRIENTS, NUTRIENT_LABELS, type Nutrient } from '../../domain/nutrition'
import { portionFromDraft, type FoodValues } from '../../domain/foodSearch'
import { INPUT } from '../../lib/ui'

export function ManualNutritionFields({ values, grams, onChange }: { values: FoodValues; grams: string; onChange: (key: Nutrient, value: string) => void }) {
  const portion = portionFromDraft({ grams, values })
  return <div className="mt-3 space-y-3">
    <p className="text-xs text-muted">Pro 100 g</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {NUTRIENTS.map(key => <label key={key} className="block text-xs text-muted"><span className="mb-1 block">{NUTRIENT_LABELS[key]} ({key === 'kcal' ? 'kcal' : 'g'})</span>
        <input className={INPUT} inputMode="decimal" maxLength={8} required value={values[key]} onChange={event => onChange(key, event.target.value)} />
      </label>)}
    </div>
    <p className="text-xs text-muted">Für diese Portion{grams ? ` · ${grams} g` : ''}</p>
    <dl aria-label="Nährwerte für diese Portion" aria-live="polite" className="grid grid-cols-2 gap-3 rounded-xl bg-surface-inset p-3 sm:grid-cols-3">
      {NUTRIENTS.map(key => <div key={key}><dt className="text-xs text-muted">{NUTRIENT_LABELS[key]}</dt>
        <dd className="text-sm font-semibold tabular-nums">{portion[key] === null ? '—' : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(portion[key]!)} ${key === 'kcal' ? 'kcal' : 'g'}`}</dd>
      </div>)}
    </dl>
  </div>
}
