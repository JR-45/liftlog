import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { ChevronRightIcon } from '../../lib/icons'
import { CARD, LINK, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from '../../lib/ui'
import { AccountVisibilityDialog } from './AccountVisibilityDialog'
import { DeleteAccountCard } from '../profile/DeleteAccountCard'
import { decideRequest, loadRequests, loadSharing, saveSharing, type Person, type Sharing } from './api'

/**
 * Kontoeinstellungen mit vorhandener Sichtbarkeit, Planfreigabe, Anfragen und Hilfe.
 * Ohne sichtbares Profil bleibt die Freigabe ausdrücklich freiwillig.
 */
export function SocialSettings({ account, email, onEnable, onHide, onSaved, onOpenPerson, onRequestsChanged, onSignOut }: {
  email?: string
  account: Person | null; onEnable: () => Promise<void>; onHide: () => Promise<void>
  onSaved: (isPrivate: boolean) => void; onOpenPerson: (id: string) => void; onRequestsChanged?: () => void
  onSignOut: () => Promise<void>
}) {
  const [sharing, setSharing] = useState<Sharing | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmHide, setConfirmHide] = useState(false)
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const visibilityButton = useRef<HTMLButtonElement>(null)
  const lock = useRef(false)
  useEffect(() => {
    if (!account) return
    let cancelled = false
    loadSharing(account.user_id).then(value => { if (!cancelled) setSharing(value) })
      .catch(() => { if (!cancelled) setError('Einstellungen konnten nicht geladen werden.') })
    return () => { cancelled = true }
  }, [account])
  useEffect(() => {
    if (!confirmHide) return
    const timeout = window.setTimeout(() => setConfirmHide(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [confirmHide])
  function run(action: () => Promise<void>, message: string) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setSaved(false)
    void action().catch(() => setError(message)).finally(() => { lock.current = false; setBusy(false) })
  }
  function closeVisibility() {
    setVisibilityOpen(false)
    requestAnimationFrame(() => visibilityButton.current?.focus())
  }
  return <>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {saved && <p role="status" className="text-sm text-success">Gespeichert.</p>}
    <section className={CARD} aria-labelledby="account-heading"><h2 id="account-heading" className={SECTION_TITLE}>Konto</h2>
      {account ? <button ref={visibilityButton} type="button" disabled={busy || !sharing} aria-haspopup="dialog" aria-expanded={visibilityOpen}
        className="mt-2 flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium disabled:opacity-50" onClick={() => setVisibilityOpen(true)}>
        <span>Kontosichtbarkeit</span><span className="ml-auto text-muted">{sharing ? sharing.is_private ? 'Privat' : 'Öffentlich' : 'Wird geladen …'}</span><ChevronRightIcon className="h-4 w-4 shrink-0" />
      </button> : <button type="button" disabled={busy} className={`${PRIMARY_BUTTON} mt-3 w-full`}
        onClick={() => run(onEnable, 'Profil konnte nicht sichtbar gemacht werden.')}>Profil sichtbar machen</button>}
    </section>
    {account && <>
      <section className={CARD} aria-labelledby="privacy-heading"><h2 id="privacy-heading" className={SECTION_TITLE}>Privatsphäre</h2>
        {sharing && <label className="mt-2 flex min-h-11 items-center gap-3 py-2 text-sm font-medium"><span className="flex-1">Trainingsplan teilen</span>
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-neon" checked={sharing.share_plan} disabled={busy} onChange={event => {
            const value = event.target.checked
            run(async () => { await saveSharing(account.user_id, { share_plan: value }); setSharing(current => current && ({ ...current, share_plan: value })); setSaved(true) }, 'Trainingsplan konnte nicht freigegeben werden.')
          }} /></label>}
        <button type="button" disabled={busy} className={`min-h-11 w-full border-t border-line/[0.06] py-3 text-left text-sm font-medium ${confirmHide ? 'rounded-xl bg-danger/15 px-3 text-danger' : 'text-danger'}`}
          onClick={() => { if (!confirmHide) { setConfirmHide(true); return } setConfirmHide(false); run(onHide, 'Profil konnte nicht verborgen werden.') }}>
          {confirmHide ? 'Sicher? Nochmal tippen' : 'Profil verbergen'}
        </button>
      </section>
      <FollowRequests userId={account.user_id} onOpenPerson={onOpenPerson} onChanged={onRequestsChanged} />
    </>}
    <section className={CARD} aria-labelledby="help-heading"><h2 id="help-heading" className={SECTION_TITLE}>Hilfe</h2>
      <div className="mt-2 divide-y divide-line/[0.06]">{[
        { label: 'Hilfe', href: 'https://github.com/JR-45/liftlog/blob/main/README.md' },
        { label: 'Problem melden', href: 'https://github.com/JR-45/liftlog/issues/new' },
      ].map(item => <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 py-3 text-sm font-medium">
        <span>{item.label}</span><ChevronRightIcon className="h-4 w-4 shrink-0" />
      </a>)}
        {email && <DeleteAccountCard email={email} disabled={busy} />}
      </div>
    </section>
    <button type="button" disabled={busy} className={`${SECONDARY_BUTTON} w-full text-danger`} onClick={() => run(onSignOut, 'Abmelden hat nicht geklappt. Bitte erneut versuchen.')}>Abmelden</button>
    {visibilityOpen && sharing && account && <AccountVisibilityDialog isPrivate={sharing.is_private} onClose={closeVisibility} onSave={async isPrivate => {
      await saveSharing(account.user_id, { is_private: isPrivate })
      setSharing(current => current && ({ ...current, is_private: isPrivate }))
      onSaved(isPrivate)
      onRequestsChanged?.()
      setSaved(true)
    }} />}
  </>
}

