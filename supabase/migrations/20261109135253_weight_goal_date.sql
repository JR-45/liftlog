-- Wunschtermin fürs Zielgewicht. Daraus rechnet die App das Tempo und das Kalorienziel.
-- Kein Default und kein Vergleich mit heute: Das Datum kommt lokal vom Handy, die DB läuft in UTC.
alter table public.profiles add column target_date date;
