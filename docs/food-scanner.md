# Gemini-Foodscanner

## Umsetzungsvorschlag und Umfang

Ein neuer Tab „Ernährung“ ergänzt Training, Statistik, Trainingsplan und Profil. Die erste Version umfasst Fotoaufnahme, Upload, Analyse, Korrektur, Bestätigung, Tagebuch und editierbare Tagesziele. Vorhandene Farben, Navigation, Profilberechnungen und Supabase-Anmeldung werden weiterverwendet. Keine neue Frontend-Abhängigkeit.

| Baustein | Verantwortung | Voraussetzung |
| --- | --- | --- |
| Ernährungstagebuch | Mahlzeiten, Lebensmittel, Tagesziele, Tagessummen | Anmeldung |
| Fotoanalyse | Gemini-Aufruf, Einwilligung, Limits, validierte Ergebnisse | Ernährungstagebuch |

Reihenfolge: Datenmodell und Rechenlogik, Tagebuch und Ziele, Fotoanalyse und Korrektur, Integration und Prüfung. Der Auftrag autorisiert ausdrücklich die anschließende Umsetzung; zusätzliche Freigaberunden vor dem lokalen Bau sind nicht erforderlich.

## Datenmodell

- `nutrition_settings`: ein Datensatz pro Nutzer, fünf Tagesziele und versionierte Einwilligung zur Fotoübertragung.
- `meals`: UUID, Eigentümer, vom Gerät übergebenes Datum, Titel und Erstellzeit. Clientseitige UUID macht wiederholtes Speichern nach Netzfehlern idempotent.
- `meal_items`: Lebensmittelname, Gramm, geschätzte Nährwerte pro 100 g, Reihenfolge und Schätzkennzeichnung. Zusammengesetzter Fremdschlüssel `(meal_id, user_id)` verhindert Verweise auf fremde Mahlzeiten. Summen werden berechnet, nicht gespeichert.
- `food_scan_usage`: kurzlebige Zähler pro Nutzer und UTC-Tag, ohne Fotos oder Analyseinhalte. Nur der Server darf Zähler ändern. Atomare Reservierung begrenzt parallele Anfragen.

Alle Tabellen erhalten RLS. `anon` erhält keine Rechte. Fachliche RPCs sind `security invoker` mit leerem `search_path`; die Zähler-RPC ist ausschließlich für `service_role` ausführbar. Speichern einer Mahlzeit samt Lebensmitteln erfolgt in einer Transaktion.

## Verhalten und Entscheidungen

- Kamera und Dateiauswahl sind getrennte Aktionen. Bilder werden im Browser verkleinert und als JPEG neu kodiert, ohne ursprüngliche EXIF-Metadaten. Keine Speicherung in Storage, Datenbank oder localStorage.
- Vor jeder Übertragung steht ein Datenschutzhinweis. Vor der ersten Analyse ist eine ausdrückliche, widerrufbare Einwilligung erforderlich. Übertragen werden nur das Foto und der Analyseauftrag, keine Profildaten.
- Gemini liefert Lebensmittel, Mengen, Rückfragen und fünf Nährwerte pro 100 g. Schema und tatsächliche Werte werden unabhängig validiert. Unklare Portionen bleiben bis zur Mengenangabe und Bestätigung gesperrt.
- Nutzer können Namen, Gramm und Nährwerte bearbeiten und Lebensmittel entfernen. Beim Ändern eines Lebensmittels müssen die Nährwerte geprüft werden. Alle Fotoanalysen bleiben als Schätzungen gekennzeichnet.
- Leere Ergebnisse, ungültige Bilder, zu große Dateien, abgelaufene Anmeldung, verweigerte Einwilligung, Zeitüberschreitung, ungültige KI-Ausgabe und Anbieterlimits erhalten deutsche Fehlermeldungen.
- Standardlimit: 20 Versuche pro Nutzer und UTC-Tag, mindestens zehn Sekunden Abstand. Fehlgeschlagene Anbieteraufrufe zählen mit. Keine automatischen kostenpflichtigen Wiederholungen.
- Kalenderdaten kommen vom Gerät. Das Tagebuch kann auch vergangene Tage anzeigen. Verbrauch, Rest und Überschreitung werden getrennt ausgewiesen; Prozentwerte werden nicht bei 100 % abgeschnitten.
- Kalorien- und Proteinvorschläge verwenden ausschließlich die bestehende `analyzeBody`-Logik. Fehlende Profilwerte werden benannt und können im Profil ergänzt werden. Alle fünf Ziele können ohne Profilberechnung manuell gesetzt werden. Keine stillen Standardziele für Fett, Kohlenhydrate oder Ballaststoffe.
- Keine Aussage über genaue Mikronährstoffabdeckung, keine automatische Diagnose, kein Barcode-Scanner und keine externe Lebensmitteldatenbank in dieser Version.

## Zugangsdaten und Betrieb

Benötigt wird `GEMINI_API_KEY` als Supabase-Function-Secret, niemals als `VITE_`-Variable oder im Chat. `GEMINI_MODEL` legt das Modell serverseitig fest. Standard ist `gemini-3.8-flash`; Verfügbarkeit im eigenen Google-Projekt vor Betrieb prüfen. `FOOD_SCAN_ALLOWED_ORIGINS` begrenzt Browser-Ursprünge. Supabase stellt URL und interne Server-Zugangsdaten der Edge Function bereit.

