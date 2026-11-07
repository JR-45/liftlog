-- Methoden und Planaufteilung sind unabhängig vom Übungskatalog und gehören dem User.
create table public.training_plan_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  method text not null check (method in ('classic', 'hypertrophy', 'strength', 'endurance', 'supersets', 'circuit', 'hiit', 'cardio', 'functional', 'mobility')),
  split text not null check (split in ('custom', 'full_body', 'upper_lower', 'push_pull_legs'))
);
alter table public.training_plan_settings enable row level security;
revoke all on public.training_plan_settings from anon, authenticated;
grant select, insert, update, delete on public.training_plan_settings to authenticated;
create policy training_plan_settings_owner_only on public.training_plan_settings
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Der bestehende Plan und seine Einstellungen werden in derselben Transaktion gespeichert.
create function public.save_training_plan_config(days jsonb, chosen_method text, chosen_split text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform public.save_training_plan(days);
  if jsonb_array_length(days) = 0 then
    delete from public.training_plan_settings where user_id = auth.uid();
  else
    insert into public.training_plan_settings (method, split) values (chosen_method, chosen_split)
    on conflict (user_id) do update set method = excluded.method, split = excluded.split;
  end if;
end;
$$;
revoke all on function public.save_training_plan_config(jsonb, text, text) from public, anon;
grant execute on function public.save_training_plan_config(jsonb, text, text) to authenticated;
