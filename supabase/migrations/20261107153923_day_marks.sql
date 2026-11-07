-- Markierungen im Kalender: Ein so markierter Tag zählt nicht als verpasst.
--
-- Pro User und Tag gibt es höchstens eine Markierung. Der Tag kommt vom Gerät,
-- weil die Datenbank in UTC läuft. Ein gespeichertes Training hat im Kalender Vorrang.
create table public.day_marks (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day        date not null,
  kind       text not null check (kind in ('sick', 'vacation', 'moved')),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

revoke all on table public.day_marks from anon, authenticated;
grant select, insert, update, delete on table public.day_marks to authenticated;

alter table public.day_marks enable row level security;

create policy day_marks_owner_only on public.day_marks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
