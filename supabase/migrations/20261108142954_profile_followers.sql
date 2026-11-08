-- Nur ausdrücklich freigegebene Namen und Bilder sind für angemeldete Personen auffindbar.
-- Private Profile mit Körper- und Trainingsdaten behalten ihre Owner-Policies.
create table public.social_profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  avatar text check (avatar like 'data:image/jpeg;base64,%' and char_length(avatar) <= 200000),
  created_at timestamptz not null default now()
);

-- Diese beiden Verweise verbinden absichtlich zwei verschiedene Nutzerkonten.
-- Nur der handelnde Nutzer darf seine Beziehung schreiben; kein Zugriff auf private Profile.
create table public.follows (
  user_id uuid not null default auth.uid() references public.social_profiles(user_id) on delete cascade,
  followed_user_id uuid not null references public.social_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, followed_user_id),
  check (user_id <> followed_user_id)
);
create index follows_incoming on public.follows(followed_user_id, user_id);

revoke all on public.social_profiles, public.follows from public, anon, authenticated;
grant select, insert, update, delete on public.social_profiles to authenticated;
grant select, insert, delete on public.follows to authenticated;
alter table public.social_profiles enable row level security;
alter table public.follows enable row level security;

create policy social_profiles_read on public.social_profiles for select to authenticated using (true);
create policy social_profiles_insert on public.social_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy social_profiles_update on public.social_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy social_profiles_delete on public.social_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy follows_read on public.follows for select to authenticated
  using ((select auth.uid()) = user_id or (select auth.uid()) = followed_user_id);
create policy follows_insert on public.follows for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy follows_delete on public.follows for delete to authenticated
  using ((select auth.uid()) = user_id);

create function public.enable_social_profile()
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.social_profiles (display_name, avatar)
    select coalesce(nullif(btrim(display_name), ''), 'Athlet'), avatar
    from public.profiles where user_id = (select auth.uid())
    on conflict (user_id) do update set display_name = excluded.display_name, avatar = excluded.avatar;
  if not found then
    raise exception 'Bitte zuerst das eigene Profil speichern.' using errcode = '23514';
  end if;
end;
$$;

-- Änderungen gelten nur für bereits freigegebene Identitäten; kein automatisches Opt-in.
create function public.sync_social_identity()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  update public.social_profiles
    set display_name = coalesce(nullif(btrim(new.display_name), ''), 'Athlet'), avatar = new.avatar
    where user_id = new.user_id;
  return new;
end;
$$;
create trigger sync_social_identity after update of display_name, avatar on public.profiles
  for each row execute function public.sync_social_identity();

revoke all on function public.enable_social_profile(), public.sync_social_identity() from public, anon, authenticated;
grant execute on function public.enable_social_profile() to authenticated;
