-- «Wörtli üben»: Tabelle für den Lern-Fortschritt, eine Zeile pro Kind.
-- In Supabase öffnen: SQL Editor → New query → alles hier einfügen → Run.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Schutz: Jedes Kind sieht und ändert nur seinen eigenen Fortschritt.
alter table public.progress enable row level security;

drop policy if exists "eigenen Fortschritt lesen"  on public.progress;
drop policy if exists "eigenen Fortschritt anlegen" on public.progress;
drop policy if exists "eigenen Fortschritt ändern" on public.progress;

create policy "eigenen Fortschritt lesen"  on public.progress
  for select using (auth.uid() = user_id);
create policy "eigenen Fortschritt anlegen" on public.progress
  for insert with check (auth.uid() = user_id);
create policy "eigenen Fortschritt ändern" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
