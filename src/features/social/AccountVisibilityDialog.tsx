import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../lib/icons'
import { CARD, NAV_BUTTON, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from '../../lib/ui'

export function AccountVisibilityDialog({ isPrivate, onSave, onClose }: {
  isPrivate: boolean; onSave: (value: boolean) => Promise<void>; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState(isPrivate)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = overflow }
  }, [])

  return createPortal(<dialog ref={dialog} aria-modal="true" aria-labelledby="account-visibility-title"
    className={`template-day-dialog ${CARD} m-auto w-[calc(100%_-_2rem)] max-w-sm text-foreground`}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:checked:not(:disabled)')
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
    onClick={event => {
      if (event.target !== event.currentTarget || busy) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }}>
    <div className="flex items-center justify-between gap-3"><h2 id="account-visibility-title" className={SECTION_TITLE}>Kontosichtbarkeit</h2>
      <button type="button" className={NAV_BUTTON} aria-label="Schließen" disabled={busy} onClick={onClose}><CloseIcon /></button></div>
    <form className="mt-3 space-y-4" onSubmit={event => {
      event.preventDefault()
      if (lock.current) return
      if (selected === isPrivate) { onClose(); return }
      lock.current = true
      setBusy(true)
      setError('')
      void onSave(selected).then(onClose).catch(() => setError('Kontosichtbarkeit konnte nicht gespeichert werden.'))
        .finally(() => { lock.current = false; setBusy(false) })
    }}>
      <fieldset disabled={busy} className="space-y-2"><legend className="sr-only">Kontosichtbarkeit wählen</legend>
        {[{ label: 'Öffentlich', value: false }, { label: 'Privat', value: true }].map(option => <label key={option.label}
          className={`flex min-h-11 items-center gap-3 rounded-xl p-3 text-sm ${selected === option.value ? 'bg-neon/10 text-accent-ink' : 'bg-control'}`}>
          <input type="radio" name="account-visibility" className="h-5 w-5 shrink-0 accent-neon" checked={selected === option.value}
            onChange={() => setSelected(option.value)} /><span className="font-semibold">{option.label}</span>
        </label>)}
      </fieldset>
      {isPrivate && !selected && <p className="text-sm text-warning">Offene Anfragen werden angenommen.</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-2"><button type="button" className={SECONDARY_BUTTON} disabled={busy} onClick={onClose}>Abbrechen</button>
        <button type="submit" className={PRIMARY_BUTTON} disabled={busy}>{busy ? 'Wird gespeichert …' : 'Speichern'}</button></div>
    </form>
  </dialog>, document.body)
}
