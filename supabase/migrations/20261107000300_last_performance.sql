-- Liefert pro Übung die Sätze des letzten Trainings vor einem Datum („Letztes Mal: …“).
--
-- Die Logik liegt in der Datenbank, damit das Handy nicht die ganze Historie laden muss.
-- security invoker: RLS bleibt aktiv, jeder User bekommt also nur eigene Sätze.
-- before_date kommt vom Handy, weil die Datenbank in UTC läuft.
create function public.last_performance(before_date date)
returns table (
  exercise_id      uuid,
  performed_on     date,
  set_number       smallint,
  weight_kg        numeric,
  reps             smallint,
  duration_seconds integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest as (
    -- Pro Übung genau ein Workout, auch wenn es am selben Tag mehrere gab.
    select distinct on (s.exercise_id) s.exercise_id, s.workout_id, w.performed_on
    from public.sets s
    join public.workouts w on w.id = s.workout_id
    where w.performed_on < before_date
    order by s.exercise_id, w.performed_on desc, w.created_at desc
  )
  select s.exercise_id, l.performed_on, s.set_number, s.weight_kg, s.reps, s.duration_seconds
  from latest l
  join public.sets s on s.workout_id = l.workout_id and s.exercise_id = l.exercise_id
  order by s.exercise_id, s.set_number;
$$;

revoke all on function public.last_performance(date) from public, anon;
grant execute on function public.last_performance(date) to authenticated;
