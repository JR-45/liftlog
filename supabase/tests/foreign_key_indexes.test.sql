-- Prüft, dass jeder Fremdschlüssel in public einen passenden Index hat.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(1);

select is_empty(
  $$
  select c.conrelid::regclass::text || ' ' || c.conname
  from pg_constraint c
  where c.contype = 'f' and c.connamespace = 'public'::regnamespace
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid
        and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] @> c.conkey
        and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] <@ c.conkey
    )
  $$,
  'Jeder Fremdschlüssel hat einen Index, der mit seinen Spalten beginnt'
);

select * from finish();
rollback;
