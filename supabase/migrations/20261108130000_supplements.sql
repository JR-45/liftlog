-- Supplemente und Vitamine: eigene Liste pro Konto und ein Haken pro Tag.
-- Gleiches Muster wie überall: Owner-RLS, user_id aus der Anmeldung, zusammengesetzte Fremdschlüssel.
create table public.supplements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  dose       text check (dose is null or char_length(btrim(dose)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

-- Ein Eintrag heißt: an diesem Tag genommen. Haken entfernen löscht die Zeile.
create table public.supplement_intakes (
  supplement_id uuid not null,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  taken_on      date not null,
  primary key (supplement_id, taken_on),
  foreign key (supplement_id, user_id) references public.supplements (id, user_id) on delete cascade
);
create index supplement_intakes_user_day on public.supplement_intakes (user_id, taken_on);

do $$
declare t text;
begin
  foreach t in array array['supplements', 'supplement_intakes'] loop
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_owner_only', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end;
$$;
