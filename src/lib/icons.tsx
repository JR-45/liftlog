import type { ReactNode } from 'react'

type IconProps = {
  className?: string
}

export function FoodIcon({ className }: IconProps) {
  return <SvgIcon className={className}>
    <path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M20 21V3c-4 2-5 7-5 10h5" />
  </SvgIcon>
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

export function TrashIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
    </SvgIcon>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M12 5v14M5 12h14" />
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

export function PlanIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M4 4h16v17H4zM8 2v4M16 2v4M8 11h8M8 16h8" />
    </SvgIcon>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </SvgIcon>
  )
}

export function CameraIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </SvgIcon>
  )
}

/** Gefüllte Flamme für die Streak, damit sie auch klein kräftig wirkt. */
export function FlameIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 1.5c.3 2.9-.9 4.6-2.4 6.3-.6-1-1.5-1.8-2.6-2.3.2 2.2-.8 3.6-1.9 5.1C5.4 12.3 4.5 13.9 4.5 16c0 3.9 3.4 6.5 7.5 6.5s7.5-2.6 7.5-6.6c0-3.4-1.8-5.6-3.4-7.6-1.3-1.7-2.5-3.3-2.6-6.8Zm-1.4 18.7c-1.9 0-3.3-1.2-3.3-2.9 0-1.4.8-2.3 1.7-3.3.4.8 1 1.3 1.8 1.6-.1-1.6.5-2.8 1.4-3.9.6 1.5 2 2.9 2 4.9 0 2.1-1.6 3.6-3.6 3.6Z" />
    </svg>
  )
}

export function SnowflakeIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M12 2v20M4.9 7l14.2 10M4.9 17 19.1 7M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" />
    </SvgIcon>
  )
}

export function StopwatchIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="14" r="8" />
      <path d="M12 10v4l2.5 2M10 2h4M12 2v4M19 6l1.5-1.5" />
    </SvgIcon>
  )
}
