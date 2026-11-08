import { useEffect, useRef, useState, type FormEvent } from 'react'
import { DoneStamp } from '../../components/DoneStamp'
import { CheckIcon, PlusIcon, TrashIcon } from '../../lib/icons'
import { addSupplement, loadSupplements, removeSupplement, setSupplementTaken, updateSupplementDose, type Supplement } from './api'

// Ohne w-full, sonst nimmt das Mengenfeld die ganze Breite und schiebt den Knopf aus dem Bild.
const INPUT = 'h-11 rounded-xl border border-line/15 bg-control px-3 text-base text-foreground outline-none focus:border-neon'
const QUICK = ['Kreatin', 'Vitamin D3', 'Omega-3', 'Magnesium', 'Zink', 'Multivitamin']

/** Supplemente und Vitamine zum Abhaken. Sind alle für den Tag genommen, kommt der DONE-Stempel. */
export function SupplementsCard({ date }: { date: string }) {
  const [list, setList] = useState<Supplement[] | null>(null)
  const [taken, setTaken] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const doseInput = useRef<HTMLInputElement>(null)

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

  const allTaken = list !== null && list.length > 0 && list.every((item) => taken.has(item.id))
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
    if (next && list?.every((entry) => entry.id === item.id || taken.has(entry.id))) setStampKey((value) => value + 1)
    try { await setSupplementTaken(item.id, date, next) }
    catch { update(!next); setError('Der Haken konnte nicht gespeichert werden.') }
  }

  async function add(newName: string, newDose: string) {
    const cleanName = newName.trim()
    if (!cleanName || busy) return
    if (list?.some((item) => item.name.toLowerCase() === cleanName.toLowerCase())) { setError(`${cleanName} ist schon in deiner Liste.`); return }
    setBusy(true)
    setError('')
    try {
      const created = await addSupplement(cleanName, newDose.trim() || null)
      setList((current) => [...(current ?? []), created])
      // Nach dem ersten Eintrag bleibt das Hinzufügen offen, damit man direkt weitere eintragen kann.
      if (list?.length === 0) setEditing(true)
      setName('')
      setDose('')
    } catch { setError('Hinzufügen hat nicht geklappt.') }
    finally { setBusy(false) }
  }

  async function changeDose(item: Supplement, value: string) {
    const next = value.trim() || null
    if (next === item.dose) return
    setList((current) => current?.map((entry) => entry.id === item.id ? { ...entry, dose: next } : entry) ?? current)
    try { await updateSupplementDose(item.id, next) }
    catch {
      setList((current) => current?.map((entry) => entry.id === item.id ? { ...entry, dose: item.dose } : entry) ?? current)
      setError('Menge konnte nicht gespeichert werden.')
    }
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
  const quick = QUICK.filter((entry) => !list?.some((item) => item.name.toLowerCase() === entry.toLowerCase()))

  return <section className="relative rounded-2xl border border-line/[0.08] bg-surface p-4" aria-labelledby="supplements-heading">
    {stampKey > 0 && allTaken && <DoneStamp key={stampKey} />}
    <div className="flex items-center justify-between gap-3">
      <h2 id="supplements-heading" className="text-xl">Supplemente</h2>
      {list && list.length > 0 && <button className="min-h-11 px-1 text-sm font-medium text-accent-ink" type="button" onClick={() => setEditing((value) => !value)}>
        {editing ? 'Fertig' : 'Bearbeiten'}
      </button>}
    </div>

    {list === null && !error && <p className="mt-2 text-sm text-muted">Wird geladen …</p>}
    {list && list.length > 0 && <ul className="mt-2 divide-y divide-line/[0.06]">
      {list.map((item) => {
        const done = taken.has(item.id)
        return <li key={item.id} className="flex items-center gap-3 py-1.5">
          {editing
            ? <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger disabled:opacity-50" type="button"
              aria-label={`${item.name} entfernen`} disabled={busy} onClick={() => void remove(item)}><TrashIcon className="h-4 w-4" /></button>
            : <button className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${done ? 'border-success bg-success text-black' : 'border-line/20 text-transparent'}`}
              type="button" aria-pressed={done} aria-label={`${item.name} ${done ? 'genommen, Haken entfernen' : 'abhaken'}`} onClick={() => void toggle(item)}>
              <CheckIcon className="h-5 w-5 stroke-[3]" />
            </button>}
          <span className={`min-w-0 flex-1 truncate ${done && !editing ? 'text-muted line-through' : 'text-foreground'}`}>{item.name}</span>
          {editing
            ? <input key={item.dose ?? ''} className={`${INPUT} w-24 shrink-0 text-sm`} placeholder="Menge" maxLength={40} defaultValue={item.dose ?? ''}
              aria-label={`Menge von ${item.name}`} enterKeyHint="done"
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
              onBlur={(event) => void changeDose(item, event.target.value)} />
            : item.dose && <span className="shrink-0 text-sm tabular-nums text-muted">{item.dose}</span>}
        </li>
      })}
    </ul>}

    {showAdd && <div className="mt-3">
      {list?.length === 0 && <p className="text-sm text-muted">Was nimmst du täglich? Tippe an oder trag es selbst ein.</p>}
      {quick.length > 0 && <div className="mt-2 flex flex-wrap gap-2">
        {quick.map((entry) => <button key={entry} type="button" disabled={busy} className="min-h-9 rounded-full bg-control px-3 text-sm text-foreground disabled:opacity-50" onClick={() => { setName(entry); setError(''); doseInput.current?.focus() }}>+ {entry}</button>)}
      </div>}
      <form className="mt-3 flex gap-2" onSubmit={(event: FormEvent) => { event.preventDefault(); void add(name, dose) }}>
        <input className={`${INPUT} min-w-0 flex-1`} placeholder="Eigenes, z. B. Eisen" maxLength={60} value={name} aria-label="Name des Supplements" onChange={(event) => setName(event.target.value)} />
        <input ref={doseInput} className={`${INPUT} w-24 shrink-0`} placeholder="Menge" maxLength={40} value={dose} aria-label="Menge, optional" onChange={(event) => setDose(event.target.value)} />
        <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon text-black disabled:opacity-50" type="submit" aria-label="Supplement hinzufügen" disabled={busy || !name.trim()}>
          <PlusIcon className="h-5 w-5" />
        </button>
      </form>
    </div>}

    {error && <p role="alert" className="mt-2 text-sm text-danger">{error} {list === null && <button type="button" className="font-medium text-accent-ink" onClick={() => setAttempt((value) => value + 1)}>Erneut laden</button>}</p>}
  </section>
}
