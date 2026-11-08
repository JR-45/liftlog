# Kontoprivatsphäre und fremde Profile

## Ziel

Die bestehende Profil- und Folgen-Funktion bekommt eindeutige Benutzernamen, eine funktionierende Kontosuche und fremde Profilseiten. Private Konten müssen Folgeanfragen erst annehmen, bevor die soziale Profilübersicht sichtbar wird. Das bestätigte LiftLog-Design und die beiden Reiter „Follower“ und „Gefolgt“ bleiben erhalten.

## Bestätigungsbedarf und Annahmen

Die aktuelle Nutzerregel ersetzt die frühere umfassende Freigabe: Fremde sehen ausschließlich Anzeigename, Benutzername, Profilbild und Follower-Zähler. Nach angenommener Folgebeziehung werden Bio, Trainingsziel, Wochenziel, Trainingsverlauf und Rekorde lesbar. Körperdaten und Ernährung sieht ausschließlich die Person selbst – auch angenommene Follower erhalten sie niemals. Fremde erhalten keine Bearbeitungsrechte, E-Mail, Zugangsdaten, Export- oder Kontolöschaktionen. Bei öffentlichen Konten wird Folgen sofort angenommen; auch dort sehen nicht folgende Personen zunächst nur die Basisidentität.

Bestehende und neue Konten sind zunächst privat. Vorhandene Folgebeziehungen bleiben erhalten, benötigen für die erweiterte Freigabe von Profil und Training aber erneut die Annahme des Empfängers. Alle registrierten Konten erhalten einen eindeutigen neutralen Platzhalter-Benutzernamen; Anzeigename und Bild bilden die auffindbare Basisidentität. E-Mail-Adressen werden nicht verwendet. Der Nutzer kann seinen Benutzernamen im eigenen Profil ändern.

Diese Sichtbarkeitsgrenze ist durch die letzte Nutzeranweisung bestätigt. Die Umsetzung erfolgt lokal; eine Online-Migration bleibt dem Projekt-Owner vorbehalten.

## Sichtbar nur auf Wunsch (Migration 20261108190000)

Die erste Fassung hat für jedes Konto automatisch eine auffindbare Identität angelegt und das Verbergen entfernt. Das ist zurückgenommen:

- Niemand ist automatisch auffindbar. Sichtbar wird man nur über „Profil sichtbar machen“ (`enable_social_profile()`), in den Einstellungen oder unter Follower.
- „Profil verbergen“ (Einstellungen, mit „Sicher? Nochmal tippen“) löscht die eigene Zeile in `social_profiles`. Alle Folgebeziehungen verschwinden mit, eigene Trainings-, Körper- und Ernährungsdaten bleiben.
- Folgen setzt ein eigenes sichtbares Profil voraus.
- Beim Einspielen werden automatisch angelegte Identitäten ohne Folgebeziehung entfernt. Wer schon Beziehungen hat, bleibt sichtbar und kann sich selbst verbergen.
- Benutzernamen gibt es nur mit sichtbarem Profil.

## Oberfläche

### Eigenes Profil und Einstellungen

- Oben rechts im Profilkopf sitzt ein Zahnrad mit Beschriftung für Screenreader. Es öffnet eine eigene Einstellungsseite mit Zurück-Pfeil.
- „Privatsphäre-Konto“ öffnet die Kontosichtbarkeit mit den Optionen „Öffentlich“ und „Privat“. Der gewählte Zustand wird gespeichert und nach Neuladen wieder angezeigt.
- „Folgeanfragen“ zeigt offene Anfragen mit Profilzugang sowie „Annehmen“ und „Ablehnen“.
- Einstellungen und Anfrageverwaltung benennen ausdrücklich, dass Körperdaten und Ernährung ausschließlich beim Besitzer bleiben.
- Weitere gewünschte Einstellungszeilen sind als „Demnächst“ gekennzeichnet und deaktiviert; keine vorgetäuschten Schalter.
- `@benutzername` steht im Profilkopf. „Profil bearbeiten“ enthält dafür ein eigenes Eingabefeld mit verständlichen Meldungen bei ungültigem oder vergebenem Namen.

