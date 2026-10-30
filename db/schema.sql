-- ============================================================================
-- InternTrack: Database Schema (PostgreSQL)
-- An AI-Powered Monitoring System for Individual and Group-Based Student Internships
-- Bicol University - College of Science / Department of Computer Science
-- RDE Agenda 5: Inclusive Education and Lifelong Learning (IELL)
-- SDGs: SDG 4 (Quality Education), SDG 8 (Decent Work), SDG 9 (Innovation)
-- ============================================================================

-- Extensions for UUID generation and cryptographic hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('student', 'coordinator', 'company_mentor', 'dean');
CREATE TYPE enrollment_type AS ENUM ('individual', 'group');
CREATE TYPE group_status AS ENUM ('active', 'completed', 'disbanded', 'pending_approval');
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'undertime', 'excused');
CREATE TYPE verification_status AS ENUM ('verified', 'pending', 'flagged_anomaly');
CREATE TYPE task_status AS ENUM ('completed', 'in_progress', 'blocked');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE alert_status AS ENUM ('pending_review', 'student_notified', 'acknowledged', 'excused', 'sanctioned');
CREATE TYPE moa_status_type AS ENUM ('active', 'pending_renewal', 'under_review');

-- 1. Users Table (Bicol University Students, Faculty, and Mentors)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bu_id_number VARCHAR(20) UNIQUE NOT NULL, -- e.g. 2023-CS-00124
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '$2a$10$demoHashedPasswordInternTrack',
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    college VARCHAR(100) NOT NULL DEFAULT 'College of Science',
    department VARCHAR(100) NOT NULL DEFAULT 'Computer Science Department',
    degree_program VARCHAR(100) NOT NULL DEFAULT 'BS Computer Science',
    class_block VARCHAR(50) DEFAULT 'BSCS 4-A',
    contact_number VARCHAR(30),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Class Block Batches & Semester Archives
CREATE TABLE class_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'BATCH-2026-1ST-CS4A'
    batch_name VARCHAR(255) NOT NULL, -- e.g. 'BSCS 4-A Practicum Batch'
    block_section VARCHAR(50) NOT NULL, -- e.g. 'BSCS 4-A'
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    semester VARCHAR(50) NOT NULL DEFAULT '1st Semester',
    coordinator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_hours INT NOT NULL DEFAULT 486,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Partner Companies Table (Host Training Establishments - HTE)
CREATE TABLE partner_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    industry_sector VARCHAR(100) NOT NULL, -- e.g., 'Government IT', 'Software Development', 'Telecommunications'
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Legazpi City',
    province VARCHAR(100) NOT NULL DEFAULT 'Albay',
    contact_person VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    moa_status moa_status_type NOT NULL DEFAULT 'active',
    max_intern_capacity INT NOT NULL DEFAULT 10,
    current_intern_count INT NOT NULL DEFAULT 0,
    workstation_ip_subnet VARCHAR(50), -- for network/IP verification
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Internship Groups Table (Self-formed student cohorts)
CREATE TABLE internship_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'BU-CS-GRP-2026-A'
    group_name VARCHAR(255) NOT NULL,
    partner_company_id UUID REFERENCES partner_companies(id) ON DELETE SET NULL,
    leader_student_id UUID REFERENCES users(id) ON DELETE SET NULL,
    coordinator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    semester VARCHAR(20) NOT NULL DEFAULT '1st Semester',
    target_hours INT NOT NULL DEFAULT 486, -- Bicol University BSCS practicum hours
    status group_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Group Members (Junction table for cohort members)
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES internship_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_leader BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_group_student UNIQUE (group_id, student_id)
);

-- 5. Student Deployments & Enrollments
CREATE TABLE student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_type enrollment_type NOT NULL DEFAULT 'group',
    group_id UUID REFERENCES internship_groups(id) ON DELETE SET NULL,
    partner_company_id UUID NOT NULL REFERENCES partner_companies(id) ON DELETE RESTRICT,
    assigned_mentor_name VARCHAR(255),
    assigned_mentor_email VARCHAR(255),
    
    -- Expected Schedule Definition
    duty_schedule_start TIME NOT NULL DEFAULT '08:00:00',
    duty_schedule_end TIME NOT NULL DEFAULT '17:00:00',
    duty_days VARCHAR(50) NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    lunch_break_minutes INT NOT NULL DEFAULT 60,
    grace_period_minutes INT NOT NULL DEFAULT 15,
    
    -- Hour Tracking
    target_hours INT NOT NULL DEFAULT 486,
    rendered_hours DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    remaining_hours DECIMAL(6,2) GENERATED ALWAYS AS (target_hours - rendered_hours) STORED,
    
    status VARCHAR(50) NOT NULL DEFAULT 'deployed',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Online Attendance Logs (Verifiable Daily Time Records)
