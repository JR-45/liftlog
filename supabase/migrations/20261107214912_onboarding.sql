-- Antworten aus dem Onboarding. Sie steuern den vorgeschlagenen Plan und lassen sich später im
-- Profil ändern. onboarding_completed_at markiert, dass jemand den Ablauf abgeschlossen hat.
-- Bestehende Nutzer mit Plan sehen das Onboarding nicht, das prüft die App am Plan.
alter table public.profiles
  add column experience_level        text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  add column training_location       text check (training_location in ('gym', 'home', 'bodyweight')),
  add column session_minutes         smallint check (session_minutes in (30, 45, 60, 90)),
  add column onboarding_completed_at timestamptz;
