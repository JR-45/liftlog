-- Zucker-Obergrenze nach WHO-Empfehlung (höchstens 10 % der täglichen Kalorienzufuhr, 4 kcal pro Gramm).
alter table public.nutrition_settings
  add column sugar numeric(7,2) check (sugar > 0 and sugar <= 500);

update public.nutrition_settings
  set sugar = greatest(10, round(kcal * 0.10 / 4))
  where kcal is not null and sugar is null;

alter table public.meal_items
  add column sugar numeric(7,2) not null default 0 check (sugar between 0 and 100);

create or replace function public.save_meal(p_id uuid, p_date date, p_title text, p_items jsonb)
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
  insert into public.meal_items (meal_id, position, name, grams, kcal, protein, carbs, fat, fiber, sugar, estimated)
    select p_id, n::smallint, item->>'name', (item->>'grams')::numeric,
      (item->'per100g'->>'kcal')::numeric, (item->'per100g'->>'protein')::numeric,
      (item->'per100g'->>'carbs')::numeric, (item->'per100g'->>'fat')::numeric,
      (item->'per100g'->>'fiber')::numeric, coalesce((item->'per100g'->>'sugar')::numeric, 0),
      (item->>'estimated')::boolean
    from jsonb_array_elements(p_items) with ordinality as items(item, n);
  return p_id;
end;
$$;
revoke all on function public.save_meal(uuid, date, text, jsonb) from public, anon;
grant execute on function public.save_meal(uuid, date, text, jsonb) to authenticated;
