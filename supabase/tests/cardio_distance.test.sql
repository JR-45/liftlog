-- Strecke, Rückgabe beim nächsten Training und bestehende Benutzertrennung.
begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(9);
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into exercises (id, name, tracking_type) values ('a0000000-0000-0000-0000-000000000001', 'Joggen', 'duration');
insert into workouts (id, performed_on) values ('a0000000-0000-0000-0000-000000000011', '2026-11-05');
insert into sets (workout_id, exercise_id, set_number, duration_seconds, distance_km) values
  ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 1, 1500, 5.5);
select is((select distance_km from sets), 5.5::numeric, 'Kilometer werden gespeichert');
select is((select distance_km from last_performance('2026-11-07')), 5.5::numeric, 'Letzte Leistung enthält Kilometer');
select throws_ok($$update sets set distance_km = 0$$, '23514', null, 'Null Kilometer sind ungültig');
select throws_ok($$update sets set distance_km = -1$$, '23514', null, 'Negative Kilometer sind ungültig');
select throws_ok($$update sets set distance_km = 2001$$, '23514', null, 'Obergrenze wird geprüft');
select throws_ok($$update sets set duration_seconds = 0$$, '23514', null, 'Strecke braucht positive Dauer');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty($$select distance_km from sets$$, 'Fremde Strecke ist unsichtbar');
select is_empty($$update sets set distance_km = 99 returning id$$, 'Fremde Strecke kann nicht geändert werden');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
update sets set distance_km = null;
select is((select distance_km from sets), null::numeric, 'Bestehende Dauer-Erfassung bleibt ohne Strecke gültig');
select * from finish();
rollback;
