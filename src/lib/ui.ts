// Gemeinsame Stile, damit alle Bereiche gleich aussehen. Neue Stellen nutzen diese statt eigener Varianten.
// Regeln und Beispiele: Skill `liftlog-design` (.agents/skills/liftlog-design/SKILL.md).

/** Karte für einen Bereich (Ziele, Supplemente, Körperdaten …). */
export const CARD = 'rounded-2xl border border-line/[0.08] bg-surface p-4'

/** Titel einer Karte oder eines Bereichs. Schrift und Großbuchstaben kommen aus index.css. */
export const SECTION_TITLE = 'text-xl'

/** Hauptaktion, höchstens eine pro Karte. Text auf Neon ist immer schwarz. */
export const PRIMARY_BUTTON = 'min-h-11 rounded-xl bg-neon px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50'

/** Nebenaktion. */
export const SECONDARY_BUTTON = 'min-h-11 rounded-xl border border-line/15 bg-control px-4 py-2.5 text-sm font-medium transition-colors hover:bg-control-hover disabled:opacity-50'

/** Eingabefeld, volle Breite. In Flex-Zeilen ohne w-full verwenden, sonst schiebt es Knöpfe aus dem Bild. */
export const INPUT = 'h-11 w-full rounded-xl border border-line/15 bg-control px-3 text-base text-foreground outline-none focus:border-neon disabled:opacity-50'

/** Eckiger Vor/Zurück-Knopf mit Pfeil-Symbol (Monat, Woche, Tag). */
export const NAV_BUTTON = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-control text-foreground transition-transform active:scale-95 disabled:opacity-25'

/** Textlink ohne Unterstrich, in Akzentfarbe. */
export const LINK = 'min-h-11 text-sm font-medium text-accent-ink disabled:opacity-50'
