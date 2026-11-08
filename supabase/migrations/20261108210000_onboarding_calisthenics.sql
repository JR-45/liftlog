-- Onboarding: Calisthenics als vierter Trainingsort (Klimmzugstange, Dips, Ringe).
alter table public.profiles drop constraint profiles_training_location_check;
alter table public.profiles add constraint profiles_training_location_check
  check (training_location in ('gym', 'home', 'bodyweight', 'calisthenics'));
