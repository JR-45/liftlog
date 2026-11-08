-- Zirkel: Eine Übung kann eine Liste von Bewegungen haben, die pro Runde nacheinander gemacht werden.
-- Erfasst wird weiter pro Runde (ein Satz je Runde), die Bewegungen sind nur die Anleitung.
alter table public.plan_exercises
  add column steps text[] check (steps is null or cardinality(steps) between 1 and 20);

create or replace function public.save_training_plan(days jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  day jsonb;
  entry jsonb;
  day_id uuid;
  exercise_id uuid;
  exercise_type text;
  pos integer;
  entry_steps text[];
begin
  if uid is null then
    raise exception 'Login erforderlich' using errcode = '42501';
  end if;
  -- Gleichzeitige Speichervorgänge desselben Users werden nacheinander ausgeführt.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 0));
  if days is null or jsonb_typeof(days) <> 'array' then
    raise exception 'Trainingstage müssen eine Liste sein' using errcode = '22023';
  end if;
  if jsonb_array_length(days) > 7 or
     (select count(distinct (d->>'weekday')::int) from jsonb_array_elements(days) d) <> jsonb_array_length(days) then
    raise exception 'Jeder Wochentag darf nur einmal vorkommen' using errcode = '22023';
  end if;

  delete from public.plan_days
  where user_id = uid and weekday not in (select (d->>'weekday')::int from jsonb_array_elements(days) d);

  for day in select value from jsonb_array_elements(days) loop
    if jsonb_typeof(day->'exercises') is distinct from 'array' or jsonb_array_length(day->'exercises') = 0 then
      raise exception 'Jeder Trainingstag braucht mindestens eine Übung' using errcode = '22023';
    end if;
    if (select count(distinct btrim(e->>'name')) from jsonb_array_elements(day->'exercises') e)
       <> jsonb_array_length(day->'exercises') then
      raise exception 'Jede Übung darf pro Tag nur einmal vorkommen' using errcode = '22023';
    end if;
    insert into public.plan_days (user_id, weekday, name)
    values (uid, (day->>'weekday')::smallint, btrim(day->>'name'))
    on conflict (user_id, weekday) do update set name = excluded.name
    returning id into day_id;

    delete from public.plan_exercises where plan_day_id = day_id and user_id = uid;
    pos := 0;
    for entry in select value from jsonb_array_elements(day->'exercises') loop
      pos := pos + 1;
      insert into public.exercises (user_id, name, tracking_type)
      values (uid, btrim(entry->>'name'), entry->>'tracking_type')
      on conflict (user_id, name) do nothing;
      select e.id, e.tracking_type into exercise_id, exercise_type
      from public.exercises e where e.user_id = uid and e.name = btrim(entry->>'name');
      if exercise_type is distinct from entry->>'tracking_type' then
        raise exception 'Die Übung „%“ existiert mit anderer Erfassung. Bitte anderen Namen wählen.', entry->>'name'
          using errcode = '22023';
      end if;
      if (entry->>'sets_min')::int not between 1 and 100 or
         (entry->>'sets_max')::int not between 1 and 100 then
        raise exception 'Sätze müssen zwischen 1 und 100 liegen' using errcode = '22023';
      end if;
      if exercise_type = 'duration' then
        if (entry->>'reps_min') is not null or (entry->>'reps_max') is not null then
          raise exception 'Dauerübungen dürfen keine Wiederholungsvorgabe haben' using errcode = '22023';
        end if;
      elsif (entry->>'duration_min') is not null or (entry->>'duration_max') is not null then
        raise exception 'Wiederholungsübungen dürfen keine Dauervorgabe haben' using errcode = '22023';
      end if;
      -- Bewegungen machen aus einer Übung einen Zirkel mit Runden, z. B. ein Kettlebell Complex.
      entry_steps := null;
      if entry ? 'steps' and jsonb_typeof(entry->'steps') = 'array' and jsonb_array_length(entry->'steps') > 0 then
        select array_agg(btrim(s) order by n) into entry_steps
        from jsonb_array_elements_text(entry->'steps') with ordinality as t(s, n);
        if cardinality(entry_steps) > 20 or
           exists (select 1 from unnest(entry_steps) s where char_length(s) not between 1 and 60) then
          raise exception 'Ein Zirkel hat höchstens 20 Bewegungen mit je 1 bis 60 Zeichen' using errcode = '22023';
        end if;
      end if;
      insert into public.plan_exercises (
        user_id, plan_day_id, exercise_id, alternative_exercise_id, position,
        sets_min, sets_max, reps_min, reps_max, duration_min, duration_max, steps
      ) values (
        uid, day_id, exercise_id, (entry->>'alternative_exercise_id')::uuid, pos,
        (entry->>'sets_min')::smallint, (entry->>'sets_max')::smallint,
        (entry->>'reps_min')::smallint, (entry->>'reps_max')::smallint,
        (entry->>'duration_min')::int, (entry->>'duration_max')::int, entry_steps
      );
    end loop;
  end loop;
end;
$$;
revoke all on function public.save_training_plan(jsonb) from public, anon;
grant execute on function public.save_training_plan(jsonb) to authenticated;
