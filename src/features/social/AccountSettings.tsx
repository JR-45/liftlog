import { useEffect, useRef, useState } from 'react'
import { CARD, LINK, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from '../../lib/ui'
import { decideRequest, loadRequests, savePrivacy, type Person } from './api'

/** Ohne sichtbares Profil nur der Knopf zum Sichtbarmachen. Sonst Privatsphäre, Anfragen und Verbergen. */
export function SettingsMenu({ account, onEnable, onHide, onPrivacy, onRequests }: {
  account: Person | null; onEnable: () => Promise<void>; onHide: () => Promise<void>; onPrivacy: () => void; onRequests: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmHide, setConfirmHide] = useState(false)
  useEffect(() => {
    if (!confirmHide) return
    const timeout = window.setTimeout(() => setConfirmHide(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [confirmHide])
  function run(action: () => Promise<void>, message: string) {
    if (busy) return
    setBusy(true)
    setError('')
    void action().catch(() => setError(message)).finally(() => setBusy(false))
  }
  if (!account) return <div className={CARD}>
    <h2 className={SECTION_TITLE}>Personen finden und folgen</h2>
    <p className="mt-2 text-sm text-muted">Andere finden dich dann über Name und Benutzername. Follower sehen nur dein Profil und deine Trainings.</p>
    {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    <button type="button" disabled={busy} className={`${PRIMARY_BUTTON} mt-3 w-full`}
      onClick={() => run(onEnable, 'Profil konnte nicht sichtbar gemacht werden.')}>Profil sichtbar machen</button>
  </div>
  return <div className={`${CARD} space-y-2`}>
    <button type="button" className={`${SECONDARY_BUTTON} w-full text-left`} onClick={onPrivacy}>Privatsphäre-Konto</button>
    <button type="button" className={`${SECONDARY_BUTTON} w-full text-left`} onClick={onRequests}>Folgeanfragen</button>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button type="button" disabled={busy} className={`${SECONDARY_BUTTON} w-full text-left ${confirmHide ? 'bg-danger/15 text-danger' : 'text-danger'}`}
      onClick={() => { if (!confirmHide) { setConfirmHide(true); return } setConfirmHide(false); run(onHide, 'Profil konnte nicht verborgen werden.') }}>
      {confirmHide ? 'Sicher? Nochmal tippen' : 'Profil verbergen'}
    </button>
    {confirmHide && <p className="text-xs text-muted">Du bist dann nicht mehr auffindbar, und alle Follower werden entfernt.</p>}
  </div>
}

export function PrivacySettings({ account, onSaved }: { account: Person; onSaved: (isPrivate: boolean) => void }) {
  const [isPrivate, setIsPrivate] = useState(account.is_private)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  return <form className={`${CARD} space-y-4`} onSubmit={event => {
    event.preventDefault()
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    void savePrivacy(account.user_id, isPrivate).then(() => onSaved(isPrivate))
      .catch(() => setError('Kontoprivatsphäre konnte nicht gespeichert werden.'))
      .finally(() => { lock.current = false; setBusy(false) })
  }}>
    <fieldset disabled={busy} className="space-y-3"><legend className={`mb-3 ${SECTION_TITLE}`}>Kontosichtbarkeit</legend>
      {([{ value: false, label: 'Öffentlich', note: 'Folgen wird sofort angenommen.' }, { value: true, label: 'Privat', note: 'Du bestätigst neue Follower zuerst.' }]).map(option => <label key={option.label} className="flex min-h-11 items-start gap-3 text-sm">
        <input type="radio" name="privacy" className="mt-1 h-5 w-5 shrink-0 accent-neon" checked={isPrivate === option.value} onChange={() => setIsPrivate(option.value)} />
        <span><span className="block font-semibold">{option.label}</span><span className="text-muted">{option.note}</span></span>
      </label>)}
    </fieldset>
    <p className="text-sm text-muted">Fremde sehen Name, Benutzername, Bild und Follower-Zähler. Bestätigte Follower sehen Profil und Training. Körperdaten und Ernährung bleiben nur für dich sichtbar.</p>
    {account.is_private && !isPrivate && <p className="text-sm text-warning">Offene Folgeanfragen werden beim Speichern angenommen.</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>{busy ? 'Wird gespeichert …' : 'Sichtbarkeit speichern'}</button>
  </form>
}

export function FollowRequests({ userId, onOpenPerson }: { userId: string; onOpenPerson: (id: string) => void }) {
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
    void decideRequest(userId, id, accept).then(refresh)
      .catch(() => setError('Anfrage konnte nicht geändert werden.'))
      .finally(() => { lock.current = false; setBusy(false) })
  }
  return <div className={CARD}>
    <p className="mb-3 text-sm text-muted">Mit der Annahme werden Profil und Training sichtbar. Körperdaten und Ernährung bleiben privat.</p>
    {error && <div role="alert"><p className="text-sm text-danger">{error}</p><button className={LINK} type="button" onClick={refresh}>Erneut laden</button></div>}
    {!error && (people === null ? <p role="status" className="text-sm text-muted">Wird geladen …</p> : !people.length ? <p className="text-sm text-muted">Keine offenen Folgeanfragen.</p> : <ul className="divide-y divide-line/[0.06]">{people.map(person => <li key={person.user_id} className="space-y-3 py-3">
      <button type="button" disabled={busy} className="flex min-h-11 w-full items-center gap-3 text-left" onClick={() => onOpenPerson(person.user_id)}>
        {person.avatar ? <img src={person.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-control">{person.display_name[0]}</span>}
        <span className="min-w-0"><span className="block break-words text-sm font-semibold">{person.display_name}</span><span className="block break-all text-xs text-muted">@{person.username}</span></span>
      </button>
      <div className="grid grid-cols-2 gap-2"><button type="button" className={PRIMARY_BUTTON} disabled={busy} onClick={() => decide(person.user_id, true)}>Annehmen</button><button type="button" className={SECONDARY_BUTTON} disabled={busy} onClick={() => decide(person.user_id, false)}>Ablehnen</button></div>
    </li>)}</ul>)}
  </div>
}
