/** Behandelt Platzhalter als Namenszeichen, damit die Suche nicht alle Konten auswählt. */
export function socialSearchPattern(input: string): string | null {
  const name = input.trim()
  if (name.length < 2 || name.length > 50) return null
  return `%${name.replace(/[\\%_]/g, '\\$&')}%`
}
