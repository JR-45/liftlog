import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { localDateString } from '../../domain/sets'
import { StatsIcon, TrainingIcon } from '../../lib/icons'
import { supabase } from '../../lib/supabase'
import { ExportCard } from '../stats/ExportCard'
import { StatsScreen } from '../stats/StatsScreen'
import { loadPlanDays, type PlanDay } from './api'
import { DayView } from './DayView'
import { clearDrafts } from './drafts'
import { RestTimerBar } from './RestTimerBar'
import { useRestTimer } from './useRestTimer'

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

type Tab = 'training' | 'stats'

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00`).getDay()
}

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
      : `h-11 w-full gap-3 rounded-xl px-3.5 text-sm ${active ? 'bg-[#2C2C2E]' : 'hover:bg-[#1C1C1E]'}`
  return (
    <button
      className={`flex items-center transition-colors active:opacity-75 ${layout} ${
        active ? 'font-semibold text-[#FFD60A]' : 'text-[#8E8E93]'
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
  const [pickedWeekday, setPickedWeekday] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('training')
  // Liegt hier und nicht beim Tag, damit die Pause beim Wechsel von Tag oder Tab weiterläuft.
  const restTimer = useRestTimer()

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
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      const now = localDateString()
      if (now !== today) {
        setToday(now)
        setPickedWeekday(null)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [today])

  // Entwürfe gelten nur für den jeweiligen Tag.
  useEffect(() => {
    clearDrafts({ userId, date: today })
  }, [userId, today])

  function handleSignOut() {
    clearDrafts()
    restTimer.stop()
    void supabase.auth.signOut()
  }

  const selectedWeekday = pickedWeekday ?? weekdayOf(today)
  const selectedDay = planDays?.find((day) => day.weekday === selectedWeekday)
  const timerRunning = restTimer.endsAt !== null
  const showTimer = planDays !== null && (timerRunning || (tab === 'training' && selectedDay !== undefined))

  const dateLabel = DATE_FORMAT.format(new Date(`${today}T12:00:00`))

  return (
    <div className="lg:pl-64">
      {/* Laptop: Navigation, Pause und Abmelden in einer festen Seitenleiste. */}
      <aside className="apple-glass fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/[0.08] p-4 lg:flex">
        <div className="flex items-center gap-3 px-1">
          <img className="h-10 w-10 rounded-xl shadow-sm ring-1 ring-white/10" src="/icons/icon-192.png" alt="" />
          <div>
            <p className="text-base font-semibold tracking-tight text-white">LiftLog</p>
            <p className="text-xs text-[#8E8E93]">{dateLabel}</p>
          </div>
        </div>
        {planDays !== null && (
          <nav className="mt-6 space-y-1" aria-label="Hauptmenü">
            <TabButton label="Training" variant="side" active={tab === 'training'} onClick={() => setTab('training')}>
              <TrainingIcon />
            </TabButton>
            <TabButton label="Statistik" variant="side" active={tab === 'stats'} onClick={() => setTab('stats')}>
              <StatsIcon />
            </TabButton>
          </nav>
        )}
        <div className="mt-auto space-y-3">
          {showTimer && <RestTimerBar timer={restTimer} variant="panel" />}
          <button
            className="h-11 w-full rounded-xl px-3.5 text-left text-sm text-[#8E8E93] transition-colors hover:bg-[#1C1C1E] hover:text-white"
            type="button"
            onClick={handleSignOut}
          >
            Abmelden
          </button>
        </div>
      </aside>

      <main className="mx-auto min-h-dvh max-w-md px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] pt-5 md:max-w-2xl md:px-6 lg:max-w-5xl lg:px-8 lg:pb-10 lg:pt-8">
        <header className="flex items-start justify-between lg:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">{dateLabel}</p>
            <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-white">LiftLog</h1>
          </div>
          <button
            className="-mr-2 min-h-11 rounded-xl px-2.5 text-sm font-medium text-[#8E8E93] transition-colors active:text-white"
            type="button"
            onClick={handleSignOut}
          >
            Abmelden
          </button>
        </header>

        {failed ? (
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4">
            <p role="alert" className="text-sm text-[#FF453A]">Dein Plan konnte nicht geladen werden.</p>
            <button
              className="mt-2 min-h-11 py-2 text-sm font-medium text-[#FFD60A]"
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
          <p className="mt-6 text-sm text-[#8E8E93]">Plan wird geladen …</p>
        ) : (
          <>
            {/* Bleibt beim Tab-Wechsel erhalten, damit Eingaben und offene Übung nicht verloren gehen. */}
            <div className={tab === 'training' ? '' : 'hidden'}>
              <nav
                className="mt-4 flex gap-1 rounded-2xl border border-white/[0.06] bg-[#1C1C1E] p-1 lg:mt-0 lg:max-w-xl"
                aria-label="Trainingstag"
              >
                {planDays.map((day) => (
                  <button
                    key={day.id}
                    className={`relative h-11 flex-1 rounded-xl text-sm transition-all duration-200 active:scale-95 ${
                      day.weekday === selectedWeekday
                        ? 'bg-[#FFD60A] font-semibold text-black shadow-sm'
                        : 'text-[#EBEBF5]/75 hover:text-white'
                    }`}
                    type="button"
                    aria-pressed={day.weekday === selectedWeekday}
                    onClick={() => setPickedWeekday(day.weekday)}
                  >
                    {WEEKDAY_SHORT[day.weekday]}
                    {day.weekday === weekdayOf(today) && day.weekday !== selectedWeekday && (
                      <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#FFD60A]" />
                    )}
                  </button>
                ))}
              </nav>

              {selectedDay ? (
                <>
                  <h2 className="mt-5 text-xl font-bold tracking-tight text-white">{selectedDay.name}</h2>
                  <DayView
                    key={`${selectedDay.id}:${today}`}
                    planDayId={selectedDay.id}
                    userId={userId}
                    today={today}
                    onSetLogged={restTimer.start}
                  />
                </>
              ) : (
                <div className="mt-12 rounded-2xl border border-white/[0.08] bg-[#1C1C1E] px-6 py-12 text-center">
                  <p className="text-lg font-semibold text-white">Heute ist Ruhetag</p>
                  <p className="mt-1 text-sm text-[#8E8E93]">Oben kannst du trotzdem einen Trainingstag wählen.</p>
                </div>
              )}
            </div>

            {/* Wird bei jedem Öffnen neu geladen und zeigt so auch gerade gespeicherte Sätze. */}
            {tab === 'stats' && (
              <>
                <StatsScreen
                  today={today}
                  startDate={localDateString(new Date(session.user.created_at))}
                  planDays={planDays}
                />
                <ExportCard today={today} />
              </>
            )}

            {/* Handy und Tablet: Pause und Menü unten. Am Laptop übernimmt das die Seitenleiste. */}
            <div className="fixed inset-x-0 bottom-0 z-20 lg:hidden">
              {showTimer && <RestTimerBar timer={restTimer} variant="bar" />}
              <nav className="apple-glass border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]" aria-label="Hauptmenü">
                <div className="mx-auto flex max-w-md md:max-w-2xl">
                  <TabButton label="Training" variant="bottom" active={tab === 'training'} onClick={() => setTab('training')}>
                    <TrainingIcon />
                  </TabButton>
                  <TabButton label="Statistik" variant="bottom" active={tab === 'stats'} onClick={() => setTab('stats')}>
                    <StatsIcon />
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
