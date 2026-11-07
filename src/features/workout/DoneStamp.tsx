import { useState } from 'react'

/**
 * Grüner „DONE“-Stempel, der einmal auf die Übungskarte knallt und wieder verschwindet.
 * Wird über einen neuen key neu abgespielt. Rein dekorativ, der Status steht schon im Haken.
 */
export function DoneStamp() {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <div className="done-stamp-layer pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden="true"
      onAnimationEnd={(event) => { if (event.target === event.currentTarget) setVisible(false) }}>
      <span className="done-stamp-ring absolute h-16 w-16 rounded-full border-4 border-success" />
      <span className="done-stamp rounded-xl border-4 border-success bg-success/10 px-5 py-0.5 font-display text-4xl font-extrabold uppercase tracking-[0.2em] text-success">
        Done
      </span>
    </div>
  )
}
