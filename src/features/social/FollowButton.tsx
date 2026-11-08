import { useRef, useState } from 'react'
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '../../lib/ui'
import { setFollowing, type Person } from './api'

export function FollowButton({ person, viewerId, onChanged, onError }: {
  person: Person; viewerId: string; onChanged: () => void; onError: (message: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const active = person.relationship !== 'none'
  const label = person.relationship === 'accepted' ? 'Entfolgen' : person.relationship === 'pending' ? 'Angefragt' : person.is_private ? 'Anfragen' : 'Folgen'
  if (person.user_id === viewerId) return null
  return <button type="button" disabled={busy} aria-label={`${person.display_name}: ${label}`}
    className={active ? SECONDARY_BUTTON : PRIMARY_BUTTON} onClick={() => {
      if (lock.current) return
      lock.current = true
      setBusy(true)
      void setFollowing(person.user_id, !active, viewerId).then(onChanged)
        .catch(() => onError('Folgen konnte nicht geändert werden.'))
        .finally(() => { lock.current = false; setBusy(false) })
    }}>{label}</button>
}
