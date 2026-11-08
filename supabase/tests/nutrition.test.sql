-- Ernährungsdaten, Transaktionen und serverseitige Kostenbegrenzung.
begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(29);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

set local role anon;
select throws_ok('select * from nutrition_settings', '42501', null, 'anon sieht keine Ziele');
select throws_ok('select * from meals', '42501', null, 'anon sieht keine Mahlzeiten');
select throws_ok('select * from meal_items', '42501', null, 'anon sieht keine Lebensmittel');
select throws_ok('select * from food_scan_usage', '42501', null, 'anon sieht keine Scan-Zähler');
select throws_ok($$select save_meal(gen_random_uuid(), '2026-11-08', 'Essen', '[]')$$, '42501', null, 'anon darf keine Mahlzeit speichern');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into nutrition_settings (kcal, protein, sugar) values (2200, 140, 55);
select is((select user_id from nutrition_settings), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'Eigentümer kommt aus Anmeldung');
select throws_ok('update nutrition_settings set kcal = -1', '23514', null, 'Negative Ziele sind verboten');
select throws_ok('update nutrition_settings set sugar = 501', '23514', null, 'Zucker-Obergrenze über 500 g ist verboten');
select throws_ok($$update nutrition_settings set photo_consent_version = 'google-food-v1'$$, '23514', null, 'Einwilligung braucht Zeitstempel');
select lives_ok($$select save_meal('a0000000-0000-0000-0000-000000000001', '2026-11-08', 'Mittagessen', '[{"name":"Reis","grams":150,"per100g":{"kcal":130,"protein":3,"carbs":28,"fat":1,"fiber":1,"sugar":0.5},"estimated":true}]')$$, 'Mahlzeit lässt sich atomar speichern');
select is((select sugar from meal_items), 0.5::numeric, 'Zucker pro 100 g wird gespeichert');
select lives_ok($$select save_meal('a0000000-0000-0000-0000-000000000001', '2026-11-08', 'Mittagessen', '[{"name":"Reis","grams":150,"per100g":{"kcal":130,"protein":3,"carbs":28,"fat":1,"fiber":1},"estimated":true}]')$$, 'Wiederholung nach Netzfehler gelingt');
select is((select count(*)::int from meals), 1, 'Wiederholung erzeugt keine zweite Mahlzeit');
select is((select count(*)::int from meal_items), 1, 'Wiederholung erzeugt keine zweiten Lebensmittel');
select lives_ok($$select save_meal('a0000000-0000-0000-0000-000000000001', '2026-11-08', 'Mittagessen', '[{"name":"Reis","grams":200,"per100g":{"kcal":130,"protein":3,"carbs":28,"fat":1,"fiber":1},"estimated":true}]')$$, 'Korrektur nach unklarer Netzantwort aktualisiert dieselbe Mahlzeit');
select is((select grams from meal_items), 200::numeric, 'Wiederholtes Speichern übernimmt die aktuelle Menge');
select throws_ok($$select save_meal('a0000000-0000-0000-0000-000000000002', '2026-11-08', 'Fehler', '[{"name":"Reis","grams":-1,"per100g":{"kcal":130,"protein":3,"carbs":28,"fat":1,"fiber":1},"estimated":true}]')$$, '23514', null, 'Ungültige Portion wird abgelehnt');
select is((select count(*)::int from meals), 1, 'Fehler hinterlässt keine halbe Mahlzeit');
select throws_ok($$select save_meal(gen_random_uuid(), '2026-11-08', 'Leer', '[]')$$, '22023', null, 'Leere Mahlzeit wird abgelehnt');
select throws_ok($$select reserve_food_scan('aaaaaaaa-0000-0000-0000-000000000001')$$, '42501', null, 'Nutzer kann keinen Zähler reservieren oder zurücksetzen');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty('select * from nutrition_settings', 'B sieht keine Ziele von A');
select is_empty('select * from meals', 'B sieht keine Mahlzeiten von A');
select is_empty('select * from meal_items', 'B sieht keine Lebensmittel von A');
select is_empty('delete from meals returning id', 'B kann Mahlzeit von A nicht löschen');
select throws_ok($$insert into meal_items (meal_id, position, name, grams, kcal, protein, carbs, fat, fiber) values ('a0000000-0000-0000-0000-000000000001', 2, 'Fremder Reis', 100, 130, 3, 28, 1, 1)$$, '23503', null, 'Zusammengesetzter FK blockt fremde Mahlzeit');
reset role;

set local role service_role;
select ok(reserve_food_scan('aaaaaaaa-0000-0000-0000-000000000001'), 'Server reserviert ersten Versuch');
select ok(not reserve_food_scan('aaaaaaaa-0000-0000-0000-000000000001'), 'Zu schnelle Wiederholung wird blockiert');
update food_scan_usage set scan_count = 20, last_scan_at = now() - interval '1 minute';
select ok(not reserve_food_scan('aaaaaaaa-0000-0000-0000-000000000001'), 'Tageslimit blockiert weitere Versuche');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
delete from meals;
select is_empty('select * from meal_items', 'Löschen einer Mahlzeit entfernt Lebensmittel');
reset role;
select * from finish();
rollback;
