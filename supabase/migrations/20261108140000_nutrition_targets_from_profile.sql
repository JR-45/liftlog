-- Tagesziele für die Ernährung kommen standardmäßig aus dem Profil (Kalorien und Protein aus der
-- Körperanalyse) und ändern sich mit, wenn sich das Profil ändert. Wer eigene Ziele speichert,
-- schaltet das aus. Bestehende eigene Ziele bleiben eigene Ziele.
alter table public.nutrition_settings add column targets_from_profile boolean not null default true;
update public.nutrition_settings set targets_from_profile = false where kcal is not null;
