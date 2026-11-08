-- Follower erhalten nur Profil und Training. Körper- und Ernährungsdaten bleiben owner-only.
-- Die eigene Ansicht lädt diese Daten weiterhin direkt aus den unveränderten Quelltabellen.
create or replace view public.shared_profile_overviews with (security_barrier = true) as
select p.user_id, jsonb_build_object(
  'profile', jsonb_build_object('displayName', p.display_name, 'bio', p.bio, 'goal', p.goal,
    'weeklyTarget', coalesce(p.weekly_target, 3)),
  'sets', coalesce((select jsonb_agg(jsonb_build_object('performed_on', w.performed_on, 'plan_day', d.name,
    'exercise', e.name, 'set_number', s.set_number, 'weight_kg', s.weight_kg, 'is_assisted', s.is_assisted,
    'reps', s.reps, 'duration_seconds', s.duration_seconds, 'distance_km', s.distance_km) order by w.performed_on, s.set_number)
    from public.sets s join public.workouts w on (w.id, w.user_id) = (s.workout_id, s.user_id)
    join public.exercises e on (e.id, e.user_id) = (s.exercise_id, s.user_id)
    left join public.plan_days d on (d.id, d.user_id) = (w.plan_day_id, w.user_id)
    where s.user_id = p.user_id), '[]'::jsonb)
) as overview
from public.profiles p where auth.uid() is not null and (p.user_id = auth.uid() or exists (
  select 1 from public.follows f where f.user_id = auth.uid() and f.followed_user_id = p.user_id and f.status = 'accepted'
));
revoke all on public.shared_profile_overviews from public, anon, authenticated;
grant select on public.shared_profile_overviews to authenticated;
