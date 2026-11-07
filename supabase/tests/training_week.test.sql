begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(14);
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'week-a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'week-b@test.local');
insert into plan_days (id, user_id, weekday, name) values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 'Oberkörper'),
  ('b0000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 1, 'Fremder Plan');
create function pg_temp.week_data(start_date date, plan_id uuid) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('day_date', start_date + i,
    'plan_day_id', case when i = 0 then plan_id else null end, 'is_rest_day', i <> 0))
  from generate_series(0, 6) i;
$$;
set local role anon;
select throws_ok($$select public.save_training_week('2026-11-02', '[]')$$, '42501', null, 'Anonymes Speichern gesperrt');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$select save_training_week('2026-11-02', pg_temp.week_data('2026-11-02', 'a0000000-0000-0000-0000-000000000001'))$$, 'Woche speichern');
select is((select count(*)::int from training_schedule), 7, 'Sieben Tage gespeichert');
select is((select count(*)::int from training_schedule where is_rest_day), 6, 'Ruhetage ausdrücklich gespeichert');
select public.save_training_week('2026-11-09', pg_temp.week_data('2026-11-09', 'a0000000-0000-0000-0000-000000000001'));
select is((select count(*)::int from training_schedule), 14, 'Andere Woche separat gespeichert');
select throws_ok($$select save_training_week('2026-11-03', '[]')$$, '22023', null, 'Dienstag ist kein Wochenbeginn');
select throws_ok($$select save_training_week('2026-11-02', '[]')$$, '22023', null, 'Unvollständige Woche abgelehnt');
select throws_ok($$select save_training_week('2026-11-02', pg_temp.week_data('2026-11-09', 'a0000000-0000-0000-0000-000000000001'))$$, '22023', null, 'Fremde Datumswoche abgelehnt');
select throws_ok($$select save_training_week('2026-11-02', pg_temp.week_data('2026-11-02', 'b0000000-0000-0000-0000-000000000002'))$$, '23503', null, 'Fremde Trainingsvorlage abgelehnt');
select is((select count(*)::int from training_schedule), 14, 'Fehler hinterlassen keine halbe Woche');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty('select * from training_schedule', 'B sieht keine Woche von A');
select is_empty('update training_schedule set is_rest_day = false returning day_date', 'B ändert keine Woche von A');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.save_training_week('2026-11-02', pg_temp.week_data('2026-11-02', null));
select is((select count(*)::int from training_schedule where day_date between '2026-11-09' and '2026-11-15' and plan_day_id is not null), 1, 'Ändern lässt die andere Woche unverändert');
select is((select weekday::int from plan_days), 1, 'Ursprüngliche Vorlage bleibt unverändert');
select * from finish();
rollback;
