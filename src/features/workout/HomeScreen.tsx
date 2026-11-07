import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { localDateString } from '../../domain/sets'
import { PlanIcon, StatsIcon, TrainingIcon, UserIcon } from '../../lib/icons'
import { supabase } from '../../lib/supabase'
import { loadAvatar } from '../profile/api'
import { ProfileScreen } from '../profile/ProfileScreen'
import { StatsScreen } from '../stats/StatsScreen'
import { PlanEditor } from '../plan/PlanEditor'
import { loadPlanDays, type PlanDay } from './api'
import { WeekPlanning } from './WeekPlanning'
import { TrainingDays } from './TrainingDays'
import { clearDrafts } from './drafts'
import { RestTimerBar } from './RestTimerBar'
import { useRestTimer } from './useRestTimer'

const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

type Tab = 'training' | 'stats' | 'plan' | 'profile'

/** bottom: untere Leiste auf Handy und Tablet. side: Seitenleiste am Laptop. */
function TabButton(props: {
  label: string
  active: boolean
  variant: 'bottom' | 'side'
  onClick: () => void
  children: React.ReactNode
}) {
  const { label, active, variant, onClick, children } = props
  const layout =
    variant === 'bottom'
      ? 'h-14 flex-1 flex-col justify-center gap-1 text-[11px] tracking-tight'
      : `h-11 w-full gap-3 rounded-xl px-3.5 text-sm ${active ? 'bg-control' : 'hover:bg-surface'}`
  return (
    <button
      className={`flex items-center transition-colors active:opacity-75 ${layout} ${
        active ? 'font-semibold text-accent-ink' : 'text-muted'
      }`}
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
      {label}
    </button>
  )
}

