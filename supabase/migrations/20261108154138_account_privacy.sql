-- Die Basisidentität ist auffindbar; umfassende Profildaten brauchen eine angenommene Beziehung.
alter table public.social_profiles
  add column username text,
  add column is_private boolean not null default true;
update public.social_profiles set username = 'athlet_' || replace(user_id::text, '-', '');
alter table public.social_profiles
  alter column username set default ('athlet_' || replace(auth.uid()::text, '-', '')),
  alter column username set not null,
  add constraint social_username_format check (username ~ '^[a-z0-9._]{3,40}$'),
  add constraint social_username_unique unique (username);

-- Alte Beziehungen gaben nur Namen und Bilder frei und gelten deshalb zunächst als neue Anfragen.
alter table public.follows add column status text not null default 'pending'
  check (status in ('pending', 'accepted'));
revoke delete on public.social_profiles from authenticated;
drop policy social_profiles_delete on public.social_profiles;

-- Die Kontoanlage läuft ohne Nutzersitzung. Dieser eng begrenzte Trigger legt nur die Basisidentität an.
create function public.create_social_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.social_profiles(user_id, display_name, username)
  values (new.id, 'Athlet', 'athlet_' || replace(new.id::text, '-', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_social_identity() from public, anon, authenticated;
create trigger create_social_identity after insert on auth.users
  for each row execute function public.create_social_identity();

insert into public.social_profiles(user_id, display_name, avatar, username)
select u.id, coalesce(nullif(btrim(p.display_name), ''), 'Athlet'), p.avatar,
  'athlet_' || replace(u.id::text, '-', '')
from auth.users u left join public.profiles p on p.user_id = u.id
on conflict (user_id) do nothing;
drop trigger sync_social_identity on public.profiles;
create trigger sync_social_identity after insert or update of display_name, avatar on public.profiles
  for each row execute function public.sync_social_identity();

create function public.prepare_follow_request()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.status := case when (select is_private from public.social_profiles where user_id = new.followed_user_id)
    then 'pending' else 'accepted' end;
  return new;
end;
$$;
revoke all on function public.prepare_follow_request() from public, anon, authenticated;
create trigger prepare_follow_request before insert on public.follows
  for each row execute function public.prepare_follow_request();
drop policy follows_insert on public.follows;
create policy follows_insert on public.follows for insert to authenticated with check (
  user_id = (select auth.uid()) and status = (
    select case when is_private then 'pending' else 'accepted' end
    from public.social_profiles where user_id = followed_user_id
  )
);
drop policy follows_delete on public.follows;
create policy follows_delete on public.follows for delete to authenticated
  using ((select auth.uid()) = user_id or (select auth.uid()) = followed_user_id);
grant update(status) on public.follows to authenticated;
create policy follows_accept on public.follows for update to authenticated
  using (followed_user_id = (select auth.uid()) and status = 'pending')
  with check (followed_user_id = (select auth.uid()) and status = 'accepted');

create function public.accept_public_requests()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted' where followed_user_id = new.user_id and status = 'pending';
  end if;
  return new;
end;
$$;
revoke all on function public.accept_public_requests() from public, anon, authenticated;
create trigger accept_public_requests after update of is_private on public.social_profiles
  for each row execute function public.accept_public_requests();

-- Views laufen als ihr Besitzer, damit die Owner-RLS der Quelltabellen unverändert bleiben kann.
-- Jeder Zugriff prüft die Sitzungsidentität. security_barrier verhindert vorgeschobene äußere Filter.
create view public.social_directory with (security_barrier = true) as
select p.user_id, p.display_name, p.username, p.avatar, p.is_private,
  (select count(*) from public.follows f where f.followed_user_id = p.user_id and f.status = 'accepted') as followers_count
from public.social_profiles p where auth.uid() is not null;

create view public.visible_follows with (security_barrier = true) as
select f.user_id, f.followed_user_id from public.follows f
where f.status = 'accepted' and auth.uid() is not null and (
  f.user_id = auth.uid() or f.followed_user_id = auth.uid() or exists (
    select 1 from public.follows permission where permission.user_id = auth.uid() and permission.status = 'accepted'
      and permission.followed_user_id in (f.user_id, f.followed_user_id)
  )
);

create view public.shared_profile_overviews with (security_barrier = true) as
select p.user_id, jsonb_build_object(
  'profile', jsonb_build_object('displayName', p.display_name, 'bio', p.bio, 'goal', p.goal,
    'weeklyTarget', coalesce(p.weekly_target, 3), 'heightCm', p.height_cm, 'targetWeightKg', p.target_weight_kg,
    'sex', p.sex, 'birthYear', p.birth_year, 'activityLevel', p.activity_level),
  'measurements', coalesce((select jsonb_agg(jsonb_build_object(
    'date', m.measured_on, 'weightKg', m.weight_kg, 'bodyFatPct', m.body_fat_pct,
    'neckCm', m.neck_cm, 'chestCm', m.chest_cm, 'waistCm', m.waist_cm, 'hipsCm', m.hips_cm,
    'armCm', m.arm_cm, 'thighCm', m.thigh_cm, 'calfCm', m.calf_cm) order by m.measured_on)
    from public.body_measurements m where m.user_id = p.user_id), '[]'::jsonb),
  'sets', coalesce((select jsonb_agg(jsonb_build_object('performed_on', w.performed_on, 'plan_day', d.name,
    'exercise', e.name, 'set_number', s.set_number, 'weight_kg', s.weight_kg, 'is_assisted', s.is_assisted,
    'reps', s.reps, 'duration_seconds', s.duration_seconds, 'distance_km', s.distance_km) order by w.performed_on, s.set_number)
    from public.sets s join public.workouts w on (w.id, w.user_id) = (s.workout_id, s.user_id)
    join public.exercises e on (e.id, e.user_id) = (s.exercise_id, s.user_id)
    left join public.plan_days d on (d.id, d.user_id) = (w.plan_day_id, w.user_id)
    where s.user_id = p.user_id), '[]'::jsonb),
  'meals', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'consumed_on', m.consumed_on,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'grams', i.grams,
      'per100g', jsonb_build_object('kcal', i.kcal, 'protein', i.protein, 'carbs', i.carbs, 'fat', i.fat, 'fiber', i.fiber),
      'estimated', i.estimated) order by i.position)
      from public.meal_items i where i.meal_id = m.id and i.user_id = p.user_id), '[]'::jsonb)) order by m.consumed_on desc, m.id)
    from public.meals m where m.user_id = p.user_id), '[]'::jsonb)
) as overview
from public.profiles p where auth.uid() is not null and (p.user_id = auth.uid() or exists (
  select 1 from public.follows f where f.user_id = auth.uid() and f.followed_user_id = p.user_id and f.status = 'accepted'
));
revoke all on public.social_directory, public.visible_follows, public.shared_profile_overviews from public, anon, authenticated;
grant select on public.social_directory, public.visible_follows, public.shared_profile_overviews to authenticated;

