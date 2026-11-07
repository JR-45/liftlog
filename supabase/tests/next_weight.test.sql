-- Prüft das Gewicht fürs nächste Mal pro Satz: Historie, Rückgabe und Trennung der User.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(6);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into exercises (id, name, tracking_type) values ('a0000000-0000-0000-0000-000000000001', 'Preacher Curls', 'weight_reps');
insert into workouts (id, performed_on) values ('a0000000-0000-0000-0000-000000000011', '2026-11-05');
insert into sets (workout_id, exercise_id, set_number, weight_kg, reps) values
  ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 1, 60, 12),
  ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 2, 60, 10);

select is((select next_weight_kg from sets where set_number = 1), null::numeric, 'Ohne Entscheidung bleibt das Feld leer');

update sets set next_weight_kg = 62.5 where set_number = 1;

select is((select weight_kg from sets where set_number = 1), 60.00, 'Das gestemmte Gewicht bleibt erhalten');
select results_eq(
  $$select set_number::int, weight_kg, next_weight_kg from public.last_performance('2026-11-07') order by set_number$$,
  $$values (1, 60.00::numeric, 62.50::numeric), (2, 60.00::numeric, null::numeric)$$,
  'last_performance liefert die Entscheidung pro Satz'
);
select throws_ok(
  $$update sets set next_weight_kg = -1 where set_number = 1$$,
  '23514', null, 'Negatives Gewicht ist nicht möglich'
);

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty($$update sets set next_weight_kg = 999 returning id$$, 'B kann die Entscheidung von A nicht ändern');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select next_weight_kg from sets where set_number = 1), 62.50, 'Der Wert von A ist unverändert');

select * from finish();
rollback;
