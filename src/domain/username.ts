/** Namen werden unabhängig von Großschreibung eindeutig in der Datenbank gespeichert. */
export function normalizeUsername(value: string): string | null {
  const username = value.trim().toLowerCase()
  return /^[a-z0-9._]{3,40}$/.test(username) ? username : null
}
