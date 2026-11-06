import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { localDateString } from '../../domain/sets'
import { supabase } from '../../lib/supabase'
import { loadPlanDays, type PlanDay } from './api'
import { DayView } from './DayView'
import { clearDrafts } from './drafts'

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

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
    void supabase.auth.signOut()
  }

  const selectedWeekday = pickedWeekday ?? weekdayOf(today)
  const selectedDay = planDays?.find((day) => day.weekday === selectedWeekday)

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-100">LiftLog</h1>
        <button className="py-2 text-sm text-neutral-400" type="button" onClick={handleSignOut}>
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
                className={`h-11 flex-1 rounded-lg text-sm ${
                  day.weekday === selectedWeekday ? 'bg-neutral-200 font-medium text-neutral-900' : 'bg-neutral-800 text-neutral-300'
                }`}
                type="button"
                aria-pressed={day.weekday === selectedWeekday}
                onClick={() => setPickedWeekday(day.weekday)}
              >
                {WEEKDAY_SHORT[day.weekday]}
              </button>
            ))}
          </nav>

          {selectedDay ? (
            <>
              <p className="mt-4 text-sm text-neutral-400">{selectedDay.name}</p>
              <DayView key={`${selectedDay.id}:${today}`} planDayId={selectedDay.id} userId={userId} today={today} />
            </>
          ) : (
            <p className="mt-6 text-neutral-300">Heute ist Ruhetag. Oben kannst du trotzdem einen Trainingstag wählen.</p>
          )}
        </>
      )}
    </main>
  )
}
