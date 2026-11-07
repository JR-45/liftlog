-- Optionale Strecke; bestehende Datensätze und die bestehenden Owner-RLS-Regeln bleiben erhalten.
alter table public.sets
  add column distance_km numeric(7, 3),
  add constraint sets_distance_valid check (
    distance_km is null or (
      distance_km > 0 and distance_km <= 2000
      and duration_seconds is not null and duration_seconds > 0
      and weight_kg is null and reps is null
    )
  );

-- Der zusätzliche Rückgabewert bleibt für bestehende Clients optional.
drop function public.last_performance(date);

create function public.last_performance(before_date date)
returns table (
  exercise_id      uuid,
  performed_on     date,
  set_number       smallint,
  weight_kg        numeric,
  reps             smallint,
  duration_seconds integer,
  is_assisted      boolean,
  next_weight_kg   numeric,
  distance_km      numeric
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
  select s.exercise_id, l.performed_on, s.set_number, s.weight_kg, s.reps, s.duration_seconds, s.is_assisted, s.next_weight_kg, s.distance_km
  from latest l
  join public.sets s on s.workout_id = l.workout_id and s.exercise_id = l.exercise_id
  order by s.exercise_id, s.set_number;
$$;

revoke all on function public.last_performance(date) from public, anon;
grant execute on function public.last_performance(date) to authenticated;
