-- Konto löschen (DSGVO, Recht auf Löschung).
--
-- Ein eingeloggter User darf nur sich selbst löschen. Dafür braucht die Funktion Rechte auf
-- auth.users, die authenticated nicht hat, deshalb security definer. Abgesichert durch:
--   * sie löscht ausschließlich die Zeile mit auth.uid(), Parameter gibt es keine
--   * search_path = '' gegen untergeschobene Objekte
--   * nur authenticated darf sie ausführen, anon und public nicht
-- Alle Tabellen in public hängen mit on delete cascade an auth.users, die Daten verschwinden mit.
-- Die App prüft vorher das Passwort, damit ein offen liegendes Handy nicht reicht.
create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'delete_own_account requires a logged-in user' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon, authenticated;
grant execute on function public.delete_own_account() to authenticated;
