import { useEffect, useMemo, useState } from 'react'
import { buildMonth, type CalendarDay, type DayStatus, monthIndex } from '../../domain/calendar'
import { localDateString } from '../../domain/sets'
import { loadTrainedDates, type PlanDay } from '../workout/api'

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTH_FORMAT = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const DAY_FORMAT = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' })

const STATUS_LABEL: Record<DayStatus, string> = {
  trained: 'trainiert',
  missed: 'nicht trainiert',
  rest: 'Ruhetag',
  today: 'heute',
  future: 'noch offen',
  before_start: 'vor dem Start',
}

type Props = { today: string; startDate: string; planDays: PlanDay[] }

function DayCell({ cell }: { cell: CalendarDay }) {
  const label = `${DAY_FORMAT.format(new Date(`${cell.date}T12:00:00`))}: ${STATUS_LABEL[cell.status]}`
  const style: Record<DayStatus, string> = {
    trained: 'bg-yellow-400 font-semibold text-neutral-950',
    missed: 'bg-red-400/10 text-red-300',
    rest: 'text-neutral-500',
    today: 'border border-yellow-400 text-neutral-100',
    future: 'text-neutral-600',
    before_start: 'text-neutral-700',
  }
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular-nums ${style[cell.status]}`}
    >
      <span className="leading-none">{cell.day}</span>
      {cell.status === 'trained' && <span className="mt-0.5 text-xs leading-none" aria-hidden="true">✓</span>}
      {cell.status === 'missed' && <span className="mt-0.5 text-xs leading-none" aria-hidden="true">✕</span>}
    </div>
  )
}

export function StatsScreen({ today, startDate, planDays }: Props) {
  const currentIndex = monthIndex(today)
  const firstIndex = Math.min(monthIndex(startDate), currentIndex)
  const [shownIndex, setShownIndex] = useState(currentIndex)
  const [loaded, setLoaded] = useState<{ index: number; dates: Set<string> } | null>(null)
  const [failedIndex, setFailedIndex] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)

  const year = Math.floor(shownIndex / 12)
  const month = shownIndex % 12

  useEffect(() => {
    let cancelled = false
    const from = localDateString(new Date(year, month, 1))
    const to = localDateString(new Date(year, month + 1, 0))
    loadTrainedDates(from, to)
      .then((dates) => {
        if (cancelled) return
        setLoaded({ index: shownIndex, dates })
        setFailedIndex(null)
      })
      .catch(() => {
        if (!cancelled) setFailedIndex(shownIndex)
      })
    return () => {
      cancelled = true
    }
  }, [shownIndex, year, month, attempt])

  const dates = loaded?.index === shownIndex ? loaded.dates : null
  const calendar = useMemo(() => {
    if (!dates) return null
    return buildMonth({
      year,
      month,
      today,
      startDate,
      trainedDates: dates,
      plannedWeekdays: new Set(planDays.map((day) => day.weekday)),
    })
  }, [dates, year, month, today, startDate, planDays])

  return (
    <section className="mt-5">
      <h2 className="text-lg font-medium text-neutral-100">Trainingstage</h2>

      {/* Ab Tablet stehen Kalender und Zahlen nebeneinander, damit die Tage nicht riesig werden. */}
      <div className="mt-3 md:grid md:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] md:items-start md:gap-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-800/40 p-3">
          <div className="flex items-center justify-between">
            <button
              className="h-11 w-11 rounded-lg text-xl text-neutral-300 disabled:opacity-25"
              type="button"
              aria-label="Vorheriger Monat"
              disabled={shownIndex <= firstIndex}
              onClick={() => setShownIndex((current) => current - 1)}
            >
              ‹
            </button>
            <span className="font-medium text-neutral-100">{MONTH_FORMAT.format(new Date(year, month, 1))}</span>
            <button
              className="h-11 w-11 rounded-lg text-xl text-neutral-300 disabled:opacity-25"
              type="button"
              aria-label="Nächster Monat"
              disabled={shownIndex >= currentIndex}
              onClick={() => setShownIndex((current) => current + 1)}
            >
              ›
            </button>
          </div>

          {failedIndex === shownIndex ? (
            <div className="py-10 text-center">
              <p role="alert" className="text-sm text-red-300">Der Kalender konnte nicht geladen werden.</p>
              <button
                className="mt-2 py-2 text-sm text-neutral-200 underline"
                type="button"
                onClick={() => {
                  setFailedIndex(null)
                  setAttempt((current) => current + 1)
                }}
              >
                Noch einmal versuchen
              </button>
            </div>
          ) : calendar === null ? (
            <p className="py-16 text-center text-sm text-neutral-400">Kalender wird geladen …</p>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-neutral-500" aria-hidden="true">
                {WEEKDAY_HEADERS.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {calendar.weeks.flat().map((cell, index) =>
                  cell ? <DayCell key={cell.date} cell={cell} /> : <span key={`blank-${index}`} />,
                )}
              </div>
            </>
          )}
        </div>

        {calendar && (
          <div>
            <div className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:grid-cols-1 lg:grid-cols-2">
              <div className="rounded-xl border border-neutral-800 bg-neutral-800/40 p-3">
                <p className="text-2xl font-semibold tabular-nums text-yellow-300" data-testid="trained-count">
                  {calendar.trained}
                </p>
                <p className="text-sm text-neutral-400">{calendar.trained === 1 ? 'Training' : 'Trainings'}</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-800/40 p-3">
                <p className="text-2xl font-semibold tabular-nums text-red-300" data-testid="missed-count">
                  {calendar.missed}
                </p>
                <p className="text-sm text-neutral-400">{calendar.missed === 1 ? 'Tag verpasst' : 'Tage verpasst'}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              ✕ zählt nur an deinen Trainingstagen. Ruhetage bleiben unmarkiert. Heute wird erst ab morgen als verpasst gezählt.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
