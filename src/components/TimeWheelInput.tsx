import { useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { timeWheelParts, timeWheelSeconds } from '../domain/numberWheel'
import { WheelColumn } from './WheelColumn'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  valueSeconds: number | null
  placeholderSeconds?: number | null
  onSecondsChange: (seconds: number | null) => void
}

export function TimeWheelInput({ valueSeconds, placeholderSeconds, onSecondsChange, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('Dauer auswählen')
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(1)
  const [error, setError] = useState('')
  const parts = timeWheelParts(valueSeconds ?? 0)
  const placeholder = placeholderSeconds ? timeWheelParts(placeholderSeconds) : null

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
    const initial = timeWheelParts(valueSeconds ?? placeholderSeconds ?? 60)
    setHours(initial.hours)
    setMinutes(initial.minutes)
    setError('')
    setLabel(props['aria-label'] ?? input.current?.labels?.[0]?.textContent?.trim() ?? 'Dauer auswählen')
    setOpen(true)
  }

  function apply() {
    const columns = dialog.current?.querySelectorAll<HTMLElement>('[role="listbox"]')
    const seconds = timeWheelSeconds(Math.round((columns?.[0]?.scrollTop ?? 0) / 44), Math.round((columns?.[1]?.scrollTop ?? 0) / 44))
    if (seconds === null) { setError('Bitte eine Dauer von 1 min bis 24 h wählen.'); return }
    onSecondsChange(seconds)
    close()
  }

  return <>
    <input {...props} ref={input} type="text" readOnly inputMode="none" value={valueSeconds === null ? '' : `${parts.hours} h ${parts.minutes} min`}
      placeholder={placeholder ? `${placeholder.hours} h ${placeholder.minutes} min` : props.placeholder}
      aria-haspopup="dialog" aria-expanded={open} onClick={show} onKeyDown={event => {
        if (['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); show() }
      }} />
    {open && createPortal(<dialog ref={dialog} className="number-wheel-dialog m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl bg-surface p-5 text-foreground shadow-2xl ring-1 ring-line/10"
      aria-labelledby={id} onCancel={event => { event.preventDefault(); close() }}>
      <h2 id={id} className="text-xl">{label}</h2>
      <div className="mt-5 grid grid-cols-2 gap-5 text-center text-sm font-semibold text-muted" aria-hidden="true"><span>h</span><span>min</span></div>
      <div className="number-wheel mt-1 flex gap-5">
        <WheelColumn value={hours} minimum={0} maximum={24} label="Stunden" onChange={setHours} />
        <WheelColumn value={minutes} minimum={0} maximum={59} label="Minuten" onChange={setMinutes} />
      </div>
      <p className="mt-3 text-center text-2xl font-semibold tabular-nums text-accent-ink" aria-live="polite">{hours} h {minutes} min</p>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <button type="button" className="mt-1 min-h-11 text-sm text-muted" onClick={() => { onSecondsChange(null); close() }}>Leeren</button>
      <div className="mt-2 flex gap-3">
        <button type="button" className="min-h-12 flex-1 rounded-xl bg-control px-3" onClick={close}>Abbrechen</button>
        <button type="button" className="min-h-12 flex-1 rounded-xl bg-neon px-3 font-semibold text-black" onClick={apply}>Übernehmen</button>
      </div>
    </dialog>, document.body)}
  </>
}
