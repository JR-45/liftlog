/** Schriftzug „LIFTLOG“: LIFT weiß, LOG in der Akzentfarbe, kursiv in der Display-Schrift. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold uppercase italic leading-none tracking-wide text-white ${className}`}>
      Lift<span className="text-neon">Log</span>
    </span>
  )
}
