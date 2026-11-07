-- Profil und Körpermessungen pro User.
--
-- Liegt in eigenen Tabellen statt in auth.users.user_metadata: Die Metadaten stecken in jedem
-- Login-Token und gehören nicht zum RLS-Muster. Körperdaten zählen als Gesundheitsdaten und
-- sind deshalb nur für den Besitzer sichtbar.
--
-- Geschlecht, Geburtsjahr und Aktivität braucht die App für Grundumsatz, Tagesbedarf und die
-- Körperfett-Schätzung nach der Navy-Formel. Alle drei sind freiwillig.
--
-- Das Profilbild ist ein kleines, im Browser auf 320×320 px zugeschnittenes JPEG als Data-URL.
-- So braucht es keinen Storage-Bucket, und das Bild ist auf allen Geräten gleich.

create table public.profiles (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name     text check (char_length(btrim(display_name)) between 1 and 50),
  bio              text not null default '' check (char_length(bio) <= 280),
  goal             text not null default 'hypertrophy' check (goal in ('hypertrophy', 'strength', 'cut', 'fitness')),
  weekly_target    smallint check (weekly_target between 1 and 7), -- NULL: Anzahl der Trainingstage im Plan
  height_cm        smallint check (height_cm between 100 and 250),
  target_weight_kg numeric(4, 1) check (target_weight_kg between 20 and 350),
  sex              text check (sex in ('male', 'female')),
  birth_year       smallint check (birth_year between 1900 and 2020),
  activity_level   text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  avatar           text check (avatar like 'data:image/jpeg;base64,%' and char_length(avatar) <= 200000),
  updated_at       timestamptz not null default now()
);

-- Eine Messung pro Tag. Jeder Wert ist freiwillig, mindestens einer muss gesetzt sein.
-- Der Tag kommt vom Gerät, weil die Datenbank in UTC läuft. Umfänge in cm.
create table public.body_measurements (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on  date not null,
  weight_kg    numeric(4, 1) check (weight_kg between 20 and 350),
  body_fat_pct numeric(3, 1) check (body_fat_pct between 2 and 70),
  neck_cm      numeric(4, 1) check (neck_cm between 10 and 250),
  chest_cm     numeric(4, 1) check (chest_cm between 10 and 250),
  waist_cm     numeric(4, 1) check (waist_cm between 10 and 250),
  hips_cm      numeric(4, 1) check (hips_cm between 10 and 250),
  arm_cm       numeric(4, 1) check (arm_cm between 10 and 250),
  thigh_cm     numeric(4, 1) check (thigh_cm between 10 and 250),
  calf_cm      numeric(4, 1) check (calf_cm between 10 and 250),
  created_at   timestamptz not null default now(),
  primary key (user_id, measured_on),
  check (num_nonnulls(weight_kg, body_fat_pct, neck_cm, chest_cm, waist_cm, hips_cm, arm_cm, thigh_cm, calf_cm) > 0)
);

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'body_measurements']
  loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)',
      t || '_owner_only', t
    );
  end loop;
end;
$$;
