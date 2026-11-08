-- Follower sehen nur noch, wann jemand trainiert (Gym-Tage), und den Trainingsplan, wenn er ihn
-- veröffentlicht. Keine Gewichte, Sätze, Rekorde, Körper- oder Ernährungsdaten.
alter table public.social_profiles add column share_plan boolean not null default false;

create or replace view public.shared_profile_overviews with (security_barrier = true) as
select p.user_id, jsonb_build_object(
  'profile', jsonb_build_object('displayName', p.display_name, 'weeklyTarget', coalesce(p.weekly_target, 3)),
  -- Tage mit mindestens einem gespeicherten Satz im letzten Jahr, ohne Inhalte.
  'gymDays', coalesce((select jsonb_agg(distinct w.performed_on order by w.performed_on)
    from public.workouts w
    where w.user_id = p.user_id and w.performed_on >= current_date - 371
      and exists (select 1 from public.sets s where s.workout_id = w.id and s.user_id = w.user_id)), '[]'::jsonb),
  'plan', case when p.user_id = auth.uid() or coalesce(sp.share_plan, false) then coalesce((select jsonb_agg(jsonb_build_object(
      'weekday', d.weekday, 'name', d.name,
      'exercises', coalesce((select jsonb_agg(jsonb_build_object('name', e.name, 'setsMin', pe.sets_min, 'setsMax', pe.sets_max,
          'repsMin', pe.reps_min, 'repsMax', pe.reps_max, 'durationMin', pe.duration_min, 'durationMax', pe.duration_max) order by pe.position)
        from public.plan_exercises pe join public.exercises e on (e.id, e.user_id) = (pe.exercise_id, pe.user_id)
        where pe.plan_day_id = d.id and pe.user_id = d.user_id), '[]'::jsonb)) order by d.weekday)
    from public.plan_days d where d.user_id = p.user_id), '[]'::jsonb) end
) as overview
from public.profiles p
left join public.social_profiles sp on sp.user_id = p.user_id
where auth.uid() is not null and (p.user_id = auth.uid() or exists (
  select 1 from public.follows f where f.user_id = auth.uid() and f.followed_user_id = p.user_id and f.status = 'accepted'
));
revoke all on public.shared_profile_overviews from public, anon, authenticated;
grant select on public.shared_profile_overviews to authenticated;

-- Suche nur über den eindeutigen Benutzernamen, nicht über den Anzeigenamen.
create or replace function public.search_social_accounts(p_query text, p_offset integer default 0)
returns setof public.social_directory language sql security invoker set search_path = '' as $$
  select * from public.social_directory
  where user_id <> auth.uid() and char_length(btrim(p_query)) between 2 and 40
    and strpos(lower(username), lower(btrim(p_query))) > 0
  order by username, user_id offset greatest(0, least(p_offset, 100000)) limit 21;
$$;
