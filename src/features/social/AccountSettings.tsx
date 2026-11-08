import { useEffect, useRef, useState } from 'react'
import { CARD, LINK, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from '../../lib/ui'
import { decideRequest, loadRequests, loadSharing, saveSharing, type Person, type Sharing } from './api'

/**
 * Sichtbarkeit im Einstellungs-Bereich: Profil sichtbar machen, wer folgen darf, Plan veröffentlichen,
 * offene Folgeanfragen und Verbergen. Ohne sichtbares Profil nur der Knopf zum Sichtbarmachen.
 */
export function SocialSettings({ account, onEnable, onHide, onSaved, onOpenPerson, onRequestsChanged }: {
  account: Person | null; onEnable: () => Promise<void>; onHide: () => Promise<void>
  onSaved: (isPrivate: boolean) => void; onOpenPerson: (id: string) => void; onRequestsChanged?: () => void
}) {
  const [sharing, setSharing] = useState<Sharing | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmHide, setConfirmHide] = useState(false)
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
    if (busy) return
    setBusy(true)
    setError('')
    setSaved(false)
    void action().catch(() => setError(message)).finally(() => setBusy(false))
  }

  if (!account) return <section className={CARD} aria-labelledby="visibility-heading">
    <h2 id="visibility-heading" className={SECTION_TITLE}>Sichtbarkeit</h2>
    {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    <button type="button" disabled={busy} className={`${PRIMARY_BUTTON} mt-3 w-full`}
      onClick={() => run(onEnable, 'Profil konnte nicht sichtbar gemacht werden.')}>Profil sichtbar machen</button>
  </section>

  return <>
    <form className={`${CARD} space-y-4`} aria-labelledby="visibility-heading" onSubmit={event => {
      event.preventDefault()
      if (!sharing) return
      run(async () => { await saveSharing(account.user_id, sharing); onSaved(sharing.is_private); onRequestsChanged?.(); setSaved(true) }, 'Einstellungen konnten nicht gespeichert werden.')
    }}>
      <h2 id="visibility-heading" className={SECTION_TITLE}>Sichtbarkeit</h2>
      {!sharing ? <p role="status" className="text-sm text-muted">Wird geladen …</p> : <fieldset disabled={busy} className="space-y-2">
        {([{ value: true, label: 'Privat' }, { value: false, label: 'Öffentlich' }]).map(option => <label key={option.label} className="flex min-h-11 items-center gap-3 text-sm">
          <input type="radio" name="privacy" className="h-5 w-5 shrink-0 accent-neon" checked={sharing.is_private === option.value} onChange={() => setSharing({ ...sharing, is_private: option.value })} />
          <span className="font-semibold">{option.label}</span>
        </label>)}
        <label className="flex min-h-11 items-center gap-3 border-t border-line/[0.06] pt-3 text-sm">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-neon" checked={sharing.share_plan} onChange={event => setSharing({ ...sharing, share_plan: event.target.checked })} />
          <span className="font-semibold">Trainingsplan veröffentlichen</span>
        </label>
      </fieldset>}
      {sharing && !sharing.is_private && account.is_private && <p className="text-sm text-warning">Offene Anfragen werden angenommen.</p>}
      {saved && <p role="status" className="text-sm text-success">Gespeichert.</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy || !sharing} className={`${PRIMARY_BUTTON} w-full`}>{busy ? 'Wird gespeichert …' : 'Speichern'}</button>
    </form>
    <FollowRequests userId={account.user_id} onOpenPerson={onOpenPerson} onChanged={onRequestsChanged} />
    <div>
      <button type="button" disabled={busy} className={`${SECONDARY_BUTTON} w-full ${confirmHide ? 'bg-danger/15 text-danger' : 'text-danger'}`}
        onClick={() => { if (!confirmHide) { setConfirmHide(true); return } setConfirmHide(false); run(onHide, 'Profil konnte nicht verborgen werden.') }}>
        {confirmHide ? 'Sicher? Nochmal tippen' : 'Profil verbergen'}
      </button>
    </div>
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
        {person.avatar ? <img src={person.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-control">{person.display_name[0]}</span>}
        <span className="min-w-0"><span className="block break-words text-sm font-semibold">{person.display_name}</span><span className="block break-all text-xs text-muted">@{person.username}</span></span>
      </button>
      <div className="grid grid-cols-2 gap-2"><button type="button" className={PRIMARY_BUTTON} disabled={busy} onClick={() => decide(person.user_id, true)}>Annehmen</button><button type="button" className={SECONDARY_BUTTON} disabled={busy} onClick={() => decide(person.user_id, false)}>Ablehnen</button></div>
    </li>)}</ul>}
  </div>
}
