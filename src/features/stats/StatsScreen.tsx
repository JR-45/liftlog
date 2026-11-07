import { useEffect, useMemo, useState } from 'react'
import { buildMonth, type CalendarDay, type DayMarkKind, type DayStatus, monthIndex } from '../../domain/calendar'
import type { ExportRow } from '../../domain/export'
import { buildDayHistory } from '../../domain/progress'
import { localDateString } from '../../domain/sets'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../../lib/icons'
import { loadScheduledDays, loadTrainedDates, type PlanDay } from '../workout/api'
import { deleteDayMark, loadDayMarks, loadExportRows, saveDayMark } from './api'
import { ExerciseProgressCard } from './ExerciseProgressCard'
import { AttendanceChart } from './AttendanceChart'

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTH_FORMAT = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const DAY_FORMAT = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' })

const STATUS_LABEL: Record<DayStatus, string> = {
  trained: 'trainiert',
  missed: 'nicht trainiert',
  marked: 'markiert',
  rest: 'Ruhetag',
  today: 'heute',
  future: 'noch offen',
  before_start: 'vor dem Start',
}

const MARKS: { kind: DayMarkKind; label: string; short: string }[] = [
  { kind: 'sick', label: 'Krank', short: 'K' },
  { kind: 'vacation', label: 'Urlaub', short: 'U' },
  { kind: 'moved', label: 'Verschoben', short: '→' },
]

type Props = { today: string; startDate: string; planDays: PlanDay[] }

