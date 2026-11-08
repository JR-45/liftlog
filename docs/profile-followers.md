# Follower und Gefolgt im Profil

## Ziel und Umfang

Neben dem Namen und „Profil bearbeiten“ stehen zwei anklickbare Zähler: „Follower“ und „Gefolgt“. Beide öffnen dieselbe eigene Unterseite mit Zurück-Pfeil und zwei Reitern, kein Popup oder Overlay. Der angeklickte Zähler bestimmt den aktiven Reiter. Innerhalb der Unterseite kann zwischen „Follower“ und „Gefolgt“ gewechselt werden, wie bei Instagram und TikTok. Zurück führt zum Profil. Beide Listen zeigen Namen, Profilbilder und passende Aktionen zum Folgen beziehungsweise Entfolgen. Das bestehende LiftLog-Design bleibt erhalten.

Damit die Listen mit echten Beziehungen funktionieren, enthält dieselbe Funktion eine kleine Personensuche nach Anzeigenamen. Freigegebene Nutzer können direkt gefolgt werden; eine Bestätigung durch die Zielperson ist in dieser Version nicht vorgesehen.

## Annahmen zur Sichtbarkeit

- Nutzer geben die Sichtbarkeit ihres Anzeigenamens und Profilbilds ausdrücklich im Profil frei. Bestehende Konten bleiben zunächst unsichtbar.
- Nur angemeldete Nutzer können freigegebene Personen suchen und ihnen folgen.
- Follower- und Gefolgt-Listen sowie Zähler sind nur im eigenen Profil sichtbar. Fremde vollständige Profile gehören nicht zum Umfang.
- E-Mail-Adresse, Bio, Trainingsziel, Trainingshistorie, Ernährung und Körperdaten bleiben privat. Die bestehende Owner-RLS der Tabelle `profiles` wird nicht geöffnet.
- Beim Deaktivieren der Sichtbarkeit werden bestehende Folgebeziehungen entfernt; die Oberfläche weist vor der Bestätigung darauf hin.

Der bestätigte Entwurf verwendet diese Sichtbarkeit. Die Freigabe wird erst beim ausdrücklichen Aktivieren im eigenen Konto erteilt.

## Oberfläche und Abnahme

- Beide Zähler stehen im bestehenden Profilkopf. Auf kleinen Displays dürfen sie unter dem Namen umbrechen, ohne horizontalen Überlauf.
- Ein Klick öffnet eine eigene, per Tastatur bedienbare Unterseite mit „Follower“ und „Gefolgt“ als Reitern, Zurück-Pfeil und sauberem Fokusverhalten. Der Einstieg aktiviert den passenden Reiter; ein Wechsel bleibt auf derselben Unterseite. Aktiver Reiter und jeweilige Anzahl sind erkennbar. Der Profilinhalt erscheint währenddessen nicht hinter einem Overlay.
- Leere Listen erklären „Dir folgt noch niemand“ beziehungsweise „Du folgst noch niemandem“.
- Ladezustand, Fehler und erneutes Laden sind sichtbar; fehlgeschlagene Anfragen erscheinen nicht als Anzahl null.
- Nutzer können freigegebene Personen suchen, folgen und entfolgen. Sich selbst zu folgen ist ausgeschlossen.
- Doppelte Beziehungen sind ausgeschlossen. Erfolgreiche Änderungen aktualisieren Liste und Zähler und bleiben nach Neuladen erhalten.
- Namen und Bilder in den Listen folgen Änderungen des freigegebenen Profils. Konto-Löschung entfernt zugehörige Identität und Beziehungen.
- Suche und Listen werden seitenweise geladen. Es gibt keine Nachrichten, Benachrichtigungen, Feeds oder Trainingsfreigabe.

## Technik und Struktur

React 19, TypeScript, Tailwind 4 und bestehender Supabase-Client; keine neue Abhängigkeit und kein eigener Server.

- `src/features/profile/ProfileScreen.tsx`: bestehender Profilkopf und Einstieg.
- `src/features/social/`: UI und `api.ts` für Personen, Listen und Folgeaktionen. Komponenten verwenden ausschließlich diese API-Schicht.
- `src/domain/`: ausschließlich bei benötigter reiner Validierungslogik, mit Vitest-Tests.
- `supabase/migrations/`: neue additive Migration für freigegebene soziale Identitäten und Folgebeziehungen.
- `supabase/tests/`: pgTAP-Prüfungen der Berechtigungen und Beziehungen.
- `src/lib/database.types.ts`: frisch generierte Datenbanktypen.

