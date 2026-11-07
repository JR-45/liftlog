-- Prüft Profil und Körpermessungen: Regeln und Trennung der User.
begin;

create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);

select plan(17);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

set local role anon;
select throws_ok('select user_id from profiles', '42501', null, 'anon liest keine Profile');
select throws_ok('select weight_kg from body_measurements', '42501', null, 'anon liest keine Körpermessungen');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into profiles (display_name, goal) values ('Anna', 'strength');
select is((select user_id from profiles), 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'user_id kommt aus dem Login');

select throws_ok(
  $$update profiles set goal = 'unbekannt'$$,
  '23514', null, 'Unbekanntes Ziel ist nicht möglich'
);
select throws_ok(
  $$update profiles set avatar = 'https://example.com/bild.png'$$,
  '23514', null, 'Profilbild muss ein JPEG als Data-URL sein'
);
select throws_ok(
  $$update profiles set height_cm = 40$$,
  '23514', null, 'Unrealistische Größe ist nicht möglich'
);
select throws_ok(
  $$update profiles set sex = 'x'$$,
  '23514', null, 'Unbekanntes Geschlecht ist nicht möglich'
);
select throws_ok(
  $$insert into body_measurements (measured_on) values ('2026-11-08')$$,
  '23514', null, 'Eine leere Messung ist nicht möglich'
);

insert into body_measurements (measured_on, weight_kg) values ('2026-11-06', 80.4);
select throws_ok(
  $$insert into body_measurements (measured_on, weight_kg) values ('2026-11-06', 80.0)$$,
  '23505', null, 'Pro Tag gibt es nur einen Eintrag'
);
select throws_ok(
  $$insert into body_measurements (measured_on, weight_kg) values ('2026-11-07', 5)$$,
  '23514', null, 'Unrealistisches Gewicht ist nicht möglich'
);

insert into body_measurements (measured_on, weight_kg) values ('2026-11-06', 80.0)
  on conflict (user_id, measured_on) do update set weight_kg = excluded.weight_kg;
select is((select weight_kg from body_measurements), 80.0::numeric, 'Eintrag lässt sich ändern');
insert into body_measurements (measured_on, waist_cm, neck_cm) values ('2026-11-05', 84, 38);
select is((select count(*)::int from body_measurements), 2, 'Messung nur mit Umfängen ist möglich');

-- Fremder User
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty('select user_id from profiles', 'B sieht das Profil von A nicht');
select is_empty('select weight_kg from body_measurements', 'B sieht die Körpermessungen von A nicht');
select is_empty($$update profiles set bio = 'gehackt' returning user_id$$, 'B kann das Profil nicht ändern');
select is_empty('delete from body_measurements returning measured_on', 'B kann die Körpermessungen nicht löschen');
select throws_ok(
  $$insert into body_measurements (user_id, measured_on, weight_kg) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-11-07', 70)$$,
  '42501', null, 'B kann keine Einträge für A anlegen'
);

select * from finish();
rollback;
