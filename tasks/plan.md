# Umsetzung: Follower im Profil

Spezifikation: [docs/profile-followers.md](../docs/profile-followers.md). Eigene Unterseite mit Zurück-Pfeil und wechselbaren Reitern ist in der lokalen Vorschau bestätigt. Umsetzung und PR sind beauftragt; `main` wurde zuerst abgeglichen. Keine Online-Datenbankänderungen.

1. Freiwillig freigegebene soziale Identitäten und Folgebeziehungen mit RLS und pgTAP absichern. Bestehende private Profile bleiben unverändert geschützt.
2. Typen generieren; API für eigenen Status, paginierte Personenlisten, Suche und Folgeaktionen ergänzen.
3. Profilzähler und Unterseite im bestätigten Layout integrieren. Einstieg bestimmt den aktiven Reiter; beide Reiter bleiben auf derselben Seite.
4. Lokalen Mehrnutzerablauf, Tastatur, Hell-/Dunkelmodus und mobile Breiten prüfen; Lint, Unit-Tests, Build und pgTAP ausführen.
5. Nur zugehörige Dateien committen, erneut `main` abgleichen, Branch pushen und PR mit Migrationshinweis erstellen.

Risiken: Identitäten dürfen nur freigegebene Namen und Bilder enthalten. Nur der Handelnde darf folgen/entfolgen; Listen sind auf eigene Beziehungen beschränkt. Zwei Konten müssen verbunden werden können, ohne bestehende Owner-RLS für Gesundheit oder Training zu öffnen. Das Löschen einer sozialen Identität entfernt Beziehungen per Fremdschlüssel. Abhängigkeiten: Datenmodell → API → Profilintegration → Browserprüfung → PR.
