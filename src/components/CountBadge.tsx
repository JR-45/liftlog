/** Rote Zahl oben rechts an einem Symbol, z. B. offene Folgeanfragen. Bei 0 nichts. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return <span aria-hidden="true"
    className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-fill px-1 text-[11px] font-bold leading-none tabular-nums text-white ring-2 ring-surface">
    {count > 9 ? '9+' : count}
  </span>
}
