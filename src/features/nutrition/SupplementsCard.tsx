import { useEffect, useRef, useState, type FormEvent } from 'react'
import { DoneStamp } from '../../components/DoneStamp'
import { DOSE_UNITS, type DoseUnit, formatDose, normalizeWeekdays, parseDose, QUICK_SUPPLEMENTS, scheduleLabel, supplementDue } from '../../domain/supplements'
import { CheckIcon, TrashIcon } from '../../lib/icons'
import { addSupplement, loadSupplements, removeSupplement, setSupplementTaken, updateSupplement, type Supplement } from './api'

// Ohne w-full, sonst nimmt ein Feld die ganze Breite und schiebt den Rest aus dem Bild.
const INPUT = 'h-11 rounded-xl border border-line/15 bg-control px-3 text-base text-foreground outline-none focus:border-neon'
const WEEK = [1, 2, 3, 4, 5, 6, 0]
const SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

type Values = { amount: string; unit: DoseUnit; days: number[] }

/** Menge, Einheit und Tage. Alle Tage an heißt täglich. Beim Hinzufügen zusätzlich der Name. */
function SupplementForm({ initial, withName, name, onName, busy, submitLabel, onSubmit, amountRef }: {
  initial: Values; withName: boolean; name?: string; onName?: (value: string) => void; busy: boolean; submitLabel: string
  onSubmit: (values: Values) => void; amountRef?: React.RefObject<HTMLInputElement | null>
}) {
  const [values, setValues] = useState(initial)
  const daily = values.days.length === 7
  return <form className="space-y-2" onSubmit={(event: FormEvent) => { event.preventDefault(); onSubmit(values) }}>
    {withName && <input className={`${INPUT} w-full`} placeholder="Name, z. B. Eisen" maxLength={60} value={name} aria-label="Name des Supplements"
      onChange={(event) => onName?.(event.target.value)} />}
    <div className="flex gap-2">
      <input ref={amountRef} className={`${INPUT} w-24 shrink-0 tabular-nums`} inputMode="decimal" placeholder="Menge" value={values.amount} aria-label="Menge"
        onChange={(event) => setValues({ ...values, amount: event.target.value })} />
      <select className={`${INPUT} min-w-0 flex-1`} value={values.unit} aria-label="Einheit"
        onChange={(event) => setValues({ ...values, unit: event.target.value as DoseUnit })}>
        {DOSE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
      </select>
    </div>
    <div>
      <div className="grid grid-cols-7 gap-1" role="group" aria-label="An welchen Tagen">
        {WEEK.map((day) => {
          const on = values.days.includes(day)
          return <button key={day} type="button" aria-pressed={on} className={`h-11 min-w-0 rounded-lg text-sm font-semibold ${on ? 'bg-neon/15 text-accent-ink ring-1 ring-neon/60' : 'bg-control text-muted'}`}
            onClick={() => setValues({ ...values, days: on ? values.days.filter((entry) => entry !== day) : [...values.days, day] })}>{SHORT[day]}</button>
        })}
      </div>
      <p className="mt-1 text-xs text-muted">{daily ? 'Täglich' : values.days.length ? `${values.days.length}× pro Woche` : 'Mindestens einen Tag wählen'}</p>
    </div>
    <button className="min-h-11 w-full rounded-xl bg-neon px-4 text-sm font-semibold text-black disabled:opacity-50" type="submit"
      disabled={busy || values.days.length === 0 || (withName && !name?.trim())}>{submitLabel}</button>
  </form>
}

/** Supplemente und Vitamine zum Abhaken, nur an ihren Tagen. Sind alle des Tages genommen, kommt der DONE-Stempel. */
export function SupplementsCard({ date }: { date: string }) {
  const [list, setList] = useState<Supplement[] | null>(null)
  const [taken, setTaken] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState(false)
  const [changing, setChanging] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<DoseUnit>('g')
  const [formKey, setFormKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const amountInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    loadSupplements(date).then((data) => {
      if (cancelled) return
      setList(data.list)
      setTaken(data.taken)
      setError('')
    }).catch(() => { if (!cancelled) setError('Supplemente konnten nicht geladen werden.') })
    return () => { cancelled = true }
  }, [date, attempt])

  const due = list?.filter((item) => supplementDue(item.weekdays, date)) ?? []
  const allTaken = due.length > 0 && due.every((item) => taken.has(item.id))
  // Stempel nur, wenn du selbst den letzten Haken setzt, nicht beim Öffnen eines fertigen Tages.
  const [stampKey, setStampKey] = useState(0)

  async function toggle(item: Supplement) {
    const next = !taken.has(item.id)
    const update = (on: boolean) => setTaken((current) => {
      const copy = new Set(current)
      if (on) copy.add(item.id)
      else copy.delete(item.id)
      return copy
    })
    update(next)
    if (next && due.every((entry) => entry.id === item.id || taken.has(entry.id))) setStampKey((value) => value + 1)
    try { await setSupplementTaken(item.id, date, next) }
    catch { update(!next); setError('Der Haken konnte nicht gespeichert werden.') }
  }

  async function add(values: Values) {
    const cleanName = name.trim()
    if (!cleanName || busy) return
    if (list?.some((item) => item.name.toLowerCase() === cleanName.toLowerCase())) { setError(`${cleanName} ist schon in deiner Liste.`); return }
    setBusy(true)
    setError('')
    try {
      const created = await addSupplement(cleanName, formatDose(values.amount, values.unit), normalizeWeekdays(values.days))
      setList((current) => [...(current ?? []), created])
      // Nach dem ersten Eintrag bleibt das Hinzufügen offen, damit man direkt weitere eintragen kann.
      if (list?.length === 0) setEditing(true)
      setName('')
      setFormKey((value) => value + 1)
    } catch { setError('Hinzufügen hat nicht geklappt.') }
    finally { setBusy(false) }
  }

  async function change(item: Supplement, values: Values) {
    const changes = { dose: formatDose(values.amount, values.unit), weekdays: normalizeWeekdays(values.days) }
    setBusy(true)
    setError('')
    try {
      await updateSupplement(item.id, changes)
      setList((current) => current?.map((entry) => entry.id === item.id ? { ...entry, ...changes } : entry) ?? current)
      setChanging(null)
    } catch { setError('Ändern hat nicht geklappt.') }
    finally { setBusy(false) }
  }

  async function remove(item: Supplement) {
    setBusy(true)
    try {
      await removeSupplement(item.id)
      setList((current) => current?.filter((entry) => entry.id !== item.id) ?? current)
    } catch { setError('Löschen hat nicht geklappt.') }
    finally { setBusy(false) }
  }

  const showAdd = editing || list?.length === 0
  const quick = QUICK_SUPPLEMENTS.filter((entry) => !list?.some((item) => item.name.toLowerCase() === entry.name.toLowerCase()))
  const shown = editing ? list ?? [] : due

  return <section className="relative rounded-2xl border border-line/[0.08] bg-surface p-4" aria-labelledby="supplements-heading">
    {stampKey > 0 && allTaken && <DoneStamp key={stampKey} />}
    <div className="flex items-center justify-between gap-3">
      <h2 id="supplements-heading" className="text-xl">Supplemente</h2>
      {list && list.length > 0 && <button className="min-h-11 px-1 text-sm font-medium text-accent-ink" type="button" onClick={() => { setEditing((value) => !value); setChanging(null) }}>
        {editing ? 'Fertig' : 'Bearbeiten'}
      </button>}
    </div>

    {list === null && !error && <p className="mt-2 text-sm text-muted">Wird geladen …</p>}
    {list && list.length > 0 && !editing && !due.length && <p className="mt-2 text-sm text-muted">Heute nichts dran.</p>}
    {shown.length > 0 && <ul className="mt-2 divide-y divide-line/[0.06]">
      {shown.map((item) => {
        const done = taken.has(item.id)
        const days = scheduleLabel(item.weekdays)
        const parsed = parseDose(item.dose)
        return <li key={item.id} className="py-1.5">
          <div className="flex items-center gap-3">
            {editing
              ? <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger disabled:opacity-50" type="button"
                aria-label={`${item.name} entfernen`} disabled={busy} onClick={() => void remove(item)}><TrashIcon className="h-4 w-4" /></button>
              : <button className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${done ? 'border-success bg-success text-black' : 'border-line/20 text-transparent'}`}
                type="button" aria-pressed={done} aria-label={`${item.name} ${done ? 'genommen, Haken entfernen' : 'abhaken'}`} onClick={() => void toggle(item)}>
                <CheckIcon className="h-5 w-5 stroke-[3]" />
              </button>}
            <span className="min-w-0 flex-1">
              <span className={`block truncate ${done && !editing ? 'text-muted line-through' : 'text-foreground'}`}>{item.name}</span>
              {days && <span className="block text-xs text-muted">{days}</span>}
            </span>
            {item.dose && <span className="shrink-0 text-sm tabular-nums text-muted">{item.dose}</span>}
            {editing && <button type="button" className="min-h-11 shrink-0 px-1 text-sm font-medium text-accent-ink" aria-expanded={changing === item.id}
              onClick={() => setChanging(changing === item.id ? null : item.id)}>{changing === item.id ? 'Schließen' : 'Ändern'}</button>}
          </div>
          {editing && changing === item.id && <div className="mt-2">
            <SupplementForm withName={false} busy={busy} submitLabel="Speichern" onSubmit={(values) => void change(item, values)}
              initial={{ amount: parsed.amount, unit: parsed.unit ?? 'g', days: item.weekdays ?? ALL_DAYS }} />
          </div>}
        </li>
      })}
    </ul>}

    {showAdd && <div className="mt-3 border-t border-line/[0.06] pt-3">
      {list?.length === 0 && <p className="text-sm text-muted">Was nimmst du? Tippe an oder trag es selbst ein.</p>}
      {quick.length > 0 && <div className="mt-2 flex flex-wrap gap-2">
        {quick.map((entry) => <button key={entry.name} type="button" disabled={busy} className="min-h-9 rounded-full bg-control px-3 text-sm text-foreground disabled:opacity-50"
          onClick={() => { setName(entry.name); setUnit(entry.unit); setError(''); requestAnimationFrame(() => amountInput.current?.focus()) }}>+ {entry.name}</button>)}
      </div>}
      <div className="mt-3">
        {/* Ein Vorschlag setzt die passende Einheit, dafür startet das Formular neu. */}
        <SupplementForm key={`${formKey}-${unit}`} withName name={name} onName={setName} busy={busy} submitLabel="Hinzufügen" amountRef={amountInput}
          initial={{ amount: '', unit, days: ALL_DAYS }} onSubmit={(values) => void add(values)} />
      </div>
    </div>}

    {error && <p role="alert" className="mt-2 text-sm text-danger">{error} {list === null && <button type="button" className="font-medium text-accent-ink" onClick={() => setAttempt((value) => value + 1)}>Erneut laden</button>}</p>}
  </section>
}
