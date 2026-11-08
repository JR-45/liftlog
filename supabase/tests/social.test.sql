-- Freiwillige Identitäten und Folgebeziehungen, ohne Zugriff auf private Profildaten.
begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select no_plan();

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into profiles (display_name, bio, height_cm) values ('Anna', 'Privat', 175);
select is((select count(*)::int from social_profiles where user_id = auth.uid()), 0, 'Private Konten werden nicht automatisch freigegeben');
select public.enable_social_profile();
select is((select display_name from social_profiles where user_id = auth.uid()), 'Anna', 'Freigabe übernimmt den eigenen Anzeigenamen');
select is((select user_id from social_profiles where display_name = 'Anna' and user_id = auth.uid()), auth.uid(), 'Identität gehört dem angemeldeten Nutzer');
select throws_ok('select height_cm from social_profiles', '42703', null, 'Freigegebene Identitäten enthalten keine Körperdaten');
select throws_ok('select bio from social_profiles', '42703', null, 'Freigegebene Identitäten enthalten keine private Bio');
select lives_ok('select public.enable_social_profile()', 'Erneute Freigabe ist idempotent');
select throws_ok($$insert into social_profiles (user_id, display_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Falsch')$$, '42501', null, 'Fremde Identität kann nicht angelegt werden');
select throws_ok($$insert into follows (followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$$, '23514', null, 'Sich selbst folgen ist verboten');
select throws_ok($$insert into follows (followed_user_id) values ('bbbbbbbb-0000-0000-0000-000000000002')$$, '23503', null, 'Unsichtbare Personen können nicht gefolgt werden');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from profiles), 0, 'Private Profildaten bleiben für B unsichtbar');
select is((select display_name from social_profiles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'Anna', 'B kann nur die freigegebene Identität sehen');
select is_empty($$update social_profiles set display_name = 'Falsch' returning user_id$$, 'B kann Annas Identität nicht verändern');
select is_empty('delete from social_profiles returning user_id', 'B kann Annas Identität nicht entfernen');
insert into profiles (display_name) values ('Ben');
select public.enable_social_profile();
insert into follows (followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');
select is((select user_id from follows), auth.uid(), 'Folgender Nutzer wird serverseitig bestimmt');
select throws_ok($$insert into follows (followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$$, '23505', null, 'Doppelte Folgebeziehungen sind ausgeschlossen');
select throws_ok($$insert into follows (user_id, followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')$$, '42501', null, 'B kann keine Beziehung für A anlegen');
select is((select count(*)::int from follows where user_id = auth.uid()), 1, 'B sieht seine Gefolgt-Liste');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from follows where followed_user_id = auth.uid()), 1, 'A sieht seine Follower');
select is_empty('delete from follows returning user_id', 'A kann nicht für B entfolgen');
update profiles set display_name = 'Anja';
select is((select display_name from social_profiles where user_id = auth.uid()), 'Anja', 'Namensänderungen werden in die freigegebene Identität übernommen');
update profiles set avatar = 'data:image/jpeg;base64,/9j/';
select is((select avatar from social_profiles where user_id = auth.uid()), 'data:image/jpeg;base64,/9j/', 'Bildänderungen werden nur für die freigegebene Identität übernommen');
update profiles set avatar = null;
select is((select avatar from social_profiles where user_id = auth.uid()), null, 'Ein entferntes Profilbild bleibt auch sozial entfernt');
insert into follows (followed_user_id) values ('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from follows), 2, 'Beide Richtungen sind unabhängig');

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from follows), 0, 'Unbeteiligte Personen sehen keine fremden Beziehungen');
select throws_ok($$insert into follows (followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$$, '23503', null, 'Ohne eigene Freigabe kann C nicht folgen');
select is_empty($$delete from follows where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' returning user_id$$, 'C kann fremde Beziehungen nicht löschen');

reset role;
set local role anon;
select throws_ok('select * from social_profiles', '42501', null, 'Anonyme Nutzer sehen keine Identitäten');
select throws_ok('select * from follows', '42501', null, 'Anonyme Nutzer sehen keine Beziehungen');
select throws_ok('select public.enable_social_profile()', '42501', null, 'Anonyme Nutzer können nichts freigeben');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
delete from follows where followed_user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select count(*)::int from follows where user_id = auth.uid()), 0, 'Entfolgen entfernt nur die eigene Beziehung');
select is((select count(*)::int from follows where followed_user_id = auth.uid()), 1, 'Andere Richtung bleibt beim Entfolgen erhalten');
delete from social_profiles where user_id = auth.uid();
select is((select count(*)::int from follows), 0, 'Sichtbarkeit widerrufen entfernt alle zugehörigen Beziehungen');
update profiles set display_name = 'Benedikt';
select is((select count(*)::int from social_profiles where user_id = auth.uid()), 0, 'Profiländerungen aktivieren eine widerrufene Freigabe nicht erneut');
select public.enable_social_profile();
select is((select display_name from social_profiles where user_id = auth.uid()), 'Benedikt', 'Erneute Freigabe übernimmt die aktuellen Profildaten');
insert into follows (followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');
reset role;
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select count(*)::int from social_profiles where user_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')), 1, 'Konto löschen entfernt nur die eigene soziale Identität');
select is((select count(*)::int from follows where followed_user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'Konto löschen entfernt auch eingehende Beziehungen');
select * from finish();
rollback;
