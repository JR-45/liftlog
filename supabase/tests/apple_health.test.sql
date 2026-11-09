-- Apple Watch / Apple Health Tageswerte sind privat pro Nutzer (Owner-RLS) und prüfen Grenzen.
begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(19);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

set local role anon;
select throws_ok('select * from apple_health_daily', '42501', null, 'anon sieht keine Apple-Health-Daten');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into apple_health_daily (synced_on, active_kcal, workout_minutes, steps)
  values ('2026-11-09', 485, 52, 8420);

select is((select active_kcal::int from apple_health_daily where synced_on = '2026-11-09'), 485, 'A speichert aktive Kalorien');
select is((select workout_minutes::int from apple_health_daily where synced_on = '2026-11-09'), 52, 'A speichert Trainingsminuten');
select is((select steps from apple_health_daily where synced_on = '2026-11-09'), 8420, 'A speichert Schritte');
select throws_ok($$insert into apple_health_daily (synced_on, active_kcal) values ('2026-11-08', -5)$$, '23514', null, 'Negative Kalorien werden abgelehnt');
select throws_ok($$insert into apple_health_daily (synced_on, workout_minutes) values ('2026-11-08', 1500)$$, '23514', null, 'Mehr als 1440 Minuten pro Tag werden abgelehnt');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty('select * from apple_health_daily', 'B sieht keine Apple-Health-Daten von A');
select is_empty('delete from apple_health_daily returning synced_on', 'B kann Apple-Health-Daten von A nicht löschen');

reset role;

-- Import über den Kurzbefehl: Schlüssel-Hash speichern, dann ohne Login (anon) importieren.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into apple_health_tokens (token_hash)
  values (encode(sha256(convert_to('test-schluessel-mit-mindestens-32-zeichen-abc', 'UTF8')), 'hex'));

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty('select user_id from apple_health_tokens', 'B sieht den Schlüssel von A nicht');
reset role;

set local role anon;
select lives_ok(
  $$select import_apple_health(E'test-schluessel-mit-mindestens-32-zeichen-abc\n', null, '512,4 kcal', '47 min', '8.420')$$,
  'Kurzbefehl importiert ohne Login und ohne Datum (Zeilenumbruch am Schlüssel egal)'
);
select throws_ok(
  $$select import_apple_health('falscher-schluessel-mit-mindestens-32-zeichen', null, '1', '1', '1')$$,
  '28000', null, 'Falscher Schlüssel wird abgelehnt'
);
select throws_ok(
  $$select import_apple_health('test-schluessel-mit-mindestens-32-zeichen-abc', (current_date - 30)::text, '1', '1', '1')$$,
  '22023', null, 'Alte Tage werden abgelehnt'
);
select throws_ok('select health_number($$5$$)', '42501', null, 'anon darf die Hilfsfunktion nicht direkt aufrufen');
select throws_ok('select * from apple_health_tokens', '42501', null, 'anon liest keine Schlüssel');
reset role;

select results_eq(
  $$select active_kcal::int, workout_minutes::int, steps from apple_health_daily
    where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and synced_on = (now() at time zone 'Europe/Berlin')::date$$,
  $$values (512, 47, 8420)$$,
  'Werte landen beim Besitzer des Schlüssels, Einheiten und Tausenderpunkt werden verstanden'
);
select is(
  (select count(*)::int from apple_health_daily where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'B bekommt keine Werte'
);


-- Schlüssel aus der App erzeugen: nur angemeldet, alter Schlüssel wird ungültig.
set local role anon;
select throws_ok('select create_apple_health_token()', '42501', null, 'anon kann keinen Schlüssel erzeugen');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select matches(create_apple_health_token(), '^[0-9a-f]{64}$', 'Neuer Schlüssel hat 64 Zeichen');
reset role;
set local role anon;
select throws_ok(
  $$select import_apple_health('test-schluessel-mit-mindestens-32-zeichen-abc', null, '1', '1', '1')$$,
  '28000', null, 'Alter Schlüssel ist nach dem Erneuern ungültig'
);
reset role;

select * from finish();
rollback;
