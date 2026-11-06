-- Erste Migration: Tabellen und Row Level Security (RLS).
--
-- Sicherheitsmodell in drei Ebenen:
--   1. GRANTs: anon darf nichts, authenticated nur SELECT/INSERT/UPDATE/DELETE.
--   2. RLS: Jede Zeile ist nur für ihren Besitzer sichtbar und änderbar.
--   3. Zusammengesetzte Foreign Keys: Eine Zeile kann nur auf Zeilen desselben
--      Users zeigen. RLS allein prüft das nicht, weil FK-Prüfungen RLS umgehen.
--
-- user_id hat den Default auth.uid(), das Frontend muss es also nicht mitsenden.
-- FKs auf exercises nutzen bewusst NO ACTION statt RESTRICT: NO ACTION prüft erst
-- am Ende des Statements, damit das Löschen eines Users per Cascade durchläuft.

-- Übungen ------------------------------------------------------------------
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 100),
  tracking_type text not null check (tracking_type in ('weight_reps', 'reps', 'duration')),
  created_at    timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id) -- Ziel für zusammengesetzte FKs
);

-- Trainingstage ------------------------------------------------------------
create table public.plan_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6), -- 0 = Sonntag
  name       text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, weekday),
  unique (id, user_id)
);

-- Übungen eines Trainingstags mit Vorgabe -----------------------------------
create table public.plan_exercises (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_day_id             uuid not null,
  exercise_id             uuid not null,
  alternative_exercise_id uuid, -- z. B. Kniebeugen oder Beinpresse
  position                smallint not null check (position > 0),
  sets_min                smallint not null check (sets_min > 0),
  sets_max                smallint not null,
  reps_min                smallint check (reps_min > 0),
  reps_max                smallint,
  duration_min            integer check (duration_min > 0), -- Sekunden
  duration_max            integer,
  created_at              timestamptz not null default now(),
  unique (plan_day_id, position),
  check (sets_min <= sets_max),
  check (reps_min <= reps_max),
  check ((reps_min is null) = (reps_max is null)),
  check (duration_min <= duration_max),
  check ((duration_min is null) = (duration_max is null)),
  check (alternative_exercise_id <> exercise_id),
  foreign key (plan_day_id, user_id) references public.plan_days (id, user_id) on delete cascade,
  foreign key (exercise_id, user_id) references public.exercises (id, user_id),
  -- Spaltenliste: Nur die Alternative wird NULL, user_id bleibt erhalten.
  foreign key (alternative_exercise_id, user_id) references public.exercises (id, user_id)
    on delete set null (alternative_exercise_id)
);

-- Absolvierte Trainings -----------------------------------------------------
create table public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_day_id  uuid, -- NULL, wenn der Trainingstag später gelöscht wurde
  performed_on date not null, -- kein Default: Die DB läuft in UTC, das Datum kommt lokal vom Handy
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (plan_day_id, performed_on), -- verhindert doppelte Trainings, z. B. durch Doppeltipp
  unique (id, user_id),
  -- Historie bleibt erhalten, auch wenn der Trainingstag gelöscht wird.
  foreign key (plan_day_id, user_id) references public.plan_days (id, user_id)
    on delete set null (plan_day_id)
);

-- Einzelne Sätze ------------------------------------------------------------
create table public.sets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id       uuid not null,
  exercise_id      uuid not null,
  set_number       smallint not null check (set_number > 0),
  weight_kg        numeric(6, 2) check (weight_kg >= 0),
  reps             smallint check (reps >= 0),
  duration_seconds integer check (duration_seconds >= 0),
  created_at       timestamptz not null default now(),
  unique (workout_id, exercise_id, set_number),
  check (reps is not null or duration_seconds is not null),
  foreign key (workout_id, user_id) references public.workouts (id, user_id) on delete cascade,
  foreign key (exercise_id, user_id) references public.exercises (id, user_id)
);

-- Indizes für FKs und die Abfrage „letzte Leistung pro Übung“ ------------------
create index plan_exercises_exercise_idx on public.plan_exercises (exercise_id, user_id);
create index plan_exercises_alternative_idx on public.plan_exercises (alternative_exercise_id, user_id)
  where alternative_exercise_id is not null;
create index workouts_plan_day_idx on public.workouts (plan_day_id, user_id);
create index workouts_user_performed_idx on public.workouts (user_id, performed_on desc);
create index sets_exercise_idx on public.sets (exercise_id, user_id);

-- Rechte und RLS ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['exercises', 'plan_days', 'plan_exercises', 'workouts', 'sets']
  loop
    -- Supabase vergibt per Default weite Rechte, deshalb hier explizit einschränken.
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

    execute format('alter table public.%I enable row level security', t);

    -- using: welche Zeilen sichtbar sind. with check: welche Zeilen geschrieben werden dürfen.
    -- (select auth.uid()) wird einmal pro Abfrage ausgewertet statt einmal pro Zeile.
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)',
      t || '_owner_only', t
    );
  end loop;
end;
$$;
