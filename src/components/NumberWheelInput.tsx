import { useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { WheelColumn } from './WheelColumn'
import { numberWheelDigits, numberWheelValue } from '../domain/numberWheel'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  onValueChange: (value: string) => void
  decimals?: number
}

export function NumberWheelInput({ onValueChange, decimals, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('Zahl auswählen')
  const [digits, setDigits] = useState<number[]>([])
  const [keyboard, setKeyboard] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const places = decimals ?? (props.inputMode === 'decimal' ? 2 : 0)
  const minimum = props.min === undefined ? 0 : Number(props.min)
  const maximum = props.max === undefined ? 9999.99 : Number(props.max)
  const integerDigits = String(Math.floor(maximum)).length
  const selected = numberWheelValue(digits, places)
  const range = places === 0 && maximum <= 100 && Number.isInteger(minimum) && Number.isInteger(maximum)

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
    const current = String(props.value ?? '').replace(',', '.')
    const placeholder = Number(props.placeholder?.replace(',', '.'))
    const initial = current.trim() && Number.isFinite(Number(current)) ? Number(current)
      : props.placeholder?.trim() && Number.isFinite(placeholder) ? placeholder : minimum > 0 && minimum < 1 ? 1 : minimum
    const bounded = Math.min(maximum, Math.max(minimum, initial))
    setDigits(numberWheelDigits(String(bounded), integerDigits, places))
    setTyped(String(bounded))
    setKeyboard(false)
    setError('')
    setLabel(props['aria-label'] ?? input.current?.labels?.[0]?.textContent?.trim() ?? 'Zahl auswählen')
    setOpen(true)
  }

  function apply() {
    const next = keyboard ? typed.replace(',', '.') : numberWheelValue(
      [...(dialog.current?.querySelectorAll<HTMLElement>('[role="listbox"]') ?? [])]
        .map(column => range ? Math.max(minimum, Math.min(maximum, Math.round(column.scrollTop / 44) + minimum)) : Math.max(0, Math.min(9, Math.round(column.scrollTop / 44)))), places)
    const value = Number(next)
    if (!next.trim() || !Number.isFinite(value) || value < minimum || value > maximum) {
      setError(`Bitte eine Zahl zwischen ${String(minimum).replace('.', ',')} und ${String(maximum).replace('.', ',')} wählen.`)
      return
    }
    if (places === 0 && !Number.isInteger(value)) {
      setError('Bitte eine ganze Zahl wählen.')
      return
    }
    onValueChange(String(value))
    close()
  }

  return <>
    <input {...props} ref={input} type="text" readOnly inputMode="none" aria-haspopup="dialog" aria-expanded={open}
      onClick={show} onKeyDown={event => {
        if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); show() }
      }} />
    {open && createPortal(<dialog ref={dialog} aria-labelledby={titleId}
      className="number-wheel-dialog m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl bg-surface p-5 text-foreground shadow-2xl ring-1 ring-line/10"
      onCancel={event => { event.preventDefault(); close() }}>
      <h2 id={titleId} className="text-xl">{label}</h2>
      <p className="mt-2 text-sm text-muted">{range ? 'Wähle die Anzahl.' : 'Wische die Ziffern nach oben oder unten.'}</p>
      {keyboard ? <input autoFocus aria-label="Zahl direkt eingeben" className="mt-5 h-12 w-full rounded-xl bg-control px-3 text-center text-xl tabular-nums"
        inputMode={places > 0 ? 'decimal' : 'numeric'} value={typed} onChange={event => setTyped(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); apply() } }} />
        : <div className="number-wheel mt-4 flex items-center justify-center gap-1">
          {range ? <WheelColumn value={Number(selected)} label="Anzahl" minimum={minimum} maximum={maximum}
            onChange={next => setDigits(numberWheelDigits(String(next), integerDigits, 0))} /> : digits.map((digit, index) => <div key={index} className="flex min-w-0 flex-1 items-center">
            {places > 0 && index === integerDigits && <span className="relative z-10 mr-1 shrink-0 text-2xl" aria-hidden="true">,</span>}
            <WheelColumn value={digit} label={`Ziffer ${index + 1}`} onChange={next => setDigits(current => current.map((value, i) => i === index ? next : value))} />
          </div>)}
        </div>}
      <p className="mt-3 text-center text-2xl font-semibold tabular-nums text-accent-ink" aria-live="polite">{(keyboard ? typed : selected).replace('.', ',')}</p>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-2 flex justify-between gap-3 text-sm text-muted">
        <button type="button" className="min-h-11" onClick={() => {
          if (keyboard) setDigits(numberWheelDigits(typed, integerDigits, places))
          else setTyped(selected)
          setKeyboard(!keyboard)
        }}>{keyboard ? 'Auswahlrad' : 'Tastatur verwenden'}</button>
        <button type="button" className="min-h-11" onClick={() => { onValueChange(''); close() }}>Leeren</button>
      </div>
      <div className="mt-3 flex gap-3">
        <button type="button" className="min-h-12 flex-1 rounded-xl bg-control px-3" onClick={close}>Abbrechen</button>
        <button type="button" className="min-h-12 flex-1 rounded-xl bg-neon px-3 font-semibold text-black" onClick={apply}>Übernehmen</button>
      </div>
    </dialog>, document.body)}
  </>
}
