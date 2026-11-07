-- Prüft die Gewichtshilfe: Erfassungsart, Historie der Sätze und Trennung der User.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(7);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into exercises (id, name, tracking_type, current_weight_kg) values
  ('a0000000-0000-0000-0000-000000000001', 'Klimmzüge', 'assisted_reps', 30);
insert into workouts (id, performed_on) values
  ('a0000000-0000-0000-0000-000000000011', '2026-11-02'),
  ('a0000000-0000-0000-0000-000000000012', '2026-11-05');

select throws_ok(
  $$insert into exercises (name, tracking_type) values ('x', 'unbekannt')$$,
  '23514', null, 'Unbekannte Erfassungsart ist nicht möglich'
);
select throws_ok(
  $$insert into sets (workout_id, exercise_id, set_number, reps, is_assisted)
    values ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 9, 5, true)$$,
  '23514', null, 'Satz mit Gewichtshilfe braucht ein Gewicht'
);

insert into sets (workout_id, exercise_id, set_number, weight_kg, reps, is_assisted) values
  ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 1, 30, 8, true);
insert into sets (workout_id, exercise_id, set_number, reps) values
  ('a0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 1, 6);

select is((select is_assisted from sets where reps = 6), false, 'Sätze sind ohne Angabe keine Hilfe-Sätze');

-- Die Hilfe sinkt, der alte Satz bleibt
update exercises set current_weight_kg = current_weight_kg - weight_step_kg where name = 'Klimmzüge';
select is((select current_weight_kg from exercises where name = 'Klimmzüge'), 27.50, 'Hilfe lässt sich senken');
select results_eq(
  $$select weight_kg, is_assisted from public.last_performance('2026-11-03')$$,
  $$values (30.00::numeric, true)$$,
  'last_performance liefert Hilfe und Gewicht des alten Satzes'
);

-- Wechsel zurück auf normales Gewicht ändert die Historie nicht
update exercises set tracking_type = 'weight_reps' where name = 'Klimmzüge';
select is((select is_assisted from sets where reps = 8), true, 'Alter Hilfe-Satz bleibt ein Hilfe-Satz');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty($$update exercises set tracking_type = 'reps' returning id$$, 'B kann die Erfassungsart von A nicht ändern');

select * from finish();
rollback;
