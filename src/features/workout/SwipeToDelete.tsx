import { type PointerEvent, type ReactNode, useRef, useState } from 'react'
import { TrashIcon } from '../../lib/icons'

/** Breite der roten Löschen-Fläche, wenn sie offen stehen bleibt. */
const ACTION_WIDTH = 88
/** Ab dieser Strecke gilt eine Bewegung als Wischen statt als Tippen oder Scrollen. */
const DRAG_THRESHOLD = 8
/** Wer weiter als diesen Anteil der Breite wischt, löscht direkt wie in iOS. */
const FULL_SWIPE_RATIO = 0.6

type Props = {
  /** Text für Screenreader, z. B. „Bankdrücken löschen“. */
  label: string
  enabled: boolean
  onDelete: () => void
  children: ReactNode
  className?: string
}

/**
 * Nach links wischen zeigt wie in iOS eine rote Löschen-Fläche.
 * Nur für Touch gedacht. Am Laptop gibt es stattdessen einen Löschen-Button.
 */
export function SwipeToDelete({ label, enabled, onDelete, children, className = '' }: Props) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ x: number; y: number; base: number; axis: 'x' | 'y' | null } | null>(null)
  // Nach einem Wischen darf der folgende Klick keine Übung öffnen oder einen Haken setzen.
  const suppressClick = useRef(false)
  const open = offset <= -ACTION_WIDTH

  if (!enabled) return <div className={className}>{children}</div>

  function width(): number {
    return containerRef.current?.offsetWidth ?? 320
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') return
    gesture.current = { x: event.clientX, y: event.clientY, base: offset, axis: null }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current
    if (!current) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (current.axis === null) {
      if (Math.abs(dx) > DRAG_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        current.axis = 'x'
        setDragging(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      } else if (Math.abs(dy) > DRAG_THRESHOLD) {
        current.axis = 'y'
      }
    }
    if (current.axis !== 'x') return
    setOffset(Math.min(0, Math.max(-width(), current.base + dx)))
  }

  function finish() {
    const current = gesture.current
    gesture.current = null
    if (!current || current.axis !== 'x') return
    setDragging(false)
    suppressClick.current = true
    if (offset < -width() * FULL_SWIPE_RATIO) {
      setOffset(-width())
      onDelete()
    } else {
      setOffset(offset < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0)
    }
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {offset < 0 && (
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center justify-end bg-[#FF453A] text-white"
          style={{ width: -offset }}
          aria-label={label}
          tabIndex={open ? 0 : -1}
          onClick={onDelete}
        >
          <span className="flex w-[88px] shrink-0 flex-col items-center justify-center gap-0.5 text-xs font-semibold">
            <TrashIcon className="h-5 w-5" />
            Löschen
          </span>
        </button>
      )}
      <div
        className={`relative ${dragging ? '' : 'transition-transform duration-200 ease-out motion-reduce:transition-none'}`}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finish}
        onPointerCancel={() => {
          gesture.current = null
          setDragging(false)
          setOffset(open ? -ACTION_WIDTH : 0)
        }}
        onClickCapture={(event) => {
          // Ein Tipp auf die offene Zeile schließt sie wieder, statt etwas auszulösen.
          if (suppressClick.current || open) {
            event.preventDefault()
            event.stopPropagation()
            if (!suppressClick.current) setOffset(0)
          }
          suppressClick.current = false
        }}
      >
        {children}
      </div>
    </div>
  )
}
