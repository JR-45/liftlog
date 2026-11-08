# LiftLog

Web-App fürs iPhone, um Krafttraining zu tracken: Sätze eintragen, das letzte Training sehen, Gewicht steigern, Pausen
timen und im Kalender sehen, an welchen Tagen trainiert wurde.

**Technik:** React, TypeScript, Vite, Tailwind CSS, Supabase (Postgres und Auth), Bun, Vercel

## Lokal einrichten

Du brauchst [Bun](https://bun.sh) und [Docker Desktop](https://www.docker.com/products/docker-desktop/). Docker muss laufen.

```bash
git clone https://github.com/JR-45/liftlog.git
cd liftlog
bun install
bunx supabase start
```

Beim ersten Start lädt `supabase start` einige Minuten lang Docker-Images. Danach läuft eine eigene Test-Datenbank auf
deinem Rechner, inklusive aller Migrationen. Sie ist komplett von der Online-Datenbank getrennt.

Lokale Zugangsdaten in die von Git ignorierte Datei `.env.local` schreiben:

```bash
bunx supabase status -o env | sed -n -E 's/^API_URL="?([^"]*)"?$/VITE_SUPABASE_URL=\1/p; s/^PUBLISHABLE_KEY="?([^"]*)"?$/VITE_SUPABASE_PUBLISHABLE_KEY=\1/p' > .env.local
```

App starten:

```bash
bun run dev
```

Die App läuft dann auf <http://localhost:5173>.

### Test-Konto anlegen

Die App hat keine Registrierung. Lege ein lokales Konto in Supabase Studio an:

1. Öffne <http://localhost:54323>.
2. Geh zu **Authentication → Users → Add user → Create new user**.
3. Gib eine beliebige E-Mail und ein Passwort ein und melde dich damit in der App an.

Beim ersten Login öffnet sich die Trainingsplan-Erstellung. Lege Trainingstage mit Übungen, Satzanzahl und optionalen
Wiederholungs- oder Dauervorgaben an. Der Plan wird im Benutzerkonto gespeichert. Unter **Trainingsplan** kannst du ihn
später bearbeiten, löschen und neu anlegen. Bisherige Trainingsdaten bleiben dabei erhalten.

Die Oberfläche passt sich der Fenstergröße an: Smartphones haben eine Navigation unten, Tablets mehrspaltige Inhalte und
Notebooks ab 1024 Pixeln eine Seitenleiste.
Die Darstellung berücksichtigt Bildschirmränder mit Aussparungen, Tastaturbedienung und reduzierte Animationen.

Unter **Trainingsplan** steht oben die Wochenplanung und darunter die **Wochenvorlage**. In der Vorlage tippst du auf einen Wochentag und legst Name und Übungen fest. **Tag speichern** speichert
den Tag direkt im Konto. Zurück/Weiter und horizontales Wischen wechseln zwischen den Übungen. Eigene Übungen, Erfassung
und Satzbereiche stehen unter **Mehr Optionen**.

Im Training kommt die Satzanzahl jeder Übung aus dem Trainingsplan. Du änderst sie im Planeditor, nicht während des
Trainings. Einen gespeicherten Satz nimmst du mit dem Haken zurück, die ganze Übung mit „Übung zurücksetzen“.

In der **Wochenplanung** wählst du eine Kalenderwoche und planst Training und Ruhetage für jeden Tag.
Neue Wochen übernehmen zunächst die gespeicherte Vorlage. **Woche speichern** speichert nur diese Kalenderwoche.
In der **Wochenvorlage** öffnet jeder Tagesbutton ein eigenes Popup: Dort erstellst du den Trainingsplan für
diesen Tag oder machst ihn zum Ruhetag. Farbig markierte Tagesbuttons enthalten eine Einheit. Der Bereich **Training**
folgt der Wochenplanung: Ein in der Woche verschobener Tag oder Ruhetag erscheint dort genau so. Ohne Änderung gilt
die Vorlage. Sätze werden nur für heute eingetragen.

## Befehle

| Befehl | Zweck |
|---|---|
| `bun run dev` | App lokal starten |
| `bun run lint` | Code prüfen |
| `bun run test` | Unit-Tests |
| `bun run build` | Typen prüfen und bauen |
| `bun run test:db` | Datenbank-Tests, die lokale Datenbank muss laufen |
| `bunx supabase start` / `stop` | Lokale Datenbank starten oder stoppen |
| `bunx supabase db reset` | Lokale Datenbank leeren und alle Migrationen neu einspielen |

## Projektaufbau

| Ordner | Inhalt |
|---|---|
| `src/domain/` | Reine Logik ohne React und Datenbank, mit Unit-Tests |
| `src/features/auth/` | Login |
| `src/features/workout/` | Training, Sätze, Pausentimer, Datenzugriff in `api.ts` |
| `src/features/stats/` | Kalender |
| `src/lib/` | Supabase-Client und generierte Datenbank-Typen |
| `supabase/migrations/` | Alle Änderungen an der Datenbank |
| `supabase/tests/` | Datenbank-Tests mit pgTAP |
| `docs/` | PlantUML-Diagramme, von Hand gepflegt |

## Mitarbeiten

Arbeite auf einem eigenen Branch und nicht direkt auf `main`:

```bash
git switch main
git pull
git switch -c feature/kurzer-name
# ändern und committen
git push -u origin feature/kurzer-name
```

Öffne danach auf GitHub einen Pull Request. Gemergt wird erst, wenn die CI grün ist und jemand anderes kurz drübergeschaut
hat.

### CI

Bei jedem Pull Request und jedem Push auf `main` laufen automatisch Lint, Unit-Tests, Build, alle Migrationen und die
Datenbank-Tests. Die CI nutzt eine eigene Test-Datenbank und kommt nicht an die Online-Datenbank.

- **Scheitert „Pakete installieren“:** Das ist oft nur ein Download-Problem. Starte den Lauf mit **Re-run failed jobs**
  neu.
- **Scheitert ein anderer Schritt:** Dann liegt es wahrscheinlich an der Änderung. Der fehlgeschlagene Schritt nennt die
  Ursache.

### Datenbank ändern

1. Neue Migration anlegen, und bereits gemergte Migrationen nie nachträglich ändern:
   ```bash
   bunx supabase migration new kurzer_name
   ```
2. SQL schreiben, lokal einspielen und Tests in `supabase/tests/` ergänzen:
   ```bash
   bunx supabase db reset
   bun run test:db
   ```
3. Typen neu erzeugen und mitcommitten. Die CI schlägt sonst fehl:
   ```bash
   bunx supabase gen types typescript --local > src/lib/database.types.ts
   ```
4. Im Pull Request deutlich schreiben, dass eine Migration dabei ist.

Neue Tabellen brauchen Row Level Security und eine Policy auf `user_id`, so wie die bestehenden Tabellen. Verweise auf
andere Tabellen laufen über zusammengesetzte Foreign Keys mit `user_id`.

**Online einspielen darf nur der Projekt-Owner, und zwar vor dem Merge.** Sonst fragt die neue App nach Spalten, die es
online noch nicht gibt.

### Secrets

- Nichts Geheimes committen. `.env.local` wird von Git ignoriert.
- Alles mit `VITE_` landet öffentlich im Browser. Dort gehört nur der `sb_publishable_`-Key hin.
- Der `sb_secret_`- bzw. `service_role`-Key gehört nie in den Code, in eine `VITE_`-Variable oder in einen Chat.

## Gemini-Foodscanner

Der Tab „Ernährung“ bietet Fotoanalyse, korrigierbare Lebensmittel und Portionen, ein privates Ernährungstagebuch sowie Tagesziele für Kalorien, Protein, Kohlenhydrate, Fett und Ballaststoffe. Alle Fotoangaben sind Schätzungen. Gemini-Zugangsdaten liegen ausschließlich in einer Supabase Edge Function.

Oben stehen die Tagesziele mit dem, was noch offen ist. Sie werden aus dem Profil berechnet (Kalorien und Protein aus der Körperanalyse, Fett 25 % der Kalorien, Kohlenhydrate der Rest, Ballaststoffe 14 g je 1000 kcal) und ändern sich mit, bis man eigene Ziele speichert. Darunter lassen sich Supplemente und Vitamine pro Tag abhaken (Tabellen `supplements` und `supplement_intakes`). Erreichte Ziele und vollständig abgehakte Supplemente bekommen den DONE-Stempel.

Einrichtung, Datenmodell und Prüfungen: [Foodscanner-Dokumentation](docs/food-scanner.md).
