import { useEffect, useState } from 'react'
import { CARD, LINK, SECONDARY_BUTTON, SECTION_TITLE } from '../../lib/ui'
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
    loadAccount(personId, viewerId).then(async person => ({ person, overview: person.relationship === 'accepted' ? await loadSharedOverview(personId) : null }))
      .then(value => { if (!cancelled) setData(value) })
      .catch(() => { if (!cancelled) setError('Profil konnte nicht geladen werden.') })
    return () => { cancelled = true }
  }, [personId, viewerId, attempt])
  function refresh() { setData(null); setError(''); setAttempt(value => value + 1) }
  if (error) return <div role="alert" className={CARD}><p className="text-sm text-danger">{error}</p><button type="button" className={LINK} onClick={refresh}>Erneut laden</button></div>
  if (!data) return <p role="status" className="text-sm text-muted">Profil wird geladen …</p>
  const { person, overview } = data
  return <>
    <div className={CARD}>
      <div className="flex items-center gap-4">
        {person.avatar ? <img src={person.avatar} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-control text-2xl font-semibold">{person.display_name[0]?.toUpperCase()}</span>}
        <div className="min-w-0 flex-1"><h2 className={`${SECTION_TITLE} break-words`}>{person.display_name}</h2><p className="break-all text-sm text-muted">@{person.username}</p>
          <p className="mt-2 text-sm tabular-nums">{person.followers_count} Follower</p></div>
      </div>
      <div className="mt-4"><FollowButton person={person} viewerId={viewerId} onChanged={refresh} onError={setError} /></div>
      {person.relationship === 'accepted' && <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={SECONDARY_BUTTON} onClick={() => onConnections('followers')}>Follower anzeigen</button>
        <button type="button" className={SECONDARY_BUTTON} onClick={() => onConnections('following')}>Gefolgt anzeigen</button>
      </div>}
    </div>
    {person.relationship !== 'accepted' ? <div className={CARD}><h3 className={SECTION_TITLE}>{person.is_private ? 'Dieses Konto ist privat' : 'Profilübersicht'}</h3>
      <p className="mt-2 text-sm text-muted">{person.relationship === 'pending' ? 'Deine Anfrage wartet auf Bestätigung. Tippe auf „Angefragt“, um sie zurückzuziehen.' : person.is_private ? 'Stelle eine Folgeanfrage, um die Profilübersicht zu sehen.' : 'Folge diesem Konto, um die Profilübersicht zu sehen.'}</p></div>
      : overview ? <SharedProfileOverview overview={overview} today={today} /> : <p className="text-sm text-muted">Noch keine Profilangaben.</p>}
  </>
}
