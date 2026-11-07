-- Prüft die Stoppuhr-Spalten an workouts.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(4);

select has_column('public', 'workouts', 'started_at', 'workouts hat eine eigene Startzeit für die Stoppuhr');
select col_is_null('public', 'workouts', 'started_at', 'Ohne Start bleibt started_at leer');

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into workouts (performed_on) values ('2026-11-07');
update workouts set started_at = now() - interval '5 minutes';
update workouts set started_at = null, finished_at = null;
select is((select started_at from workouts), null, 'Zurücksetzen leert die Startzeit');
select isnt((select created_at from workouts), null, 'created_at bleibt beim Zurücksetzen erhalten');

select * from finish();
rollback;
