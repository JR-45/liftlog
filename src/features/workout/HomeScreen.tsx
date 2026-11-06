import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

type PlanDay = { id: string; weekday: number; name: string }

/** Legt beim ersten Login den Plan an und lädt danach die Trainingstage. */
async function loadPlanDays(): Promise<PlanDay[]> {
  // Mehrfachaufruf ist sicher, die Funktion überschreibt keinen vorhandenen Plan.
  const { error: seedError } = await supabase.rpc('seed_default_plan')
  if (seedError) throw seedError

  const { data, error } = await supabase.from('plan_days').select('id, weekday, name').order('weekday')
  if (error) throw error
  return data
}

// Vorläufige Startansicht: Die Tagesansicht mit Übungen und Sätzen folgt in Schritt 3.
export function HomeScreen({ session }: { session: Session }) {
  const [planDays, setPlanDays] = useState<PlanDay[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

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

  const retry = useCallback(() => {
    setFailed(false)
    setAttempt((current) => current + 1)
  }, [])

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-100">LiftLog</h1>
        <button className="py-2 text-sm text-neutral-400" type="button" onClick={() => void supabase.auth.signOut()}>
          Abmelden
        </button>
      </header>
      <p className="mt-1 truncate text-sm text-neutral-500">{session.user.email}</p>

      {failed ? (
        <div className="mt-6">
          <p role="alert" className="text-sm text-red-300">Dein Plan konnte nicht geladen werden.</p>
          <button className="mt-2 py-2 text-sm text-neutral-200 underline" type="button" onClick={retry}>
            Noch einmal versuchen
          </button>
        </div>
      ) : planDays === null ? (
        <p className="mt-6 text-sm text-neutral-400">Plan wird geladen …</p>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-800">
          {planDays.map((day) => (
            <li key={day.id} className="flex justify-between py-3">
              <span className="text-neutral-100">{WEEKDAYS[day.weekday]}</span>
              <span className="text-neutral-400">{day.name}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
