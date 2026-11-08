# Umsetzung: Kontoprivatsphäre

Spezifikation: [docs/account-privacy.md](../docs/account-privacy.md). Bestätigte Grenze: Fremde sehen Name, Benutzername, Bild und Follower-Anzahl; nach Annahme ist die gesamte Profilübersicht lesbar. Kontoverwaltung und Schreibrechte bleiben beim Eigentümer.

1. Benutzernamenvalidierung und private/öffentliche Folgeanfragen mit Tests absichern.
2. Neue additive Migration: Verzeichnis aller Konten, eindeutige Benutzernamen, Anfragezustände, geschützte Leseansichten. Quelltabellen behalten Owner-RLS. Bestehende Beziehungen werden wegen erweiterter Datenfreigabe erneut angefragt.
3. API und generierte Typen anpassen. Fremde Profile und Navigation aus Suche/Listen anbinden.
4. Zahnrad, Einstellungsplatzhalter, Kontoprivatsphäre und Anfrageverwaltung ergänzen. Eigene Benutzernamen editierbar machen.
5. Mehrnutzerablauf lokal testen: Zugriff vor/nach Annahme, Ablehnung, Rücknahme, öffentlich folgen, Entfolgen, Eindeutigkeit. Lint, Unit-Tests, Build, pgTAP und responsive UI prüfen.

Keine Online-Migration, keine Commits oder Pushes ohne neuen Auftrag. Rückbau: Oberfläche kann entfernt werden; zusätzliche Spalten/Ansichten bleiben zunächst erhalten. Keine private Quelltabelle wird für Fremdzugriff geöffnet.

<!-- Der vorherige, abgeschlossene Plan bleibt in der Git-Historie erhalten. -->

Spezifikation: [docs/food-scanner.md](../docs/food-scanner.md). Umsetzung und Pull Request gegen den zuvor aktualisierten `main` sind vom Nutzer beauftragt. Keine Online-Datenbankänderungen.

1. Reine Ernährungsberechnungen und Scan-Vertrag mit Vitest absichern.
2. Private Tabellen, transaktionale Mahlzeiten-RPC und serverseitige Scanlimits ergänzen; lokal migrieren und mit pgTAP prüfen.
3. Tagebuch, Ziele und korrigierbare Lebensmittel mit vorhandenen UI-Tokens umsetzen.
4. Geschützte Gemini-Edge-Function und Fotoablauf ergänzen; Fehlerpfade isoliert testen.
5. Navigation integrieren, Datenbanktypen generieren, vollständige Prüfungen und lokalen Browserdurchlauf ausführen.

Risiken: KI-Portionen sind ungenau, deshalb verbindliche Nutzerprüfung. Anbieterfehler und Kosten werden mit Timeout und atomaren Limits begrenzt. Keine Fotospeicherung. Fehlender Google-Key begrenzt nur den echten Anbieter-Smoke-Test.