export function HomeScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const [planDays, setPlanDays] = useState<PlanDay[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [today, setToday] = useState(() => localDateString())
  const [planMode, setPlanMode] = useState<'weekly' | 'template'>('weekly')
  const [tab, setTab] = useState<Tab>('training')
  const [planVersion, setPlanVersion] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Das Profilbild liegt in der Datenbank und ist so auf allen Geräten gleich.
  useEffect(() => {
    let cancelled = false
    loadAvatar()
      .then((url) => {
        if (!cancelled) setAvatarUrl(url)
      })
      .catch(() => {
        // Ohne Bild zeigt die App das Standard-Symbol.
      })
    return () => {
      cancelled = true
    }
  }, [userId])
  // Liegt hier und nicht beim Tag, damit die Pause beim Wechsel von Tag oder Tab weiterläuft.
  const restTimer = useRestTimer()

  useEffect(() => {
    let cancelled = false
    loadPlanDays()
      .then((days) => {
        if (!cancelled) setPlanDays(days)
      })
      .catch(async () => {
        if (cancelled) return
        // Gibt es den User nicht mehr, z. B. nach einem Reset der Datenbank, hilft nur ein neuer Login.
        const { error } = await supabase.auth.getUser()
        if (error) {
          clearDrafts()
          void supabase.auth.signOut()
          return
        }
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  // Eine installierte App bleibt oft tagelang geöffnet. Bei der Rückkehr gilt der aktuelle Tag.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      const now = localDateString()
      if (now !== today) {
        setToday(now)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [today])

  // Datierte Entwürfe bleiben beim Wechsel zwischen Trainingswochen erhalten.
  useEffect(() => {
    clearDrafts({ userId })
  }, [userId])

  function handleSignOut() {
    clearDrafts()
    restTimer.stop()
    void supabase.auth.signOut()
  }

  const timerRunning = restTimer.endsAt !== null
  const showTimer = planDays !== null && (timerRunning || (tab === 'training' && planDays.length > 0))
  const planArea = tab === 'plan' || (tab === 'training' && planDays?.length === 0)
  const editingPlan = planArea && (planDays?.length === 0 || planMode === 'template')

  const dateLabel = DATE_FORMAT.format(new Date(`${today}T12:00:00`))

  return (
    <div className="lg:pl-64">
      {/* Laptop: Navigation, Pause und Abmelden in einer festen Seitenleiste. */}
      <aside className="apple-glass fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line/[0.08] p-4 lg:flex">
        <div className="flex items-center gap-3 px-1">
          <img className="h-10 w-10 rounded-xl shadow-sm ring-1 ring-line/10" src="/icons/icon-192.png" alt="" />
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">LiftLog</p>
            <p className="text-xs text-muted">{dateLabel}</p>
          </div>
        </div>
        {planDays !== null && (
          <nav className="mt-6 space-y-1" aria-label="Hauptmenü">
            <TabButton label="Training" variant="side" active={tab === 'training' && !planArea} onClick={() => setTab('training')}>
              <TrainingIcon />
            </TabButton>
            <TabButton label="Statistik" variant="side" active={tab === 'stats'} onClick={() => setTab('stats')}>
              <StatsIcon />
            </TabButton>
            <TabButton label="Trainingsplan" variant="side" active={planArea} onClick={() => setTab('plan')}>
              <PlanIcon />
            </TabButton>
            <TabButton label="Profil" variant="side" active={tab === 'profile'} onClick={() => setTab('profile')}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-line/20" />
              ) : (
                <UserIcon />
              )}
            </TabButton>
          </nav>
        )}
        <div className="mt-auto space-y-3">
          {showTimer && <RestTimerBar timer={restTimer} variant="panel" />}
          <button
            className="h-11 w-full rounded-xl px-3.5 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
            type="button"
            onClick={handleSignOut}
          >
            Abmelden
          </button>
        </div>
      </aside>

      <main className="page-shell mx-auto min-h-dvh max-w-xl px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] pt-6 md:max-w-4xl md:px-6 lg:max-w-7xl lg:px-8 lg:pb-10 lg:pt-8">
        <header className="flex items-center justify-between lg:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{dateLabel}</p>
            <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-foreground">LiftLog</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Profil öffnen"
              onClick={() => setTab('profile')}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className={`h-9 w-9 rounded-full object-cover ring-2 ${
                    tab === 'profile' ? 'ring-accent' : 'ring-line/15'
                  }`}
                />
              ) : (
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-surface ring-1 ${
                    tab === 'profile' ? 'text-accent-ink ring-accent' : 'text-muted ring-line/10'
                  }`}
                >
                  <UserIcon className="h-4 w-4" />
                </span>
              )}
            </button>
            <button
              className="-mr-2 min-h-11 rounded-xl px-2.5 text-sm font-medium text-muted transition-colors active:text-foreground"
              type="button"
              onClick={handleSignOut}
            >
              Abmelden
            </button>
          </div>
        </header>

        {failed ? (
          <div className="mt-6 rounded-2xl border border-line/[0.08] bg-surface p-4">
            <p role="alert" className="text-sm text-danger">Dein Plan konnte nicht geladen werden.</p>
            <button
              className="mt-2 min-h-11 py-2 text-sm font-medium text-accent-ink"
              type="button"
              onClick={() => {
                setFailed(false)
                setAttempt((current) => current + 1)
              }}
            >
              Noch einmal versuchen
            </button>
          </div>
        ) : planDays === null ? (
          <p className="mt-6 text-sm text-muted">Plan wird geladen …</p>
        ) : (
          <>
            {tab === 'plan' && planDays.length > 0 && <nav className="mt-4 grid max-w-xl grid-cols-2 gap-2" aria-label="Trainingsplan-Bereich">
              <button type="button" className={`min-h-14 rounded-lg px-2 py-2 text-sm ${planMode === 'weekly' ? 'bg-yellow-400 font-semibold text-black' : 'bg-neutral-800'}`}
                aria-pressed={planMode === 'weekly'} onClick={() => setPlanMode('weekly')}>Wochenplanung</button>
              <button type="button" className={`min-h-14 rounded-lg px-2 py-2 text-sm ${planMode === 'template' ? 'bg-yellow-400 font-semibold text-black' : 'bg-neutral-800'}`}
                aria-pressed={planMode === 'template'} onClick={() => setPlanMode('template')}>Wochenvorlage bearbeiten</button>
            </nav>}
            {editingPlan && (
              <PlanEditor
                key={planVersion}
                hasPlan={planDays.length > 0}
                onCancel={() => setPlanMode('weekly')}
                onSaved={() => {
                  restTimer.stop()
                  clearDrafts()
                  setPlanDays(null)
                  setPlanMode('weekly')
                  setTab('plan')
                  setPlanVersion((value) => value + 1)
                  setAttempt((value) => value + 1)
                }}
              />
            )}
            {/* Bleibt beim Tab-Wechsel erhalten, damit Eingaben und offene Übung nicht verloren gehen. */}
            {planDays.length > 0 && <div className={tab === 'training' ? '' : 'hidden'}>
              <TrainingDays key={planVersion} today={today} userId={userId} planDays={planDays} onSetLogged={restTimer.start} />
            </div>}
            {planDays.length > 0 && <div className={tab === 'plan' && planMode === 'weekly' ? '' : 'hidden'}>
              <WeekPlanning key={planVersion} today={today} planDays={planDays} active={tab === 'plan' && planMode === 'weekly'} />
            </div>}

            {/* Wird bei jedem Öffnen neu geladen und zeigt so auch gerade gespeicherte Sätze. */}
            {tab === 'stats' && (
              <StatsScreen
                today={today}
                startDate={localDateString(new Date(session.user.created_at))}
                planDays={planDays}
              />
            )}

            {tab === 'profile' && (
              <ProfileScreen
                user={session.user}
                today={today}
                defaultWeeklyTarget={planDays.length}
                restTimer={restTimer}
                onAvatarChange={setAvatarUrl}
                onSignOut={handleSignOut}
              />
            )}

            {/* Handy und Tablet: Pause und Menü unten. Am Laptop übernimmt das die Seitenleiste. */}
            <div className="mobile-dock fixed inset-x-0 bottom-0 z-20 lg:hidden">
              {showTimer && <RestTimerBar timer={restTimer} variant="bar" />}
              <nav className="apple-glass border-t border-line/[0.08] pb-[env(safe-area-inset-bottom)]" aria-label="Hauptmenü">
                <div className="mx-auto flex max-w-md md:max-w-2xl">
                  <TabButton label="Training" variant="bottom" active={tab === 'training' && !planArea} onClick={() => setTab('training')}>
                    <TrainingIcon />
                  </TabButton>
                  <TabButton label="Statistik" variant="bottom" active={tab === 'stats'} onClick={() => setTab('stats')}>
                    <StatsIcon />
                  </TabButton>
                  <TabButton label="Trainingsplan" variant="bottom" active={planArea} onClick={() => setTab('plan')}>
                    <PlanIcon />
                  </TabButton>
                  <TabButton label="Profil" variant="bottom" active={tab === 'profile'} onClick={() => setTab('profile')}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-line/20" />
                    ) : (
                      <UserIcon />
                    )}
                  </TabButton>
                </div>
              </nav>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
