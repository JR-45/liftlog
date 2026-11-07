/** Schriftzug „LIFTLOG“: LIFT weiß, LOG in der Akzentfarbe, kursiv in der Display-Schrift. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold uppercase italic leading-none tracking-wide text-foreground ${className}`}>
      Lift<span className="text-accent-ink">Log</span>
    </span>
  )
}
