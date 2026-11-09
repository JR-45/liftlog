-- Tägliche Aktivitätsdaten von Apple Watch / Apple Health (aktive Kalorien, Trainingsminuten, Schritte).
-- Bleibt privat pro Konto (Owner-only RLS).
alter table public.profiles
  add column apple_watch_connected boolean not null default false;

create table public.apple_health_daily (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  synced_on date not null,
  active_kcal smallint not null default 0 check (active_kcal between 0 and 10000),
  workout_minutes smallint not null default 0 check (workout_minutes between 0 and 1440),
  steps integer not null default 0 check (steps between 0 and 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, synced_on)
);

revoke all on table public.apple_health_daily from public, anon, authenticated;
alter table public.apple_health_daily enable row level security;
create policy apple_health_daily_owner_only on public.apple_health_daily
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on table public.apple_health_daily to authenticated;

-- Import-Schlüssel für den iOS-Kurzbefehl.
--
-- Der Kurzbefehl läuft ohne LiftLog-Login. Er schickt die Tageswerte mit einem persönlichen
-- Schlüssel an import_apple_health(). Gespeichert wird nur der SHA-256-Hash des Schlüssels,
-- nie der Schlüssel selbst. Ein neuer Schlüssel ersetzt den alten, Löschen trennt die Verbindung.
create table public.apple_health_tokens (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

revoke all on table public.apple_health_tokens from public, anon, authenticated;
alter table public.apple_health_tokens enable row level security;
create policy apple_health_tokens_owner_only on public.apple_health_tokens
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on table public.apple_health_tokens to authenticated;

-- Liest eine Zahl aus dem, was der Kurzbefehl schickt: „485,3 kcal“, „8.420“, „8,420“, „8420“ oder leer.
-- Gruppen aus genau drei Ziffern hinter Punkt oder Komma gelten als Tausendertrennung.
create function public.health_number(raw text)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  token text := substring(coalesce(raw, '') from '[0-9][0-9.,]*');
begin
  if token is null then
    return 0;
  end if;
  token := rtrim(token, '.,');
  -- Beide Trennzeichen („1.234,5“ oder „1,234.5“): das letzte ist das Komma für Nachkommastellen.
  if token ~ '[.]' and token ~ ',' then
    if strpos(reverse(token), ',') < strpos(reverse(token), '.') then
      token := replace(replace(token, '.', ''), ',', '.');
    else
      token := replace(token, ',', '');
    end if;
  elsif token ~ '^[0-9]{1,3}([.,][0-9]{3})+$' then
    token := replace(replace(token, '.', ''), ',', '');
  else
    token := replace(token, ',', '.');
  end if;
  return round(substring(token from '^[0-9]+(?:[.][0-9]+)?')::numeric)::integer;
end;
$$;

revoke all on function public.health_number(text) from public, anon, authenticated;

-- Wird vom Kurzbefehl ohne Login aufgerufen (Rolle anon). security definer, weil anon sonst
-- nichts schreiben darf. Abgesichert durch:
--   * schreibt nur, wenn der Schlüssel-Hash zu genau einem Konto passt, und nur in dessen Zeile
--   * nur Tageswerte für heute bis 7 Tage zurück (plus ein Tag Puffer), ohne Datum gilt heute
--   * Grenzen für Kalorien, Minuten und Schritte prüft die Tabelle selbst
--   * search_path = ''
create function public.import_apple_health(
  p_token text,
  p_date text default null,
  p_active_kcal text default null,
  p_workout_minutes text default null,
  p_steps text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  -- Ohne Datum gilt der heutige Tag in deutscher Zeit (die DB läuft in UTC).
  berlin_today date := (now() at time zone 'Europe/Berlin')::date;
  day date;
begin
  -- Der Kurzbefehl liest den Schlüssel aus einer Textdatei, dort kann ein Zeilenumbruch hängen.
  p_token := btrim(p_token, E' \t\r\n');
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'Ungültiger Schlüssel' using errcode = '28000';
  end if;

  select user_id into owner
  from public.apple_health_tokens
  where token_hash = encode(pg_catalog.sha256(convert_to(p_token, 'UTF8')), 'hex');

  if owner is null then
    raise exception 'Ungültiger Schlüssel' using errcode = '28000';
  end if;

  if coalesce(btrim(p_date), '') = '' then
    day := berlin_today;
  elsif p_date ~ '^\d{4}-\d{2}-\d{2}' then
    day := left(p_date, 10)::date;
  else
    raise exception 'Datum außerhalb des erlaubten Bereichs' using errcode = '22023';
  end if;

  if day > berlin_today + 1 or day < berlin_today - 7 then
    raise exception 'Datum außerhalb des erlaubten Bereichs' using errcode = '22023';
  end if;

  insert into public.apple_health_daily (user_id, synced_on, active_kcal, workout_minutes, steps, updated_at)
  values (
    owner, day,
    public.health_number(p_active_kcal), public.health_number(p_workout_minutes), public.health_number(p_steps),
    now()
  )
  on conflict (user_id, synced_on) do update
    set active_kcal = excluded.active_kcal,
        workout_minutes = excluded.workout_minutes,
        steps = excluded.steps,
        updated_at = excluded.updated_at;

  update public.profiles set apple_watch_connected = true where user_id = owner and not apple_watch_connected;
end;
$$;

revoke all on function public.import_apple_health(text, text, text, text, text) from public;
grant execute on function public.import_apple_health(text, text, text, text, text) to anon, authenticated;

-- Erzeugt einen neuen Import-Schlüssel für den angemeldeten Nutzer und gibt ihn einmalig zurück.
-- Gespeichert wird nur der Hash. Ein alter Schlüssel wird dadurch ungültig.
create function public.create_apple_health_token()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '28000';
  end if;
  insert into public.apple_health_tokens (user_id, token_hash, created_at)
  values (auth.uid(), encode(pg_catalog.sha256(convert_to(new_token, 'UTF8')), 'hex'), now())
  on conflict (user_id) do update
    set token_hash = excluded.token_hash, created_at = excluded.created_at;
  return new_token;
end;
$$;

revoke all on function public.create_apple_health_token() from public, anon;
grant execute on function public.create_apple_health_token() to authenticated;