Offen für den späteren Betrieb: Google-Projekt und Abrechnung, erlaubtes Budget, freigegebene Modellversion sowie Anbieterbedingungen zur Verarbeitung und Aufbewahrung. Diese Angaben blockieren den lokalen Bau nicht. Ohne Key schlägt die Analyse mit einem Einrichtungshinweis fehl; es werden keine Ergebnisse erfunden.

Online-Migration und Deployment werden ausschließlich vom Projekt-Owner vorgenommen. Der Foodscanner wird über einen Pull Request gegen `main` bereitgestellt. Die enthaltene Migration ist älter datiert als die neuesten Migrationen auf `main`; der Owner benötigt deshalb `bunx supabase db push --remote --include-all` und bestätigt anschließend mit dem Label `migration-online`. Der Agent verändert keine Online-Datenbank.

### Lokal starten

1. `bunx supabase start` und `bunx supabase db reset` anwenden; der Reset löscht lokale Testdaten.
2. `supabase/functions/.env.example` nach `supabase/functions/.env.local` kopieren und dort den eigenen `GEMINI_API_KEY` eintragen. Diese Datei ist gitignored.
3. `bunx supabase functions serve food-scan --env-file supabase/functions/.env.local` starten.
4. `bun run dev --host` starten und unter `http://localhost:5173` anmelden. Im Tab „Ernährung“ Tagesziele setzen und ein Foto auswählen.

Bei Zugriff vom Handy müssen `VITE_SUPABASE_URL` und `FOOD_SCAN_ALLOWED_ORIGINS` die lokale WLAN-Adresse verwenden. `localhost` und `127.0.0.1` bezeichnen auf dem Handy das Handy selbst. Kamera-/PWA-Funktionen können HTTPS benötigen; der Datei-Upload ist ebenfalls vorhanden.

Für Produktion setzt der Owner dieselben Function-Secrets mit der echten Website-Origin, prüft Anbieterbedingungen und Budget und veröffentlicht die Function separat. Ein Vite-Deployment allein veröffentlicht keine Supabase-Funktionen oder Migrationen. Bei Rücknahme kann die Navigation entfernt und die Function deaktiviert werden; die additive Migration lässt vorhandene Trainingsdaten unverändert.

## Quellstruktur und Regeln

Reine Typen, Validierung und Rechenlogik liegen unter `src/domain/nutrition.ts` und `src/domain/foodScan.ts`. Datenzugriff liegt ausschließlich in `src/features/nutrition/api.ts`, UI unter `src/features/nutrition/`. Die Edge Function liegt unter `supabase/functions/food-scan/`; sie verwendet die reine gemeinsame Ausgabevalidierung. Kommentare und UI sind deutsch, TypeScript folgt dem vorhandenen Stil, beispielsweise `const remaining = Math.max(0, target - consumed)`.

## Prüfung und Abnahme

- Vitest beweist Portionenskalierung, Tagessummen, Rest/Überschreitung, fehlende Ziele, Eingabegrenzen und Ablehnung ungültiger KI-Ausgaben.
- Handler-Tests prüfen Anmeldung, Einwilligung, Limits, Timeout, fehlerhafte Anbieterantworten und erfolgreiche Analyse ohne echten Google-Aufruf.
- pgTAP prüft Owner-RLS, zusammengesetzte Fremdschlüssel, Wertebereiche, atomare Speicherung, Idempotenz und Zählerschutz.
- `bun run test`, `bun run lint`, `bun run build`, `bun run test:db` und frisch generierte Datenbanktypen müssen passen.
- Lokaler Browserdurchlauf prüft Mobil- und Laptopansicht, Korrektur, Speicherung, Tagesziele, Fehlermeldungen und Bedienbarkeit. Ein echter Gemini-Smoke-Test benötigt einen eingerichteten Key.

Grundlagen: [Gemini-Bildanalyse](https://ai.google.dev/gemini-api/docs/image-understanding), [strukturierte Ausgabe](https://ai.google.dev/gemini-api/docs/structured-output), [Modell](https://aistudio.google.com/docs/models/gemini-3.8-flash), [Supabase-Authentifizierung](https://supabase.com/docs/guides/functions/auth-headers).

## Lokaler Prüfnachweis

- 17 neue Vitest-Tests für Berechnungen, Korrektureingaben, KI-Ausgabe und Edge-Handler bestehen.
- Nach vollständigem lokalem Reset auf aktuellem `main` bestehen alle 185 pgTAP-Tests. Die Datenbanktypen wurden frisch generiert.
- Alle 265 Unit-Tests, Lint und der vollständige Build einschließlich Typecheck bestehen.
- Die Onboarding-Tests entsprechen auf ausdrücklichen Nutzerwunsch dem aktuellen `main`. Die ältere lokale 120-Minuten-Änderung bleibt separat gesichert und ist kein Bestandteil des Foodscanner-PRs.
- Playwright prüft Ziele, Einwilligung/Widerruf, Bildverarbeitung, Rückfragen, Korrektur, Speicherung, erneutes Laden sowie 320/390/768/1024/1440 px ohne horizontalen Überlauf oder JavaScript-Fehler. Dark- und Light-Ansichten wurden visuell geprüft.
- Die echte lokale Edge Function prüft Anmeldung und Einwilligung und meldet den fehlenden Gemini-Key korrekt. Der erfolgreiche Analyseablauf verwendet im Browser eine ausdrücklich simulierte KI-Antwort; ein echter Gemini-Smoke-Test steht bis zur Einrichtung des Keys aus.
