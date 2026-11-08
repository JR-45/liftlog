-- Supplemente: nur für den Eigentümer, ein Haken pro Tag, Löschen räumt die Haken mit ab.
begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(10);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

set local role anon;
select throws_ok('select * from supplements', '42501', null, 'anon sieht keine Supplemente');
select throws_ok('select * from supplement_intakes', '42501', null, 'anon sieht keine Haken');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into supplements (id, name, dose) values ('a1000000-0000-0000-0000-000000000001', 'Kreatin', '5 g');
select is((select user_id from supplements), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'Eigentümer kommt aus der Anmeldung');
select throws_ok($$insert into supplements (name) values ('Kreatin')$$, '23505', null, 'Name gibt es pro Konto nur einmal');
select throws_ok($$insert into supplements (name) values ('  ')$$, '23514', null, 'Leerer Name ist verboten');
insert into supplement_intakes (supplement_id, taken_on) values ('a1000000-0000-0000-0000-000000000001', '2026-11-08');
select throws_ok($$insert into supplement_intakes (supplement_id, taken_on) values ('a1000000-0000-0000-0000-000000000001', '2026-11-08')$$, '23505', null, 'Pro Tag nur ein Haken');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from supplements), 0, 'B sieht die Supplemente von A nicht');
select throws_ok($$insert into supplement_intakes (supplement_id, taken_on) values ('a1000000-0000-0000-0000-000000000001', '2026-11-09')$$, '23503', null, 'B kann nichts bei A abhaken');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
delete from supplements where name = 'Kreatin';
select is((select count(*)::int from supplement_intakes), 0, 'Löschen entfernt auch die Haken');
reset role;

select is((select count(*)::int from supplements where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 0, 'B hat weiterhin nichts');

select * from finish();
rollback;
