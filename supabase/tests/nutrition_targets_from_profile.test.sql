-- Ziele aus dem Profil sind für neue Konten an und lassen sich abschalten.
begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(3);

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into nutrition_settings (photo_consent_version, photo_consent_at) values (null, null);
select is((select targets_from_profile from nutrition_settings), true, 'Neue Konten nutzen die Ziele aus dem Profil');
select lives_ok($$update nutrition_settings set kcal = 2000, protein = 120, carbs = 220, fat = 60, fiber = 30, sugar = 50, targets_from_profile = false$$, 'Eigene Ziele schalten die Automatik ab');
select is((select targets_from_profile from nutrition_settings), false, 'Eigene Ziele bleiben gespeichert');

select * from finish();
rollback;
