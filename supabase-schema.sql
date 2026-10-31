-- ============================================================================
-- InternTrack: Complete Database Migration for Bicol University
-- Project URL: https://lgfgxdhxjnmuebjsefnc.supabase.co
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS & ORGANIZATION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    group_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coordinators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
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

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    coordinator_id UUID REFERENCES coordinators(id),
    batch_id UUID REFERENCES batches(id),
    group_id UUID REFERENCES groups(id),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    company_name VARCHAR(255),
    company_branch VARCHAR(255),
    mentor_name VARCHAR(255),
    duty_start VARCHAR(10) DEFAULT '08:00',
    duty_end VARCHAR(10) DEFAULT '17:00',
    full_name VARCHAR(255) NOT NULL,
    required_hours DECIMAL(6, 2) DEFAULT 486.00,
    completed_hours DECIMAL(6, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. TRACKING & REPORTS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_in TIMESTAMP WITH TIME ZONE,
    time_out TIMESTAMP WITH TIME ZONE,
    hours_rendered DECIMAL(5, 2),
    ai_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accomplishment_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    raw_task_logs TEXT,
    nlp_summary TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS overtime_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    hours_requested DECIMAL(5, 2) NOT NULL DEFAULT 8.00,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    coordinator_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