-- Eine geordnete Ergebnismenge hält die Seitennavigation bei Namens- und Benutzernamenssuche stabil.
create function public.search_social_accounts(p_query text, p_offset integer default 0)
returns setof public.social_directory language sql security invoker set search_path = '' as $$
  select * from public.social_directory
  where user_id <> auth.uid() and char_length(btrim(p_query)) between 2 and 50
    and (strpos(lower(username), lower(btrim(p_query))) > 0 or strpos(lower(display_name), lower(btrim(p_query))) > 0)
  order by username, user_id offset greatest(0, least(p_offset, 100000)) limit 21;
$$;
revoke all on function public.search_social_accounts(text, integer) from public, anon, authenticated;
grant execute on function public.search_social_accounts(text, integer) to authenticated;

-- Profil und eindeutiger Benutzername werden gemeinsam gespeichert oder vollständig zurückgerollt.
create function public.save_profile_identity(p_username text, p_name text, p_bio text, p_goal text, p_weekly_target smallint)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.social_profiles set username = p_username where user_id = auth.uid();
  insert into public.profiles(display_name, bio, goal, weekly_target)
    values (p_name, p_bio, p_goal, p_weekly_target)
    on conflict(user_id) do update set display_name = excluded.display_name, bio = excluded.bio,
      goal = excluded.goal, weekly_target = excluded.weekly_target, updated_at = now();
end;
$$;
revoke all on function public.save_profile_identity(text, text, text, text, smallint) from public, anon, authenticated;
grant execute on function public.save_profile_identity(text, text, text, text, smallint) to authenticated;
