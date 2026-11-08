import { useEffect, useRef, useState } from 'react'
import { socialSearchPattern } from '../../domain/social'
import { ChevronLeftIcon, ChevronRightIcon } from '../../lib/icons'
import { CARD, INPUT, LINK, NAV_BUTTON, PRIMARY_BUTTON, SECTION_TITLE } from '../../lib/ui'
import { FollowButton } from './FollowButton'
import { loadPeople, type PeoplePage } from './api'

/**
 * Mitglieder über den Benutzernamen finden und ihnen folgen.
 * Ohne eigenes sichtbares Profil kann man nicht folgen, dann kommt zuerst der Knopf zum Sichtbarmachen.
 */
export function MemberSearch({ userId, visible, onBack, onOpenPerson, onEnable }: {
  userId: string; visible: boolean; onBack: () => void; onOpenPerson: (id: string) => void; onEnable: () => Promise<void>
}) {
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<PeoplePage | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [enabling, setEnabling] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { window.scrollTo(0, 0); input.current?.focus() }, [])

  // Kurz nach dem Tippen suchen, ab 2 Zeichen. Ein vorangestelltes @ ist erlaubt.
  useEffect(() => {
    const next = draft.trim().replace(/^@/, '')
    if (next === query || (next && !socialSearchPattern(next))) return
    const timeout = window.setTimeout(() => { setQuery(next); setPage(0) }, 300)
    return () => window.clearTimeout(timeout)
  }, [draft, query])

  useEffect(() => {
    if (!query) return
    let cancelled = false
    loadPeople(userId, 'followers', query, page)
      .then(value => { if (!cancelled) { setResult(value); setError('') } })
      .catch(() => { if (!cancelled) setError('Suche hat nicht geklappt.') })
    return () => { cancelled = true }
  }, [userId, query, page, attempt])

  const refresh = () => setAttempt(value => value + 1)
  const people = query ? result : null

  return <section className="mt-5 space-y-4" aria-label="Mitglieder suchen">
    <div className="flex items-center gap-3">
      <button type="button" className={NAV_BUTTON} aria-label="Zurück zum Profil" onClick={onBack}><ChevronLeftIcon className="h-5 w-5" /></button>
      <h1 className={`min-w-0 flex-1 text-center ${SECTION_TITLE}`}>Mitglieder suchen</h1><span className="w-11" aria-hidden="true" />
    </div>
    {!visible && <div className={CARD}>
      <p className="text-sm text-muted">Zum Folgen mach zuerst dein Profil sichtbar.</p>
      <button type="button" disabled={enabling} className={`${PRIMARY_BUTTON} mt-3 w-full`} onClick={() => {
        setEnabling(true)
        setError('')
        void onEnable().catch(() => setError('Profil konnte nicht sichtbar gemacht werden.')).finally(() => setEnabling(false))
      }}>Profil sichtbar machen</button>
    </div>}
    <form role="search" onSubmit={event => event.preventDefault()}>
      <input ref={input} type="search" className={INPUT} maxLength={41} value={draft} placeholder="Benutzername" aria-label="Benutzername suchen"
        autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search" onChange={event => setDraft(event.target.value)} />
    </form>
    {error && <div role="alert"><p className="text-sm text-danger">{error}</p><button className={LINK} type="button" onClick={refresh}>Erneut versuchen</button></div>}
    {people && <div className={CARD}>
      {!people.people.length ? <p className="text-sm text-muted">{page > 0 ? 'Keine weiteren Mitglieder.' : 'Niemand mit diesem Benutzernamen.'}</p>
        : <ul className="divide-y divide-line/[0.06]">{people.people.map(person => <li key={person.user_id} className="flex items-center gap-2 py-2">
          <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpenPerson(person.user_id)}>
            {person.avatar ? <img src={person.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              : <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-control font-semibold">{person.display_name.charAt(0).toUpperCase()}</span>}
            <span className="min-w-0"><span className="block break-words text-sm font-semibold">{person.display_name}</span><span className="block break-all text-xs text-muted">@{person.username}</span></span>
          </button>
          {visible && <FollowButton person={person} viewerId={userId} onChanged={refresh} onError={setError} />}
        </li>)}</ul>}
      {(page > 0 || people.hasMore) && <nav className="mt-3 flex items-center justify-between gap-3" aria-label="Ergebnisse blättern">
        <button type="button" disabled={page === 0} className={NAV_BUTTON} aria-label="Vorherige Ergebnisse" onClick={() => setPage(page - 1)}><ChevronLeftIcon /></button>
        <span className="text-sm tabular-nums text-muted">Seite {page + 1}</span>
        <button type="button" disabled={!people.hasMore} className={NAV_BUTTON} aria-label="Weitere Ergebnisse" onClick={() => setPage(page + 1)}><ChevronRightIcon /></button>
      </nav>}
    </div>}
  </section>
}
