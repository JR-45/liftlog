import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { localDateString } from '../../domain/sets'
import { supabase } from '../../lib/supabase'
import { loadPlanDays, type PlanDay } from './api'
import { DayView } from './DayView'
import { clearDrafts } from './drafts'
import { RestTimerBar } from './RestTimerBar'
import { useRestTimer } from './useRestTimer'

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00`).getDay()
}

export function HomeScreen({ session }: { session: Session }) {
  const userId = session.user.id
  const [planDays, setPlanDays] = useState<PlanDay[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [today, setToday] = useState(() => localDateString())
  const [pickedWeekday, setPickedWeekday] = useState<number | null>(null)
  // Liegt hier und nicht beim Tag, damit die Pause beim Wechsel des Tages weiterläuft.
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

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-6">
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
          {(selectedDay || restTimer.endsAt !== null) && <RestTimerBar timer={restTimer} />}
        </>
      )}
    </main>
  )
}
