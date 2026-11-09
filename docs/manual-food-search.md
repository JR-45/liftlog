# Lebensmittelsuche in der manuellen Eingabe

Die manuelle Scanner-Eingabe sucht nach 300 ms Pause ab zwei Zeichen. Bis zu sechs Vorschläge erscheinen direkt unter dem Namen. Die Auswahl übernimmt die verfügbaren Werte pro 100 g; Grammzahl und alle sechs Nährwerte bleiben bearbeitbar. Darunter steht die unmittelbar berechnete Portion. Zucker und Ballaststoffe verwenden die bereits auf main vorhandenen Felder und werden mit der Mahlzeit gespeichert.

Eine Suche allein verändert keine eingegebenen Nährwerte. Nur die ausdrückliche Auswahl eines Vorschlags ersetzt sie. Ein neuer Treffer behält die bisherige Grammzahl; ohne Mengenangabe beginnt die Auswahl bei 100 g. Jeder Lebensmittelslot arbeitet unabhängig. Die bestehende Mahlzeiten-UUID und die atomare Funktion `save_meal` verhindern doppelte Einträge bei Doppelklick oder Wiederholung nach einem Netzfehler.

## Datenquelle und Grenzen

- Bestehende Datenquelle: [Open Food Facts](https://world.openfoodfacts.org). Marken und Zubereitungsangaben in Produktnamen bleiben sichtbar. Der Quellenlink führt zum gewählten Produkt.
- Die [Search-a-licious-Suche](https://openfoodfacts.github.io/search-a-licious/users/ref-openapi/) liefert Produktdaten und Präfixsuche. Die klassische OFF-Suche wird nicht für Autovervollständigung verwendet, weil die [API-Regeln](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/index.md) dies ausdrücklich ausschließen.
- Die Such-API erlaubt aktuell keine direkten Browseraufrufe per CORS. Deshalb vermittelt die angemeldete Supabase-Funktion `food-search`. Ausschließlich der Suchbegriff geht an OFF, keine Sitzung, Kontodaten oder gespeicherte Mahlzeit.
- Keine eigenen oder KI-generierten Nährwerte. Fehlende Ballaststoff- oder Zuckerwerte bleiben leer; vor dem Speichern muss der Nutzer sie ergänzen. Auch ohne Treffer und bei einem Dienstausfall bleibt die manuelle Eingabe möglich.
- Treffer benötigen die vier Grundwerte. Explizite Angaben pro 100 ml werden ausgeschlossen: Ohne Dichte ist eine Umrechnung in Gramm nicht zuverlässig. Die Datenqualität und Vollständigkeit hängen von den jeweiligen OFF-Produkteinträgen ab.
- Reine Schreibvarianten und gebräuchliche Präfixe werden normalisiert. Unterschiedliche Zubereitungen werden nicht zu einem Lebensmittel zusammengeführt.

## Betrieb

Neue Edge Function: `supabase/functions/food-search/`. Keine neue Datenbankmigration, kein zusätzlicher API-Schlüssel und keine neue Abhängigkeit.

Der Projekt-Owner stellt die Funktion online bereit:

```sh
bunx supabase functions deploy food-search
```

`FOOD_SEARCH_ALLOWED_ORIGINS` enthält die erlaubten App-Ursprünge, durch Komma getrennt. Alternativ übernimmt die Funktion `FOOD_SCAN_ALLOWED_ORIGINS`. Ohne beide Variablen gelten ausschließlich localhost und 127.0.0.1 auf den Ports 5173 und 5176. Die produktive App-URL und gegebenenfalls konkrete Preview-URLs müssen freigegeben sein. JWT-Prüfung im Gateway und serverseitiges `getUser` bleiben eingeschaltet; anonyme Konten erhalten keine Suche.

Lokal startet `bunx supabase functions serve food-search` die Funktion. Supabase und Vite müssen laufen. Ein Cache mit zehn Minuten Gültigkeit und höchstens 100 Suchbegriffen hält öffentliche Ergebnisse im Browser und je Edge-Worker. Ein zusätzliches Worker-Limit begrenzt einen Nutzer auf 60 Suchanfragen pro Minute; es ist keine globale, workerübergreifende Quote. Fehler werden nicht gecacht. Request-Größen, Upstream-Antworten und Zeitlimits sind begrenzt.

## Prüfung

Unit-Tests prüfen deutsche Suchbegriffe, Ergebnisreihenfolge, fehlende Werte, sechs Nährwerte, Mengenänderung, manuelle Korrektur, Cache und Abbruch. Handler-Tests prüfen Anmeldung, CORS, Eingabegrenzen und Anbieterfehler.

Der lokale Browserlauf prüft zusätzlich einen echten OFF-Aufruf über die Edge Function. Simulierte Suchantworten prüfen anschließend schnelle Texteingabe, veraltete Antworten und Fehler reproduzierbar. Speicherung und Wiederladen erfolgen gegen die echte lokale Datenbank; ein fehlgeschlagener Speicherversuch und ein doppeltes Absenden erzeugen dieselbe Mahlzeiten-ID.