### Fremde Profile und Suche

- Ein Klick auf Name oder Bild in Suche, Follower-Liste, Gefolgt-Liste oder Folgeanfrage öffnet zuerst die Profilseite der Person.
- Die Kontosuche findet tatsächlich registrierte Konten über den Benutzernamen. Bereits freiwillig freigegebene Anzeigenamen bleiben ebenfalls durchsuchbar. Unbekannte private Namen oder E-Mail-Adressen werden nicht zum Suchindex.
- Benutzername, zulässige Basisidentität und Kontosichtbarkeit sind auch bei privaten Konten sichtbar, damit die richtige Person gefunden und angefragt werden kann.
- Bei einem öffentlichen Konto ist „Folgen“ sofort erfolgreich und schaltet die Übersicht für Profil und Training frei. Vorher bleibt die Seite auf die Basisidentität beschränkt.
- Bei einem privaten Konto ohne angenommene Beziehung steht „Dieses Konto ist privat“. Die geschützte Übersicht und Personenlisten werden nicht geladen. Der Knopf zeigt „Anfragen“.
- Nach Absenden steht „Angefragt“; die Anfrage kann zurückgezogen werden. Nach Annahme wird die Übersicht sichtbar und der Knopf ermöglicht „Entfolgen“.
- Körperdaten, Messungen, BMI und andere Körperberechnungen sowie sämtliche Ernährungsdaten werden in fremden Profilen vollständig ausgelassen. Es erscheinen weder Überschriften noch leere Karten, Platzhalter, Werte oder Hinweise auf fehlende Daten dieser Bereiche.
- Zurück kehrt zur vorherigen Ansicht zurück, auch beim Öffnen eines Profils aus einer Personenliste. Eigenes Konto öffnet die eigene Profilansicht.
- Follower und Gefolgt öffnen weiterhin eine eigene Seite mit beiden Reitern. Bei fremden Konten gilt dort dieselbe Privatsphäre wie auf dem Profil.
- Nach angenommener Beziehung zeigt auch der fremde Profilkopf zwei anklickbare Zähler mit Anzahl und „Follower“ beziehungsweise „Gefolgt“, im selben Stil wie das eigene Profil. Es gibt keine zusätzlichen Knöpfe „Follower anzeigen“ oder „Gefolgt anzeigen“. Der Einstieg aktiviert den angeklickten Reiter.

## Beziehungen und Sichtbarkeitswechsel

| Aktion | Ergebnis |
| --- | --- |
| Öffentlichem Konto folgen | Sofort angenommene Beziehung |
| Privatem Konto folgen | Offene Anfrage, kein Zugang zur geschützten Übersicht |
| Anfrage annehmen | Nur der Empfänger darf die Beziehung freigeben |
| Anfrage ablehnen/zurückziehen | Beziehung wird entfernt, kein Zugang |
| Entfolgen | Angenommene Beziehung und Zugriffsrecht enden |
| Öffentlich auf privat wechseln | Bereits angenommene Follower bleiben; neue Beziehungen brauchen Annahme |
| Privat auf öffentlich wechseln | Offene Anfragen werden atomar angenommen; Hinweis vor dem Wechsel |

Nur angenommene Beziehungen zählen als Follower oder Gefolgt. Selbst-Folgen und doppelte Anfragen sind ausgeschlossen. Ein Client darf sich niemals selbst als angenommen markieren. Konto-Löschung entfernt Identität und alle zugehörigen Beziehungen.

## Benutzernamen

