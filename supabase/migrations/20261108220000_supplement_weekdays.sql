-- Supplemente nicht nur täglich: an welchen Wochentagen sie dran sind (0 = Sonntag). null heißt täglich.
alter table public.supplements add column weekdays smallint[]
  check (weekdays is null or (cardinality(weekdays) between 1 and 6 and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]));
