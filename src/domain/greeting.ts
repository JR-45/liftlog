/** Begrüßung nach Tageszeit. Nachts bleibt es bei „Hallo“, weil „Gute Nacht“ ein Abschied ist. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Guten Morgen'
  if (hour >= 18 && hour < 23) return 'Guten Abend'
  return 'Hallo'
}

/** Erstes Wort des Anzeigenamens, z. B. „Onur“ aus „Onur Yahsi“. Leer ergibt null. */
export function firstName(displayName: string | null): string | null {
  const first = displayName?.trim().split(/\s+/)[0] ?? ''
  return first === '' ? null : first.slice(0, 24)
}

/**
 * Große, pushende Überschrift für die Trainingsseite: an Trainingstagen „LET'S GO, ONUR.“,
 * an Ruhetagen „ERHOLUNG, ONUR.“ Ohne Namen nur der Spruch.
 */
export function headline(isTrainingDay: boolean, displayName: string | null): string {
  const name = firstName(displayName)
  const phrase = isTrainingDay ? "Let's go" : 'Erholung'
  return name ? `${phrase}, ${name}.` : `${phrase}.`
}