export function FollowRequests({ userId, onOpenPerson, onChanged }: { userId: string; onOpenPerson: (id: string) => void; onChanged?: () => void }) {
  const [people, setPeople] = useState<Person[] | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    let cancelled = false
    loadRequests(userId).then(value => { if (!cancelled) setPeople(value) })
      .catch(() => { if (!cancelled) setError('Anfragen konnten nicht geladen werden.') })
    return () => { cancelled = true }
  }, [userId, attempt])
  function refresh() { setPeople(null); setError(''); setAttempt(value => value + 1) }
  function decide(id: string, accept: boolean) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    void decideRequest(userId, id, accept).then(() => { refresh(); onChanged?.() })
      .catch(() => setError('Anfrage konnte nicht geändert werden.'))
      .finally(() => { lock.current = false; setBusy(false) })
  }
  // Ohne offene Anfragen keine Karte.
  if (!error && !people?.length) return null
  return <div className={CARD}>
    <h2 className={`mb-2 ${SECTION_TITLE}`}>Anfragen</h2>
    {error && <div role="alert"><p className="text-sm text-danger">{error}</p><button className={LINK} type="button" onClick={refresh}>Erneut laden</button></div>}
    {!error && people && <ul className="divide-y divide-line/[0.06]">{people.map(person => <li key={person.user_id} className="space-y-3 py-3">
      <button type="button" disabled={busy} className="flex min-h-11 w-full items-center gap-3 text-left" onClick={() => onOpenPerson(person.user_id)}>
        {person.avatar ? <Avatar src={person.avatar} className="h-11 w-11 shrink-0 rounded-full" /> : <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-control">{person.display_name[0]}</span>}
        <span className="min-w-0"><span className="block break-words text-sm font-semibold">{person.display_name}</span><span className="block break-all text-xs text-muted">@{person.username}</span></span>
      </button>
      <div className="grid grid-cols-2 gap-2"><button type="button" className={PRIMARY_BUTTON} disabled={busy} onClick={() => decide(person.user_id, true)}>Annehmen</button><button type="button" className={SECONDARY_BUTTON} disabled={busy} onClick={() => decide(person.user_id, false)}>Ablehnen</button></div>
    </li>)}</ul>}
  </div>
}
