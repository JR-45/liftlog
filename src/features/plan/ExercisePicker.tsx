import { useState } from 'react'
import { EXERCISE_CATALOG, findExercises, type CatalogExercise } from '../../domain/exerciseCatalog'

const INPUT = 'mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-neutral-100'
const GROUPS = [...new Set(EXERCISE_CATALOG.map((exercise) => exercise.group))]

export function ExercisePicker({ onSelect }: { onSelect: (exercise: CatalogExercise) => void }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const matches = findExercises(query, group)
  return (
    <div className="mb-4 rounded-lg bg-neutral-800 p-3">
      <p className="font-medium text-neutral-200">Übungskatalog</p>
      <label className="mt-2 block text-sm text-neutral-400">Übung suchen
        <input className={INPUT} type="search" placeholder="z. B. Brust, Kabelzug, Beinpresse" value={query}
          onChange={(event) => setQuery(event.target.value)} />
      </label>
      <label className="mt-2 block text-sm text-neutral-400">Muskelgruppe / Bereich
        <select className={INPUT} value={group} onChange={(event) => setGroup(event.target.value)}>
          <option value="">Alle Bereiche</option>
          {GROUPS.map((name) => <option key={name}>{name}</option>)}
        </select>
      </label>
      <label className="mt-2 block text-sm text-neutral-400">Übung auswählen ({matches.length})
        <select className={INPUT} value="" onChange={(event) => {
          const selected = EXERCISE_CATALOG.find((exercise) => exercise.name === event.target.value)
          if (selected) onSelect(selected)
        }}>
          <option value="">Bitte auswählen …</option>
          {GROUPS.map((name) => {
            const exercises = matches.filter((exercise) => exercise.group === name)
            return exercises.length > 0 && <optgroup key={name} label={name}>
              {exercises.map((exercise) => <option key={exercise.name}>{exercise.name}</option>)}
            </optgroup>
          })}
        </select>
      </label>
      {matches.length === 0 && <p className="mt-2 text-sm text-neutral-400">Keine Treffer. Du kannst unten eine eigene Übung eintragen.</p>}
    </div>
  )
}
