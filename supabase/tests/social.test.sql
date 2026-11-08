-- Basisidentität und eigene Beziehungen bleiben gegen fremde Schreibzugriffe geschützt.
begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select no_plan();
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into profiles(display_name, bio, height_cm) values ('Anna', 'Privat', 175);
select lives_ok('select public.enable_social_profile()', 'Bestehende Freigabe-API bleibt idempotent');
select throws_ok('select height_cm from social_profiles', '42703', null, 'Basisidentität enthält keine Körperdaten');
select throws_ok('select bio from social_profiles', '42703', null, 'Basisidentität enthält keine Bio');
select throws_ok($$insert into follows(followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$$, '23514', null, 'Selbst-Folgen ist ausgeschlossen');
update profiles set display_name = 'Anja', avatar = 'data:image/jpeg;base64,/9j/';
select is((select display_name from social_profiles where user_id = auth.uid()), 'Anja', 'Name bleibt synchron');
select is((select avatar from social_profiles where user_id = auth.uid()), 'data:image/jpeg;base64,/9j/', 'Bild bleibt synchron');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from profiles), 0, 'Fremde private Quellprofile bleiben verborgen');
select is_empty($$update social_profiles set display_name = 'Falsch' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' returning user_id$$, 'Fremde Identitäten sind unveränderbar');
select throws_ok($$insert into follows(user_id, followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')$$, '42501', null, 'Niemand kann für andere folgen');
-- Folgen setzt ein eigenes sichtbares Profil voraus.
select throws_ok($$insert into follows(followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$$, '23503', null, 'Ohne eigenes sichtbares Profil kann niemand folgen');
insert into profiles(display_name) values ('Ben');
select public.enable_social_profile();
insert into follows(followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');
select throws_ok($$insert into follows(followed_user_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$$, '23505', null, 'Doppelte Beziehungen sind ausgeschlossen');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
delete from social_profiles where user_id = auth.uid();
select is((select count(*)::int from follows where followed_user_id = auth.uid()), 0, 'Verbergen entfernt alle Follower');
select is((select count(*)::int from profiles where user_id = auth.uid()), 1, 'Verbergen löscht keine eigenen Daten');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty($$delete from social_profiles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' returning user_id$$, 'Fremde Identitäten lassen sich nicht löschen');
reset role;
set local role anon;
select throws_ok('select * from social_profiles', '42501', null, 'Anonyme sehen keine Identitäten');
select throws_ok('select * from follows', '42501', null, 'Anonyme sehen keine Beziehungen');
reset role;
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select count(*)::int from follows where followed_user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'Konto löschen räumt Beziehungen auf');
select * from finish();
rollback;
