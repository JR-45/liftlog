-- Prüft das Löschen des eigenen Kontos: alles weg, fremde Konten unberührt, anon darf nicht.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(8);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

-- Beide User legen Daten an
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into profiles (display_name) values ('Anna');
insert into body_measurements (measured_on, weight_kg) values ('2026-11-07', 70);
insert into exercises (name, tracking_type) values ('Kniebeugen', 'weight_reps');
insert into plan_days (weekday, name) values (1, 'Beine');
insert into workouts (performed_on) values ('2026-11-07');
insert into sets (workout_id, exercise_id, set_number, weight_kg, reps)
  select w.id, e.id, 1, 60, 8 from workouts w, exercises e;

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into profiles (display_name) values ('Ben');
insert into exercises (name, tracking_type) values ('Kniebeugen', 'weight_reps');
reset role;

-- anon darf die Funktion nicht aufrufen
set local role anon;
select throws_ok('select public.delete_own_account()', '42501', null, 'anon darf kein Konto löschen');
reset role;

-- A löscht sich selbst
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok('select public.delete_own_account()', 'A kann das eigene Konto löschen');
reset role;

select is((select count(*)::int from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'Konto von A ist weg');
select is((select count(*)::int from profiles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'Profil von A ist weg');
select is((select count(*)::int from body_measurements where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'Körperdaten von A sind weg');
select is((select count(*)::int from sets where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'Sätze von A sind weg');
select is((select count(*)::int from exercises where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'Übungen von A sind weg');
select is((select count(*)::int from profiles where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 1, 'B bleibt unberührt');

select * from finish();
rollback;