Soziale Identitäten enthalten ausschließlich freigegebene Namen und Bilder. Eigene Änderungen sind über `auth.uid()` abgesichert; `anon` erhält keine Rechte. Folgebeziehungen sind der notwendige Verweis zwischen zwei verschiedenen Konten: Der Handelnde wird serverseitig bestimmt, nur er kann seine Beziehung anlegen oder entfernen. Lesen ist auf Beziehungen zum eigenen Konto begrenzt. Die genaue RLS muss Suche, Sichtbarkeit und Zählung gemeinsam absichern, ohne private Profildaten freizugeben.

Bestehenden Stil verwenden, beispielsweise:

```tsx
<button type="button" onClick={() => setList('followers')}>
  <span>{counts.followers}</span> Follower
</button>
```

Kommentare, SQL-Kommentare und Oberflächentexte bleiben deutsch.

## Prüfung und Befehle

```sh
bun run lint
bun run test
bun run build
bunx supabase migration new profile_followers
bunx supabase db reset
bun run test:db
bunx supabase gen types typescript --local > src/lib/database.types.ts
bun run dev --host
```

Der Datenbankreset betrifft ausschließlich lokale Testdaten. pgTAP prüft mindestens zwei verschiedene Nutzer, anonyme Zugriffe, private Profile, fremde Schreibzugriffe, Selbst-Folgen, doppelte Beziehungen, Sichtbarkeit, beide Listenrichtungen und Löschkaskaden. Browserprüfung mit lokalen Testkonten: Sichtbarkeit freigeben, Person suchen, folgen, beide Listen öffnen, entfolgen, neu laden; zusätzlich Tastatur und 320/390/768/1440 px.

## Grenzen

- Bestehende UI, Anmeldung und Profile wiederverwenden. Keine erfundenen Nutzer oder Zähler anzeigen.
- Keine Änderungen an bereits gemergten Migrationen; keine Zugangsdaten im Code.
- Keine Online-Migration durch den Agenten. Der Projekt-Owner spielt die Migration vor einem späteren Merge ein.
- Kein Commit, Push oder Merge ohne gesonderten Auftrag. Vor einem UI-Commit erfolgt die Vorschau gemäß `AGENTS.md`.

## Freigabe

Der Nutzer hat den Entwurf und anschließend die eigene Unterseite mit Zurück-Pfeil und Reiterwechsel bestätigt. Umsetzung und Pull Request nach erneutem Abgleich mit `main` sind beauftragt.

## Umsetzung und Prüfnachweis

- Migration `20261108142954_profile_followers.sql`: getrennte soziale Identitäten und Beziehungen; keine Öffnung der privaten Profiltabelle. Nur die Teilnehmer sehen eine Beziehung, nur der Folgende kann sie anlegen oder entfernen. Widerruf und Konto-Löschung entfernen Beziehungen per Fremdschlüssel.
- Neue oder geänderte private Namen und Bilder aktivieren keine Freigabe. Bereits freigegebene Identitäten übernehmen Änderungen am eigenen Profilbild und Namen.
- Der lokale Browserdurchlauf prüft Freigabe, Suche, Folgen, beide Listenrichtungen, Reiterwechsel per Klick und Pfeiltasten, Entfolgen, Widerruf und erneute Freigabe mit zwei Testkonten. 21 zusätzliche lokale Suchtreffer prüfen die Seitennavigation.
- Profil und Personenansicht wurden bei 320/390/768/1280 px in Hell- und Dunkelmodus ohne seitlichen Überlauf oder JavaScript-Fehler geprüft.
- 286 Unit-Tests, 234 pgTAP-Tests, Lint, Typecheck und Produktionsbuild bestanden. Die Datenbanktypen stammen aus dem lokal neu aufgebauten Schema.
- Die Migration ist additiv. Ein Rückbau der Oberfläche kann die bestehenden Trainings- und Körperdaten unverändert lassen. Der Owner spielt die Migration vor dem Merge mit `bunx supabase db push --remote` ein und setzt danach `migration-online`; der Agent verändert keine Online-Datenbank.
