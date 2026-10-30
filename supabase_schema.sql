-- =========================================================================
-- InternTrack Supabase Database Schema
-- Run this in your Supabase Project: SQL Editor -> New Query -> Run
-- =========================================================================

-- Enable uuid generation
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase Auth or standalone)
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('coordinator', 'student')),
  bu_id text not null,
  department text default 'Department of Computer Science',
  class_block text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Companies / Host Training Establishments (HTE)
create table if not exists public.companies (
  id text primary key,
  name text not null,
  sector text,
  address text,
  contact_person text,
  contact_email text,
  contact_phone text,
  moa_status text default 'active' check (moa_status in ('active', 'pending_renewal', 'under_review')),
  max_interns integer default 10,
  current_interns integer default 0,
  workstation_subnet text default '192.168.1.0/24',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Class Batches / Academic Cohorts
create table if not exists public.class_batches (
  id text primary key,
  batch_code text not null,
  batch_name text not null,
  block_section text not null,
  academic_year text not null,
  semester text not null,
  coordinator_name text not null,
  total_students integer default 0,
  completed_students integer default 0,
  total_hours_rendered numeric default 0,
  target_hours integer default 486,
  is_archived boolean default false,
  archived_date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Practicum Groups
create table if not exists public.practicum_groups (
  id text primary key,
  code text not null,
  name text not null,
  company_id text references public.companies(id) on delete set null,
  company_name text,
  leader_id text,
  leader_name text,
  academic_year text not null,
  semester text not null,
  target_hours integer default 486,
  members_count integer default 0,
  status text default 'active' check (status in ('active', 'completed', 'pending')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Students
create table if not exists public.students (
  id text primary key,
  bu_id text not null,
  full_name text not null,
  email text not null,
  degree text default 'BS Computer Science',
  college text default 'College of Science',
  class_block text,
  batch_id text references public.class_batches(id) on delete set null,
  enrollment_type text default 'individual' check (enrollment_type in ('individual', 'group')),
  group_id text references public.practicum_groups(id) on delete set null,
  group_name text,
  company_id text references public.companies(id) on delete set null,
  company_name text,
  mentor_name text,
  duty_start text default '08:00',
  duty_end text default '17:00',
  duty_days text default 'Monday to Friday',
  target_hours integer default 486,
  rendered_hours numeric default 0,
  attendance_rate numeric default 100,
  status text default 'active' check (status in ('active', 'completed', 'at_risk')),
  enrollment_status text default 'pending_approval' check (enrollment_status in ('not_enrolled', 'pending_approval', 'approved', 'declined')),
  enrollment_declined_reason text,
  deployment_approved boolean default false,
  deployment_approved_at timestamp with time zone,
  completion_approved boolean default false,
  completion_approved_at timestamp with time zone,
  is_archived boolean default false,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Attendance Logs (DTR Time-In / Time-Out)
create table if not exists public.attendance_logs (
  id text primary key,
  student_id text references public.students(id) on delete cascade not null,
  student_name text not null,
  company_id text,
  date text not null,
  time_in text not null,
  time_out text,
  hours_rendered numeric default 0,
  status text default 'present' check (status in ('present', 'late', 'undertime', 'absent')),
  workstation_ip text default '192.168.1.100',
  remarks text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Daily Accomplishment Reports
create table if not exists public.accomplishment_reports (
  id text primary key,
  student_id text references public.students(id) on delete cascade not null,
  student_name text not null,
  group_id text references public.practicum_groups(id) on delete set null,
  group_name text,
  company_id text,
  company_name text,
  date text not null,
  week_number integer default 1,
  work_category text not null,
  task_title text not null,
  task_description text not null,
  hours_spent numeric default 8,
  task_status text default 'completed' check (task_status in ('completed', 'in_progress', 'blocked')),
  obstacles_faced text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Attendance Alerts / Anomalies
create table if not exists public.attendance_alerts (
  id text primary key,
  student_id text references public.students(id) on delete cascade not null,
  student_name text not null,
  company_name text,
  anomaly_type text not null,
  severity text default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  detection_method text default 'Rule-Based Heuristic',
  anomaly_score numeric default 0.8,
  expected_schedule text,
  message text not null,
  email_dispatched boolean default false,
  push_dispatched boolean default false,
  status text default 'pending_review' check (status in ('pending_review', 'acknowledged', 'excused', 'sanctioned')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. AI Summaries
create table if not exists public.ai_summaries (
  id text primary key,
  group_id text,
  group_name text,
  student_id text,
  student_name text,
  week_number integer default 1,
  total_members integer default 0,
  members_attended integer default 0,
  total_hours_rendered numeric default 0,
  tasks_submitted integer default 0,
  tasks_completed integer default 0,
  dominant_work_areas text[],
  ai_highlight text,
  key_findings text[],
  decision_support_notes text,
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) Enablement
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.class_batches enable row level security;
alter table public.practicum_groups enable row level security;
alter table public.students enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.accomplishment_reports enable row level security;
alter table public.attendance_alerts enable row level security;
alter table public.ai_summaries enable row level security;

-- Public read / write policies for applet usage
create policy "Public Access Profiles" on public.profiles for all using (true) with check (true);
create policy "Public Access Companies" on public.companies for all using (true) with check (true);
create policy "Public Access Batches" on public.class_batches for all using (true) with check (true);
create policy "Public Access Groups" on public.practicum_groups for all using (true) with check (true);
create policy "Public Access Students" on public.students for all using (true) with check (true);
create policy "Public Access Attendance" on public.attendance_logs for all using (true) with check (true);
create policy "Public Access Accomplishments" on public.accomplishment_reports for all using (true) with check (true);
create policy "Public Access Alerts" on public.attendance_alerts for all using (true) with check (true);
create policy "Public Access AI Summaries" on public.ai_summaries for all using (true) with check (true);
