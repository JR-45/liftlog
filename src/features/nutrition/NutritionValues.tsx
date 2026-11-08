import { formatNutrition, NUTRIENTS, NUTRIENT_LABELS, nutrientProgress, type Nutrition, type NutritionTargets } from '../../domain/nutrition'


export function NutritionValues({ values }: { values: Nutrition }) {
  return <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3 xl:grid-cols-6">
    {NUTRIENTS.map((key) => <div key={key}>
      <dt className="text-xs text-muted">{NUTRIENT_LABELS[key]}</dt>
      <dd className="font-semibold tabular-nums">{formatNutrition(values[key], key)}</dd>
    </div>)}
  </dl>
}

export function NutritionProgress({ values, targets, label }: { values: Nutrition; targets: NutritionTargets; label: string }) {
  return <section aria-label={label} className="space-y-4">
    {NUTRIENTS.map((key) => {
      const progress = nutrientProgress(values[key], targets[key])
      return <div key={key}>
        <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-sm">
          <span className="font-medium">{key === 'sugar' ? 'Zucker (WHO-Max.)' : NUTRIENT_LABELS[key]}</span>
          <span className="tabular-nums">{formatNutrition(values[key], key)}{progress && ` · ${progress.percent} %`}</span>
        </div>
        {progress ? <>
          <progress className="nutrition-progress mt-1.5 h-2 w-full" aria-label={`${NUTRIENT_LABELS[key]}: ${progress.percent} % des Tagesziels`} max={Math.max(targets[key]!, values[key])} value={values[key]} />
          <p className="mt-1 text-xs text-muted">{progress.exceeded > 0
            ? `${formatNutrition(progress.exceeded, key)} über ${key === 'sugar' ? 'WHO-Max.' : 'Tagesziel'}`
            : `${formatNutrition(progress.remaining, key)} verbleibend`} · {key === 'sugar' ? 'Max.' : 'Ziel'} {formatNutrition(targets[key]!, key)}</p>
        </> : <p className="mt-1 text-xs text-muted">Noch kein Tagesziel gesetzt</p>}
      </div>
    })}
  </section>
}
