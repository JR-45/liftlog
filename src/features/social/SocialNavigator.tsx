import { useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon } from '../../lib/icons'
import { NAV_BUTTON, SECTION_TITLE } from '../../lib/ui'
import { FollowRequests, PrivacySettings, SettingsMenu } from './AccountSettings'
import { ConnectionsPage } from './ConnectionsPage'
import { ForeignProfile } from './ForeignProfile'
import type { Person, SocialTab } from './api'

export type SocialRoute = { kind: 'profile'; id: string } | { kind: 'connections'; id: string; tab: SocialTab; name: string; query?: string; page?: number } | { kind: 'settings' | 'privacy' | 'requests' }

export function SocialNavigator({ userId, today, account, initialRoute, onBack, onAccountChange }: {
  userId: string; today: string; account: Person; initialRoute: SocialRoute; onBack: () => void; onAccountChange: (value: Person) => void
}) {
  const [stack, setStack] = useState<SocialRoute[]>([initialRoute])
  const route = stack[stack.length - 1]!
  const back = useRef<HTMLButtonElement>(null)
  function push(next: SocialRoute) { setStack(value => [...value, next]) }
  function pop() { if (stack.length === 1) onBack(); else setStack(value => value.slice(0, -1)) }
  function openPerson(id: string) { if (id === userId) onBack(); else push({ kind: 'profile', id }) }
  useEffect(() => { window.scrollTo(0, 0); back.current?.focus() }, [route])
  if (route.kind === 'connections') return <ConnectionsPage userId={userId} ownerId={route.id} displayName={route.name}
    initialTab={route.tab} initialQuery={route.query} initialPage={route.page} onBack={pop} onOpenPerson={openPerson}
    onViewChange={(tab, query, page) => setStack(value => value.map((entry, index) => index === value.length - 1 ? { ...route, tab, query, page } : entry))} />
  const title = route.kind === 'settings' ? 'Einstellungen' : route.kind === 'privacy' ? 'Privatsphäre-Konto' : route.kind === 'requests' ? 'Folgeanfragen' : 'Profil'
  return <section className="mt-5 space-y-4">
    <div className="flex items-center gap-3"><button ref={back} type="button" className={NAV_BUTTON} aria-label="Zurück" onClick={pop}><ChevronLeftIcon /></button><h1 className={`min-w-0 flex-1 text-center ${SECTION_TITLE}`}>{title}</h1><span className="w-11" aria-hidden="true" /></div>
    {route.kind === 'settings' && <SettingsMenu onPrivacy={() => push({ kind: 'privacy' })} onRequests={() => push({ kind: 'requests' })} />}
    {route.kind === 'privacy' && <PrivacySettings account={account} onSaved={isPrivate => { onAccountChange({ ...account, is_private: isPrivate }); pop() }} />}
    {route.kind === 'requests' && <FollowRequests userId={userId} onOpenPerson={openPerson} />}
    {route.kind === 'profile' && <ForeignProfile key={route.id} personId={route.id} viewerId={userId} today={today}
      onConnections={tab => push({ kind: 'connections', id: route.id, tab, name: 'Verbindungen' })} />}
  </section>
}
