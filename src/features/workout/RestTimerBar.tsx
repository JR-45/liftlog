import { formatClock, restFraction, restSecondsLeft } from '../../domain/timer'
import { CloseIcon } from '../../lib/icons'
import type { RestTimer } from './useRestTimer'

const OPTIONS = [60, 90]
const iconButtonClass =
  'inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-3.5 text-sm font-semibold transition-transform active:scale-95'

/** bar: Leiste unten auf Handy und Tablet. panel: Kasten in der Seitenleiste am Laptop. */
export function RestTimerBar({ timer, variant }: { timer: RestTimer; variant: 'bar' | 'panel' }) {
  const { duration, endsAt, totalMs, now, start, stop, addSeconds, chooseDuration } = timer
  const left = endsAt === null ? null : restSecondsLeft(endsAt, now)
  const overtime = left !== null && left <= 0
  const quickOptions = duration === 120 || duration === 180 ? [60, 90, duration] : OPTIONS

  return (
    <div
      className={`transition-colors ${
        variant === 'bar' ? 'border-t' : 'overflow-hidden rounded-2xl border'
      } ${
        overtime
          ? 'border-neon bg-neon text-black'
          : 'apple-glass border-line/[0.08] text-foreground'
      }`}
    >
      {left !== null && !overtime && endsAt !== null && (
        <div className="h-1 bg-control">
          <div
            className="h-full bg-neon transition-[width] duration-200 ease-linear"
            style={{ width: `${restFraction(endsAt, totalMs, now) * 100}%` }}
          />
        </div>
      )}

      <div
        className={
          variant === 'bar'
            ? 'mx-auto flex max-w-md items-center justify-between gap-2 px-4 py-2 md:max-w-2xl'
            : 'flex flex-wrap items-center justify-between gap-2 p-3'
        }
      >
        {left === null ? (
          <>
            <span className="text-sm font-medium text-muted">Pause</span>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-control p-0.5" role="group" aria-label="Pausenlänge">
                {quickOptions.map((seconds) => (
                  <button
                    key={seconds}
                    className={`h-11 min-w-11 rounded-[10px] px-3 text-sm tabular-nums transition-all ${
                      duration === seconds
                        ? 'bg-control-hover font-semibold text-foreground shadow-sm'
                        : 'text-muted'
                    }`}
                    type="button"
                    aria-pressed={duration === seconds}
                    onClick={() => chooseDuration(seconds)}
                  >
                    {seconds} s
                  </button>
                ))}
              </div>
              <button
                className={`${iconButtonClass} bg-neon text-black shadow-sm`}
                type="button"
                onClick={() => start()}
              >
                Start
              </button>
            </div>
          </>
        ) : (
          <>
            <div role="timer" aria-label="Pausentimer" className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-bold tracking-tight tabular-nums">
                {overtime ? `+${formatClock(left)}` : formatClock(left)}
              </span>
              <span className={`text-sm font-medium ${overtime ? 'text-black/75' : 'text-muted'}`}>
                {overtime ? 'Pause vorbei, weiter!' : 'Pause'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {!overtime && (
                <button
                  className={`${iconButtonClass} bg-control tabular-nums text-foreground`}
                  type="button"
                  aria-label="15 Sekunden mehr"
                  onClick={() => addSeconds(15)}
                >
                  +15
                </button>
              )}
              <button
                className={`${iconButtonClass} ${overtime ? 'bg-black/15 text-black' : 'bg-control text-foreground'}`}
                type="button"
                aria-label="Pause beenden"
                onClick={stop}
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
