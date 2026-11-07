import type { ReactNode } from 'react'

type IconProps = {
  className?: string
}

function SvgIcon({ className = 'h-5 w-5', children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M20 6 9 17l-5-5" />
    </SvgIcon>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </SvgIcon>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="m9 18 6-6-6-6" />
    </SvgIcon>
  )
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="m15 18-6-6 6-6" />
    </SvgIcon>
  )
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </SvgIcon>
  )
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </SvgIcon>
  )
}

export function TrainingIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
    </SvgIcon>
  )
}

export function StatsIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </SvgIcon>
  )
}
