import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { socialSearchPattern } from '../../domain/social'
import { ChevronLeftIcon, ChevronRightIcon } from '../../lib/icons'
import { CARD, INPUT, LINK, NAV_BUTTON, SECTION_TITLE } from '../../lib/ui'
import { FollowButton } from './FollowButton'
import { loadPeople, loadSocialSummary, type PeoplePage, type SocialSummary, type SocialTab } from './api'

type Props = { userId: string; ownerId?: string; displayName: string; initialTab: SocialTab; initialQuery?: string; initialPage?: number; onBack: () => void; onOpenPerson: (id: string) => void; onViewChange?: (tab: SocialTab, query: string, page: number) => void }

export function ConnectionsPage({ userId, ownerId = userId, displayName, initialTab, initialQuery = '', initialPage = 0, onBack, onOpenPerson, onViewChange }: Props) {
  const [tab, setTab] = useState(initialTab)
  const [summary, setSummary] = useState<SocialSummary | null>(null)
  const [result, setResult] = useState<PeoplePage>({ people: [], hasMore: false })
  const [draft, setDraft] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  const [page, setPage] = useState(initialPage)
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const back = useRef<HTMLButtonElement>(null)
  useEffect(() => { back.current?.focus(); window.scrollTo(0, 0) }, [])
  useEffect(() => {
    let cancelled = false
    Promise.all([loadSocialSummary(ownerId), loadPeople(userId, tab, query, page, ownerId)])
      .then(([counts, people]) => { if (!cancelled) { setSummary(counts); setResult(people) } })
      .catch(() => { if (!cancelled) setError('Verbindungen konnten nicht geladen werden.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, ownerId, tab, query, page, attempt])
  function refresh() { setLoading(true); setError(''); setAttempt(value => value + 1) }
  function changeTab(next: SocialTab) { setTab(next); setDraft(''); setQuery(''); setPage(0); onViewChange?.(next, '', 0); refresh() }
  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 'followers' : event.key === 'End' ? 'following' : tab === 'followers' ? 'following' : 'followers'
    changeTab(next)
    document.getElementById(`connections-${next}`)?.focus()
  }
  useEffect(() => {
    const next = draft.trim().replace(/^@/, '')
    if (next === query || (next && !socialSearchPattern(next))) return
    const timeout = window.setTimeout(() => { setQuery(next); setPage(0); onViewChange?.(tab, next, 0); refresh() }, 300)
    return () => window.clearTimeout(timeout)
  }, [draft, query, tab, onViewChange])

  return <section className="mt-5 space-y-4" aria-label="Verbindungen">
    <div className="flex items-center gap-3"><button ref={back} className={NAV_BUTTON} type="button" aria-label="Zurück zum Profil" onClick={onBack}><ChevronLeftIcon /></button>
      <h2 className={`min-w-0 flex-1 truncate text-center ${SECTION_TITLE}`}>{displayName}</h2><span className="w-11" aria-hidden="true" /></div>
    <div role="tablist" aria-label="Verbindungen" className="grid grid-cols-2 gap-1 rounded-2xl border border-line/[0.06] bg-surface p-1">
      {(['followers', 'following'] as const).map(value => <button key={value} id={`connections-${value}`} type="button" role="tab" aria-controls="connections-list"
        aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onClick={() => changeTab(value)} onKeyDown={navigateTabs}
        className={`min-h-11 rounded-xl px-3 py-2 text-sm transition-all ${tab === value ? 'bg-neon font-semibold text-black shadow-sm' : 'text-foreground/75 hover:text-foreground'}`}>
        <span className="tabular-nums">{summary ? summary[value] : '…'}</span> {value === 'followers' ? 'Follower' : 'Gefolgt'}
      </button>)}
    </div>
    <form role="search" onSubmit={event => event.preventDefault()}><input type="search" className={INPUT} maxLength={50} value={draft} placeholder="Name oder Benutzername" aria-label="Personen suchen"
      enterKeyHint="search" onChange={event => setDraft(event.target.value)} /></form>
    {error && <div role="alert"><p className="text-sm text-danger">{error}</p><button className={LINK} type="button" onClick={refresh}>Erneut laden</button></div>}
    <div id="connections-list" role="tabpanel" aria-labelledby={`connections-${tab}`} aria-busy={loading} className={CARD}>
      {query && <h3 className={`mb-2 ${SECTION_TITLE}`}>Suchergebnisse</h3>}
      {loading ? <p role="status" className="text-sm text-muted">Wird geladen …</p> : !error && <>
        {!result.people.length && <p className="text-sm text-muted">{page > 0 ? 'Keine weiteren Personen.' : query ? 'Keine Personen gefunden.' : tab === 'followers' ? 'Dir folgt noch niemand.' : 'Du folgst noch niemandem.'}</p>}
        <ul className="divide-y divide-line/[0.06]">{result.people.map(person => <li key={person.user_id} className="flex items-center gap-2 py-2">
          <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpenPerson(person.user_id)}>
            {person.avatar ? <img src={person.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-control font-semibold">{person.display_name.charAt(0).toUpperCase()}</span>}
            <span className="min-w-0"><span className="block break-words text-sm font-semibold">{person.display_name}</span><span className="block break-all text-xs text-muted">@{person.username}</span></span>
          </button>
          <FollowButton person={person} viewerId={userId} onChanged={refresh} onError={setError} />
        </li>)}</ul>
        {(page > 0 || result.hasMore) && <nav className="mt-3 flex items-center justify-between gap-3" aria-label="Personenliste blättern">
          <button type="button" disabled={page === 0} className={NAV_BUTTON} aria-label="Vorherige Personen" onClick={() => { setPage(page - 1); onViewChange?.(tab, query, page - 1); refresh() }}><ChevronLeftIcon /></button>
          <span className="text-sm tabular-nums text-muted">Seite {page + 1}</span><button type="button" disabled={!result.hasMore} className={NAV_BUTTON} aria-label="Weitere Personen" onClick={() => { setPage(page + 1); onViewChange?.(tab, query, page + 1); refresh() }}><ChevronRightIcon /></button>
        </nav>}
      </>}
    </div>
  </section>
}
