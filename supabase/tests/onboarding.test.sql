-- Prüft die Onboarding-Felder im Profil.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(8);

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into profiles (experience_level, training_location, session_minutes, onboarding_completed_at)
  values ('beginner', 'home', 45, now());
select is((select session_minutes from profiles), 45::smallint, 'Antworten werden gespeichert');

select throws_ok($$update profiles set experience_level = 'profi'$$, '23514', null, 'Unbekannte Erfahrung ist nicht möglich');
select throws_ok($$update profiles set training_location = 'park'$$, '23514', null, 'Unbekannter Ort ist nicht möglich');
select lives_ok($$update profiles set training_location = 'calisthenics'$$, 'Calisthenics ist ein erlaubter Ort');
select lives_ok($$update profiles set session_minutes = 75$$, 'Eigene Trainingsdauer ist möglich');
select throws_ok($$update profiles set session_minutes = 5$$, '23514', null, 'Unter 10 Minuten ist nicht möglich');
select throws_ok($$update profiles set session_minutes = 300$$, '23514', null, 'Über 4 Stunden ist nicht möglich');
select lives_ok($$update profiles set experience_level = null, training_location = null, session_minutes = null$$, 'Alle Felder sind freiwillig');

select * from finish();
rollback;
