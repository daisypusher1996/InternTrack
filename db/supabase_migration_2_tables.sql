-- ============================================================================
-- InternTrack Supabase Migration: 2 Separate Profile Tables & Photo Sync
-- Run this in your Supabase Project: lgfgxdhxjnmuebjsefnc -> SQL Editor -> Run
-- ============================================================================

-- Enable pgcrypto / uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. COORDINATOR PROFILES TABLE
-- Dedicated to practicum coordinators & academic supervisors
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coordinator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bu_id VARCHAR(50) UNIQUE NOT NULL,                -- e.g. 'FAC-2026-CS-004'
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'coordinator',
    college TEXT NOT NULL DEFAULT 'College of Science',
    department TEXT NOT NULL DEFAULT 'Department of Computer Science',
    avatar_url TEXT,                                 -- Stores base64 data URI or public photo URL
    contact_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. STUDENT PROFILES TABLE
-- Dedicated to student interns with live DTR, company, and practicum hours
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bu_id VARCHAR(50) UNIQUE NOT NULL,                -- e.g. '2023-CS-1249'
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    degree TEXT DEFAULT 'BS Computer Science',
    college TEXT DEFAULT 'College of Science',
    department TEXT DEFAULT 'Department of Computer Science',
    class_block TEXT,                                 -- e.g. 'BSCS 4-A', 'BSIT 4-B'
    batch_id TEXT DEFAULT 'batch-1',
    company_id TEXT,
    company_name TEXT DEFAULT 'Not Yet Enrolled (Pending Application)',
    company_branch TEXT,
    mentor_name TEXT DEFAULT 'Unassigned',
    coordinator_id TEXT,
    coordinator_name TEXT,
    coordinator_email TEXT,
    duty_start TEXT DEFAULT '08:00',
    duty_end TEXT DEFAULT '17:00',
    duty_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    target_hours NUMERIC DEFAULT 486,
    rendered_hours NUMERIC DEFAULT 0,
    attendance_rate NUMERIC DEFAULT 100,
    enrollment_status TEXT DEFAULT 'not_enrolled',     -- 'not_enrolled', 'pending_approval', 'approved', 'declined'
    status TEXT DEFAULT 'active',                      -- 'active', 'completed', 'at_risk'
    is_archived BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,                                  -- Stores base64 data URI or public photo URL
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-speed queries
CREATE INDEX IF NOT EXISTS idx_coord_profiles_email ON public.coordinator_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON public.student_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_class_block ON public.student_profiles(class_block);
CREATE INDEX IF NOT EXISTS idx_student_profiles_coord_email ON public.student_profiles(coordinator_email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.coordinator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for authenticated web app access & seamless real-time sync
DROP POLICY IF EXISTS "Public read coordinator_profiles" ON public.coordinator_profiles;
CREATE POLICY "Public read coordinator_profiles" ON public.coordinator_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow upsert coordinator_profiles" ON public.coordinator_profiles;
CREATE POLICY "Allow upsert coordinator_profiles" ON public.coordinator_profiles
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read student_profiles" ON public.student_profiles;
CREATE POLICY "Public read student_profiles" ON public.student_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow upsert student_profiles" ON public.student_profiles;
CREATE POLICY "Allow upsert student_profiles" ON public.student_profiles
    FOR ALL USING (true) WITH CHECK (true);

-- Optional: Auto-migrate existing records from legacy 'profiles' and 'students' if they already exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        INSERT INTO public.coordinator_profiles (bu_id, full_name, email, role, department, avatar_url, updated_at)
        SELECT 
            COALESCE(bu_id, 'FAC-' || SUBSTRING(id::text, 1, 8)),
            full_name,
            LOWER(TRIM(email)),
            'coordinator',
            COALESCE(department, 'Department of Computer Science'),
            avatar_url,
            NOW()
        FROM public.profiles
        WHERE role = 'coordinator'
        ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            avatar_url = COALESCE(EXCLUDED.avatar_url, public.coordinator_profiles.avatar_url),
            updated_at = NOW();

        INSERT INTO public.student_profiles (bu_id, full_name, email, department, class_block, avatar_url, updated_at)
        SELECT 
            COALESCE(bu_id, 'STU-' || SUBSTRING(id::text, 1, 8)),
            full_name,
            LOWER(TRIM(email)),
            COALESCE(department, 'Department of Computer Science'),
            class_block,
            avatar_url,
            NOW()
        FROM public.profiles
        WHERE role = 'student'
        ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            class_block = COALESCE(EXCLUDED.class_block, public.student_profiles.class_block),
            avatar_url = COALESCE(EXCLUDED.avatar_url, public.student_profiles.avatar_url),
            updated_at = NOW();
    END IF;
END $$;
