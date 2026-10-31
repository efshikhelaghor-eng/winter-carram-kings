-- উইন্টার ক্যারাম কিংস টুর্নামেন্ট–২০২৬ইং
-- Supabase SQL Editor-এ সম্পূর্ণ ফাইলটি রান করুন।
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  group_name text not null check (group_name in ('A','B','C','D')),
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  category text not null check (category in ('A','B','C')),
  slot int not null check (slot in (1,2)),
  created_at timestamptz not null default now(),
  unique(team_id,slot)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  match_no text not null unique,
  sort_order int not null unique,
  stage text not null check (stage in ('group','quarterfinal','semifinal','third_place','final')),
  group_name text check (group_name in ('A','B','C','D')),
  team1_id uuid references public.teams(id) on delete set null,
  team2_id uuid references public.teams(id) on delete set null,
  score1 int check (score1 is null or score1 >= 0),
  score2 int check (score2 is null or score2 >= 0),
  status text not null default 'scheduled' check (status in ('scheduled','live','completed')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;

-- Public users can read tournament data, but only allowlisted admin account can mutate it.
create policy "public read teams" on public.teams for select using (true);
create policy "public read players" on public.players for select using (true);
create policy "public read matches" on public.matches for select using (true);
create policy "admin can read admin list" on public.admin_users for select to authenticated using (user_id = auth.uid());

create policy "admin manages teams" on public.teams for all to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
create policy "admin manages players" on public.players for all to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
create policy "admin manages matches" on public.matches for all to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Enable Realtime for live public updates
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.matches;

-- Seed 12 group-stage fixtures and 8 knockout fixtures (20 matches total).
insert into public.matches (match_no,sort_order,stage,group_name) values
('G-A1',1,'group','A'),('G-A2',2,'group','A'),('G-A3',3,'group','A'),
('G-B1',4,'group','B'),('G-B2',5,'group','B'),('G-B3',6,'group','B'),
('G-C1',7,'group','C'),('G-C2',8,'group','C'),('G-C3',9,'group','C'),
('G-D1',10,'group','D'),('G-D2',11,'group','D'),('G-D3',12,'group','D'),
('QF-1',13,'quarterfinal',null),('QF-2',14,'quarterfinal',null),
('QF-3',15,'quarterfinal',null),('QF-4',16,'quarterfinal',null),
('SF-1',17,'semifinal',null),('SF-2',18,'semifinal',null),
('3RD',19,'third_place',null),('FINAL',20,'final',null)
on conflict (match_no) do nothing;

-- IMPORTANT: Create the admin in Supabase Authentication first, then run:
-- insert into public.admin_users (user_id) values ('PASTE_AUTH_USER_UUID_HERE');
-- Do not put a service-role key in the website or in NEXT_PUBLIC_* variables.
