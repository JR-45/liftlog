-- Legt den Standard-Trainingsplan für den eingeloggten User an.
--
-- Der Plan gehört einem User, ein globaler Seed passt deshalb nicht. Das Frontend
-- ruft die Funktion nach dem ersten Login auf.
--
-- security invoker: Die Funktion läuft mit den Rechten des Aufrufers, RLS bleibt also
-- aktiv. search_path = '': Verhindert, dass ein fremdes Schema Objekte unterschiebt.
create function public.seed_default_plan()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'seed_default_plan requires a logged-in user' using errcode = '42501';
  end if;

  -- Idempotent: Ein vorhandener Plan wird nie überschrieben.
  if exists (select 1 from public.plan_days where user_id = uid) then
    return;
  end if;

  insert into public.exercises (user_id, name, tracking_type, weight_step_kg)
  select
    uid, v.name, v.tracking_type,
    case v.name
      when 'Seitheben' then 1
      when 'Kettlebell Complex' then 4
      else 2.5
    end
  from (values
    ('Seitheben', 'weight_reps'),
    ('Klimmzüge', 'weight_reps'),
    ('Schrägbankpresse', 'weight_reps'),
    ('Rudern sitzend', 'weight_reps'),
    ('Butterfly', 'weight_reps'),
    ('Lat-Überzüge', 'weight_reps'),
    ('Schulterdrücken', 'weight_reps'),
    ('Facepulls', 'weight_reps'),
    ('Preacher Curls', 'weight_reps'),
    ('Trizeps Extensions (nach unten)', 'weight_reps'),
    ('Face Away Cable Curls', 'weight_reps'),
    ('Trizepsdrücken über Kopf', 'weight_reps'),
    ('Beinbeuger', 'weight_reps'),
    ('Kreuzheben', 'weight_reps'),
    ('Beinpresse', 'weight_reps'),
    ('Beinstrecker', 'weight_reps'),
    ('Situps (Schrägbank)', 'reps'),
    ('Kniebeugen', 'weight_reps'),
    ('Hyperextensions', 'reps'),
    ('Beinheben hängend', 'reps'),
    ('Kettlebell Complex', 'weight_reps'),
    ('Plank', 'duration'),
    ('Ausdauer', 'duration')
  ) as v (name, tracking_type)
  on conflict (user_id, name) do nothing;

  insert into public.plan_days (user_id, weekday, name)
  select uid, v.weekday, v.name
  from (values
    (0, 'Oberkörper'),
    (1, 'Arme + Beine'),
    (3, 'Oberkörper'),
    (4, 'Arme + Beine'),
    (5, 'Kettlebell + Ausdauer')
  ) as v (weekday, name)
  on conflict (user_id, weekday) do nothing;

  insert into public.plan_exercises (
    user_id, plan_day_id, exercise_id, alternative_exercise_id,
    position, sets_min, sets_max, reps_min, reps_max, duration_min, duration_max
  )
  select
    uid, d.id, e.id, alt.id,
    v.position, v.sets_min, v.sets_max, v.reps_min, v.reps_max, v.duration_min, v.duration_max
  from (
    -- Sonntag und Mittwoch nutzen dieselbe Übungsliste.
    select w.weekday, u.position, u.exercise, null::text as alternative,
           3 as sets_min, 3 as sets_max, u.reps_min, u.reps_max,
           null::int as duration_min, null::int as duration_max
    from (values (0), (3)) as w (weekday)
    cross join (values
      (1, 'Seitheben', 12, 15),
      (2, 'Klimmzüge', 6, 10),
      (3, 'Schrägbankpresse', 8, 12),
      (4, 'Rudern sitzend', 8, 12),
      (5, 'Butterfly', 10, 12),
      (6, 'Lat-Überzüge', 10, 12),
      (7, 'Schulterdrücken', 8, 12),
      (8, 'Facepulls', 12, 15)
    ) as u (position, exercise, reps_min, reps_max)

    union all

    select * from (values
      -- Montag
      (1, 1, 'Preacher Curls', null::text, 3, 3, 8, 12, null::int, null::int),
      (1, 2, 'Trizeps Extensions (nach unten)', null, 3, 3, 8, 12, null, null),
      (1, 3, 'Face Away Cable Curls', null, 3, 3, 10, 12, null, null),
      (1, 4, 'Trizepsdrücken über Kopf', null, 3, 3, 10, 12, null, null),
      (1, 5, 'Beinbeuger', null, 3, 3, 10, 12, null, null),
      (1, 6, 'Kreuzheben', null, 3, 3, 6, 8, null, null),
      (1, 7, 'Beinpresse', null, 3, 3, 8, 12, null, null),
      (1, 8, 'Beinstrecker', null, 3, 3, 10, 12, null, null),
      (1, 9, 'Situps (Schrägbank)', null, 3, 3, 15, 15, null, null),
      -- Donnerstag
      (4, 1, 'Preacher Curls', null, 3, 3, 8, 12, null, null),
      (4, 2, 'Trizeps Extensions (nach unten)', null, 3, 3, 8, 12, null, null),
      (4, 3, 'Face Away Cable Curls', null, 3, 3, 10, 12, null, null),
      (4, 4, 'Trizepsdrücken über Kopf', null, 3, 3, 10, 12, null, null),
      (4, 5, 'Beinbeuger', null, 3, 3, 10, 12, null, null),
      (4, 6, 'Kniebeugen', 'Beinpresse', 3, 3, 8, 10, null, null),
      (4, 7, 'Beinstrecker', null, 3, 3, 10, 12, null, null),
      (4, 8, 'Hyperextensions', null, 3, 3, 12, 15, null, null),
      (4, 9, 'Beinheben hängend', null, 3, 3, 10, 15, null, null),
      -- Freitag: Complex als eine Übung mit Runden, Plank in Sekunden, Ausdauer ohne Vorgabe
      (5, 1, 'Kettlebell Complex', null, 4, 5, 5, 5, null, null),
      (5, 2, 'Plank', null, 3, 3, null, null, 30, 60),
      (5, 3, 'Ausdauer', null, 1, 1, null, null, null, null)
    ) as f
  ) as v (weekday, position, exercise, alternative, sets_min, sets_max, reps_min, reps_max, duration_min, duration_max)
  join public.plan_days d on d.user_id = uid and d.weekday = v.weekday
  join public.exercises e on e.user_id = uid and e.name = v.exercise
  left join public.exercises alt on alt.user_id = uid and alt.name = v.alternative
  on conflict (plan_day_id, position) do nothing;
end;
$$;

-- Funktionen sind per Default für alle ausführbar, deshalb explizit einschränken.
revoke all on function public.seed_default_plan() from public, anon;
grant execute on function public.seed_default_plan() to authenticated;
