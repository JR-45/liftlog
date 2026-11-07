-- Die Vorlage bleibt unverändert. Jede gespeicherte Woche hat sieben eigene Tagesentscheidungen.
create table public.training_schedule (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day_date date not null,
  plan_day_id uuid,
  is_rest_day boolean not null default false,
  primary key (user_id, day_date),
  check (not (is_rest_day and plan_day_id is not null)),
  foreign key (plan_day_id, user_id) references public.plan_days(id, user_id)
    on delete set null (plan_day_id)
);
create index training_schedule_plan_day_idx on public.training_schedule (plan_day_id, user_id);
alter table public.training_schedule enable row level security;
revoke all on public.training_schedule from anon, authenticated;
grant select, insert, update, delete on public.training_schedule to authenticated;
create policy training_schedule_owner_only on public.training_schedule
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.save_training_week(week_start date, days jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Login erforderlich' using errcode = '42501';
  end if;
  if week_start is null or extract(isodow from week_start) <> 1 then
    raise exception 'Die Woche muss an einem Montag beginnen' using errcode = '22023';
  end if;
  if days is null or jsonb_typeof(days) <> 'array' then
    raise exception 'Die Woche muss sieben Tage enthalten' using errcode = '22023';
  end if;
  if jsonb_array_length(days) <> 7 or
     (select count(distinct (d->>'day_date')::date) from jsonb_array_elements(days) d) <> 7 or
     exists (select 1 from jsonb_array_elements(days) d
       where (d->>'day_date')::date < week_start or (d->>'day_date')::date > week_start + 6) then
    raise exception 'Genau die sieben Tage der gewählten Woche sind erforderlich' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || week_start::text, 0));
  insert into public.training_schedule (day_date, plan_day_id, is_rest_day)
  select (d->>'day_date')::date, (d->>'plan_day_id')::uuid, (d->>'is_rest_day')::boolean
  from jsonb_array_elements(days) d order by (d->>'day_date')::date
  on conflict (user_id, day_date) do update
  set plan_day_id = excluded.plan_day_id, is_rest_day = excluded.is_rest_day;
end;
$$;
revoke all on function public.save_training_week(date, jsonb) from public, anon;
grant execute on function public.save_training_week(date, jsonb) to authenticated;