- 3 bis 40 Zeichen: Buchstaben `a–z`, Ziffern, Punkt und Unterstrich. Neutrale automatisch vergebene Namen sind ebenfalls eindeutig.
- Führende und abschließende Leerzeichen werden entfernt; Speicherung und Vergleich erfolgen in Kleinschreibung.
- Die Datenbank erzwingt globale Eindeutigkeit, auch bei gleichzeitigen Änderungen. `Anna` und `anna` sind derselbe Benutzername.
- Eine Verfügbarkeitsanzeige ist nur eine Hilfe; ausschlaggebend bleibt das Speichern unter der eindeutigen Datenbankbedingung.
- Bestehende Nutzer behalten Identität und Beziehungen bei Namensänderungen: Verweise bleiben UUID-basiert. Neutrale Platzhalter enthalten weder E-Mail noch Gesundheitsdaten.

## Technik und Struktur

React 19, TypeScript, Tailwind 4 und vorhandenes Supabase; kein zusätzlicher Server und keine neue Abhängigkeit vorgesehen.

- `src/features/profile/`: Zahnrad, Einstellungen, Benutzername im eigenen Profil.
- `src/features/social/`: fremde Profile, Suche, Personenlisten, Folgeanfragen und die dazugehörige `api.ts`-Schicht.
- `src/domain/`: reine Benutzernamenvalidierung und gegebenenfalls Zustandsregeln mit Vitest.
- `supabase/migrations/`: neue additive Migration für Benutzernamen, Kontosichtbarkeit und Anfragezustände; alte Migrationen bleiben unverändert.
- `supabase/tests/`: pgTAP für Eindeutigkeit, Zustandswechsel, Datenprojektion und Zugriffsschutz.
- `src/lib/database.types.ts`: aus dem lokalen Schema neu generieren.

Privatsphäre wird in der Datenbank durchgesetzt. Eine ausgeblendete Oberfläche allein reicht nicht. Die Owner-Policies der Quelltabellen bleiben erhalten. Die mit `security_barrier` geschützte Ansicht `shared_profile_overviews` enthält ausschließlich `profile` mit Anzeigename, Bio, Trainingsziel und Wochenziel sowie `sets` mit Trainingssätzen. Nach Prüfung der angenommenen Beziehung sind diese Angaben lesbar. Messungen, Mahlzeiten, Größe, Zielgewicht, Geschlecht, Geburtsjahr und Aktivitätslevel fehlen vollständig im JSON. Die eigene Profil- und Ernährungsansicht verwendet weiterhin ihre geschützten Owner-APIs. Ein Entfolgen entzieht den Zugriff auf die freigegebene Trainingsübersicht sofort.

Die neue additive Migration `20261108164300_follower_profile_privacy.sql` beschränkt die ältere Ansicht. Bestehende Migrationen werden nicht geändert. Beide Migrationen gehören zusammen in die spätere Bereitstellung; die weiter gefasste alte Ansicht darf nicht als endgültiger Stand online gehen. Ein Rückbau der Oberfläche darf die eingeschränkte Ansicht beibehalten oder entfernen, aber nicht wieder Körper- und Ernährungsdaten für Follower freigeben.

UI verwendet ausschließlich bestehende Design-Tokens und gemeinsame Stile aus `src/lib/ui.ts`. Icons gehören nach `src/lib/icons.tsx`. Beispiel:

```tsx
<button type="button" className={NAV_BUTTON} aria-label="Profileinstellungen öffnen" onClick={openSettings}>
  <SettingsIcon />
</button>
```

## Prüfung und Befehle

```sh
bun run lint
bun run test
bun run build
bunx supabase migration new account_privacy
bunx supabase db reset
bun run test:db
bunx supabase gen types typescript --local > src/lib/database.types.ts
bun run dev --host
```

Vitest prüft Normalisierung, erlaubte Zeichen und Längengrenzen. pgTAP prüft Eigentümer, unbeteiligte Person, anfragende Person und akzeptierten Follower: Profil/Training vor und nach Annahme, niemals ausgelieferte Körper-/Ernährungsfelder, weiterhin lesbare eigene Körper-/Ernährungsdaten, fremde Anfrageentscheidungen, direkte Inserts/Updates, Sichtbarkeitswechsel, doppelte Benutzernamen und Datenlöschung. Anonyme Zugriffe bleiben gesperrt.

