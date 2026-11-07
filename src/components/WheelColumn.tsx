import { useEffect, useRef, useState } from 'react'

export function WheelColumn({ value, label, onChange, minimum = 0, maximum = 9 }: {
  value: number; label: string; onChange: (value: number) => void; minimum?: number; maximum?: number
}) {
  const column = useRef<HTMLDivElement>(null)
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scrollIndex, setScrollIndex] = useState(value)
  const [renderedValue, setRenderedValue] = useState(value)
  const virtual = maximum - minimum > 100
  if (renderedValue !== value) {
    setRenderedValue(value)
    setScrollIndex(value)
  }
  useEffect(() => {
    if (column.current) column.current.scrollTop = (value - minimum) * 44
  }, [value, minimum])
  useEffect(() => () => { if (delay.current) clearTimeout(delay.current) }, [])
  return <div className="number-wheel-column" ref={column} role="listbox" aria-label={label} tabIndex={0}
    style={virtual ? { scrollSnapType: 'none' } : undefined}
    data-minimum={minimum}
    onKeyDown={event => {
      const next = event.key === 'ArrowUp' ? Math.max(minimum, value - 1) : event.key === 'ArrowDown' ? Math.min(maximum, value + 1)
        : event.key === 'Home' ? minimum : event.key === 'End' ? maximum : null
      if (next !== null) { event.preventDefault(); onChange(next) }
    }}
    onScroll={event => {
      const element = event.currentTarget
      if (virtual) setScrollIndex(Math.max(minimum, Math.min(maximum, Math.round(element.scrollTop / 44) + minimum)))
      if (delay.current) clearTimeout(delay.current)
      delay.current = setTimeout(() => onChange(Math.max(minimum, Math.min(maximum, Math.round(element.scrollTop / 44) + minimum))), 100)
    }}>
    <div style={virtual ? { height: (maximum - minimum + 1) * 44, position: 'relative' } : undefined}>
    {Array.from({ length: virtual ? Math.min(maximum, scrollIndex + 5) - Math.max(minimum, scrollIndex - 5) + 1 : maximum - minimum + 1 },
      (_, index) => index + (virtual ? Math.max(minimum, scrollIndex - 5) : minimum)).map(number => <button key={number} type="button"
      role="option" aria-selected={value === number} tabIndex={-1}
      aria-posinset={number - minimum + 1} aria-setsize={maximum - minimum + 1}
      style={virtual ? { position: 'absolute', top: (number - minimum) * 44 } : undefined}
      className={`number-wheel-digit ${value === number ? 'text-foreground' : 'text-muted/60'}`}
      onClick={() => onChange(number)}>{number}</button>)}
    </div>
  </div>
}
