-- Prüft die Markierungen im Kalender: Regeln und Trennung der User.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(10);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

set local role anon;
select throws_ok('select day from day_marks', '42501', null, 'anon liest keine Markierungen');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into day_marks (day, kind) values ('2026-11-04', 'sick');
select is((select user_id from day_marks), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'user_id kommt aus dem Login');

select throws_ok(
  $$insert into day_marks (day, kind) values ('2026-11-05', 'unbekannt')$$,
  '23514', null, 'Unbekannte Art ist nicht möglich'
);
select throws_ok(
  $$insert into day_marks (day, kind) values ('2026-11-04', 'vacation')$$,
  '23505', null, 'Pro Tag gibt es nur eine Markierung'
);

insert into day_marks (day, kind) values ('2026-11-04', 'vacation')
  on conflict (user_id, day) do update set kind = excluded.kind;
select is((select kind from day_marks where day = '2026-11-04'), 'vacation', 'Markierung lässt sich ändern');

-- Fremder User
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty('select day from day_marks', 'B sieht die Markierungen von A nicht');
select is_empty($$update day_marks set kind = 'sick' returning day$$, 'B kann sie nicht ändern');
select is_empty('delete from day_marks returning day', 'B kann sie nicht löschen');
select throws_ok(
  $$insert into day_marks (user_id, day, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-11-06', 'sick')$$,
  '42501', null, 'B kann nicht für A markieren'
);

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select kind from day_marks where day = '2026-11-04'), 'vacation', 'Die Markierung von A ist unverändert');

select * from finish();
rollback;
