begin;
create extension if not exists pgtap with schema extensions;
select set_config('search_path', 'public, extensions', true);
select plan(2);

select has_column('public', 'profiles', 'target_date', 'Profil hat einen Wunschtermin fürs Zielgewicht');
select col_is_null('public', 'profiles', 'target_date', 'Der Termin ist optional');

select * from finish();
rollback;
