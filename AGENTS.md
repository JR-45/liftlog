# AGENTS.md

Shared instructions for every coding agent in this repository (Claude Code, Codex, Antigravity, Gemini CLI, Cursor, …). `CLAUDE.md` and `GEMINI.md` only import this file, so edit rules here.

## Skills

Project skills live in `.agents/skills/<name>/SKILL.md` (frontmatter `name` + `description`, load the full file only when the task matches). `.claude/skills` and `.agent/skills` are symlinks to the same folder. Shared checklists the skills link to are in `.agents/references/`. Add or change skills only in `.agents/skills/`.

## Project

LiftLog is a workout tracker: a mobile-first PWA (used as an installed app on phones, with tablet and laptop layouts) with a React 19 + TypeScript + Vite + Tailwind 4 frontend and Supabase (Auth + Postgres) as the only backend. There is no custom server. UI text, code comments, SQL comments and CI step names are all written in **German**; keep it that way. Commit messages are English Conventional Commits (`feat(workout): …`, `fix(…)`, `ci:`, `docs:`).

## Commands

Package manager is **Bun** (`bun.lock`, CI uses `bun install --frozen-lockfile`).

```bash
bun run dev            # Vite dev server
bun run build          # tsc -b + vite build (this is also the typecheck)
bun run lint           # oxlint
bun run test           # vitest run (unit tests in src/domain/*.test.ts)
bunx vitest run src/domain/sets.test.ts      # single test file
bunx vitest run -t "stepWeight"              # tests matching a name

bunx supabase start    # local Supabase (Docker), applies all migrations; Studio on http://localhost:54323
bunx supabase db reset # wipe local DB and re-apply all migrations
bun run test:db        # pgTAP tests in supabase/tests/*.test.sql
bunx supabase gen types typescript --local > src/lib/database.types.ts
```

CI (`.github/workflows/ci.yml`) runs lint, unit tests, build, pgTAP tests and **fails if `src/lib/database.types.ts` differs from the generated types**. Regenerate them after every schema migration.

Local env: `.env.local` (gitignored) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (`src/lib/supabase.ts` throws at startup if either is missing). The README has a one-liner that fills it from `bunx supabase status -o env`. There is no sign-up in the app: create a local user in Studio (Authentication → Users). The default plan is seeded on first login.

## Architecture

**Layers:**
- `src/domain/`: pure logic, no React and no Supabase (parsing German decimal input, formatting, weight stepping, progression rule, calendar, timer math). This is the only part with unit tests. New logic belongs here, tested with Vitest.
- `src/features/*/api.ts`: every Supabase call. Components never call `supabase` directly (except auth and sign-out).
- `src/features/*/*.tsx`: UI. Flow: `App` → `LoginForm` | `HomeScreen` (tabs, weekday picker, rest timer) → `DayView` (loads a plan day, tracks saved sets, opens the next exercise) → `ExerciseCard` (hint, "Geschafft?" question, settings, alternative exercise) → `SetRow` (weight ± step, reps, check button).

**Database** (`supabase/migrations/`, append-only: add a new timestamped migration, never edit old ones):
- Chain: `exercises` → `plan_days` (one per weekday, 0 = Sunday) → `plan_exercises` (targets, optional alternative exercise) → `workouts` (unique per plan day + date) → `sets` (unique per workout + exercise + set number).
- `day_marks` (one per user + day, `kind` is `sick`, `vacation` or `moved`) keeps a calendar day from counting as missed. A saved workout on that day takes precedence.
- Security model: `anon` has no grants, every table has an owner-only RLS policy, `user_id` defaults to `auth.uid()` (the frontend never sends it), and **composite FKs `(id, user_id)`** guarantee rows only reference rows of the same user. Keep this pattern for new tables. `supabase/tests/rls.test.sql` checks RLS is enabled on every table in `public`.
- RPCs are `security invoker` with `set search_path = ''`, and `execute` is revoked from `public` and `anon`. `seed_default_plan()` is idempotent and is called on every load to create the default plan on first login. `last_performance(before_date)` returns the sets from the most recent previous workout per exercise. Changing a function's return type requires `drop function` + `create`.

