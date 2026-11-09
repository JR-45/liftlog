export type AppleHealthDay = {
  date: string
  activeKcal: number
  workoutMinutes: number
  steps: number
  updatedAt: string | null
}

function parseBoundedInt(raw: string | null | undefined, max: number): number | null {
  if (raw === null || raw === undefined || raw.trim() === '') return 0
  const cleaned = raw.trim().replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null
  const rounded = Math.round(Number(cleaned))
  return Number.isFinite(rounded) && rounded >= 0 && rounded <= max ? rounded : null
}

/** Prüft manuell eingetragene oder korrigierte Apple-Watch-Tageswerte. */
export function parseAppleHealthInput(
  input: { activeKcal: string; workoutMinutes: string; steps: string },
  date: string,
): Omit<AppleHealthDay, 'updatedAt'> | null {
  const activeKcal = parseBoundedInt(input.activeKcal, 10_000)
  const workoutMinutes = parseBoundedInt(input.workoutMinutes, 1440)
  const steps = parseBoundedInt(input.steps, 200_000)
  if (activeKcal === null || workoutMinutes === null || steps === null) return null
  if (activeKcal === 0 && workoutMinutes === 0 && steps === 0) return null
  return { date, activeKcal, workoutMinutes, steps }
}

// iOS benennt den Kurzbefehl nach der Datei.
export const SHORTCUT_NAME = 'LiftLog-Apple-Watch'
/** Signierte Kurzbefehl-Datei, erzeugt mit scripts/build-apple-health-shortcut.py. */
// Lokal (bun run dev) eine Testversion, die an die lokale Supabase schickt (nicht eingecheckt, siehe .gitignore).
export const SHORTCUT_FILE_PATH = import.meta.env.DEV ? '/dev/LiftLog-Apple-Watch.shortcut' : '/LiftLog-Apple-Watch.shortcut'

/** Startet den bereits installierten LiftLog-Kurzbefehl direkt auf dem iPhone. */
export function shortcutRunUrl(name = SHORTCUT_NAME): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(name)}`
}

/** Öffnet die Kurzbefehle-App bei den Automationen, um den täglichen Abgleich einzurichten. */
export const SHORTCUTS_AUTOMATION_URL = 'shortcuts://automation'
