import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { localDateString } from '../../domain/sets'
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

function TabButton(props: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  const { label, active, onClick, children } = props
  return (
    <button
      className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
        active ? 'font-medium text-yellow-300' : 'text-neutral-400'
      }`}
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {children}
      </svg>
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

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-44 pt-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">LiftLog</h1>
          <p className="text-sm text-neutral-500">{DATE_FORMAT.format(new Date(`${today}T12:00:00`))}</p>
        </div>
        <button className="py-2 text-sm text-neutral-500" type="button" onClick={handleSignOut}>
          Abmelden
        </button>
      </header>

      {failed ? (
        <div className="mt-6">
          <p role="alert" className="text-sm text-red-300">Dein Plan konnte nicht geladen werden.</p>
          <button
            className="mt-2 py-2 text-sm text-neutral-200 underline"
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
        <p className="mt-6 text-sm text-neutral-400">Plan wird geladen …</p>
      ) : (
        <>
          {/* Bleibt beim Tab-Wechsel erhalten, damit Eingaben und offene Übung nicht verloren gehen. */}
          <div className={tab === 'training' ? '' : 'hidden'}>
            <nav className="mt-4 flex gap-2" aria-label="Trainingstag">
              {planDays.map((day) => (
                <button
                  key={day.id}
                  className={`relative h-11 flex-1 rounded-lg text-sm transition-colors ${
                    day.weekday === selectedWeekday
                      ? 'bg-yellow-400 font-semibold text-neutral-950'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                  type="button"
                  aria-pressed={day.weekday === selectedWeekday}
                  onClick={() => setPickedWeekday(day.weekday)}
                >
                  {WEEKDAY_SHORT[day.weekday]}
                  {day.weekday === weekdayOf(today) && day.weekday !== selectedWeekday && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-yellow-400" />
                  )}
                </button>
              ))}
            </nav>

            {selectedDay ? (
              <>
                <h2 className="mt-5 text-lg font-medium text-neutral-100">{selectedDay.name}</h2>
                <DayView
                  key={`${selectedDay.id}:${today}`}
                  planDayId={selectedDay.id}
                  userId={userId}
                  today={today}
                  onSetLogged={restTimer.start}
                />
              </>
            ) : (
              <div className="mt-16 text-center">
                <p className="text-lg font-medium text-neutral-100">Heute ist Ruhetag</p>
                <p className="mt-1 text-sm text-neutral-400">Oben kannst du trotzdem einen Trainingstag wählen.</p>
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

          <div className="fixed inset-x-0 bottom-0 z-20">
            {showTimer && <RestTimerBar timer={restTimer} />}
            <nav className="border-t border-neutral-800 bg-neutral-950" aria-label="Hauptmenü">
              <div className="mx-auto flex max-w-md">
                <TabButton label="Training" active={tab === 'training'} onClick={() => setTab('training')}>
                  <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
                </TabButton>
                <TabButton label="Statistik" active={tab === 'stats'} onClick={() => setTab('stats')}>
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </TabButton>
              </div>
            </nav>
          </div>
        </>
      )}
    </main>
  )
}
