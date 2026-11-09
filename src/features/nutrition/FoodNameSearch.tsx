import { useEffect, useId, useState } from 'react'
import type { FoodSuggestion } from '../../domain/foodSearch'
import { INPUT } from '../../lib/ui'
import { searchFoods } from './api'

export function FoodNameSearch({ value, onChange, onSelect }: {
  value: string; onChange: (value: string) => void; onSelect: (food: FoodSuggestion) => void
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ query: string; foods: FoodSuggestion[]; error: boolean } | null>(null)
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  useEffect(() => {
    if (query.trim().length < 2) return
    let current = true
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void searchFoods(query, controller.signal).then(foods => {
        if (current) setResults({ query, foods, error: false })
      }).catch(() => { if (current) setResults({ query, foods: [], error: true }) })
    }, 300)
    return () => { current = false; clearTimeout(timer); controller.abort() }
  }, [query])
  const visible = focused && query === value && query.trim().length >= 2
  const foods = results?.query === query ? results.foods : []
  const loading = visible && results?.query !== query
  const open = visible && foods.length > 0
  function choose(food: FoodSuggestion) {
    setQuery('')
    setResults(null)
    setActive(-1)
    onSelect(food)
  }
  return <div className="min-w-0">
    <label className="block text-sm"><span className="mb-1 block text-muted">Lebensmittel</span>
      <input className={INPUT} maxLength={120} required value={value} role="combobox" aria-autocomplete="list" autoComplete="off"
        aria-expanded={open} aria-controls={`${id}-results`} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setActive(-1) }}
        onChange={event => { onChange(event.target.value); setQuery(event.target.value); setResults(null); setActive(-1) }}
        onKeyDown={event => {
          if (event.key === 'Escape') { setQuery(''); setActive(-1); event.preventDefault(); return }
          if (!open) return
          if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => (index + 1) % foods.length) }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => index <= 0 ? foods.length - 1 : index - 1) }
          if (event.key === 'Enter') { event.preventDefault(); if (active >= 0) choose(foods[active]) }
        }} />
    </label>
    {loading && <p role="status" className="mt-2 text-xs text-muted">Suche …</p>}
    {visible && !loading && results?.error && <p role="status" className="mt-2 text-xs text-muted">Suche nicht verfügbar. Selbst eintragen bleibt möglich.</p>}
    {visible && !loading && !results?.error && foods.length === 0 && <p role="status" className="mt-2 text-xs text-muted">Kein Treffer. Selbst eintragen.</p>}
    {open && <ul id={`${id}-results`} role="listbox" aria-label="Lebensmittelvorschläge" className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-line/15 bg-surface divide-y divide-line/[0.06]">
      {foods.map((food, index) => <li key={food.id} role="presentation"><button type="button" role="option" id={`${id}-${index}`} aria-selected={active === index}
        className={`min-h-11 w-full px-3 py-2 text-left text-sm ${active === index ? 'bg-neon/10 text-accent-ink' : ''}`}
        onPointerDown={event => event.preventDefault()} onClick={() => choose(food)}>
        <span className="block font-medium">{food.name}</span>{food.brand && <span className="block text-xs text-muted">{food.brand}</span>}
      </button></li>)}
    </ul>}
  </div>
}
