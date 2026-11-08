# Kontoprivatsphäre

- [x] Datenmodell und Tests: eindeutige Benutzernamen, Anfragen, Annahme und sichere Leseansichten; 243 pgTAP-Tests bestehen.
- [x] Navigation und API: Suche findet bestehende Konten; Namen/Bilder öffnen zuerst deren Profile. Zurück erhält Suchbegriff, Reiter und Listenseite.
- [x] Einstellungen: Zahnrad, deaktivierte Platzhalter, Öffentlich/Privat und Anfrageverwaltung.
- [x] Profil: Benutzername und Profil werden atomar gespeichert. Geschützte Übersicht mit Körper-, Trainings- und Ernährungsdaten erst nach Annahme; keine fremden Schreibrechte oder Kontoverwaltung.
- [x] Prüfung: drei lokale Konten, Anfrage/Rücknahme/Ablehnung/Annahme, Entfolgen, öffentlich folgen, Namenskollisionen, Tastatur, 320/390/1280 px, Hell-/Dunkelmodus. 290 Unit-Tests, Lint und Build bestehen.

## Vorheriger abgeschlossener Stand

- [x] Rechenlogik und Scan-Vertrag: 17 fokussierte Vitest-Tests bestehen.
- [x] Migration und pgTAP: nach lokalem Reset bestehen alle 185 Tests; Typen aus lokalem Schema generiert.
- [x] Tagebuch und Ziele: Tagessummen, Profilvorschläge und Speicherung implementiert; Browserprüfung mit Neuladen bestanden.
- [x] Gemini-Analyse: Einwilligung, Bildverarbeitung, Korrektur und Fehlerpfade geprüft. Erfolgreiche KI-Antwort im Browser simuliert.
- [x] Integration: nach Übernahme des aktuellen `main` bestehen alle 265 Unit-Tests, Lint und vollständiger Build; responsive Browserprüfung abgeschlossen.

Betriebsvoraussetzung: Gemini-Key lokal bzw. als Function-Secret einrichten und anschließend einen echten Anbieter-Smoke-Test durchführen. Online-Migration und Deployment bleiben beim Projekt-Owner; der Pull Request benötigt die Bestätigung `migration-online`.
