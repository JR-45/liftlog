-- Prüft die Mandantentrennung: User B darf die Daten von User A weder sehen noch
-- verändern noch darauf verweisen. Ausführen mit: bunx supabase test db
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(16);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

-- Grundlagen: RLS auf jeder Tabelle aktiv
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and rowsecurity),
  (select count(*)::int from pg_tables where schemaname = 'public'),
  'RLS ist auf allen Tabellen in public aktiv'
);

-- User A legt Daten an
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into exercises (id, name, tracking_type) values ('a0000000-0000-0000-0000-000000000001', 'Kniebeugen', 'weight_reps');
insert into plan_days (id, weekday, name) values ('a0000000-0000-0000-0000-000000000002', 4, 'Donnerstag');
insert into plan_exercises (plan_day_id, exercise_id, position, sets_min, sets_max, reps_min, reps_max)
  values ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1, 3, 3, 8, 10);
insert into workouts (id, plan_day_id, performed_on) values ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '2026-11-05');
insert into sets (workout_id, exercise_id, set_number, weight_kg, reps) values ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 1, 60, 10);

select is((select count(*)::int from sets), 1, 'A sieht den eigenen Satz');
select is((select user_id from sets), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'user_id wird per Default aus dem Login gesetzt');

-- User B: Lesen
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is_empty('select id from exercises', 'B sieht keine exercises von A');
select is_empty('select id from plan_days', 'B sieht keine plan_days von A');
select is_empty('select id from plan_exercises', 'B sieht keine plan_exercises von A');
select is_empty('select id from workouts', 'B sieht keine workouts von A');
select is_empty('select id from sets', 'B sieht keine sets von A');

-- User B: Schreiben
select is_empty($$update exercises set name = 'x' returning id$$, 'B kann exercises von A nicht ändern');
select is_empty('delete from sets returning id', 'B kann sets von A nicht löschen');

select throws_ok(
  $$insert into exercises (user_id, name, tracking_type) values ('aaaaaaaa-0000-0000-0000-000000000001', 'fake', 'reps')$$,
  '42501', null, 'RLS blockt Insert unter fremder user_id'
);

-- User B: Verweise auf fremde Zeilen, die RLS allein nicht abfangen würde
insert into exercises (id, name, tracking_type) values ('b0000000-0000-0000-0000-000000000001', 'B-Übung', 'weight_reps');

select throws_ok(
  $$insert into sets (workout_id, exercise_id, set_number, reps) values ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 1, 5)$$,
  '23503', null, 'FK blockt Satz an fremdem Workout'
);
select throws_ok(
  $$insert into workouts (plan_day_id, performed_on) values ('a0000000-0000-0000-0000-000000000002', '2026-11-06')$$,
  '23503', null, 'FK blockt Workout auf fremdem Trainingstag'
);

-- Nicht eingeloggt
reset role;
set local role anon;
select throws_ok('select id from exercises', '42501', null, 'anon liest keine exercises');
select throws_ok('select id from sets', '42501', null, 'anon liest keine sets');

-- Prüfung aus Sicht des Besitzers: Die Daten von A sind unverändert vorhanden
reset role;
select is(
  (select name from exercises where id = 'a0000000-0000-0000-0000-000000000001'),
  'Kniebeugen',
  'Die Angriffe von B haben die Daten von A nicht verändert'
);

select * from finish();
rollback;
