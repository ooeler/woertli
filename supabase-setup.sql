-- «Wörtli üben»: Tabelle für den Lern-Fortschritt, eine Zeile pro Kind.
-- In Supabase öffnen: SQL Editor → New query → alles hier einfügen → Run.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Schutz: Jedes Kind sieht und ändert nur seinen eigenen Fortschritt.
alter table public.progress enable row level security;

-- Rechte so knapp wie möglich: Gäste nichts, angemeldete Kinder nur lesen/anlegen/ändern
revoke all on public.progress from anon;
revoke truncate, references, trigger, delete on public.progress from authenticated;
grant select, insert, update on public.progress to authenticated;

drop policy if exists "eigenen Fortschritt lesen"  on public.progress;
drop policy if exists "eigenen Fortschritt anlegen" on public.progress;
drop policy if exists "eigenen Fortschritt ändern" on public.progress;

create policy "eigenen Fortschritt lesen"  on public.progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "eigenen Fortschritt anlegen" on public.progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "eigenen Fortschritt ändern" on public.progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Grösse und Form der gespeicherten Daten begrenzen (höchstens 256 KB, immer ein Objekt)
alter table public.progress drop constraint if exists progress_data_size;
alter table public.progress drop constraint if exists progress_data_object;
alter table public.progress
  add constraint progress_data_size   check (pg_column_size(data) <= 262144),
  add constraint progress_data_object check (jsonb_typeof(data) = 'object');

-- Zeitstempel setzt der Server, nicht der Browser
create or replace function public.progress_touch() returns trigger
  language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists progress_touch on public.progress;
create trigger progress_touch before insert or update on public.progress
  for each row execute function public.progress_touch();
revoke execute on function public.progress_touch() from anon, authenticated, public;
