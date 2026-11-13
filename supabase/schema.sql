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

alter table public.profiles
  add column if not exists smoking_status text,
  add column if not exists alcohol_intake text,
  add column if not exists junk_food_freq text;

alter table public.profiles
  add column if not exists blood_pressure_latest text,
  add column if not exists blood_glucose_latest numeric,
  add column if not exists heart_rate_latest numeric,
  add column if not exists hba1c_latest numeric,
  add column if not exists cholesterol_latest numeric,
  add column if not exists ldl_latest numeric,
  add column if not exists hdl_latest numeric,
  add column if not exists triglycerides_latest numeric,
  add column if not exists vitamin_d_latest numeric,
  add column if not exists vitamin_b12_latest numeric,
  add column if not exists thyroid_tsh_latest numeric,
  add column if not exists hemoglobin_latest numeric;

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

alter table public.meal_logs
  add column if not exists image_url text;

create table if not exists public.patient_vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null,
  vital_name text not null,
  value numeric,
  unit text,
  systolic numeric,
  diastolic numeric,
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists patient_vitals_patient_recorded_idx
  on public.patient_vitals(patient_id, recorded_at desc);

create table if not exists public.clinical_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null,
  document_url text,
  document_type text not null default 'lab_report',
  extracted_biomarkers jsonb not null default '[]'::jsonb,
  detected_anomalies jsonb not null default '[]'::jsonb,
  misprint_flags text[] not null default '{}',
  plain_language_summary text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists clinical_documents_patient_created_idx
  on public.clinical_documents(patient_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.medical_history enable row level security;
alter table public.meal_logs enable row level security;
alter table public.patient_vitals enable row level security;
alter table public.clinical_documents enable row level security;

drop policy if exists patient_vitals_select_own on public.patient_vitals;
create policy patient_vitals_select_own
  on public.patient_vitals for select to authenticated
  using (patient_id = (select auth.uid()::text));

drop policy if exists patient_vitals_insert_own on public.patient_vitals;
create policy patient_vitals_insert_own
  on public.patient_vitals for insert to authenticated
  with check (patient_id = (select auth.uid()::text));

drop policy if exists clinical_documents_select_own on public.clinical_documents;
create policy clinical_documents_select_own
  on public.clinical_documents for select to authenticated
  using (patient_id = (select auth.uid()::text));

drop policy if exists clinical_documents_insert_own on public.clinical_documents;
create policy clinical_documents_insert_own
  on public.clinical_documents for insert to authenticated
  with check (patient_id = (select auth.uid()::text));

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

create table if not exists public.patient_memory_vault (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  category text not null check (category in ('lab_report', 'prescription', 'diet_meal', 'physical_symptom', 'other')),
  storage_folder text not null check (storage_folder in ('lab-reports', 'prescriptions', 'diet-meals', 'symptoms', 'misc')),
  title text not null,
  extracted_data jsonb not null default '{}'::jsonb,
  patient_summary text not null default '',
  clinical_alerts text[] not null default '{}',
  document_url text,
  created_at timestamptz not null default now()
);

alter table public.patient_memory_vault
  add column if not exists file_url text,
  add column if not exists storage_path text;

create index if not exists patient_memory_vault_user_created_idx
  on public.patient_memory_vault(user_id, created_at desc);

alter table public.patient_memory_vault enable row level security;

drop policy if exists patient_memory_vault_select_own on public.patient_memory_vault;
create policy patient_memory_vault_select_own
  on public.patient_memory_vault for select to authenticated
  using (user_id = (select auth.uid()::text));

drop policy if exists patient_memory_vault_insert_own on public.patient_memory_vault;
create policy patient_memory_vault_insert_own
  on public.patient_memory_vault for insert to authenticated
  with check (user_id = (select auth.uid()::text));

drop policy if exists patient_memory_vault_update_own on public.patient_memory_vault;
create policy patient_memory_vault_update_own
  on public.patient_memory_vault for update to authenticated
  using (user_id = (select auth.uid()::text))
  with check (user_id = (select auth.uid()::text));

drop policy if exists patient_memory_vault_delete_own on public.patient_memory_vault;
create policy patient_memory_vault_delete_own
  on public.patient_memory_vault for delete to authenticated
  using (user_id = (select auth.uid()::text));

create table if not exists public.daily_symptom_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null,
  symptoms jsonb not null default '{}'::jsonb,
  logged_at timestamptz not null default now()
);

create index if not exists daily_symptom_logs_patient_logged_idx
  on public.daily_symptom_logs(patient_id, logged_at desc);

alter table public.daily_symptom_logs enable row level security;

drop policy if exists daily_symptom_logs_select_own on public.daily_symptom_logs;
create policy daily_symptom_logs_select_own
  on public.daily_symptom_logs for select to authenticated
  using (patient_id = (select auth.uid()::text));

drop policy if exists daily_symptom_logs_insert_own on public.daily_symptom_logs;
create policy daily_symptom_logs_insert_own
  on public.daily_symptom_logs for insert to authenticated
  with check (patient_id = (select auth.uid()::text));

insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('healthysis_vault', 'healthysis_vault', false, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], 8388608)
on conflict (id) do update
set public = false,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    file_size_limit = 8388608;

drop policy if exists healthysis_vault_select_own on storage.objects;
create policy healthysis_vault_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'healthysis_vault'
    and split_part(name, '/', 2) like (select auth.uid()::text) || '-%'
  );

drop policy if exists healthysis_vault_insert_own on storage.objects;
create policy healthysis_vault_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'healthysis_vault'
    and split_part(name, '/', 2) like (select auth.uid()::text) || '-%'
  );
