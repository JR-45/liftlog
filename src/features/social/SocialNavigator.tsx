import { useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon } from '../../lib/icons'
import { NAV_BUTTON, SECTION_TITLE } from '../../lib/ui'
import { ConnectionsPage } from './ConnectionsPage'
import { ForeignProfile } from './ForeignProfile'
import { MemberSearch } from './MemberSearch'
import { enableSocialProfile, loadAccount, type Person, type SocialTab } from './api'

export type SocialRoute = { kind: 'search' } | { kind: 'profile'; id: string } | { kind: 'connections'; id: string; tab: SocialTab; name: string; page?: number }

/** account null: eigenes Profil ist nicht sichtbar. onEnable speichert vorher das Profil, damit Name und Bild stimmen. */
export function SocialNavigator({ userId, today, account, initialRoute, onBack, onAccountChange, onEnable }: {
  userId: string; today: string; account: Person | null; initialRoute: SocialRoute; onBack: () => void
  onAccountChange: (value: Person | null) => void; onEnable: () => Promise<void>
}) {
  const [stack, setStack] = useState<SocialRoute[]>([initialRoute])
  const route = stack[stack.length - 1]!
  const back = useRef<HTMLButtonElement>(null)
  function push(next: SocialRoute) { setStack(value => [...value, next]) }
  function pop() { if (stack.length === 1) onBack(); else setStack(value => value.slice(0, -1)) }
  function openPerson(id: string) { if (id === userId) onBack(); else push({ kind: 'profile', id }) }
  useEffect(() => { window.scrollTo(0, 0); back.current?.focus() }, [route])
  async function enable() {
    await onEnable()
    await enableSocialProfile()
    onAccountChange(await loadAccount(userId, userId))
  }
  if (route.kind === 'search') return <MemberSearch userId={userId} visible={account !== null} onBack={pop} onOpenPerson={openPerson} onEnable={enable} />
  if (route.kind === 'connections') return <ConnectionsPage userId={userId} ownerId={route.id} displayName={route.name}
    onEnable={route.id === userId && !account ? enable : undefined}
    initialTab={route.tab} initialPage={route.page} onBack={pop} onOpenPerson={openPerson}
    onViewChange={(tab, _query, page) => setStack(value => value.map((entry, index) => index === value.length - 1 ? { ...route, tab, page } : entry))} />
  const title = 'Profil'
  return <section className="mt-5 space-y-4">
    <div className="flex items-center gap-3"><button ref={back} type="button" className={NAV_BUTTON} aria-label="Zurück" onClick={pop}><ChevronLeftIcon /></button><h1 className={`min-w-0 flex-1 text-center ${SECTION_TITLE}`}>{title}</h1><span className="w-11" aria-hidden="true" /></div>
    {route.kind === 'profile' && <ForeignProfile key={route.id} personId={route.id} viewerId={userId} today={today}
      onConnections={tab => push({ kind: 'connections', id: route.id, tab, name: 'Verbindungen' })} />}
  </section>
}