Der echte lokale Browserablauf umfasst registrierte Konten suchen, fremdes Profil öffnen, privat anfragen, annehmen/ablehnen/zurückziehen, Zugriff vor/nach Annahme, öffentlich folgen, entfolgen, Sichtbarkeit ändern, Benutzername speichern und Neuladen. Einstellungen, Profil und Listen bei 320/390/1280 px, Tastaturbedienung sowie Hell-/Dunkelmodus prüfen.

## Grenzen

- Keine Nachrichten, Feeds, Beiträge oder externe Kontakt-Synchronisierung.
- Körperdaten und Ernährung ausschließlich für den Besitzer; auch keine Freigabe durch öffentliches Konto oder Annahme einer Folgeanfrage. Training erst nach angenommener Beziehung. Keine Änderungen durch Follower.
- Keine Online-Migration durch den Agenten. Der Projekt-Owner spielt die Migration vor einem späteren Merge ein.
- Keine vorhandene Migration verändern und keine Tests oder Berechtigungsprüfungen umgehen.
- Vor einem späteren Commit die echte lokale UI zeigen; Commit, Push und PR nur nach entsprechendem Auftrag.

## Lokaler Prüfnachweis

- Der neue Regressionstest wurde zuerst gegen den alten Stand ausgeführt und schlug bei der Weitergabe von Messungen, Mahlzeiten und Körperangaben an bestätigte Follower fehl.
- Alle 248 pgTAP-Tests bestehen. Sie prüfen auch die fehlenden Messungs-/Mahlzeitenbereiche und Körperfelder im Follower-JSON sowie den unveränderten Zugriff des Eigentümers auf seine Daten.
- 290 Unit-Tests, Lint, Typecheck und Produktionsbuild bestanden. Datenbanktypen wurden nach dem vollständigen lokalen Reset neu erzeugt; die JSON-Spaltentypen bleiben unverändert.
- Drei getrennte lokale Browser-Sitzungen prüfen bestehende Konten suchen, Benutzernamen-Kollisionen, fremde Profile, Anfrage/Rücknahme/Ablehnung/Annahme, öffentliches Folgen, Entfolgen und Navigation durch Personenlisten. Der dritte Nutzer bleibt ohne eigene Annahme ausgeschlossen; öffentliche Freigabe übernimmt offene Anfragen wie vorgesehen.
- Auch bestätigte private und öffentliche Follower sehen keine Körper-/Ernährungsüberschriften, leeren Karten, Messungsknöpfe oder Mahlzeiten. Direkte API-Abfragen liefern ausschließlich `profile` und `sets`; Körper-/Ernährungsquellen bleiben für Follower leer. Der Besitzer sieht seine Körperdaten und Mahlzeiten weiterhin in den eigenen Ansichten.
- Die fremde Profilansicht zeigt echte anklickbare Zähler, beispielsweise „2 Follower“ und „0 Gefolgt“. Beide öffnen die richtige Liste und aktivieren den passenden Reiter; die bisherigen „anzeigen“-Knöpfe fehlen.
- Bei 320/390/1280 px in Hell- und Dunkelmodus kein seitlicher Überlauf und keine JavaScript-Fehler. Bildschirmnachweis: `output/playwright/privacy-accepted-counters.png`. Testskript: `output/playwright/account-privacy-check.mjs`.
- Alle Änderungen bleiben lokal und uncommittet. Keine Online-Migration, kein Push, kein Merge und keine Änderung an PR #48.

## Übergabesperre

Auf ausdrücklichen Nutzerauftrag: PR #48 vorerst nicht mergen und seine Migrationen nicht online einspielen. Kein Commit oder Push bis zu den angekündigten Befehlen. Osman soll während der lokalen Fertigstellung ebenfalls nicht auf `feature/account-privacy` pushen.
