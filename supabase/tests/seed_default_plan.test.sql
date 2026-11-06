-- Prüft den Trainingsplan aus seed_default_plan(): Inhalt, Idempotenz, Trennung der User.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(17);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

-- Rechte
set local role anon;
select throws_ok('select public.seed_default_plan()', '42501', null, 'anon darf den Seed nicht ausführen');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok('select public.seed_default_plan()', 'A kann den Seed ausführen');

-- Umfang
select is((select count(*)::int from plan_days), 5, '5 Trainingstage');
select is((select count(*)::int from exercises), 23, '23 verschiedene Übungen');
select is((select count(*)::int from plan_exercises), 37, '37 Einträge im Plan');
select results_eq(
  'select weekday::int from plan_days order by weekday',
  array[0, 1, 3, 4, 5],
  'Trainingstage sind So, Mo, Mi, Do, Fr'
);

-- Stichproben
select results_eq(
  $$select pe.sets_min::int, pe.sets_max::int, pe.reps_min::int, pe.reps_max::int
    from plan_exercises pe
    join plan_days d on d.id = pe.plan_day_id
    join exercises e on e.id = pe.exercise_id
    where d.weekday = 3 and e.name = 'Klimmzüge'$$,
  $$values (3, 3, 6, 10)$$,
  'Mittwoch: Klimmzüge 3×6–10'
);
select is(
  (select alt.name
   from plan_exercises pe
   join plan_days d on d.id = pe.plan_day_id
   join exercises e on e.id = pe.exercise_id
   join exercises alt on alt.id = pe.alternative_exercise_id
   where d.weekday = 4 and e.name = 'Kniebeugen'),
  'Beinpresse',
  'Donnerstag: Kniebeugen mit Alternative Beinpresse'
);
select results_eq(
  $$select pe.sets_min::int, pe.sets_max::int, pe.duration_min, pe.duration_max
    from plan_exercises pe
    join exercises e on e.id = pe.exercise_id
    where e.name = 'Plank'$$,
  $$values (3, 3, 30, 60)$$,
  'Freitag: Plank 3×30–60 Sekunden'
);

-- Arbeitsgewicht und Schrittweite
select is((select weight_step_kg from exercises where name = 'Seitheben'), 1.00, 'Seitheben: Schrittweite 1 kg');
select is((select weight_step_kg from exercises where name = 'Kettlebell Complex'), 4.00, 'Kettlebell Complex: Schrittweite 4 kg');
select is((select weight_step_kg from exercises where name = 'Schrägbankpresse'), 2.50, 'Standard-Schrittweite 2,5 kg');
select is((select count(*)::int from exercises where current_weight_kg is not null), 0, 'Arbeitsgewicht ist am Anfang leer');

-- Idempotenz: Änderungen des Users überleben einen zweiten Aufruf
update plan_days set name = 'Mein Name' where weekday = 0;
select public.seed_default_plan();
select is((select count(*)::int from plan_exercises), 37, 'Zweiter Aufruf legt nichts doppelt an');
select is((select name from plan_days where weekday = 0), 'Mein Name', 'Zweiter Aufruf überschreibt nichts');

-- Trennung
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty('select id from plan_days', 'B sieht den Plan von A nicht');
select public.seed_default_plan();
select is((select count(*)::int from plan_exercises), 37, 'B bekommt einen eigenen Plan');

select * from finish();
rollback;
