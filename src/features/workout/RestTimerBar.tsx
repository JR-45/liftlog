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

  return (
    <div
      className={`transition-colors ${
        variant === 'bar' ? 'border-t' : 'overflow-hidden rounded-2xl border'
      } ${
        overtime
          ? 'border-[#FFD60A] bg-[#FFD60A] text-black'
          : 'apple-glass border-white/[0.08] text-white'
      }`}
    >
      {left !== null && !overtime && endsAt !== null && (
        <div className="h-1 bg-[#2C2C2E]">
          <div
            className="h-full bg-[#FFD60A] transition-[width] duration-200 ease-linear"
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
            <span className="text-sm font-medium text-[#8E8E93]">Pause</span>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-[#2C2C2E] p-0.5" role="group" aria-label="Pausenlänge">
                {OPTIONS.map((seconds) => (
                  <button
                    key={seconds}
                    className={`h-11 min-w-11 rounded-[10px] px-3 text-sm tabular-nums transition-all ${
                      duration === seconds
                        ? 'bg-[#3A3A3C] font-semibold text-white shadow-sm'
                        : 'text-[#8E8E93]'
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
                className={`${iconButtonClass} bg-[#FFD60A] text-black shadow-sm`}
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
              <span className="text-2xl font-bold tracking-tight tabular-nums">
                {overtime ? `+${formatClock(left)}` : formatClock(left)}
              </span>
              <span className={`text-sm font-medium ${overtime ? 'text-black/75' : 'text-[#8E8E93]'}`}>
                {overtime ? 'Pause vorbei, weiter!' : 'Pause'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {!overtime && (
                <button
                  className={`${iconButtonClass} bg-[#2C2C2E] tabular-nums text-white`}
                  type="button"
                  aria-label="15 Sekunden mehr"
                  onClick={() => addSeconds(15)}
                >
                  +15
                </button>
              )}
              <button
                className={`${iconButtonClass} ${overtime ? 'bg-black/15 text-black' : 'bg-[#2C2C2E] text-white'}`}
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
