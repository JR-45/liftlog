begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(5);

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-0000000000c1', 'zirkel@test.local');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

select lives_ok($$select public.save_training_plan('[{"weekday":5,"name":"Kettlebell","exercises":[
  {"name":"Kettlebell Complex","tracking_type":"weight_reps","sets_min":4,"sets_max":5,"reps_min":5,"reps_max":5,
   "steps":[" Swing ","Clean","Thruster"]},
  {"name":"Plank","tracking_type":"duration","sets_min":3,"sets_max":3,"duration_min":30,"duration_max":60}
]}]')$$, 'Zirkel mit Bewegungen speichern');
select is((select steps from plan_exercises pe join exercises e on e.id = pe.exercise_id where e.name = 'Kettlebell Complex'),
  array['Swing', 'Clean', 'Thruster'], 'Bewegungen bleiben in Reihenfolge und ohne Leerzeichen');
select is((select steps from plan_exercises pe join exercises e on e.id = pe.exercise_id where e.name = 'Plank'),
  null, 'Normale Übungen haben keine Bewegungen');

select throws_ok($$select public.save_training_plan('[{"weekday":5,"name":"Kettlebell","exercises":[
  {"name":"Kettlebell Complex","tracking_type":"weight_reps","sets_min":4,"sets_max":5,"reps_min":5,"reps_max":5,"steps":["Swing","  "]}
]}]')$$, '22023', null, 'Leere Bewegung wird abgelehnt');

select lives_ok($$select public.save_training_plan('[{"weekday":5,"name":"Kettlebell","exercises":[
  {"name":"Kettlebell Complex","tracking_type":"weight_reps","sets_min":4,"sets_max":5,"reps_min":5,"reps_max":5,"steps":[]}
]}]')$$, 'Leere Liste macht wieder eine normale Übung');

select * from finish();
rollback;
