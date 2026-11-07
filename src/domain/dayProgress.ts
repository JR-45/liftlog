export type EntryState = { done: boolean; skipped: boolean }

/**
 * Fortschritt eines Trainingstags. Übersprungene Übungen zählen nicht mit, außer sie sind trotzdem geschafft.
 * Ein Tag, an dem alles übersprungen wurde, ist nicht geschafft.
 */
export function dayProgress(entries: EntryState[]): { done: number; total: number; finished: boolean } {
  const counted = entries.filter((entry) => entry.done || !entry.skipped)
  const done = counted.filter((entry) => entry.done).length
  return { done, total: counted.length, finished: counted.length > 0 && done === counted.length }
}
