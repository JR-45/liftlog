import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { localDateString } from '../../domain/sets'
import { FoodIcon, PlanIcon, StatsIcon, TrainingIcon, UserIcon } from '../../lib/icons'
import { NutritionScreen } from '../nutrition/NutritionScreen'
import { supabase } from '../../lib/supabase'
import { Wordmark } from '../../lib/Wordmark'
import { greetingFor, headline } from '../../domain/greeting'
import { loadProfileHeader } from '../profile/api'
import { ProfileScreen } from '../profile/ProfileScreen'
import { StatsScreen } from '../stats/StatsScreen'
import { PlanEditor } from '../plan/PlanEditor'
import { loadPlanDays, loadScheduledDays, loadTrainedDates, type PlanDay } from './api'
import { planForDate, shiftDate, type ScheduledDay } from '../../domain/week'
import { weekStreak } from '../../domain/motivation'
import { FlameIcon } from '../../lib/icons'
import { Avatar } from '../../components/Avatar'
import { CountBadge } from '../../components/CountBadge'
import { countRequests } from '../social/api'
import { WeekPlanning } from './WeekPlanning'
import { TrainingDays } from './TrainingDays'
import { clearDrafts } from './drafts'
import { RestTimerBar } from './RestTimerBar'
import { useRestTimer } from './useRestTimer'

const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })

