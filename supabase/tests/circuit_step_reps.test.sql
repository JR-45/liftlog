begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(5);

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-0000000000c2', 'zirkel-wdh@test.local');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c2","role":"authenticated"}', true);

select lives_ok($$select public.save_training_plan('[{"weekday":5,"name":"Kettlebell","exercises":[
  {"name":"Kettlebell Complex","tracking_type":"weight_reps","sets_min":4,"sets_max":5,"reps_min":15,"reps_max":15,
   "steps":["Swing","Thruster"],"step_reps":[10,5]}
]}]')$$, 'Zirkel mit Wiederholungen je Bewegung speichern');
select is((select step_reps from plan_exercises), array[10, 5]::smallint[], 'Wiederholungen je Bewegung gespeichert');

select throws_ok($$select public.save_training_plan('[{"weekday":5,"name":"Kettlebell","exercises":[
  {"name":"Kettlebell Complex","tracking_type":"weight_reps","sets_min":4,"sets_max":5,"reps_min":15,"reps_max":15,
   "steps":["Swing","Thruster"],"step_reps":[10]}
]}]')$$, '22023', null, 'Anzahl muss zu den Bewegungen passen');
select throws_ok($$select public.save_training_plan('[{"weekday":5,"name":"Kettlebell","exercises":[
  {"name":"Kettlebell Complex","tracking_type":"weight_reps","sets_min":4,"sets_max":5,"reps_min":15,"reps_max":15,
   "steps":["Swing","Thruster"],"step_reps":[10,0]}
]}]')$$, '22023', null, 'Null Wiederholungen werden abgelehnt');
select throws_ok($$select public.save_training_plan('[{"weekday":5,"name":"Kettlebell","exercises":[
  {"name":"Plank","tracking_type":"duration","sets_min":3,"sets_max":3,"duration_min":30,"duration_max":60,"steps":["Halten"]}
]}]')$$, '22023', null, 'Dauerübungen können kein Zirkel sein');

select * from finish();
rollback;
