-- Ernährung bleibt pro Konto privat. Fotos werden niemals gespeichert.
create table public.nutrition_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  kcal numeric(7,2) check (kcal > 0 and kcal <= 15000),
  protein numeric(7,2) check (protein > 0 and protein <= 1000),
  carbs numeric(7,2) check (carbs > 0 and carbs <= 2000),
  fat numeric(7,2) check (fat > 0 and fat <= 1000),
  fiber numeric(7,2) check (fiber > 0 and fiber <= 300),
  photo_consent_version text check (photo_consent_version = 'google-food-v1'),
  photo_consent_at timestamptz,
  check ((photo_consent_version is null) = (photo_consent_at is null))
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  consumed_on date not null,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index meals_user_date on public.meals (user_id, consumed_on);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_id uuid not null,
  position smallint not null check (position between 1 and 20),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  grams numeric(7,2) not null check (grams between 0.1 and 5000),
  kcal numeric(7,2) not null check (kcal between 0 and 1000),
  protein numeric(7,2) not null check (protein between 0 and 100),
  carbs numeric(7,2) not null check (carbs between 0 and 100),
  fat numeric(7,2) not null check (fat between 0 and 100),
  fiber numeric(7,2) not null check (fiber between 0 and 100),
  estimated boolean not null default true,
  unique (meal_id, position),
  foreign key (meal_id, user_id) references public.meals (id, user_id) on delete cascade
);

create table public.food_scan_usage (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  usage_date date not null,
  scan_count smallint not null check (scan_count between 1 and 20),
  last_scan_at timestamptz not null,
  primary key (user_id, usage_date)
);

do $$
declare t text;
begin
  foreach t in array array['nutrition_settings', 'meals', 'meal_items', 'food_scan_usage'] loop
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_owner_only', t);
    if t = 'food_scan_usage' then
      execute format('grant select on table public.%I to authenticated', t);
    else
      execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    end if;
  end loop;
end;
$$;
grant all on public.food_scan_usage to service_role;

-- Ein Speichervorgang schreibt die ganze Mahlzeit oder gar nichts.
-- Dieselbe UUID darf nach einem Netzfehler wiederholt werden, ohne Duplikat.
create function public.save_meal(p_id uuid, p_date date, p_title text, p_items jsonb)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Lebensmittel fehlen' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Eine Mahlzeit benötigt 1 bis 20 Lebensmittel' using errcode = '22023';
  end if;
  if exists (select 1 from public.meals where id = p_id and user_id = auth.uid()) then
    update public.meals set consumed_on = p_date, title = p_title where id = p_id;
    delete from public.meal_items where meal_id = p_id;
  else
    insert into public.meals (id, consumed_on, title) values (p_id, p_date, p_title);
  end if;
  insert into public.meal_items (meal_id, position, name, grams, kcal, protein, carbs, fat, fiber, estimated)
    select p_id, n::smallint, item->>'name', (item->>'grams')::numeric,
      (item->'per100g'->>'kcal')::numeric, (item->'per100g'->>'protein')::numeric,
      (item->'per100g'->>'carbs')::numeric, (item->'per100g'->>'fat')::numeric,
      (item->'per100g'->>'fiber')::numeric, (item->>'estimated')::boolean
    from jsonb_array_elements(p_items) with ordinality as items(item, n);
  return p_id;
end;
$$;
revoke all on function public.save_meal(uuid, date, text, jsonb) from public, anon;
grant execute on function public.save_meal(uuid, date, text, jsonb) to authenticated;

-- Ausschließlich der Server reserviert Versuche nach geprüfter Anmeldung.
-- Atomarer Upsert verhindert Umgehung durch parallele Edge-Instanzen.
create function public.reserve_food_scan(p_user_id uuid)
returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare
  reserved integer;
  utc_day date := (clock_timestamp() at time zone 'utc')::date;
begin
  delete from public.food_scan_usage where usage_date < utc_day - 2;
  insert into public.food_scan_usage (user_id, usage_date, scan_count, last_scan_at)
    values (p_user_id, utc_day, 1, clock_timestamp())
    on conflict (user_id, usage_date) do update
      set scan_count = public.food_scan_usage.scan_count + 1, last_scan_at = clock_timestamp()
      where public.food_scan_usage.scan_count < 20
        and public.food_scan_usage.last_scan_at <= clock_timestamp() - interval '10 seconds'
    returning 1 into reserved;
  return coalesce(reserved, 0) = 1;
end;
$$;
revoke all on function public.reserve_food_scan(uuid) from public, anon, authenticated;
grant execute on function public.reserve_food_scan(uuid) to service_role;
