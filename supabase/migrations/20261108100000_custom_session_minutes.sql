-- Eigene Trainingsdauer im Onboarding: statt nur 30, 45, 60 oder 90 Minuten jetzt jeder ganze
-- Wert von 10 bis 240 Minuten. Bestehende Werte liegen alle in diesem Bereich.
alter table public.profiles
  drop constraint profiles_session_minutes_check,
  add constraint profiles_session_minutes_check check (session_minutes between 10 and 240);