function DayCell({
  cell,
  selected,
  onSelect,
}: {
  cell: CalendarDay
  selected: boolean
  onSelect: (date: string) => void
}) {
  const mark = MARKS.find((item) => item.kind === cell.mark)
  const label = `${DAY_FORMAT.format(new Date(`${cell.date}T12:00:00`))}: ${mark?.label ?? STATUS_LABEL[cell.status]}`
  const style: Record<DayStatus, string> = {
    trained: selected
      ? 'bg-accent font-bold text-black ring-2 ring-line shadow-sm'
      : 'bg-success-fill font-semibold text-black shadow-sm shadow-[#30D158]/20',
    missed: 'bg-danger/15 text-danger',
    marked: 'bg-control-hover font-medium text-foreground',
    rest: 'text-muted',
    today: 'ring-2 ring-accent font-semibold text-foreground',
    future: 'text-muted/40',
    before_start: 'text-muted/25',
  }

  if (cell.status === 'trained') {
    return (
      <button
        type="button"
        aria-label={`${label}, Details anzeigen`}
        aria-pressed={selected}
        onClick={() => onSelect(cell.date)}
        className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm tabular-nums transition-transform active:scale-95 ${style[cell.status]}`}
      >
        <span className="leading-none">{cell.day}</span>
        <CheckIcon className="mt-0.5 h-3.5 w-3.5 stroke-[2.5]" />
      </button>
    )
  }

  const content = (
    <>
      <span className="leading-none">{cell.day}</span>
      {cell.status === 'missed' && <CloseIcon className="mt-0.5 h-3.5 w-3.5" />}
      {mark && (
        <span className="mt-0.5 text-xs leading-none" aria-hidden="true">
          {mark.short}
        </span>
      )}
    </>
  )

  if (cell.canMark) {
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        onClick={() => onSelect(cell.date)}
        className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm tabular-nums transition-transform active:scale-95 ${style[cell.status]} ${
          selected ? 'ring-2 ring-line' : ''
        }`}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm tabular-nums ${style[cell.status]}`}
    >
      {content}
    </div>
  )
}

export function StatsScreen({ today, startDate, planDays }: Props) {
  const currentIndex = monthIndex(today)
  const firstIndex = Math.min(monthIndex(startDate), currentIndex)
  const [shownIndex, setShownIndex] = useState(currentIndex)
  const [loaded, setLoaded] = useState<{ index: number; dates: Set<string>; marks: Map<string, DayMarkKind>; planned: Map<string, boolean> } | null>(
    null,
  )
  const [failedIndex, setFailedIndex] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [historyRows, setHistoryRows] = useState<ExportRow[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [markBusy, setMarkBusy] = useState(false)
  const [markError, setMarkError] = useState<string | null>(null)

  const year = Math.floor(shownIndex / 12)
  const month = shownIndex % 12

  useEffect(() => {
    let cancelled = false
    loadExportRows()
      .then((rows) => {
        if (!cancelled) setHistoryRows(rows)
      })
      .catch(() => {
        // Fortschritts-Diagramm bleibt leer, falls das Laden fehlschlägt.
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  useEffect(() => {
    let cancelled = false
    const from = localDateString(new Date(year, month, 1))
    const to = localDateString(new Date(year, month + 1, 0))
    Promise.all([loadTrainedDates(from, to), loadDayMarks(from, to), loadScheduledDays(from, to)])
      .then(([dates, marks, scheduled]) => {
        if (cancelled) return
        setLoaded({ index: shownIndex, dates, marks, planned: new Map(scheduled.map((day) => [day.day_date, day.plan_day_id !== null])) })
        setFailedIndex(null)
      })
      .catch(() => {
        if (!cancelled) setFailedIndex(shownIndex)
      })
    return () => {
      cancelled = true
    }
  }, [shownIndex, year, month, attempt])

  const current = loaded?.index === shownIndex ? loaded : null
  const calendar = useMemo(() => {
    if (!current) return null
    return buildMonth({
      year,
      month,
      today,
      startDate,
      trainedDates: current.dates,
      marks: current.marks,
      plannedWeekdays: new Set(planDays.map((day) => day.weekday)),
      plannedDates: current.planned,
    })
  }, [current, year, month, today, startDate, planDays])

  const selectedCell = calendar?.weeks.flat().find((cell) => cell?.date === selectedDate) ?? null

  function changeMonth(step: 1 | -1) {
    setSelectedDate(null)
    setMarkError(null)
    setShownIndex((index) => index + step)
  }

  /** Speichert zuerst und ändert die Anzeige nur bei Erfolg. null entfernt die Markierung. */
  async function applyMark(date: string, kind: DayMarkKind | null) {
    setMarkBusy(true)
    setMarkError(null)
    try {
      if (kind) await saveDayMark(date, kind)
      else await deleteDayMark(date)
      setLoaded((state) => {
        if (!state) return state
        const marks = new Map(state.marks)
        if (kind) marks.set(date, kind)
        else marks.delete(date)
        return { ...state, marks }
      })
      setSelectedDate(null)
    } catch {
      setMarkError('Das hat nicht geklappt. Versuch es noch einmal.')
    } finally {
      setMarkBusy(false)
    }
  }

  return (
    <section className="mt-5">
      <h2 className="text-xl font-bold tracking-tight text-foreground">Trainingstage</h2>

      {/* Ab Tablet stehen Kalender und Zahlen nebeneinander, damit die Tage nicht riesig werden. */}
      <div className="mt-3 md:grid md:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] md:items-start md:gap-4">
        <div className="rounded-2xl border border-line/[0.08] bg-surface p-3.5">
          <div className="flex items-center justify-between">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-control text-foreground transition-transform active:scale-95 disabled:opacity-25"
              type="button"
              aria-label="Vorheriger Monat"
              disabled={shownIndex <= firstIndex}
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="font-semibold tracking-tight text-foreground">{MONTH_FORMAT.format(new Date(year, month, 1))}</span>
            <button
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-control text-foreground transition-transform active:scale-95 disabled:opacity-25"
              type="button"
              aria-label="Nächster Monat"
              disabled={shownIndex >= currentIndex}
              onClick={() => changeMonth(1)}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {failedIndex === shownIndex ? (
            <div className="py-10 text-center">
              <p role="alert" className="text-sm text-danger">Der Kalender konnte nicht geladen werden.</p>
              <button
                className="mt-2 min-h-11 py-2 text-sm font-medium text-accent-ink"
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
            <p className="py-16 text-center text-sm text-muted">Kalender wird geladen …</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted" aria-hidden="true">
                {WEEKDAY_HEADERS.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                {calendar.weeks.flat().map((cell, index) =>
                  cell ? (
                    <DayCell
                      key={cell.date}
                      cell={cell}
                      selected={selectedDate === cell.date}
                      onSelect={(date) => {
                        setMarkError(null)
                        setSelectedDate((current) => (current === date ? null : date))
                      }}
                    />
                  ) : (
                    <span key={`blank-${index}`} />
                  ),
                )}
              </div>

              {selectedCell?.canMark && (
                <div className="mt-3 rounded-xl bg-control p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {DAY_FORMAT.format(new Date(`${selectedCell.date}T12:00:00`))} markieren
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Markierung wählen">
                    {MARKS.map((mark) => (
                      <button
                        key={mark.kind}
                        className={`min-h-11 rounded-xl px-1 text-sm font-medium transition-transform active:scale-95 disabled:opacity-50 ${
                          selectedCell.mark === mark.kind
                            ? 'bg-accent font-semibold text-black'
                            : 'bg-control-hover text-foreground'
                        }`}
                        type="button"
                        aria-pressed={selectedCell.mark === mark.kind}
                        disabled={markBusy}
                        onClick={() => void applyMark(selectedCell.date, mark.kind)}
                      >
                        {mark.label}
                      </button>
                    ))}
                  </div>
                  {selectedCell.mark && (
                    <button
                      className="mt-2 min-h-11 w-full text-sm font-medium text-accent-ink disabled:opacity-50"
                      type="button"
                      disabled={markBusy}
                      onClick={() => void applyMark(selectedCell.date, null)}
                    >
                      Markierung entfernen
                    </button>
                  )}
                  {markError && <p role="alert" className="mt-2 text-sm text-danger">{markError}</p>}
                </div>
              )}
            </>
          )}
        </div>

        {calendar && (
          <div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 md:mt-0 md:grid-cols-1 lg:grid-cols-2">
              <div className="rounded-2xl border border-line/[0.08] bg-surface p-3.5">
                <p className="text-2xl font-bold tabular-nums text-success" data-testid="trained-count">
                  {calendar.trained}
                </p>
                <p className="text-sm font-medium text-muted">
                  {calendar.trained === 1 ? 'Training' : 'Trainings'}
                </p>
              </div>
              <div className="rounded-2xl border border-line/[0.08] bg-surface p-3.5">
                <p className="text-2xl font-bold tabular-nums text-danger" data-testid="missed-count">
                  {calendar.missed}
                </p>
                <p className="text-sm font-medium text-muted">
                  {calendar.missed === 1 ? 'Tag verpasst' : 'Tage verpasst'}
                </p>
              </div>
            </div>
            <AttendanceChart key={shownIndex} trained={calendar.trained} missed={calendar.missed} />
            {calendar.marked > 0 && (
              <p className="mt-3 text-sm font-medium text-muted" data-testid="marked-count">
                {calendar.marked === 1 ? '1 Tag markiert' : `${calendar.marked} Tage markiert`}
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Tippe auf einen grünen Trainingstag im Kalender, um deine Sätze von diesem Tag zu sehen. Einen offenen
              Trainingstag kannst du antippen und als krank, Urlaub oder verschoben markieren.{' '}
              <CloseIcon className="mr-0.5 inline h-3.5 w-3.5 align-[-2px] text-danger" /> zählt nur an deinen
              Trainingstagen, heute erst ab morgen.
            </p>

            {selectedDate && (() => {
              const dayHistory = buildDayHistory(historyRows, selectedDate)
              if (!dayHistory) return null
              return (
                <div className="mt-3 rounded-2xl border border-line/[0.08] bg-surface p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent-ink">
                        {DAY_FORMAT.format(new Date(`${dayHistory.date}T12:00:00`))}
                      </p>
                      {dayHistory.planDay && (
                        <h3 className="text-sm font-bold text-foreground">{dayHistory.planDay}</h3>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Tagesdetails schließen"
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-control text-muted"
                      onClick={() => setSelectedDate(null)}
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <ul className="mt-2.5 divide-y divide-line/[0.06]">
                    {dayHistory.exercises.map((item) => (
                      <li key={item.name} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                        <span className="truncate font-medium text-foreground">{item.name}</span>
                        <span className="shrink-0 tabular-nums text-muted">{item.summary}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <ExerciseProgressCard rows={historyRows} />
    </section>
  )
}
