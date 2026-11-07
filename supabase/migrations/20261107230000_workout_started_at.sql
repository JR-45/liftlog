-- Eigene Spalte für den Start der Stoppuhr.
--
-- Bisher galt created_at als Start, und eine zurückgesetzte Uhr wurde als finished_at = created_at
-- gespeichert. Das hat created_at verändert, nach dem last_performance zwei Trainings am selben
-- Tag sortiert. Jetzt bleibt created_at der Anlagezeitpunkt, und die Uhr hat eigene Werte:
--   started_at null  -> Uhr nicht gestartet oder zurückgesetzt
--   started_at gesetzt, finished_at null -> Uhr läuft
--   beide gesetzt    -> Training beendet, Dauer = finished_at - started_at
alter table public.workouts add column started_at timestamptz;

-- Bestehende Trainings übernehmen den bisherigen Start. Zurückgesetzte Uhren (finished_at = created_at)
-- werden zu „nicht gestartet“.
update public.workouts
set started_at = case when finished_at = created_at then null else created_at end,
    finished_at = case when finished_at = created_at then null else finished_at end;
