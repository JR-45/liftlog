import { useEffect, useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { CARD, LINK, SECTION_TITLE } from '../../lib/ui'
import { ConnectionsSummary } from './ConnectionsSummary'
import { FollowButton } from './FollowButton'
import { SharedProfileOverview } from './SharedProfileOverview'
import { loadAccount, loadSharedOverview, type Person, type SharedOverview, type SocialTab } from './api'

export function ForeignProfile({ personId, viewerId, today, onConnections }: {
  personId: string; viewerId: string; today: string; onConnections: (tab: SocialTab) => void
}) {
  const [data, setData] = useState<{ person: Person; overview: SharedOverview | null } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    loadAccount(personId, viewerId).then(async person => {
      if (!person) throw new Error('verborgen')
      return { person, overview: person.relationship === 'accepted' ? await loadSharedOverview(personId) : null }
    })
      .then(value => { if (!cancelled) setData(value) })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error && cause.message === 'verborgen' ? 'Dieses Profil ist nicht mehr sichtbar.' : 'Profil konnte nicht geladen werden.') })
    return () => { cancelled = true }
  }, [personId, viewerId, attempt])
  function refresh() { setData(null); setError(''); setAttempt(value => value + 1) }
  if (error) return <div role="alert" className={CARD}><p className="text-sm text-danger">{error}</p><button type="button" className={LINK} onClick={refresh}>Erneut laden</button></div>
  if (!data) return <p role="status" className="text-sm text-muted">Profil wird geladen …</p>
  const { person, overview } = data
  return <>
    <div className={CARD}>
      <div className="flex items-center gap-3">
        {person.avatar ? <Avatar src={person.avatar} className="h-16 w-16 shrink-0 rounded-full" /> : <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-control text-2xl font-semibold">{person.display_name[0]?.toUpperCase()}</span>}
        <div className="min-w-0 flex-1"><h2 className={`${SECTION_TITLE} break-words`}>{person.display_name}</h2><p className="break-all text-sm text-muted">@{person.username}</p>
          {person.relationship !== 'accepted' && <p className="mt-2 text-sm tabular-nums">{person.followers_count} Follower</p>}</div>
        <div className="shrink-0"><FollowButton person={person} viewerId={viewerId} onChanged={refresh} onError={setError} /></div>
      </div>
      {person.relationship === 'accepted' && <div className="mt-3"><ConnectionsSummary userId={personId} onOpen={onConnections} label={`${person.display_name}: Verbindungen`} /></div>}
    </div>
    {person.relationship !== 'accepted' ? null
      : overview ? <SharedProfileOverview overview={overview} today={today} /> : <p className="text-sm text-muted">Noch keine Profilangaben.</p>}
  </>
}
