create table public.oficinapro_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.oficinapro_accounts enable row level security;

grant select, insert, update on public.oficinapro_accounts to authenticated;

create policy "Users can read their own OficinaPro account"
  on public.oficinapro_accounts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own OficinaPro account"
  on public.oficinapro_accounts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own OficinaPro account"
  on public.oficinapro_accounts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

