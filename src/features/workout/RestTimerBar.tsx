import { formatClock, restFraction, restSecondsLeft } from '../../domain/timer'
import type { RestTimer } from './useRestTimer'

const OPTIONS = [60, 90]
const iconButtonClass = 'h-11 min-w-11 rounded-lg px-3 text-sm font-medium'

/** bar: Leiste unten auf Handy und Tablet. panel: Kasten in der Seitenleiste am Laptop. */
export function RestTimerBar({ timer, variant }: { timer: RestTimer; variant: 'bar' | 'panel' }) {
  const { duration, endsAt, totalMs, now, start, stop, addSeconds, chooseDuration } = timer
  const left = endsAt === null ? null : restSecondsLeft(endsAt, now)
  const overtime = left !== null && left <= 0

  return (
    <div
      className={`transition-colors ${variant === 'bar' ? 'border-t' : 'overflow-hidden rounded-xl border'} ${
        overtime ? 'border-yellow-300 bg-yellow-400 text-neutral-950' : 'border-neutral-800 bg-neutral-950 text-neutral-100'
      }`}
    >
      {left !== null && !overtime && endsAt !== null && (
        <div className="h-1 bg-neutral-800">
          <div
            className="h-full bg-yellow-400 transition-[width] duration-200 ease-linear"
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
            <span className="text-sm text-neutral-400">Pause</span>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-neutral-800 p-0.5" role="group" aria-label="Pausenlänge">
                {OPTIONS.map((seconds) => (
                  <button
                    key={seconds}
                    className={`h-10 rounded-md px-3 text-sm tabular-nums ${
                      duration === seconds ? 'bg-neutral-600 font-medium text-neutral-100' : 'text-neutral-400'
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
                className={`${iconButtonClass} bg-yellow-400 font-semibold text-neutral-950`}
                type="button"
                onClick={() => start()}
              >
                Start
              </button>
            </div>
          </>
        ) : (
          <>
            <div role="timer" aria-label="Pausentimer" className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">
                {overtime ? `+${formatClock(left)}` : formatClock(left)}
              </span>
              <span className={`text-sm ${overtime ? 'text-neutral-800' : 'text-neutral-400'}`}>
                {overtime ? 'Pause vorbei, weiter!' : 'Pause'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {!overtime && (
                <button
                  className={`${iconButtonClass} bg-neutral-800 tabular-nums text-neutral-100`}
                  type="button"
                  aria-label="15 Sekunden mehr"
                  onClick={() => addSeconds(15)}
                >
                  +15
                </button>
              )}
              <button
                className={`${iconButtonClass} ${overtime ? 'bg-neutral-950/10' : 'bg-neutral-800 text-neutral-100'}`}
                type="button"
                aria-label="Pause beenden"
                onClick={stop}
              >
                ✕
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
