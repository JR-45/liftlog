# Kontoprivatsphäre

- [x] Datenmodell und Tests: neue Schutzmigration schließt Körper- und Ernährungsfelder auch für bestätigte Follower vollständig aus. Alle 248 pgTAP-Tests bestehen.
- [x] Navigation und API: Suche findet bestehende Konten; Namen/Bilder öffnen zuerst deren Profile. Zurück erhält Suchbegriff, Reiter und Listenseite.
- [x] Einstellungen: Zahnrad, deaktivierte Platzhalter, Öffentlich/Privat und Anfrageverwaltung.
- [x] Profil: Benutzername und Profil werden atomar gespeichert. Profil/Training erst nach Annahme; Körperdaten und Ernährung nur für den Besitzer. Private Bereiche werden vollständig ausgeblendet, keine leeren Karten.
- [x] Drei-Konten-Prüfung: drei getrennte Browser-Sitzungen prüfen Anfrage/Rücknahme/Ablehnung/Annahme, öffentliche Freigabe, direkten API-Zugriff und unveränderte eigene Körper-/Ernährungsansichten. 290 Unit-Tests bestehen.
- [x] Letzter UI-Schritt: anklickbare Follower-/Gefolgt-Zähler öffnen den passenden Reiter. Erneuter Drei-Konten-Browserdurchlauf, Build und Lint bestanden; Doku aktualisiert.

Kein Commit, Push, Online-Migration oder Merge bis zu den angekündigten Befehlen. PR #48 bleibt unverändert.

## Vorheriger abgeschlossener Stand

- [x] Rechenlogik und Scan-Vertrag: 17 fokussierte Vitest-Tests bestehen.
- [x] Migration und pgTAP: nach lokalem Reset bestehen alle 185 Tests; Typen aus lokalem Schema generiert.
- [x] Tagebuch und Ziele: Tagessummen, Profilvorschläge und Speicherung implementiert; Browserprüfung mit Neuladen bestanden.
- [x] Gemini-Analyse: Einwilligung, Bildverarbeitung, Korrektur und Fehlerpfade geprüft. Erfolgreiche KI-Antwort im Browser simuliert.
- [x] Integration: nach Übernahme des aktuellen `main` bestehen alle 265 Unit-Tests, Lint und vollständiger Build; responsive Browserprüfung abgeschlossen.

Betriebsvoraussetzung: Gemini-Key lokal bzw. als Function-Secret einrichten und anschließend einen echten Anbieter-Smoke-Test durchführen. Online-Migration und Deployment bleiben beim Projekt-Owner; der Pull Request benötigt die Bestätigung `migration-online`.
