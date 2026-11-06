-- Arbeitsgewicht pro Übung: Die Buttons + und − ändern current_weight_kg um weight_step_kg.
--
-- Das Gewicht gilt pro Übung, nicht pro Trainingstag: Eine Erhöhung am Montag gilt also
-- auch am Donnerstag. Abgelegte Sätze speichern ihr eigenes Gewicht in sets.weight_kg,
-- die Historie ändert sich dadurch nicht.
--
-- Ob eine Übung Gewicht erfasst, steuert der bestehende tracking_type
-- (weight_reps oder reps). Dafür ist keine weitere Spalte nötig.
--
-- Die RLS-Policy von exercises gilt zeilenweise und schützt die neuen Spalten automatisch.
alter table public.exercises
  add column current_weight_kg numeric(6, 2) check (current_weight_kg >= 0),
  add column weight_step_kg numeric(4, 2) not null default 2.5 check (weight_step_kg > 0);
