begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(17);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'plan-a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'plan-b@test.local');

set local role anon;
select throws_ok($$select public.save_training_plan('[]')$$, '42501', null, 'Anonymes Speichern ist gesperrt');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from plan_days), 0, 'Neue Konten beginnen ohne Plan');
select lives_ok($$select public.save_training_plan('[{"weekday":1,"name":"Oberkörper","exercises":[
  {"name":"Bankdrücken","tracking_type":"weight_reps","sets_min":3,"sets_max":3,"reps_min":8,"reps_max":12}
]}]')$$, 'Eigenen Plan erstellen');
select is((select count(*)::int from plan_exercises), 1, 'Übung gespeichert');
insert into workouts (id, plan_day_id, performed_on)
select 'cccccccc-0000-0000-0000-000000000003', id, '2026-11-07' from plan_days;
insert into sets (workout_id, exercise_id, set_number, reps, weight_kg)
select 'cccccccc-0000-0000-0000-000000000003', id, 1, 10, 50 from exercises;

select lives_ok($$select public.save_training_plan('[{"weekday":1,"name":"Push","exercises":[
  {"name":"Bankdrücken","tracking_type":"weight_reps","sets_min":4,"sets_max":4,"reps_min":6,"reps_max":10},
  {"name":"Plank","tracking_type":"duration","sets_min":3,"sets_max":3,"duration_min":30,"duration_max":60}
]}]')$$, 'Plan bearbeiten und Übung ergänzen');
select is((select name from plan_days), 'Push', 'Name geändert');
select is((select count(*)::int from workouts w join plan_days d on w.plan_day_id = d.id), 1, 'Tag behält seine ID');
select is((select count(*)::int from exercises where name = 'Bankdrücken'), 1, 'Übung behält ihre ID');
select is((select sets_max::int from plan_exercises pe join exercises e on e.id = pe.exercise_id where e.name = 'Bankdrücken'), 4, 'Vorgabe aktualisiert');

select throws_ok($$select public.save_training_plan('[{"weekday":1,"name":"Defekt","exercises":[
  {"name":"Bankdrücken","tracking_type":"weight_reps","sets_min":4,"sets_max":2}
]}]')$$, '23514', null, 'Ungültige Vorgaben werden abgelehnt');
select is((select count(*)::int from plan_exercises), 2, 'Fehler rollt gesamten Speichervorgang zurück');
select throws_ok($$select public.save_training_plan('[{"weekday":1,"name":"Defekt","exercises":[
  {"name":"Bankdrücken","tracking_type":"reps","sets_min":3,"sets_max":3}
]}]')$$, '22023', null, 'Bestehende Erfassung wird nicht versehentlich geändert');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.save_training_plan('[]');
select is((select count(*)::int from plan_days), 0, 'B sieht und löscht keinen fremden Plan');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from plan_days), 1, 'Plan von A bleibt erhalten');
select public.save_training_plan('[]');
select is((select count(*)::int from plan_days), 0, 'Plan gelöscht');
select is((select count(*)::int from sets), 1, 'Trainingshistorie bleibt erhalten');
select lives_ok($$select public.save_training_plan('[{"weekday":3,"name":"Neuer Plan","exercises":[
  {"name":"Bankdrücken","tracking_type":"weight_reps","sets_min":3,"sets_max":3,"reps_min":8,"reps_max":12}
]}]')$$, 'Nach Löschen neuen Plan anlegen');

select * from finish();
rollback;
