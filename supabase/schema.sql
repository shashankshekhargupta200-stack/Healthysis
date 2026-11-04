create table if not exists public.profiles (
  id text primary key,
  full_name text not null,
  phone text,
  patient_id text,
  dob date,
  blood_group text,
  abha_id text,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists patient_id text;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, patient_id)
  values (
    new.id::text,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, new.phone, ''), '@', 1), ''),
      'User'
    ),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create table if not exists public.medical_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('diagnosis', 'medication', 'surgery')),
  details jsonb not null default '{}'::jsonb,
  date date,
  created_at timestamptz not null default now()
);

create index if not exists medical_history_user_type_idx
  on public.medical_history(user_id, type);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  food_name text not null,
  calories numeric not null check (calories >= 0),
  macros jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists meal_logs_user_timestamp_idx
  on public.meal_logs(user_id, timestamp desc);

alter table public.profiles enable row level security;
alter table public.medical_history enable row level security;
alter table public.meal_logs enable row level security;

-- Every record is owned by the authenticated Supabase Auth user UUID.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select to authenticated
  using (id = (select auth.uid()::text));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()::text));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = (select auth.uid()::text))
  with check (id = (select auth.uid()::text));

drop policy if exists medical_history_select_own on public.medical_history;
create policy medical_history_select_own
  on public.medical_history for select to authenticated
  using (user_id = (select auth.uid()::text));

drop policy if exists medical_history_insert_own on public.medical_history;
create policy medical_history_insert_own
  on public.medical_history for insert to authenticated
  with check (user_id = (select auth.uid()::text));

drop policy if exists medical_history_update_own on public.medical_history;
create policy medical_history_update_own
  on public.medical_history for update to authenticated
  using (user_id = (select auth.uid()::text))
  with check (user_id = (select auth.uid()::text));

drop policy if exists medical_history_delete_own on public.medical_history;
create policy medical_history_delete_own
  on public.medical_history for delete to authenticated
  using (user_id = (select auth.uid()::text));

drop policy if exists meal_logs_select_own on public.meal_logs;
create policy meal_logs_select_own
  on public.meal_logs for select to authenticated
  using (user_id = (select auth.uid()::text));

drop policy if exists meal_logs_insert_own on public.meal_logs;
create policy meal_logs_insert_own
  on public.meal_logs for insert to authenticated
  with check (user_id = (select auth.uid()::text));

drop policy if exists meal_logs_update_own on public.meal_logs;
create policy meal_logs_update_own
  on public.meal_logs for update to authenticated
  using (user_id = (select auth.uid()::text))
  with check (user_id = (select auth.uid()::text));

drop policy if exists meal_logs_delete_own on public.meal_logs;
create policy meal_logs_delete_own
  on public.meal_logs for delete to authenticated
  using (user_id = (select auth.uid()::text));
