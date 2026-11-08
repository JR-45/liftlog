import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { socialSearchPattern } from '../../domain/social'
import { ChevronLeftIcon, ChevronRightIcon } from '../../lib/icons'
import { CARD, INPUT, LINK, NAV_BUTTON, PRIMARY_BUTTON, SECONDARY_BUTTON } from '../../lib/ui'
import { disableSocialProfile, loadPeople, loadSocialSummary, setFollowing, type PeoplePage, type SocialSummary, type SocialTab } from './api'

type Props = { userId: string; displayName: string; initialTab: SocialTab; onBack: () => void; onEnable: () => Promise<void> }

export function ConnectionsPage({ userId, displayName, initialTab, onBack, onEnable }: Props) {
  const [tab, setTab] = useState(initialTab)
  const [summary, setSummary] = useState<SocialSummary | null>(null)
  const [result, setResult] = useState<PeoplePage>({ people: [], hasMore: false })
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const back = useRef<HTMLButtonElement>(null)
  const lock = useRef(false)
  useEffect(() => { back.current?.focus(); window.scrollTo(0, 0) }, [])
  useEffect(() => {
    if (!confirmRevoke) return
    const timeout = window.setTimeout(() => setConfirmRevoke(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [confirmRevoke])
  useEffect(() => {
    let cancelled = false
    Promise.all([loadSocialSummary(userId), loadPeople(userId, tab, query, page)])
      .then(([counts, people]) => {
        if (cancelled) return
        setSummary(counts)
        setResult(people)
      })
      .catch(() => { if (!cancelled) setError('Verbindungen konnten nicht geladen werden.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, tab, query, page, attempt])

  function refresh() {
    setLoading(true)
    setError('')
    setAttempt(value => value + 1)
  }

  function changeTab(next: SocialTab) {
    setTab(next)
    setQuery('')
    setDraft('')
    setPage(0)
    refresh()
  }

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 'followers' : event.key === 'End' ? 'following' : tab === 'followers' ? 'following' : 'followers'
    changeTab(next)
    document.getElementById(`connections-${next}`)?.focus()
  }

  function search(event: FormEvent) {
    event.preventDefault()
    if (draft.trim() && !socialSearchPattern(draft)) { setError('Bitte 2 bis 50 Zeichen eingeben.'); return }
    setQuery(draft.trim())
    setPage(0)
    refresh()
  }

  async function mutate(action: () => Promise<void>, message: string) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try { await action(); refresh() }
    catch { setError(message) }
    finally { lock.current = false; setBusy(false) }
  }

  async function revoke() {
    if (!confirmRevoke) { setConfirmRevoke(true); return }
    await mutate(async () => {
      await disableSocialProfile(userId)
      setQuery('')
      setDraft('')
      setPage(0)
      setAgreed(false)
      setConfirmRevoke(false)
    }, 'Freigabe konnte nicht widerrufen werden.')
  }

  return <section className="mt-5 space-y-4" aria-label="Verbindungen">
    <div className="flex items-center gap-3">
      <button ref={back} className={NAV_BUTTON} type="button" aria-label="Zurück zum Profil" disabled={busy} onClick={onBack}><ChevronLeftIcon className="h-5 w-5" /></button>
      <h2 className="min-w-0 flex-1 truncate text-center text-2xl">{displayName}</h2><span className="w-11" aria-hidden="true" />
    </div>
    <div role="tablist" aria-label="Verbindungen" className="grid grid-cols-2 border-b border-line/10">
      {(['followers', 'following'] as const).map(value => <button key={value} id={`connections-${value}`} type="button" role="tab"
        aria-controls="connections-list" aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} disabled={busy}
        onClick={() => changeTab(value)} onKeyDown={navigateTabs}
        className={`min-h-11 border-b-2 px-3 py-2 text-sm font-semibold ${tab === value ? 'border-neon text-accent-ink' : 'border-transparent text-muted'}`}>
        <span className="tabular-nums">{summary ? summary[value] : '…'}</span> {value === 'followers' ? 'Follower' : 'Gefolgt'}
      </button>)}
    </div>

    {summary && !summary.enabled && <div className={CARD}>
      <h3 className="text-xl">Personen finden und folgen</h3>
      <label className="mt-3 flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" checked={agreed} disabled={busy}
        onChange={event => setAgreed(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-neon" />
        Mein Name und Profilbild dürfen für angemeldete Personen sichtbar sein.</label>
      <button type="button" disabled={!agreed || busy || loading} className={`${PRIMARY_BUTTON} mt-3`}
        onClick={() => { void mutate(onEnable, 'Profil konnte nicht freigegeben werden.') }}>Profil freigeben</button>
    </div>}

    {summary?.enabled && <form className="flex flex-wrap items-end gap-2" onSubmit={search}>
      <label className="min-w-0 flex-1 text-sm"><span className="mb-1 block text-muted">Personen suchen</span>
        <input type="search" className={INPUT} maxLength={50} value={draft} disabled={busy} placeholder="Anzeigename"
          onChange={event => setDraft(event.target.value)} /></label>
      <button type="submit" className={SECONDARY_BUTTON} disabled={busy || loading}>Suchen</button>
      {query && <button className={LINK} type="button" disabled={busy} onClick={() => { setQuery(''); setDraft(''); setPage(0); refresh() }}>Suche schließen</button>}
    </form>}

    {error && <div role="alert" className="text-sm text-danger"><p>{error}</p>
      <button className={LINK} type="button" disabled={busy || loading} onClick={refresh}>Erneut laden</button></div>}
    <div id="connections-list" role="tabpanel" aria-labelledby={`connections-${tab}`} aria-busy={loading} className={CARD}>
      {query && <h3 className="mb-2 text-xl">Suchergebnisse</h3>}
      {loading ? <p role="status" className="text-sm text-muted">Wird geladen …</p> : !error && <>
        {!result.people.length && <p className="text-sm text-muted">{page > 0 ? 'Keine weiteren Personen.' : query ? 'Keine Personen gefunden.' : tab === 'followers' ? 'Dir folgt noch niemand.' : 'Du folgst noch niemandem.'}</p>}
        <ul className="divide-y divide-line/[0.06]">
          {result.people.map(person => <li key={person.user_id} className="flex items-center gap-3 py-2">
            {person.avatar ? <img src={person.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              : <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-control font-semibold">{person.display_name.charAt(0).toUpperCase()}</span>}
            <span className="min-w-0 flex-1 break-words text-sm font-semibold">{person.display_name}</span>
            <button type="button" disabled={busy || !summary?.enabled} aria-label={`${person.display_name} ${person.following ? 'entfolgen' : 'folgen'}`}
              className={SECONDARY_BUTTON} onClick={() => { void mutate(() => setFollowing(person.user_id, !person.following), 'Folgen konnte nicht geändert werden.') }}>
              {person.following ? 'Entfolgen' : 'Folgen'}
            </button>
          </li>)}
        </ul>
        {(page > 0 || result.hasMore) && <nav className="mt-3 flex items-center justify-between gap-3" aria-label="Personenliste blättern">
          <button type="button" disabled={page === 0 || busy} className={NAV_BUTTON} aria-label="Vorherige Personen" onClick={() => { setPage(value => value - 1); refresh() }}><ChevronLeftIcon /></button>
          <span className="text-sm tabular-nums text-muted">Seite {page + 1}</span>
          <button type="button" disabled={!result.hasMore || busy} className={NAV_BUTTON} aria-label="Weitere Personen" onClick={() => { setPage(value => value + 1); refresh() }}><ChevronRightIcon /></button>
        </nav>}
      </>}
    </div>
    {busy && <p role="status" className="text-sm text-muted">Wird gespeichert …</p>}
    {summary?.enabled && <details>
      <summary className={`${LINK} cursor-pointer py-2`}>Sichtbarkeit ändern</summary>
      <p className="mt-2 text-sm text-muted">Beim Widerruf werden dein Name und Bild ausgeblendet und alle Folgebeziehungen entfernt.</p>
      <button type="button" disabled={busy || loading} className={`${SECONDARY_BUTTON} mt-3 ${confirmRevoke ? 'bg-danger/15 text-danger' : ''}`}
        onClick={() => { void revoke() }}>{confirmRevoke ? 'Sicher? Nochmal tippen' : 'Freigabe widerrufen'}</button>
    </details>}
  </section>
}
