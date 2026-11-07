import { useEffect, useState } from 'react'
import { TrashIcon } from '../../lib/icons'

type Props = {
  label: string
  disabled?: boolean
  onConfirm: () => void
  className?: string
}

/** Löschen am Laptop: Der erste Klick fragt nach, der zweite löscht. Nach drei Sekunden verfällt die Nachfrage. */
export function ConfirmDeleteButton({ label, disabled, onConfirm, className = '' }: Props) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timeout = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(timeout)
  }, [armed])

  return (
    <button
      type="button"
      aria-label={armed ? `${label}: zum Bestätigen noch einmal klicken` : label}
      disabled={disabled}
      className={`flex h-11 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40 ${
        armed
          ? 'bg-[#FF453A] px-3 text-sm font-semibold text-white opacity-100!'
          : 'w-11 text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-[#FF453A] focus-visible:text-[#FF453A]'
      } ${className}`}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
        }
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? 'Löschen' : <TrashIcon className="h-5 w-5" />}
    </button>
  )
}
