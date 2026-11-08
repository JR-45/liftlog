import { useEffect, useState } from 'react'
import { LINK } from '../../lib/ui'
import { loadSocialSummary, type SocialSummary, type SocialTab } from './api'

export function ConnectionsSummary({ userId, onOpen }: { userId: string; onOpen: (tab: SocialTab) => void }) {
  const [summary, setSummary] = useState<SocialSummary | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    loadSocialSummary(userId).then(value => { if (!cancelled) setSummary(value) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [userId, attempt])

  return <div>
    <div className="flex gap-1" aria-label="Deine Verbindungen">
      {(['followers', 'following'] as const).map(tab => <button key={tab} id={`profile-${tab}`} type="button" onClick={() => onOpen(tab)}
        className="min-h-14 min-w-20 rounded-xl px-3 py-2 text-center transition-colors hover:bg-control">
        <span className="block text-xl font-bold tabular-nums">{summary ? summary[tab] : failed ? '–' : '…'}</span>
        <span className="text-xs text-muted">{tab === 'followers' ? 'Follower' : 'Gefolgt'}</span>
      </button>)}
    </div>
    {failed && <div className="text-xs"><p role="alert" className="text-danger">Verbindungen konnten nicht geladen werden.</p>
      <button type="button" className={LINK} onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Erneut laden</button></div>}
  </div>
}
