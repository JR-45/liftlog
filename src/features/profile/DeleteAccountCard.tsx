import { type FormEvent, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRightIcon, CloseIcon } from '../../lib/icons'
import { CARD, NAV_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from '../../lib/ui'
import { deleteOwnAccount } from '../auth/api'

/**
 * Konto löschen: Bestätigungsfenster mit Hinweis auf den CSV-Export und Passwortabfrage.
 * Löscht Konto und alle Trainingsdaten endgültig.
 */
export function DeleteAccountCard({ email, disabled = false }: { email: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  function close() {
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.focus())
  }
  return <>
    <button ref={trigger} type="button" className="flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium disabled:opacity-50" disabled={disabled}
      aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <span>Konto löschen</span><ChevronRightIcon className="h-4 w-4 shrink-0" />
    </button>
    {open && <DeleteAccountDialog email={email} onClose={close} />}
  </>
}

function DeleteAccountDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const lock = useRef(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = overflow }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      const result = await deleteOwnAccount(email, password)
      // Bei Erfolg meldet sich die App ab und zeigt den Login, diese Karte verschwindet.
      if (result === 'wrong_password') setError('Das Passwort stimmt nicht.')
      else if (result === 'failed') setError('Das Konto konnte nicht gelöscht werden. Versuch es später noch einmal.')
    } catch {
      setError('Das Konto konnte nicht gelöscht werden. Versuch es später noch einmal.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return createPortal(<dialog ref={dialog} aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-question delete-account-warning"
    className={`template-day-dialog ${CARD} m-auto w-[calc(100%_-_2rem)] max-w-sm text-foreground`}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')
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
    <div className="flex items-center justify-between gap-3">
      <h2 id="delete-account-title" className={SECTION_TITLE}>Konto löschen</h2>
      <button type="button" className={NAV_BUTTON} aria-label="Schließen" disabled={busy} onClick={onClose}><CloseIcon /></button>
    </div>
    <p id="delete-account-question" className="mt-3 text-sm font-semibold">Möchtest du dein Konto löschen?</p>
    <p id="delete-account-warning" className="mt-2 text-sm text-muted">Dein Konto und alle Daten werden endgültig gelöscht. Sichere sie bei Bedarf vorher im Profil per CSV-Export.</p>
    <form className="mt-4 space-y-4" onSubmit={event => void handleSubmit(event)}>
      <label className="block text-sm font-medium">Zur Bestätigung dein Passwort
        <input type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={event => setPassword(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-xl border border-transparent bg-control px-3.5 py-3 text-base text-foreground outline-none focus:border-danger" />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" autoFocus disabled={busy} className={SECONDARY_BUTTON} onClick={onClose}>Nein</button>
        <button type="submit" disabled={busy || password === ''} className="min-h-11 rounded-xl bg-danger-fill px-4 font-semibold text-white disabled:opacity-50">{busy ? 'Wird gelöscht …' : 'Ja'}</button>
      </div>
    </form>
  </dialog>, document.body)
}
