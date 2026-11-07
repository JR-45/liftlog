# Spezifikation: Frei planbare Trainingswochen

## Ziel

Nutzer wählen eine Kalenderwoche und legen für jeden ihrer sieben Tage selbst fest, welche gespeicherte
Trainingseinheit stattfindet oder ob der Tag ein Ruhetag ist. Neue Wochen übernehmen zunächst den gespeicherten
Wochenplan als Vorlage. Änderungen betreffen nur die ausgewählte Woche.

## Verhalten

- Die Wochenansicht zeigt Montag bis Sonntag mit Datum und der gewählten Einheit bzw. „Ruhetag“.
- Vorherige Woche, nächste Woche, aktuelle Woche und eine Datumsauswahl erlauben die freie Wochenwahl.
- Jeder Tag kann jede eigene Trainingseinheit aus dem gespeicherten Plan verwenden, unabhängig von deren ursprünglichem
  Wochentag. Dieselbe Einheit darf innerhalb einer Woche mehrfach eingeplant werden.
- Nutzer können einen Tag ausdrücklich als Ruhetag markieren oder zunächst ungeplant lassen.
- Die sieben Zuordnungen werden mit „Woche speichern“ gemeinsam im Benutzerkonto gespeichert.
- Andere Wochen und die ursprüngliche Wochenvorlage bleiben unverändert.
- Nicht gespeicherte Wochenänderungen gehen beim Wochenwechsel nicht stillschweigend verloren: Der Wechsel wird
  zunächst gesperrt; Speichern und Verwerfen bleiben möglich.
- Die Wochenplanung bleibt im Bereich „Trainingsplan“. Der Bereich „Training“ behält die bisherige Tagesauswahl und
  protokolliert Sätze für den aktuellen Tag, mit drei Startsätzen und frei anpassbarer Satzanzahl.
- Bereits gespeicherte Sätze bleiben auch beim Umplanen oder Markieren eines Ruhetags erhalten. Die Wochenansicht weist
  auf vorhandene Trainingsdaten hin und ermöglicht den Zugriff darauf.
- Die Statistik berücksichtigt ausdrücklich geplante Ruhetage und ungeplante Tage. Diese gelten nicht als verpasst.
- Die Übungsseiten und die flexible Satzanzahl bleiben verfügbar.
- Unter „Wochenvorlage bearbeiten“ stehen sieben Tagesbuttons. Ein Klick öffnet das Popup zur Erstellung oder
  Bearbeitung der Einheit dieses Tages. Tage ohne Einheit sind Ruhetage. Einheiten lassen sich von anderen Tagen
  unabhängig kopieren. Übernehmen verändert zunächst den Entwurf; erst Speichern aktualisiert die Vorlage im Konto.

## Bestehende Technik und Struktur

React, TypeScript, Tailwind und Supabase bleiben bestehen; zusätzliche Pakete sind nicht vorgesehen.

- `src/domain/`: Datums-, Wochen- und Zuordnungslogik, einschließlich Kalenderstatistik.
- `src/features/workout/`: Wochenansicht und Training am gewählten Datum.
- `src/features/*/api.ts`: Lesen und Speichern der Wochenzuordnungen über Supabase.
- `supabase/migrations/`: zusätzliche Datenspeicherung für datierte Wochenzuordnungen.
- `supabase/tests/`: Prüfungen für Nutzertrennung, Validierung und gemeinsames Speichern.
- `src/lib/database.types.ts`: aus der lokalen Datenbank generierte Typen.

Bestehende Trainingspläne und Trainingsdaten bleiben kompatibel. Wochenzuordnungen ergänzen die gespeicherte Vorlage;
sie ersetzen weder die Vorlage noch die bisherigen Sätze. UI-Texte und Kommentare bleiben deutsch.

Beispiel für den Datenvertrag:

```ts
type ScheduledDay = {
  date: string
  planDayId: string | null
  isRestDay: boolean
}
```

## Grenzen

- Wochenzuordnungen sind ausschließlich für ihren Besitzer lesbar und änderbar. Verweise auf fremde Pläne sind gesperrt.
- Wochengrenzen und Trainingsdatum richten sich nach dem Gerät, nicht nach UTC.
- Änderungen einer Woche dürfen keine andere Woche überschreiben; ein Speicherfehler darf keine halbe Woche hinterlassen.
- Neue Migrationen sind zusätzlich. Bereits gemergte Migrationen werden nicht geändert.
- Die Online-Datenbank bleibt unangetastet. Kein Commit, Push oder Deployment ohne ausdrücklichen Auftrag.
- Mehrere unterschiedliche Einheiten am selben Kalendertag, automatische Belastungsoptimierung und Benachrichtigungen
  gehören nicht zu dieser Änderung.

## Prüfung

```sh
bun run test
bun run lint
bun run build
bun run test:db
bunx supabase gen types typescript --local
```

- Vitest prüft Wochengrenzen, Jahreswechsel, Sommerzeit und die Priorität datierter Zuordnungen vor der Vorlage.
- pgTAP prüft Eigentümerrechte, fremde Planverweise, ungültige Wochen und vollständiges Speichern.
- Der lokale Browser prüft Wochenwechsel, freie Trainingstage, Ruhetage, Neuladen sowie die einzelnen Tages-Popups.
- Die Darstellung wird auf Handy-, Tablet- und Desktopbreiten geprüft.

## Erfolgskriterien

Eine neue Woche übernimmt die Vorlage. Der Nutzer verschiebt eine Einheit auf einen anderen Tag, setzt einen Ruhetag
und speichert. Nach dem Neuladen bleiben diese Entscheidungen erhalten. Eine andere Woche behält ihre eigene Planung.
Gespeicherte Trainingssätze verschwinden beim Umplanen nicht und erscheinen weiterhin in Statistik und CSV-Backup.
