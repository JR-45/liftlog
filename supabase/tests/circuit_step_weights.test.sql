begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(5);

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-0000000000c3', 'zirkel-kg@test.local');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c3","role":"authenticated"}', true);

select lives_ok($$select public.save_training_plan('[{"weekday":5,"name":"Kettlebell","exercises":[
  {"name":"Kettlebell Complex","tracking_type":"weight_reps","sets_min":4,"sets_max":5,"reps_min":20,"reps_max":20,
   "steps":["Push-Up","Swing","Thruster"],"step_reps":[5,10,5],"step_weights":[null,16,12.5]}
]}]')$$, 'Zirkel mit Gewicht je Bewegung speichern');
select is((select step_weights from plan_exercises), array[null, 16, 12.5]::numeric(6, 2)[], 'Gewichte mit Lücken gespeichert');

select lives_ok($$select public.save_training_plan('[{"weekday":5,"name":"Kettlebell","exercises":[
  {"name":"Kettlebell Complex","tracking_type":"weight_reps","sets_min":4,"sets_max":5,"reps_min":10,"reps_max":10,
   "steps":["Push-Up","Burpee"],"step_reps":[5,5],"step_weights":[null,null]}
]}]')$$, 'Zirkel ganz ohne Gewicht speichern');
select is((select step_weights from plan_exercises), null, 'Nur leere Gewichte werden nicht gespeichert');

select throws_ok($$select public.save_training_plan('[{"weekday":5,"name":"Kettlebell","exercises":[
  {"name":"Kettlebell Complex","tracking_type":"weight_reps","sets_min":4,"sets_max":5,"reps_min":10,"reps_max":10,
   "steps":["Swing"],"step_reps":[10],"step_weights":[-1]}
]}]')$$, '22023', null, 'Negatives Gewicht wird abgelehnt');

select * from finish();
rollback;
