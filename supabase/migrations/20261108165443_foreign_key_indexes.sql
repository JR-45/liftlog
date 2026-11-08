-- Indizes für Fremdschlüssel ohne passenden Index (Supabase-Advisor „unindexed_foreign_keys“).
--
-- Ohne Index muss Postgres beim Löschen eines Workouts, Plantags oder Kontos und bei Abfragen über
-- diese Spalten die ganze Tabelle durchsuchen. Die Indizes ändern keine Daten, Spalten oder Regeln,
-- sie machen Laden und Löschen nur schneller. Die Tabellen sind klein, das Anlegen dauert kaum.

-- Sätze eines Workouts (Laden des Trainingstags, Löschen eines Workouts).
create index if not exists sets_workout_user_idx on public.sets (workout_id, user_id);
-- Alle Daten eines Users (Konto löschen per Cascade).
create index if not exists sets_user_idx on public.sets (user_id);

-- Übungen eines Plantags.
create index if not exists plan_exercises_plan_day_user_idx on public.plan_exercises (plan_day_id, user_id);
create index if not exists plan_exercises_user_idx on public.plan_exercises (user_id);

-- Bestandteile einer Mahlzeit.
create index if not exists meal_items_meal_user_idx on public.meal_items (meal_id, user_id);
create index if not exists meal_items_user_idx on public.meal_items (user_id);

-- Einnahmen eines Supplements.
create index if not exists supplement_intakes_supplement_user_idx on public.supplement_intakes (supplement_id, user_id);
