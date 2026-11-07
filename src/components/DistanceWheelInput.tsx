import { useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { WheelColumn } from './WheelColumn'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  valueKm: number | null
  onKilometersChange: (kilometers: number | null) => void
}

export function DistanceWheelInput({ valueKm, onKilometersChange, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [open, setOpen] = useState(false)
  const [kilometers, setKilometers] = useState(0)
  const [meters, setMeters] = useState(0)
  const [error, setError] = useState('')
  const total = valueKm !== null && Number.isFinite(valueKm) ? Math.round(valueKm * 1000) : null
  const text = total === null ? '' : total < 1000 ? `${total} m`
    : `${Math.floor(total / 1000)} km${total % 1000 ? ` ${total % 1000} m` : ''}`

  useLayoutEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [open])

  function close() {
    dialog.current?.close()
    setOpen(false)
    input.current?.focus({ preventScroll: true })
  }

  function show() {
    if (input.current?.matches(':disabled')) return
    const initial = Math.min(2000000, Math.max(0, total ?? 1000))
    setKilometers(Math.floor(initial / 1000))
    setMeters(initial % 1000)
    setError('')
    setOpen(true)
  }

  function apply() {
    const columns = dialog.current?.querySelectorAll<HTMLElement>('[role="listbox"]')
    const distance = Math.round((columns?.[0]?.scrollTop ?? 0) / 44) * 1000 + Math.round((columns?.[1]?.scrollTop ?? 0) / 44)
    if (distance < 1 || distance > 2000000) { setError('Bitte eine Strecke von 1 m bis 2000 km wählen.'); return }
    onKilometersChange(distance / 1000)
    close()
  }

  return <>
    <input {...props} ref={input} type="text" readOnly inputMode="none" value={text} aria-haspopup="dialog" aria-expanded={open}
      onClick={show} onKeyDown={event => {
        if (['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); show() }
      }} />
    {open && createPortal(<dialog ref={dialog} className="number-wheel-dialog m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl bg-surface p-5 text-foreground shadow-2xl ring-1 ring-line/10"
      aria-labelledby={id} onCancel={event => { event.preventDefault(); close() }}>
      <h2 id={id} className="text-xl">Strecke auswählen</h2>
      <div className="mt-5 grid grid-cols-2 gap-5 text-center text-sm font-semibold text-muted" aria-hidden="true"><span>km</span><span>m</span></div>
      <div className="number-wheel mt-1 flex gap-5">
        <WheelColumn value={kilometers} minimum={0} maximum={2000} label="Kilometer" onChange={setKilometers} />
        <WheelColumn value={meters} minimum={0} maximum={999} label="Meter" onChange={setMeters} />
      </div>
      <p className="mt-3 text-center text-2xl font-semibold tabular-nums text-accent-ink" aria-live="polite">{kilometers} km {meters} m</p>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <button type="button" className="mt-1 min-h-11 text-sm text-muted" onClick={() => { onKilometersChange(null); close() }}>Leeren</button>
      <div className="mt-2 flex gap-3">
        <button type="button" className="min-h-12 flex-1 rounded-xl bg-control px-3" onClick={close}>Abbrechen</button>
        <button type="button" className="min-h-12 flex-1 rounded-xl bg-neon px-3 font-semibold text-black" onClick={apply}>Übernehmen</button>
      </div>
    </dialog>, document.body)}
  </>
}
