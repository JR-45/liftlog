begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(9);
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'methods-a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'methods-b@test.local');
set local role anon;
select throws_ok($$select public.save_training_plan_config('[]', 'classic', 'custom')$$, '42501', null, 'Anonymes Speichern gesperrt');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$select public.save_training_plan_config('[{"weekday":1,"name":"Push","exercises":[
  {"name":"Brustpresse","tracking_type":"weight_reps","sets_min":3,"sets_max":3,"reps_min":8,"reps_max":12}
]}]', 'hypertrophy', 'push_pull_legs')$$, 'Methode, Aufteilung und Übungen gemeinsam speichern');
select is((select method from training_plan_settings), 'hypertrophy', 'Methode gespeichert');
select is((select split from training_plan_settings), 'push_pull_legs', 'Aufteilung separat gespeichert');
select throws_ok($$select public.save_training_plan_config('[{"weekday":2,"name":"Defekt","exercises":[
  {"name":"Brustpresse","tracking_type":"weight_reps","sets_min":3,"sets_max":3}
]}]', 'ungueltig', 'custom')$$, '23514', null, 'Unbekannte Methode abgelehnt');
select is((select name from plan_days), 'Push', 'Fehler rollt auch Planänderung zurück');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty('select * from training_plan_settings', 'B sieht keine Einstellungen von A');
select is_empty($$update training_plan_settings set method = 'classic' returning user_id$$, 'B ändert keine Einstellungen von A');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.save_training_plan_config('[]', 'classic', 'custom');
select is_empty('select * from training_plan_settings', 'Löschen entfernt auch die Einstellungen');
select * from finish();
rollback;
