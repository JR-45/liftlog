-- Prüft Arbeitsgewicht, Schrittweite und den Schalter „Gewicht tracken“ pro Übung.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(10);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into exercises (id, name, tracking_type) values
  ('a0000000-0000-0000-0000-000000000001', 'Schrägbankpresse', 'weight_reps'),
  ('a0000000-0000-0000-0000-000000000002', 'Hyperextensions', 'reps');
insert into workouts (id, performed_on) values ('a0000000-0000-0000-0000-000000000003', '2026-11-05');

-- Defaults
select is((select current_weight_kg from exercises where id = 'a0000000-0000-0000-0000-000000000001'), null::numeric, 'Arbeitsgewicht ist am Anfang leer');
select is((select weight_step_kg from exercises where id = 'a0000000-0000-0000-0000-000000000001'), 2.50, 'Standard-Schrittweite ist 2,5 kg');

-- Erhöhen: alte Sätze behalten ihr Gewicht
update exercises set current_weight_kg = 60 where id = 'a0000000-0000-0000-0000-000000000001';
insert into sets (workout_id, exercise_id, set_number, weight_kg, reps)
  values ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 1, 60, 12);
update exercises set current_weight_kg = current_weight_kg + weight_step_kg where id = 'a0000000-0000-0000-0000-000000000001';

select is((select current_weight_kg from exercises where id = 'a0000000-0000-0000-0000-000000000001'), 62.50, 'Button + erhöht um die Schrittweite');
select is((select weight_kg from sets where set_number = 1), 60.00, 'Alter Satz behält sein Gewicht');

-- Ungültige Werte
select throws_ok(
  $$update exercises set current_weight_kg = -1 where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Negatives Arbeitsgewicht ist nicht möglich'
);
select throws_ok(
  $$update exercises set weight_step_kg = 0 where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Schrittweite 0 ist nicht möglich'
);

-- Schalter „Gewicht tracken“
update exercises set tracking_type = 'weight_reps' where id = 'a0000000-0000-0000-0000-000000000002';
select is((select tracking_type from exercises where id = 'a0000000-0000-0000-0000-000000000002'), 'weight_reps', 'Gewicht tracken lässt sich einschalten');

update exercises set tracking_type = 'reps' where id = 'a0000000-0000-0000-0000-000000000001';
select is((select weight_kg from sets where set_number = 1), 60.00, 'Ausschalten lässt alte Sätze unverändert');

-- Fremder User
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty($$update exercises set current_weight_kg = 999 returning id$$, 'B kann das Arbeitsgewicht von A nicht ändern');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select current_weight_kg from exercises where id = 'a0000000-0000-0000-0000-000000000001'), 62.50, 'Arbeitsgewicht von A ist unverändert');

select * from finish();
rollback;