CREATE TABLE attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
    partner_company_id UUID NOT NULL REFERENCES partner_companies(id) ON DELETE RESTRICT,
    log_date DATE NOT NULL,
    
    -- Expected vs Actual Time Records
    expected_time_in TIME NOT NULL DEFAULT '08:00:00',
    actual_time_in TIMESTAMP WITH TIME ZONE,
    expected_time_out TIME NOT NULL DEFAULT '17:00:00',
    actual_time_out TIMESTAMP WITH TIME ZONE,
    
    hours_rendered DECIMAL(5,2) DEFAULT 0.00,
    attendance_status attendance_status NOT NULL DEFAULT 'present',
    verification_status verification_status NOT NULL DEFAULT 'verified',
    
    -- Verifiable audit trail
    workstation_ip VARCHAR(45),
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    device_info TEXT,
    remarks TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_date UNIQUE (student_id, log_date)
);

-- 7. Daily Accomplishment Reports (Task and Activity Logs)
CREATE TABLE accomplishment_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES internship_groups(id) ON DELETE SET NULL,
    partner_company_id UUID NOT NULL REFERENCES partner_companies(id) ON DELETE RESTRICT,
    report_date DATE NOT NULL,
    week_number INT NOT NULL,
    
    work_category VARCHAR(100) NOT NULL, -- 'System Testing & QA', 'Documentation', 'Frontend Dev', 'Backend Dev', 'Network & IT Support'
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT NOT NULL,
    hours_spent DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    task_status task_status NOT NULL DEFAULT 'completed',
    obstacles_faced TEXT,
    skills_applied TEXT,
    attachment_url TEXT,
    
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. AI-Generated Weekly Highlights & Summaries
-- Powers the LLM Accomplishment Summarization Module
CREATE TABLE ai_weekly_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES internship_groups(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE SET NULL,
    week_number INT NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    
    total_members INT NOT NULL DEFAULT 1,
    members_attended_count INT NOT NULL DEFAULT 1,
    total_hours_rendered DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    total_accomplishments_submitted INT NOT NULL DEFAULT 0,
    tasks_marked_completed INT NOT NULL DEFAULT 0,
    dominant_work_areas JSONB NOT NULL, -- e.g. ["System Testing", "Documentation"]
    
    -- Synthesized NLP Highlights
    ai_generated_highlight TEXT NOT NULL,
    summary_key_findings JSONB,
    decision_support_notes TEXT,
    model_identifier VARCHAR(100) NOT NULL DEFAULT 'gemini-3.8-flash',
    
    -- Professor/Coordinator Review Workflow
    coordinator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    review_status VARCHAR(50) NOT NULL DEFAULT 'unreviewed', -- 'unreviewed', 'endorsed', 'revision_requested'
    coordinator_feedback TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. AI Attendance Anomaly Alerts & Rule Violations
-- Powers Python Rule-Based & ML Anomaly Detection Script
CREATE TABLE ai_attendance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES student_enrollments(id) ON DELETE CASCADE,
    partner_company_id UUID REFERENCES partner_companies(id) ON DELETE SET NULL,
    
    alert_type VARCHAR(100) NOT NULL, -- 'MISSED_WINDOW', 'ABNORMAL_CHECKIN', 'CONSECUTIVE_UNEXCUSED', 'UNDERTIME_SPIKE'
    severity alert_severity NOT NULL DEFAULT 'high',
    detection_method VARCHAR(50) NOT NULL DEFAULT 'hybrid_rules_ml', -- 'rule_engine', 'z_score_model', 'hybrid_rules_ml'
    anomaly_score DECIMAL(5,4), -- e.g. 0.9450 anomaly probability
    
    expected_schedule VARCHAR(100) NOT NULL, -- '8:00 AM – 5:00 PM, August 19, 2026'
    alert_message TEXT NOT NULL,
    
    -- Multi-Channel Notification Dispatch Flags
    email_dispatched BOOLEAN NOT NULL DEFAULT FALSE,
    push_dispatched BOOLEAN NOT NULL DEFAULT FALSE,
    coordinator_flagged BOOLEAN NOT NULL DEFAULT TRUE,
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    status alert_status NOT NULL DEFAULT 'pending_review',
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 10. ISO/IEC 25010 Quality Model Evaluation Log
CREATE TABLE iso_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluator_name VARCHAR(255) NOT NULL,
    evaluator_role VARCHAR(100) NOT NULL, -- 'Practicum Coordinator', 'Adviser', 'Student', 'External Supervisor'
    functional_suitability DECIMAL(3,2) NOT NULL, -- 1.00 to 5.00
    performance_efficiency DECIMAL(3,2) NOT NULL,
    usability DECIMAL(3,2) NOT NULL,
    reliability DECIMAL(3,2) NOT NULL,
    security DECIMAL(3,2) NOT NULL,
    maintainability DECIMAL(3,2) NOT NULL,
    average_score DECIMAL(3,2) GENERATED ALWAYS AS (
        (functional_suitability + performance_efficiency + usability + reliability + security + maintainability) / 6.00
    ) STORED,
    qualitative_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for high-frequency queries
CREATE INDEX idx_attendance_student_date ON attendance_logs(student_id, log_date);
CREATE INDEX idx_attendance_company ON attendance_logs(partner_company_id);
CREATE INDEX idx_reports_group_week ON accomplishment_reports(group_id, week_number);
CREATE INDEX idx_reports_student ON accomplishment_reports(student_id);
CREATE INDEX idx_alerts_student_status ON ai_attendance_alerts(student_id, status);
CREATE INDEX idx_enrollments_group ON student_enrollments(group_id);