type Tab = 'training' | 'stats' | 'plan' | 'profile' | 'nutrition'

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
  const [tab, setTab] = useState<Tab>('training')
  const [profileHeaderActions, setProfileHeaderActions] = useState<HTMLDivElement | null>(null)
  const [planVersion, setPlanVersion] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [hour, setHour] = useState(() => new Date().getHours())
  // Wochenplanung für heute und die nächsten 6 Tage. Sie bestimmt, was im Training dran ist.
  const [schedule, setSchedule] = useState<{ from: string; days: ScheduledDay[] } | null>(null)
  const [scheduleVersion, setScheduleVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadScheduledDays(today, shiftDate(today, 6))
      .then((days) => { if (!cancelled) setSchedule({ from: today, days }) })
      // Ohne Wochenplanung gilt die Vorlage, das Training bleibt nutzbar.
      .catch(() => { if (!cancelled) setSchedule({ from: today, days: [] }) })
    return () => { cancelled = true }
  }, [today, scheduleVersion, planVersion])
  const scheduleDays = schedule?.from === today ? schedule.days : null

  // Die Begrüßung folgt der Tageszeit, auch wenn die App lange offen bleibt.
  useEffect(() => {
    const update = () => setHour(new Date().getHours())
    const interval = setInterval(update, 5 * 60 * 1000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  // Name und Bild liegen in der Datenbank und sind so auf allen Geräten gleich.
  useEffect(() => {
    let cancelled = false
    loadProfileHeader()
      .then((header) => {
        if (cancelled) return
        setAvatarUrl(header.avatar)
        setDisplayName(header.displayName)
      })
      .catch(() => {
        // Ohne Profil zeigt die App das Standard-Symbol und begrüßt ohne Namen.
      })
    return () => {
      cancelled = true
    }
  }, [userId])
  // Offene Folgeanfragen: bei jedem Tab-Wechsel und beim Zurückkehren in die App neu zählen.
  const [requestCount, setRequestCount] = useState(0)
  const [requestsVersion, setRequestsVersion] = useState(0)
  useEffect(() => {
    let cancelled = false
    countRequests(userId).then((count) => { if (!cancelled) setRequestCount(count) })
      .catch(() => { /* Ohne Zahl bleibt nur das Abzeichen weg. */ })
    return () => { cancelled = true }
  }, [userId, tab, requestsVersion])
  useEffect(() => {
    const update = () => { if (document.visibilityState === 'visible') setRequestsVersion((value) => value + 1) }
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  // Liegt hier und nicht beim Tag, damit die Pause beim Wechsel von Tag oder Tab weiterläuft.
  const restTimer = useRestTimer()
  const [trainedDates, setTrainedDates] = useState<ReadonlySet<string>>(new Set())

  // Trainingstage des letzten Jahres für die Streak. Ohne Daten bleibt die Flamme einfach weg.
  useEffect(() => {
    let cancelled = false
    const from = new Date(`${today}T12:00:00`)
    from.setFullYear(from.getFullYear() - 1)
    loadTrainedDates(localDateString(from), today)
      .then((dates) => {
        if (!cancelled) setTrainedDates(dates)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userId, today])

  /** Startet die Pause und zählt den heutigen Tag sofort für die Streak mit. */
  function handleSetLogged() {
    restTimer.start()
    setTrainedDates((current) => (current.has(today) ? current : new Set([...current, today])))
  }

  useEffect(() => {
    let cancelled = false
    loadPlanDays()
      .then((days) => {
        if (!cancelled) setPlanDays(days)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  // Eine installierte App bleibt oft tagelang geöffnet. Bei der Rückkehr gilt der aktuelle Tag.
  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>
    function scheduleMidnight() {
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      midnightTimer = setTimeout(() => {
        setToday(localDateString())
        scheduleMidnight()
      }, midnight.getTime() - now.getTime())
    }
    scheduleMidnight()
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      const now = localDateString()
      if (now !== today) {
        setToday(now)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearTimeout(midnightTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [today])

  // Datierte Entwürfe bleiben beim Wechsel zwischen Trainingswochen erhalten.
  useEffect(() => {
    clearDrafts({ userId })
  }, [userId])

  async function handleSignOut() {
    clearDrafts()
    restTimer.stop()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const timerRunning = restTimer.endsAt !== null
  const showTimer = planDays !== null && (timerRunning || (tab === 'training' && planDays.length > 0))
  const planArea = tab === 'plan' || (tab === 'training' && planDays?.length === 0)

  const streak = weekStreak(trainedDates, today)
  const profileIcon = <span className="relative">
    {avatarUrl ? <Avatar src={avatarUrl} className="h-5 w-5 rounded-full ring-1 ring-line/20" /> : <UserIcon />}
    <CountBadge count={requestCount} />
    {requestCount > 0 && <span className="sr-only">{requestCount} offene Anfragen,</span>}
  </span>
  const streakChip = streak > 0 && (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neon/15 px-2.5 py-1 font-display text-base font-extrabold uppercase tracking-wide text-neon"
      aria-label={`${streak} ${streak === 1 ? 'Woche' : 'Wochen'} am Stück trainiert`}
    >
      <FlameIcon className="h-4 w-4" />
      {streak} {streak === 1 ? 'Woche' : 'Wochen'}
    </span>
  )
  const dateLabel = DATE_FORMAT.format(new Date(`${today}T12:00:00`))
  // Trainingstag laut Wochenvorlage. Die Großschreibung übernimmt das CSS der Überschrift.
  const isTrainingDay = planDays ? planForDate(today, planDays, scheduleDays ?? []).planDayId !== null : false
  const title = headline(isTrainingDay, displayName)
  // Ohne gespeicherten Namen ein dezenter Hinweis statt des Mail-Anfangs als Name.
  const nameHint = displayName === null && (
    <button type="button" className="mt-1 min-h-8 text-sm text-accent-ink" onClick={() => setTab('profile')}>
      Name im Profil eintragen
    </button>
  )

  return (
    <div className="lg:pl-64">
      {/* Laptop: Navigation und Pause in einer festen Seitenleiste. */}
      <aside className="apple-glass fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line/[0.08] p-4 lg:flex">
        <div className="flex items-center gap-3 px-1">
          <img className="h-10 w-10 rounded-xl shadow-sm ring-1 ring-line/10" src="/icons/icon-192.png" alt="" />
          <div>
            <Wordmark className="block text-2xl" />
            <p className="text-xs text-muted">{dateLabel}</p>
          </div>
        </div>
        {planDays !== null && (
          <nav className="mt-6 space-y-1" aria-label="Hauptmenü">
            <TabButton label="Training" variant="side" active={tab === 'training' && !planArea} onClick={() => setTab('training')}>
              <TrainingIcon />
            </TabButton>
            <TabButton label="Trainingsplan" variant="side" active={planArea} onClick={() => setTab('plan')}>
              <PlanIcon />
            </TabButton>
            <TabButton label="Ernährung" variant="side" active={tab === 'nutrition'} onClick={() => setTab('nutrition')}>
              <FoodIcon />
            </TabButton>
            <TabButton label="Statistik" variant="side" active={tab === 'stats'} onClick={() => setTab('stats')}>
              <StatsIcon />
            </TabButton>
            <TabButton label="Profil" variant="side" active={tab === 'profile'} onClick={() => setTab('profile')}>
              {profileIcon}
            </TabButton>
          </nav>
        )}
        <div className="mt-auto space-y-3">
          {showTimer && <RestTimerBar timer={restTimer} variant="panel" />}
        </div>
      </aside>

      <main className="page-shell mx-auto min-h-dvh max-w-xl px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] pt-6 md:max-w-4xl md:px-6 lg:max-w-7xl lg:px-8 lg:pb-10 lg:pt-8">
        <header className={tab === 'profile' ? 'flex items-center justify-between gap-3 lg:has-[button]:mt-5 lg:justify-end' : 'flex items-center justify-between lg:hidden'}>
          <div className={`min-w-0 ${tab === 'profile' ? 'flex-1 lg:hidden' : ''}`}>
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted">
              {tab === 'training'
                ? `${greetingFor(hour)} · ${SHORT_DATE_FORMAT.format(new Date(`${today}T12:00:00`))}`
                : dateLabel}
            </p>
            {tab === 'training' ? (
              <>
                <h1 className="mt-1 text-4xl text-foreground [overflow-wrap:break-word]">{title}</h1>
                {streakChip && <div className="mt-2">{streakChip}</div>}
                {nameHint}
              </>
            ) : (
              <h1 className="mt-0.5 text-3xl">
                <Wordmark />
              </h1>
            )}
          </div>
          {tab === 'profile' && <div ref={setProfileHeaderActions} className="flex shrink-0 gap-2" />}
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
            {/* Am Laptop fehlt die Kopfzeile, die Begrüßung steht dann über dem Training. */}
            {tab === 'training' && (
              <div className="mb-2 hidden lg:block">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{greetingFor(hour)}</p>
                <h1 className="mt-1 text-6xl text-foreground">{title}</h1>
                {streakChip && <div className="mt-3">{streakChip}</div>}
                {nameHint}
              </div>
            )}
            {/* Bleibt beim Tab-Wechsel erhalten, damit Eingaben und offene Übung nicht verloren gehen. */}
            {planDays.length > 0 && <div className={tab === 'training' ? '' : 'hidden'}>
              <TrainingDays key={planVersion} today={today} userId={userId} planDays={planDays} schedule={scheduleDays} restSeconds={restTimer.duration} onSetLogged={handleSetLogged} />
            </div>}
            {/* Wochenplanung und Vorlage stehen auf einer Seite: oben die Woche, darunter die Vorlage. */}
            {planDays.length > 0 && <div className={tab === 'plan' ? '' : 'hidden'}>
              <WeekPlanning key={planVersion} today={today} planDays={planDays} active={tab === 'plan'} onSaved={() => setScheduleVersion((value) => value + 1)} />
            </div>}
            {planArea && (
              <PlanEditor
                key={planVersion}
                hasPlan={planDays.length > 0}
                onSaved={() => {
                  // Bleibt im Trainingsplan, damit sich mehrere Tage nacheinander bearbeiten lassen.
                  // Pause und noch nicht gespeicherte Trainingseingaben laufen weiter.
                  setPlanDays(null)
                  setTab('plan')
                  setPlanVersion((value) => value + 1)
                  setAttempt((value) => value + 1)
                }}
              />
            )}

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
                headerActionsTarget={profileHeaderActions}
                onSignOut={handleSignOut}
                user={session.user}
                today={today}
                defaultWeeklyTarget={planDays.length}
                onAvatarChange={setAvatarUrl}
                onNameChange={setDisplayName}
                requestCount={requestCount}
                onRequestsChanged={() => setRequestsVersion((value) => value + 1)}
              />
            )}

            {tab === 'nutrition' && <NutritionScreen user={session.user} today={today} onOpenProfile={() => setTab('profile')} />}

            {/* Handy und Tablet: Pause und Menü unten. Am Laptop übernimmt das die Seitenleiste. */}
            <div className="mobile-dock fixed inset-x-0 bottom-0 z-20 lg:hidden">
              {showTimer && <RestTimerBar timer={restTimer} variant="bar" />}
              <nav className="apple-glass border-t border-line/[0.08] pb-[env(safe-area-inset-bottom)]" aria-label="Hauptmenü">
                <div className="mx-auto flex max-w-md md:max-w-2xl">
                  <TabButton label="Training" variant="bottom" active={tab === 'training' && !planArea} onClick={() => setTab('training')}>
                    <TrainingIcon />
                  </TabButton>
                  <TabButton label="Trainingsplan" variant="bottom" active={planArea} onClick={() => setTab('plan')}>
                    <PlanIcon />
                  </TabButton>
                  <TabButton label="Ernährung" variant="bottom" active={tab === 'nutrition'} onClick={() => setTab('nutrition')}>
                    <FoodIcon />
                  </TabButton>
                  <TabButton label="Statistik" variant="bottom" active={tab === 'stats'} onClick={() => setTab('stats')}>
                    <StatsIcon />
                  </TabButton>
                  <TabButton label="Profil" variant="bottom" active={tab === 'profile'} onClick={() => setTab('profile')}>
                    {profileIcon}
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
