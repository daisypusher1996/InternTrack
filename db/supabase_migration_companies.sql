-- ============================================================================
-- InternTrack: Companies Table & Student Relationship Migration
-- Project URL: https://lgfgxdhxjnmuebjsefnc.supabase.co
--
-- Run this in your Supabase Project:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Click "Run"
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    branch VARCHAR(255),
    sector VARCHAR(255) NOT NULL,
    address TEXT,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    max_interns INTEGER DEFAULT 10,
    current_interns INTEGER DEFAULT 0,
    workstation_subnet VARCHAR(100) DEFAULT '192.168.10.0/24',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Populate Standard Host Training Establishments (HTE) in Albay
INSERT INTO public.companies (id, name, branch, sector, address, contact_person, contact_email, contact_phone, max_interns, workstation_subnet)
VALUES
    ('a0000001-0000-0000-0000-000000000001', 'DOST Region V (Regional Office)', 'Regional Center Site, Rawis, Legazpi City', 'Government Science & ICT', 'Rawis, Legazpi City, Albay', 'Engr. Rommel R. Serrano', 'dost5@region5.dost.gov.ph', '+63 (052) 742-0911', 8, '192.168.10.0/24'),
    ('a0000002-0000-0000-0000-000000000002', 'Albay Provincial Information Technology Office', 'Capitol Compound, Legazpi City Branch', 'Public Sector IT Infrastructure', 'Old Albay District, Legazpi City', 'Mary Jane B. Gomez, MIT', 'pito@albay.gov.ph', '+63 (052) 480-0255', 6, '192.168.20.0/24'),
    ('a0000003-0000-0000-0000-000000000003', 'LGU Legazpi City - MIS Division', 'City Hall Complex, Rizal St., Legazpi City', 'Local Government Systems', 'Rizal Street, Cabangan, Legazpi City', 'Arch. Joseph B. Esplana', 'mis@legazpicity.gov.ph', '+63 (052) 742-3244', 10, '192.168.30.0/24'),
    ('a0000004-0000-0000-0000-000000000004', 'Bicol University Information & Comm. Tech. Office (BU-ICTO)', 'Main Campus, Daraga / Legazpi Branch', 'Academic Enterprise Systems', 'Rizal St, Legazpi City, Albay', 'Dr. Manuel C. Belisario', 'icto@bicol-u.edu.ph', '+63 (052) 820-2400', 12, '192.168.40.0/24'),
    ('a0000005-0000-0000-0000-000000000005', 'DENR Environmental Management Bureau V', 'Regional Center, Rawis, Legazpi City Branch', 'Environmental Data Informatics', 'Regional Center Site, Rawis, Legazpi City', 'Engr. Maria Socorro A. Abu', 'r5@emb.gov.ph', '+63 (052) 742-2797', 6, '192.168.50.0/24')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    branch = EXCLUDED.branch,
    sector = EXCLUDED.sector,
    address = EXCLUDED.address;

-- 3. Alter Students Table to Establish Foreign Key Relationship and Schedule
DO $$
BEGIN
    -- Add company_id foreign key column to students table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.students ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
    END IF;

    -- Add company_name to students table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'company_name'
    ) THEN
        ALTER TABLE public.students ADD COLUMN company_name VARCHAR(255);
    END IF;

    -- Add company_branch to students table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'company_branch'
    ) THEN
        ALTER TABLE public.students ADD COLUMN company_branch VARCHAR(255);
    END IF;

    -- Add mentor_name to students table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'mentor_name'
    ) THEN
        ALTER TABLE public.students ADD COLUMN mentor_name VARCHAR(255);
    END IF;

    -- Add duty_start to students table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'duty_start'
    ) THEN
        ALTER TABLE public.students ADD COLUMN duty_start VARCHAR(10) DEFAULT '08:00';
    END IF;

    -- Add duty_end to students table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'duty_end'
    ) THEN
        ALTER TABLE public.students ADD COLUMN duty_end VARCHAR(10) DEFAULT '17:00';
    END IF;

    -- Add enrollment_status to students table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'enrollment_status'
    ) THEN
        ALTER TABLE public.students ADD COLUMN enrollment_status VARCHAR(50) DEFAULT 'approved';
    END IF;

    -- Add deployment_approved to students table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'deployment_approved'
    ) THEN
        ALTER TABLE public.students ADD COLUMN deployment_approved BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 4. Enable Row Level Security (RLS) and grant policies for public app access
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Companies" ON public.companies;
CREATE POLICY "Public Access Companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);
