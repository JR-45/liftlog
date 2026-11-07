-- Gewichtshilfe, z. B. Klimmzüge an der Maschine: Hier bedeutet weniger Gewicht mehr Fortschritt.
--
-- Die Hilfe steht als positiver Wert in denselben Gewichtsspalten. Die Bedeutung liefert
-- exercises.tracking_type für den aktuellen Stand und sets.is_assisted für jeden einzelnen Satz.
-- Der Satz speichert das selbst, damit alte Einträge korrekt bleiben, wenn die Übung später
-- wieder mit normalem Gewicht trainiert wird.
alter table public.exercises
  drop constraint exercises_tracking_type_check,
  add constraint exercises_tracking_type_check
    check (tracking_type in ('weight_reps', 'assisted_reps', 'reps', 'duration'));

alter table public.sets
  add column is_assisted boolean not null default false,
  add constraint sets_assisted_needs_weight check (not is_assisted or weight_kg is not null);

-- Der Rückgabetyp ändert sich, deshalb reicht create or replace nicht.
drop function public.last_performance(date);

create function public.last_performance(before_date date)
returns table (
  exercise_id      uuid,
  performed_on     date,
  set_number       smallint,
  weight_kg        numeric,
  reps             smallint,
  duration_seconds integer,
  is_assisted      boolean
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
  select s.exercise_id, l.performed_on, s.set_number, s.weight_kg, s.reps, s.duration_seconds, s.is_assisted
  from latest l
  join public.sets s on s.workout_id = l.workout_id and s.exercise_id = l.exercise_id
  order by s.exercise_id, s.set_number;
$$;

revoke all on function public.last_performance(date) from public, anon;
grant execute on function public.last_performance(date) to authenticated;
