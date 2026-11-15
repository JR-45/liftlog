import { useEffect, useState } from 'react'
import type { ExerciseGuide } from '../../domain/exerciseGuides'
import { PauseIcon, PlayIcon } from '../../lib/icons'

export function ExerciseGuideView({ guide }: { guide: ExerciseGuide }) {
  const [currentFrame, setCurrentFrame] = useState<0 | 1>(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setCurrentFrame((current) => (current === 0 ? 1 : 0))
    }, 1200)
    return () => clearInterval(interval)
  }, [isPlaying])

  return (
    <div className="mb-3.5 space-y-3 rounded-2xl bg-surface-inset p-3.5 ring-1 ring-line/[0.06]">
      {/* 2-Phasen-Looping-Animation */}
      <div className="relative mx-auto flex aspect-square max-h-64 w-full max-w-[280px] flex-col items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
        {guide.frames.map((src, index) => (
          <img
            key={src}
            src={src}
            alt={`${guide.name} Phase ${index + 1}`}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-contain p-2 transition-opacity duration-300 ${
              currentFrame === index ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          />
        ))}

        {/* Steuerung & Phasen-Anzeige unten */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg bg-black/75 px-2.5 py-1.5 text-xs text-white backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-white transition-colors hover:bg-white/30"
              aria-label={isPlaying ? 'Pause' : 'Abspielen'}
              onClick={() => setIsPlaying((current) => !current)}
            >
              {isPlaying ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
            </button>
            <span className="font-medium tracking-tight">
              {currentFrame === 0 ? '1. Dehnung / Start' : '2. Kontraktion / Ende'}
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false)
                setCurrentFrame(0)
              }}
              className={`rounded px-1.5 py-0.5 font-bold transition-colors ${
                currentFrame === 0 ? 'bg-neon text-black' : 'text-white/70 hover:text-white'
              }`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false)
                setCurrentFrame(1)
              }}
              className={`rounded px-1.5 py-0.5 font-bold transition-colors ${
                currentFrame === 1 ? 'bg-neon text-black' : 'text-white/70 hover:text-white'
              }`}
            >
              B
            </button>
          </div>
        </div>
      </div>

      {/* Zielmuskeln */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Zielmuskeln</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {guide.primaryMuscles.map((muscle) => (
            <span
              key={muscle}
              className="rounded-lg bg-neon/15 px-2.5 py-1 text-xs font-semibold text-accent-ink ring-1 ring-neon/25"
            >
              {muscle}
            </span>
          ))}
          {guide.secondaryMuscles.map((muscle) => (
            <span
              key={muscle}
              className="rounded-lg bg-control px-2 py-0.5 text-xs font-medium text-foreground/80"
            >
              {muscle}
            </span>
          ))}
        </div>
      </div>

      {/* Tipps zur Ausführung */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Ausführung</p>
        <ul className="mt-1.5 space-y-1 text-xs text-muted">
          {guide.tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="shrink-0 font-display font-bold text-accent-ink">{index + 1}.</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
