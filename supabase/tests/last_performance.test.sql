-- Prüft last_performance(): richtiges Training, heutiger Tag ausgeschlossen, Trennung der User.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(7);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

set local role anon;
select throws_ok($$select * from public.last_performance('2026-11-10')$$, '42501', null, 'anon darf die Funktion nicht ausführen');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is_empty($$select * from public.last_performance('2026-11-10')$$, 'Ohne Training keine Daten');

insert into exercises (id, name, tracking_type) values
  ('a0000000-0000-0000-0000-000000000001', 'Preacher Curls', 'weight_reps'),
  ('a0000000-0000-0000-0000-000000000002', 'Plank', 'duration');
insert into workouts (id, performed_on) values
  ('a0000000-0000-0000-0000-000000000011', '2026-11-02'),
  ('a0000000-0000-0000-0000-000000000012', '2026-11-05'),
  ('a0000000-0000-0000-0000-000000000013', '2026-11-10');
insert into sets (workout_id, exercise_id, set_number, weight_kg, reps, duration_seconds) values
  ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 1, 20, 8, null),
  ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 1, null, null, 45),
  ('a0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 1, 25, 12, null),
  ('a0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 2, 25, 11, null),
  ('a0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 1, 30, 6, null);

select results_eq(
  $$select set_number::int, weight_kg, reps::int from public.last_performance('2026-11-10')
    where exercise_id = 'a0000000-0000-0000-0000-000000000001' order by set_number$$,
  $$values (1, 25.00::numeric, 12), (2, 25.00::numeric, 11)$$,
  'Liefert alle Sätze des letzten Trainings vor dem Datum, nicht den heutigen Tag'
);
select is(
  (select duration_seconds from public.last_performance('2026-11-10') where exercise_id = 'a0000000-0000-0000-0000-000000000002'),
  45,
  'Jede Übung bekommt ihr eigenes letztes Training, hier ein älteres'
);
select is(
  (select distinct performed_on from public.last_performance('2026-11-05') where exercise_id = 'a0000000-0000-0000-0000-000000000001'),
  '2026-11-02'::date,
  'Das Datum selbst zählt nicht mit'
);
select is_empty($$select * from public.last_performance('2026-11-01')$$, 'Vor dem ersten Training keine Daten');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty($$select * from public.last_performance('2026-11-10')$$, 'B sieht die Leistungen von A nicht');

select * from finish();
rollback;
