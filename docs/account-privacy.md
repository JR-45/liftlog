# Kontoprivatsphäre und fremde Profile

## Ziel

Die bestehende Profil- und Folgen-Funktion bekommt eindeutige Benutzernamen, eine funktionierende Kontosuche und fremde Profilseiten. Private Konten müssen Folgeanfragen erst annehmen, bevor die soziale Profilübersicht sichtbar wird. Das bestätigte LiftLog-Design und die beiden Reiter „Follower“ und „Gefolgt“ bleiben erhalten.

## Bestätigungsbedarf und Annahmen

Der Nutzer hat die Sichtbarkeit präzisiert: Fremde sehen ausschließlich Anzeigename, Benutzername, Profilbild und Follower-Zähler. Nach angenommener Folgebeziehung ist die vollständige Profilübersicht einschließlich Bio, Körperdaten, Training und Ernährung lesbar. Fremde erhalten niemals Bearbeitungsrechte, E-Mail, Zugangsdaten, Export- oder Kontolöschaktionen. Bei öffentlichen Konten wird Folgen sofort angenommen; auch dort sehen nicht folgende Personen zunächst nur die Basisidentität.

Bestehende und neue Konten sind zunächst privat. Vorhandene Folgebeziehungen bleiben erhalten, benötigen für die jetzt deutlich umfassendere Profilfreigabe aber erneut die Annahme des Empfängers. Alle registrierten Konten erhalten einen eindeutigen neutralen Platzhalter-Benutzernamen; Anzeigename und Bild bilden die auffindbare Basisidentität. E-Mail-Adressen werden nicht verwendet. Der Nutzer kann seinen Benutzernamen im eigenen Profil ändern.

Diese Sichtbarkeitsgrenze ist durch die letzte Nutzeranweisung bestätigt. Die Umsetzung erfolgt lokal; eine Online-Migration bleibt dem Projekt-Owner vorbehalten.

## Oberfläche

### Eigenes Profil und Einstellungen

- Oben rechts im Profilkopf sitzt ein Zahnrad mit Beschriftung für Screenreader. Es öffnet eine eigene Einstellungsseite mit Zurück-Pfeil.
- „Privatsphäre-Konto“ öffnet die Kontosichtbarkeit mit den Optionen „Öffentlich“ und „Privat“. Der gewählte Zustand wird gespeichert und nach Neuladen wieder angezeigt.
- „Folgeanfragen“ zeigt offene Anfragen mit Profilzugang sowie „Annehmen“ und „Ablehnen“.
- Weitere gewünschte Einstellungszeilen sind als „Demnächst“ gekennzeichnet und deaktiviert; keine vorgetäuschten Schalter.
- `@benutzername` steht im Profilkopf. „Profil bearbeiten“ enthält dafür ein eigenes Eingabefeld mit verständlichen Meldungen bei ungültigem oder vergebenem Namen.

### Fremde Profile und Suche

- Ein Klick auf Name oder Bild in Suche, Follower-Liste, Gefolgt-Liste oder Folgeanfrage öffnet zuerst die Profilseite der Person.
- Die Kontosuche findet tatsächlich registrierte Konten über den Benutzernamen. Bereits freiwillig freigegebene Anzeigenamen bleiben ebenfalls durchsuchbar. Unbekannte private Namen oder E-Mail-Adressen werden nicht zum Suchindex.
- Benutzername, zulässige Basisidentität und Kontosichtbarkeit sind auch bei privaten Konten sichtbar, damit die richtige Person gefunden und angefragt werden kann.
- Bei einem öffentlichen Konto ist „Folgen“ sofort erfolgreich und schaltet die vollständige Übersicht frei. Vorher bleibt die Seite auf die Basisidentität beschränkt.
- Bei einem privaten Konto ohne angenommene Beziehung steht „Dieses Konto ist privat“. Die geschützte Übersicht und Personenlisten werden nicht geladen. Der Knopf zeigt „Anfragen“.
- Nach Absenden steht „Angefragt“; die Anfrage kann zurückgezogen werden. Nach Annahme wird die Übersicht sichtbar und der Knopf ermöglicht „Entfolgen“.
- Zurück kehrt zur vorherigen Ansicht zurück, auch beim Öffnen eines Profils aus einer Personenliste. Eigenes Konto öffnet die eigene Profilansicht.
- Follower und Gefolgt öffnen weiterhin eine eigene Seite mit beiden Reitern. Bei fremden Konten gilt dort dieselbe Privatsphäre wie auf dem Profil.

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

