-- ============================================================================
-- SUDU EARNFLOW AI - PRODUCTION SUPABASE POSTGRESQL SCHEMA & SECURITY POLICIES
-- ============================================================================
-- Execute this entire file in your Supabase SQL Editor (Dashboard -> SQL Editor).
-- This provisions all 5 core tables, sets up foreign key constraints, indexes,
-- Row Level Security (RLS) data isolation, automatic profile trigger on signup,
-- and clearly labeled demo seed data.
-- ============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 2. PROFILES TABLE
-- Directly maps 1:1 with auth.users via id primary key
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null default 'Verified Member',
  email text,
  country text not null default 'India',
  education text default 'Graduate Degree',
  skills text[] not null default array['Python', 'Data Annotation', 'English (Fluent)', 'RLHF Evaluation']::text[],
  preferred_payment_methods text[] not null default array['Indian bank transfer', 'UPI']::text[],
  experience_years integer not null default 2 check (experience_years >= 0),
  min_hourly_rate numeric(10,2) not null default 20.00 check (min_hourly_rate >= 0),
  weekly_hours integer not null default 20 check (weekly_hours >= 0 and weekly_hours <= 168),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. PLATFORMS TABLE (Publicly readable verified catalog)
create table if not exists public.platforms (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  website_url text not null,
  india_supported boolean not null default true,
  payment_methods text[] not null default array['Indian bank transfer']::text[],
  platform_category text not null default 'AI Training',
  verification_status text not null default 'Verified Demo Provider',
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. OPPORTUNITIES TABLE (Publicly readable catalog with skills & payment criteria)
create table if not exists public.opportunities (
  id uuid default gen_random_uuid() primary key,
  platform_id uuid references public.platforms(id) on delete cascade not null,
  title text not null,
  description text not null,
  opportunity_url text not null,
  compensation text not null,
  currency text not null default 'USD',
  country_eligibility text[] not null default array['India']::text[],
  payment_methods text[] not null default array['Indian bank transfer']::text[],
  skills_required text[] not null default array[]::text[],
  deadline date,
  source text not null default 'Sudu Opportunity Radar',
  verification_status text not null default 'Verified Demo Opportunity',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. APPLICATIONS TABLE (Private to the user with RLS)
create table if not exists public.applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  opportunity_id uuid references public.opportunities(id) on delete cascade not null,
  status text not null default 'Saved' check (
    status in ('Saved', 'Applied', 'Assessment', 'Interview', 'Pending approval', 'Accepted', 'Rejected')
  ),
  cover_letter text,
  screening_answers jsonb default '{}'::jsonb not null,
  notes text default '',
  applied_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_opportunity unique (user_id, opportunity_id)
);

-- 6. EARNINGS TABLE (Private to the user with RLS)
create table if not exists public.earnings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  platform_id uuid references public.platforms(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'USD',
  payment_status text not null check (payment_status in ('Received', 'Pending')),
  payment_method text not null default 'Indian bank transfer',
  payment_date date not null default current_date,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- PERFORMANCE & FILTER INDEXES
-- ============================================================================
create index if not exists idx_opportunities_platform on public.opportunities(platform_id);
create index if not exists idx_opportunities_created on public.opportunities(created_at desc);
create index if not exists idx_applications_user on public.applications(user_id);
create index if not exists idx_applications_opportunity on public.applications(opportunity_id);
create index if not exists idx_applications_status on public.applications(user_id, status);
create index if not exists idx_earnings_user on public.earnings(user_id);
create index if not exists idx_earnings_payment_date on public.earnings(user_id, payment_date desc);
create index if not exists idx_earnings_status on public.earnings(user_id, payment_status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.platforms enable row level security;
alter table public.opportunities enable row level security;
alter table public.applications enable row level security;
alter table public.earnings enable row level security;

-- PROFILES POLICIES
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- PLATFORMS POLICIES (Public read-only catalog)
drop policy if exists "Public read platforms" on public.platforms;
create policy "Public read platforms"
  on public.platforms for select
  using (true);

-- OPPORTUNITIES POLICIES (Public read-only catalog)
drop policy if exists "Public read opportunities" on public.opportunities;
create policy "Public read opportunities"
  on public.opportunities for select
  using (true);

-- APPLICATIONS POLICIES (Strict User Isolation)
drop policy if exists "Users can select own applications" on public.applications;
create policy "Users can select own applications"
  on public.applications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own applications" on public.applications;
create policy "Users can insert own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own applications" on public.applications;
create policy "Users can update own applications"
  on public.applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own applications" on public.applications;
create policy "Users can delete own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

-- EARNINGS POLICIES (Strict User Isolation)
drop policy if exists "Users can select own earnings" on public.earnings;
create policy "Users can select own earnings"
  on public.earnings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own earnings" on public.earnings;
create policy "Users can insert own earnings"
  on public.earnings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own earnings" on public.earnings;
create policy "Users can update own earnings"
  on public.earnings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own earnings" on public.earnings;
create policy "Users can delete own earnings"
  on public.earnings for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    full_name, 
    email, 
    country, 
    education, 
    skills, 
    preferred_payment_methods,
    experience_years,
    min_hourly_rate,
    weekly_hours
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'country', 'India'),
    'B.Tech / B.Sc in Information Technology',
    array['Python', 'Data Annotation', 'English (Fluent)', 'RLHF Evaluation']::text[],
    array['Indian bank transfer', 'UPI']::text[],
    2,
    20.00,
    20
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- SEED DATA (Explicitly labeled Verified Demo Opportunities)
-- ============================================================================
insert into public.platforms (id, name, website_url, india_supported, payment_methods, platform_category, verification_status, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'Outlier AI', 'https://outlier.ai', true, array['Indian bank transfer', 'PayPal', 'Direct Deposit'], 'AI Training', 'Verified Demo Provider', 'Primary LLM reinforcement learning platform. Payouts processed weekly on Tuesdays via direct bank wire/NEFT and PayPal.'),
  ('22222222-2222-2222-2222-222222222222', 'DataAnnotation Tech', 'https://dataannotation.tech', false, array['PayPal'], 'Data Annotation', 'Verified Demo Provider', 'High pay AI evaluation tasks. Currently restricted to US, Canada, UK, Australia, Ireland, and New Zealand; India applicants face conditional screening.'),
  ('33333333-3333-3333-3333-333333333333', 'Welocalize India', 'https://welocalize.com', true, array['Indian bank transfer', 'UPI', 'Direct Deposit'], 'Search & Ads Evaluation', 'Verified Demo Provider', 'Multinational localization agency with formal registered Indian entity. Pays directly to Indian bank accounts via NEFT/IMPS.'),
  ('44444444-4444-4444-4444-444444444444', 'Alignerr by Labelbox', 'https://alignerr.com', true, array['Indian bank transfer', 'Payoneer', 'Deel'], 'AI Alignment', 'Verified Demo Provider', 'Deel-powered global contractor payroll. Supports direct INR withdrawal to any Indian savings or current bank account.'),
  ('55555555-5555-5555-5555-555555555555', 'OneForma by Centific', 'https://oneforma.com', true, array['Payoneer', 'PayPal', 'Indian bank transfer'], 'Audio & Translation', 'Verified Demo Provider', 'Multimodal AI training datasets. Supports Indian banking via Payoneer direct transfer integration.')
on conflict (id) do nothing;

insert into public.opportunities (id, platform_id, title, description, opportunity_url, compensation, currency, country_eligibility, payment_methods, skills_required, deadline, source, verification_status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'AI Python & Reasoning Evaluator', 'Evaluate, benchmark, and improve code generation responses produced by leading foundational AI models. Formulate step-by-step mathematical reasoning and debug synthetic algorithms.', 'https://outlier.ai/evaluators', '$25 - $45 / hr (Est.)', 'USD', array['India', 'United States', 'Canada', 'United Kingdom', 'Germany'], array['Indian bank transfer', 'PayPal', 'Direct Deposit'], array['Python', 'Problem Solving', 'RLHF Evaluation', 'Prompt Engineering'], '2026-12-15', 'Sudu Opportunity Radar', 'Verified Demo Opportunity'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'Expert Subject Matter Evaluator - STEM & Coding', 'Review high-difficulty benchmarks in software architecture, computer science principles, and algorithm complexity. Requires passing a 45-minute technical verification assessment.', 'https://alignerr.com/apply', '$30 - $55 / hr (Est.)', 'USD', array['India', 'Global', 'United States', 'Canada'], array['Indian bank transfer', 'Payoneer', 'Deel'], array['Python', 'Prompt Engineering', 'Critical Reading', 'Fact-Checking'], '2026-12-31', 'Sudu Opportunity Radar', 'Verified Demo Opportunity'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Search & Ad Relevance Evaluator (Hindi / English)', 'Measure the accuracy, safety, and cultural intent of search engine results and ad units for internet users in the Indian market. Flexible part-time hours with weekly reporting.', 'https://welocalize.com/jobs', '$14 - $18 / hr (Est.)', 'USD', array['India'], array['Indian bank transfer', 'UPI', 'Direct Deposit'], array['English (Fluent)', 'Fact-Checking', 'Critical Reading'], '2026-11-30', 'Sudu Opportunity Radar', 'Verified Demo Opportunity'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Bilingual Prompt Response Auditor', 'Audit dual-model generative text outputs for logical consistency, truthfulness, and safety compliance. Strict geographic residency check during registration.', 'https://dataannotation.tech', '$20 - $25 / hr (Est.)', 'USD', array['United States', 'Canada', 'United Kingdom', 'Australia'], array['PayPal'], array['Critical Reading', 'Fact-Checking', 'English (Fluent)'], '2026-12-20', 'Sudu Opportunity Radar', 'Verified Demo Opportunity'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555', 'Indian Accent Voice & Audio Transcriber', 'Transcribe regional Indian English, Hindi-English code-switching, and speech samples to train next-gen acoustic speech recognition systems.', 'https://oneforma.com/projects', '$12 - $17 / hr (Est.)', 'USD', array['India', 'Global'], array['Payoneer', 'PayPal', 'Indian bank transfer'], array['English (Fluent)', 'Data Annotation', 'Audio Transcription'], '2027-01-10', 'Sudu Opportunity Radar', 'Verified Demo Opportunity')
on conflict (id) do nothing;
