# Umsetzung: Gemini-Foodscanner

Spezifikation: [docs/food-scanner.md](../docs/food-scanner.md). Umsetzung und Pull Request gegen den zuvor aktualisierten `main` sind vom Nutzer beauftragt. Keine Online-Datenbankänderungen.

1. Reine Ernährungsberechnungen und Scan-Vertrag mit Vitest absichern.
2. Private Tabellen, transaktionale Mahlzeiten-RPC und serverseitige Scanlimits ergänzen; lokal migrieren und mit pgTAP prüfen.
3. Tagebuch, Ziele und korrigierbare Lebensmittel mit vorhandenen UI-Tokens umsetzen.
4. Geschützte Gemini-Edge-Function und Fotoablauf ergänzen; Fehlerpfade isoliert testen.
5. Navigation integrieren, Datenbanktypen generieren, vollständige Prüfungen und lokalen Browserdurchlauf ausführen.

Risiken: KI-Portionen sind ungenau, deshalb verbindliche Nutzerprüfung. Anbieterfehler und Kosten werden mit Timeout und atomaren Limits begrenzt. Keine Fotospeicherung. Fehlender Google-Key begrenzt nur den echten Anbieter-Smoke-Test.
