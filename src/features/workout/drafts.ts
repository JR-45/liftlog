import type { SetDraft } from '../../domain/sets'

// Noch nicht gespeicherte Eingaben überstehen so einen Netzausfall oder das Schließen der App.
// Der Speicher kann blockiert sein, z. B. im privaten Modus. Die App läuft dann ohne Entwürfe weiter.
const PREFIX = 'liftlog:draft:'

function draftKey(userId: string, date: string, exerciseId: string, setNumber: number): string {
  return `${PREFIX}${userId}:${date}:${exerciseId}:${setNumber}`
}

export function readDraft(userId: string, date: string, exerciseId: string, setNumber: number): SetDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, date, exerciseId, setNumber))
    return raw ? (JSON.parse(raw) as SetDraft) : null
  } catch {
    return null
  }
}

export function writeDraft(userId: string, date: string, exerciseId: string, setNumber: number, draft: SetDraft): void {
  try {
    localStorage.setItem(draftKey(userId, date, exerciseId, setNumber), JSON.stringify(draft))
  } catch {
    // Ohne Speicher bleibt die Eingabe nur bis zum Schließen der App erhalten.
  }
}

export function removeDraft(userId: string, date: string, exerciseId: string, setNumber: number): void {
  try {
    localStorage.removeItem(draftKey(userId, date, exerciseId, setNumber))
  } catch {
    // Nichts zu tun.
  }
}

/** Entfernt alle Entwürfe, außer denen des angegebenen Users und Tages. */
export function clearDrafts(keep?: { userId: string; date: string }): void {
  try {
    const keepPrefix = keep ? `${PREFIX}${keep.userId}:${keep.date}:` : null
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX) && !(keepPrefix && key.startsWith(keepPrefix))) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // Nichts zu tun.
  }
}
