-- Run in Supabase SQL Editor (https://supabase.com/dashboard)

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null unique,
  role text not null default 'player' check (role in ('admin', 'player')),
  email text not null default 'placeholder@goalguru.local',
  coin_balance integer not null default 1000 check (coin_balance >= 0),
  total_points integer not null default 0 check (total_points >= 0),
  default_odds_mode text not null default 'fixed' check (default_odds_mode in ('fixed', 'pool')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup (email + Google)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      'Žaidėjas'
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- BETS TABLE — run this block after profiles table is created
-- ============================================================

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  match_id text not null,
  outcome text not null check (outcome in ('home', 'draw', 'away')),
  stake integer not null check (stake >= 1),
  odds_mode text not null default 'fixed' check (odds_mode in ('fixed', 'pool')),
  coefficient numeric not null,
  created_at timestamptz not null default now(),
  settled boolean not null default false,
  points_won integer not null default 0,
  placed_by_admin boolean not null default false,
  unique (player_id, match_id)
);

alter table public.bets enable row level security;

create policy "Players can view own bets"
  on public.bets for select
  using (auth.uid() = player_id);

create policy "Players can place own bets"
  on public.bets for insert
  with check (auth.uid() = player_id);

create policy "Admin can view all bets"
  on public.bets for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admin can insert any bet"
  on public.bets for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admin can update any bet"
  on public.bets for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