**Key invariants spread across files:**
- **Dates come from the device** (`localDateString()`), never from the DB, which runs in UTC. `performed_on` has no default.
- A `workouts` row is created lazily by `ensureWorkout` (upsert) only when the first set is saved. Just viewing a day writes nothing.
- Sets are upserted on `(workout_id, exercise_id, set_number)`. Unchecking a set deletes the row.
- `exercises.tracking_type` is one of `weight_reps`, `assisted_reps`, `reps`, `duration`. With `assisted_reps`, weight means assistance, so **less is progress**: every comparison and step direction is inverted (`direction = assisted ? -1 : 1`, min/max swap). Each set stores its own `is_assisted` so history stays correct if the mode changes.
- Progression: `exercises.current_weight_kg` follows the heaviest set (or the lowest assistance). After an exercise, the "Geschafft?" answer writes `sets.next_weight_kg` for each set (null = not answered yet). The next workout prefills each set's weight from `next_weight_kg ?? weight_kg` of the previous one. Saving or changing a set resets `next_weight_kg` to null. `domain/progression.ts` implements double progression (all sets at `reps_max` → recommend increasing).
- Unsaved input is persisted in `localStorage` (`drafts.ts`, keyed by user, date, exercise and set) and survives the app being closed. The rest timer stores its end time (not a counter) so it stays correct after iOS suspends the app. All `localStorage` access is wrapped in try/catch.
- The generated Supabase types do not know the composite-FK embeds or the `tracking_type` union, so `api.ts` casts query results to its own types.

`.github/workflows/keep-database-active.yml` pings the REST API every 3 days so the free Supabase project is not paused. It expects the `42501` permission error as proof the DB is up.

Diagrams: `docs/database.puml` / `docs/database.png` and `docs/code-dependencies.puml`.

## Regeln

Diese Regeln gelten für alle im Team (Jeton, Murat, Osman) und für jeden Agenten, mit dem sie arbeiten. „Der Entwickler“ ist immer die Person, die gerade mit dem Agenten arbeitet.

### Git und Zusammenarbeit
- Keine `Co-Authored-By`-Zeile, keine Agent-Signatur und kein „Generated with …“ in Commits oder PRs. Kein Agent (Claude, Codex, Gemini, …) wird als Autor oder Co-Autor eingetragen.
- Vor jedem `git push` immer zuerst `git pull --rebase` ausführen. Bei Konflikten anhalten und nachfragen, nicht selbst auflösen.
- Nie force-pushen, ohne vorher ausdrücklich zu fragen. Falls doch freigegeben: nur `--force-with-lease`, und vorher prüfen, ob schon jemand auf den umzuschreibenden Commits weitergearbeitet hat.
- `main` ist auf GitHub geschützt: Direkte Pushes werden abgelehnt, Änderungen kommen nur per Pull Request mit grüner CI rein.
- Nicht direkt auf `main` arbeiten: eigener Branch (`feature/kurzer-name`), pushen, Pull Request. Gemergt wird erst, wenn die CI grün ist und jemand anderes drübergeschaut hat.
- Nach dem Merge den Branch lokal und auf GitHub löschen (`git branch -d …`, `git push origin --delete …`), danach `main` pullen.
- Commits: englische Conventional Commits (`feat(workout): …`, `fix(…)`, `ci:`, `docs:`, `chore:`), klein und in sich abgeschlossen.
- Nur committen oder pushen, wenn der Entwickler es verlangt.
- UI-Änderungen vor dem Commit zeigen: lokale Supabase und `bun run dev --host` starten, dem Entwickler die Links für Laptop (`http://localhost:5173`) und Handy (Netzwerk-Adresse aus der Vite-Ausgabe, gleiches WLAN) geben und erst nach dessen OK committen und pushen.

### Datenbank
- Neue Migration mit `bunx supabase migration new kurzer_name`. Bereits gemergte Migrationen nie ändern.
- Danach `bunx supabase db reset`, Tests in `supabase/tests/` ergänzen, `bun run test:db`, Typen neu erzeugen und mitcommitten.
- Neue Tabellen: RLS mit Owner-Policy auf `user_id`, Verweise über zusammengesetzte Foreign Keys mit `user_id`.
- Im Pull Request deutlich schreiben, dass eine Migration dabei ist. Online einspielen darf nur der Projekt-Owner, und zwar vor dem Merge. Ein Agent spielt nie etwas in die Online-Datenbank ein.

### Secrets
- In `VITE_`-Variablen gehört nur der `sb_publishable_`-Key, alles mit `VITE_` landet öffentlich im Browser.
- Der `sb_secret_`- bzw. `service_role`-Key gehört nie in Code, `.env`-Vorlagen, `VITE_`-Variablen oder in den Chat.
- Vor jedem Commit den Diff auf echte Schlüssel prüfen.

### Sprache
- UI-Texte, Code-Kommentare, SQL-Kommentare und CI-Schrittnamen auf Deutsch. Commit-Messages auf Englisch.
