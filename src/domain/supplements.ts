// Supplemente: Menge mit Einheit und an welchen Wochentagen sie dran sind.

export const DOSE_UNITS = ['g', 'mg', 'µg', 'IE', 'Tabletten', 'Kapseln', 'ml'] as const
export type DoseUnit = (typeof DOSE_UNITS)[number]

/** Bei Stückzahlen heißt eins „Tablette“ bzw. „Kapsel“. */
const SINGULAR: Partial<Record<DoseUnit, string>> = { Tabletten: 'Tablette', Kapseln: 'Kapsel' }

/** Typische Einheit für die Vorschläge, damit man nur noch die Zahl tippt. */
export const QUICK_SUPPLEMENTS: { name: string; unit: DoseUnit }[] = [
  { name: 'Kreatin', unit: 'g' }, { name: 'Omega-3', unit: 'Kapseln' }, { name: 'Eisen', unit: 'mg' },
]

/** „5“ und „g“ werden zu „5 g“, „1“ und „Tabletten“ zu „1 Tablette“. Leer oder ungültig ergibt null. */
export function formatDose(amount: string, unit: DoseUnit): string | null {
  const value = Number(amount.trim().replace(',', '.'))
  if (!amount.trim() || !Number.isFinite(value) || value <= 0 || value > 100000) return null
  const number = String(Math.round(value * 100) / 100).replace('.', ',')
  return `${number} ${value === 1 ? SINGULAR[unit] ?? unit : unit}`
}

/** Gespeicherte Menge zurück in Zahl und Einheit. Freitext von früher bleibt als Zahl leer. */
export function parseDose(dose: string | null): { amount: string; unit: DoseUnit | null } {
  const match = dose?.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.+)$/)
  if (!match) return { amount: '', unit: null }
  const word = match[2].trim().toLowerCase()
  const unit = DOSE_UNITS.find((entry) => entry.toLowerCase() === word || SINGULAR[entry]?.toLowerCase() === word) ?? null
  return { amount: unit ? match[1] : '', unit }
}

/** Alle sieben Tage heißt täglich und wird als null gespeichert. 0 = Sonntag. */
export function normalizeWeekdays(weekdays: number[]): number[] | null {
  const days = [...new Set(weekdays)].filter((day) => day >= 0 && day <= 6).sort((a, b) => a - b)
  return days.length === 0 || days.length === 7 ? null : days
}

/** Ob ein Supplement an diesem Tag (YYYY-MM-DD) dran ist. */
export function supplementDue(weekdays: number[] | null, date: string): boolean {
  return weekdays === null || weekdays.includes(new Date(`${date}T12:00:00`).getDay())
}

const SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

/** Kurz für die Liste: null bei täglich, sonst z. B. „Mo“ oder „Mo, Do“ (Woche ab Montag). */
export function scheduleLabel(weekdays: number[] | null): string | null {
  if (weekdays === null) return null
  return [...weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((day) => SHORT[day]).join(', ')
}
