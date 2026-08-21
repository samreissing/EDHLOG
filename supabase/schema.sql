-- EDHLOG cloud sync schema (run in Supabase SQL editor)
-- After running: disable public sign-ups in Auth settings so only you can create an account.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "Users read own data" on public.user_data;
create policy "Users read own data"
  on public.user_data for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own data" on public.user_data;
create policy "Users insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own data" on public.user_data;
create policy "Users update own data"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own data" on public.user_data;
create policy "Users delete own data"
  on public.user_data for delete
  using (auth.uid() = user_id);

create or replace function public.set_user_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_updated_at on public.user_data;
create trigger user_data_updated_at
  before update on public.user_data
  for each row execute function public.set_user_data_updated_at();

-- Optional: restrict to a single email (replace with your address).
-- drop policy if exists "Users read own data" on public.user_data;
-- create policy "Users read own data"
--   on public.user_data for select
--   using (auth.uid() = user_id and auth.jwt() ->> 'email' = 'you@example.com');