Privatsphäre wird in der Datenbank durchgesetzt. Eine ausgeblendete Oberfläche allein reicht nicht. Basisidentität und geschützte Angaben werden getrennt. Die bestehenden Owner-Policies für Quelltabellen bleiben erhalten; begrenzte, mit `security_barrier` geschützte Leseansichten geben ausschließlich nach Prüfung der angenommenen Beziehung die benötigten Spalten frei. Sie geben keine Schreibrechte und keine Authentifizierungsdaten frei. Ein Entfolgen oder Entfernen der Beziehung entzieht den Zugriff sofort. Bestehende Beziehungen werden bei der Migration zu offenen Anfragen, damit frühere Namens-/Bildfreigaben nicht stillschweigend Gesundheitsdaten freigeben.

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

Vitest prüft Normalisierung, erlaubte Zeichen und Längengrenzen. pgTAP prüft mindestens Eigentümer, unbeteiligte Person, anfragende Person und akzeptierten Follower: private Übersicht vor/nach Annahme, fremde Anfrageentscheidungen, direkte Inserts/Updates, atomare Sichtbarkeitswechsel, doppelte Benutzernamen und Datenlöschung. Anonyme Zugriffe bleiben gesperrt.

Der echte lokale Browserablauf umfasst registrierte Konten suchen, fremdes Profil öffnen, privat anfragen, annehmen/ablehnen/zurückziehen, Zugriff vor/nach Annahme, öffentlich folgen, entfolgen, Sichtbarkeit ändern, Benutzername speichern und Neuladen. Einstellungen, Profil und Listen bei 320/390/1280 px, Tastaturbedienung sowie Hell-/Dunkelmodus prüfen.

## Grenzen

- Keine Nachrichten, Feeds, Beiträge oder externe Kontakt-Synchronisierung.
- Keine Gesundheits-, Ernährungs- oder Trainingsdaten vor Annahme einer Beziehung. Keine Änderungen durch Follower.
- Keine Online-Migration durch den Agenten. Der Projekt-Owner spielt die Migration vor einem späteren Merge ein.
- Keine vorhandene Migration verändern und keine Tests oder Berechtigungsprüfungen umgehen.
- Vor einem späteren Commit die echte lokale UI zeigen; Commit, Push und PR nur nach entsprechendem Auftrag.

## Lokaler Prüfnachweis

- Neue Migration `20261108154138_account_privacy.sql` mit anschließendem vollständigem lokalen Datenbankreset angewendet. Quelltabellen behalten ihre Owner-Policies; die zusätzlichen Leseansichten prüfen die angenommene Beziehung und erlauben ausschließlich Lesen.
- 243 Datenbanktests prüfen unter anderem private Anfragen, Annahme ausschließlich durch den Empfänger, öffentliche Sofortannahme, Entfolgen, Sichtbarkeitswechsel, anonyme Zugriffe, eindeutige Namen und weiter gesperrte Quelltabellen.
- 290 Unit-Tests, Lint, Typecheck und Produktionsbuild bestanden.
- Echter lokaler Browserablauf mit drei Testkonten: eindeutige Benutzernamen und atomare Speicherung bei Kollisionen, Suche bereits registrierter Personen, private fremde Profile, Anfrage zurückziehen/ablehnen/annehmen, Übersicht nach Annahme, Entfolgen mit sofortigem Zugriffsentzug und öffentliches Folgen.
- Körper- und Ernährungsdaten wurden vor Annahme sowohl im Browser als auch per direkter API-Abfrage als verborgen geprüft. Nach Annahme ist die Übersicht lesbar; E-Mail, Export und Kontolöschung werden nicht ausgeliefert.
- Profil, Einstellungen und fremde Übersicht bei 320/390/1280 px in Hell- und Dunkelmodus ohne seitlichen Überlauf oder JavaScript-Fehler geprüft. Keine Online-Datenbankänderung.
