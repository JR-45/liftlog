-- Sichtbar nur auf Wunsch. 20261108154138 hat für jedes Konto automatisch eine auffindbare Identität
-- angelegt und das Verbergen entfernt. Beides wird hier zurückgenommen:
--   * neue Konten bekommen keine Identität mehr, sichtbar wird man nur über enable_social_profile()
--   * „Profil verbergen“ löscht die eigene Identität samt allen Folgebeziehungen (on delete cascade)
--   * automatisch angelegte, nie genutzte Identitäten werden entfernt. Wer schon Beziehungen hat,
--     bleibt sichtbar und kann sich jederzeit selbst verbergen.
drop trigger if exists create_social_identity on auth.users;
drop function if exists public.create_social_identity();

grant delete on public.social_profiles to authenticated;
drop policy if exists social_profiles_delete on public.social_profiles;
create policy social_profiles_delete on public.social_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

delete from public.social_profiles sp
where not exists (
  select 1 from public.follows f where f.user_id = sp.user_id or f.followed_user_id = sp.user_id
);
