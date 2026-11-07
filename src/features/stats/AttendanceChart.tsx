import { useEffect, useId, useState } from 'react'

export function AttendanceChart({ trained, missed }: { trained: number; missed: number }) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  const total = trained + missed
  const percentage = total === 0 ? 0 : Math.round(trained / total * 100)
  const share = total === 0 ? 0 : trained / total
  const annotations = [
    { count: trained, label: 'Absolviert', color: 'var(--color-success)', angle: -Math.PI / 2 + share * Math.PI },
    { count: missed, label: 'Verpasst', color: 'var(--color-danger)', angle: -Math.PI / 2 + (1 + share) * Math.PI },
  ]

  useEffect(() => {
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setVisible(true))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [])

  return (
    <figure className="attendance-infographic mt-3 rounded-2xl border border-line/[0.08] bg-surface p-4">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">Trainingsbilanz</span>
        <span className="rounded-full border border-line/[0.08] bg-control/40 px-2.5 py-1 text-[11px] font-medium text-muted">Monatsübersicht</span>
      </figcaption>
      <div className="mx-auto mt-2 w-full max-w-sm" role="img"
        aria-label={total === 0 ? 'Noch keine abgeschlossenen Trainingstage in diesem Monat.' : `${trained} Trainings absolviert, ${missed} verpasst. ${percentage} Prozent absolviert.`}>
        <svg viewBox="0 0 320 260" className="w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-green`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="var(--color-success)" />
              <stop offset="1" stopColor="var(--color-success-fill)" />
            </linearGradient>
            <linearGradient id={`${id}-red`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="var(--color-danger)" />
              <stop offset="1" stopColor="var(--color-danger-fill)" />
            </linearGradient>
            <radialGradient id={`${id}-center`}>
              <stop stopColor="var(--color-surface)" />
              <stop offset="1" stopColor="var(--color-surface-inset)" />
            </radialGradient>
          </defs>
          <circle cx="160" cy="130" r="87" fill="none" stroke="var(--color-line)" strokeOpacity=".12"
            strokeDasharray="1 6" strokeLinecap="round" />
          <circle cx="160" cy="133" r="64" fill="none" stroke="var(--color-line)" strokeOpacity=".06" strokeWidth="33" />
          <circle cx="160" cy="130" r="46" fill={`url(#${id}-center)`} stroke="var(--color-line)" strokeOpacity=".05" />
          <g transform="rotate(-90 160 130)">
            <circle cx="160" cy="130" r="64" fill="none" stroke="var(--color-control)" strokeWidth="32" />
            <circle cx="160" cy="130" r="64" fill="none" stroke={`url(#${id}-red)`} strokeWidth="32"
              pathLength="100" strokeDasharray={`${visible && total > 0 ? missed / total * 100 : 0} 100`}
              strokeDashoffset={-share * 100}
              className="attendance-segment attendance-interactive-segment" />
            <circle cx="160" cy="130" r="64" fill="none" stroke={`url(#${id}-green)`} strokeWidth="32"
              pathLength="100" strokeDasharray={`${visible && total > 0 ? share * 100 : 0} 100`}
              className="attendance-segment attendance-interactive-segment" />
          </g>
          <g pointerEvents="none" textAnchor="middle" fill="var(--color-foreground)">
            <text x="160" y="110" fontSize="8" letterSpacing="1.5" fill="var(--color-muted)">DEINE QUOTE</text>
            <text x="160" y="137" fontSize="29" fontWeight="700" letterSpacing="-1">{total === 0 ? '–' : `${percentage} %`}</text>
            <text x="160" y="155" fontSize="10" fill="var(--color-muted)">{total === 0 ? 'Keine Trainings' : 'absolviert'}</text>
          </g>
          {total > 0 && annotations.filter(item => item.count > 0).map(item => {
            const x = 160 + Math.cos(item.angle) * 82
            const y = 130 + Math.sin(item.angle) * 82
            const right = x >= 160
            const end = right ? 302 : 18
            return <g key={item.label} pointerEvents="none">
              <path d={`M ${x} ${y} L ${right ? 270 : 50} ${y} H ${end}`}
                fill="none" stroke={item.color} strokeWidth="1" strokeOpacity=".6" />
              <circle cx={x} cy={y} r="5" fill={item.color} fillOpacity=".12" />
              <circle cx={x} cy={y} r="2.5" fill={item.color} />
              <text x={end} y={y - 9} textAnchor={right ? 'end' : 'start'} fill={item.color} fontSize="20" fontWeight="700">{item.count}</text>
              <text x={end} y={y + 16} textAnchor={right ? 'end' : 'start'} fill="var(--color-muted)" fontSize="11">{item.label}</text>
            </g>
          })}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <p className="rounded-xl border border-success/15 bg-success/5 py-3 text-xs font-medium text-muted"><strong className="mb-1 block text-2xl tabular-nums text-success">{trained}</strong>Absolviert</p>
        <p className="rounded-xl border border-danger/15 bg-danger/5 py-3 text-xs font-medium text-muted"><strong className="mb-1 block text-2xl tabular-nums text-danger">{missed}</strong>Verpasst</p>
      </div>
      <p className="mt-3 text-center text-xs text-muted">{total === 0 ? 'Für diesen Monat liegen noch keine abgeschlossenen Trainingstage vor.' : 'Bilanz für den ausgewählten Monat.'}</p>
    </figure>
  )
}
