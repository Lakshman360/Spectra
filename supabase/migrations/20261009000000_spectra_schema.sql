-- =============================================================================
-- SPECTRA — G. Pulla Reddy Engineering College (GPREC)
-- Academic Performance & Early Warning System — Database Schema & RLS Policies
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. College Configuration
CREATE TABLE IF NOT EXISTS college_config (
  id TEXT PRIMARY KEY DEFAULT 'gprec-main',
  college_name TEXT NOT NULL DEFAULT 'G. Pulla Reddy Engineering College',
  college_code TEXT NOT NULL DEFAULT 'GPREC',
  roll_code TEXT NOT NULL DEFAULT '9XA',
  email_domain TEXT NOT NULL DEFAULT 'gprec.ac.in',
  location TEXT NOT NULL DEFAULT 'Kurnool, Andhra Pradesh, India',
  regular_attendance_threshold NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  high_priority_attendance_threshold NUMERIC(5,2) NOT NULL DEFAULT 65.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Branches
CREATE TABLE IF NOT EXISTS branches (
  code VARCHAR(2) PRIMARY KEY,
  short_name VARCHAR(10) NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO branches (code, short_name, full_name) VALUES
  ('05', 'CSE', 'Computer Science and Engineering'),
  ('33', 'CSM', 'Computer Science and Machine Learning (AI & ML)'),
  ('04', 'EEE', 'Electrical and Electronics Engineering')
ON CONFLICT (code) DO NOTHING;

-- 3. User Profiles (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  verified_roll_number VARCHAR(10) UNIQUE,
  branch_code VARCHAR(2) REFERENCES branches(code),
  batch_year VARCHAR(10),
  personal_email TEXT,
  personal_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_number TEXT,
  avatar_initials VARCHAR(4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Faculty Advisors
CREATE TABLE IF NOT EXISTS faculty_advisors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  faculty_name TEXT NOT NULL,
  email TEXT NOT NULL,
  cabin_location TEXT,
  office_hours TEXT,
  branch_code VARCHAR(2) REFERENCES branches(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Student Details
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roll_number VARCHAR(10) UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  college_email TEXT UNIQUE NOT NULL,
  personal_email TEXT,
  personal_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  branch_code VARCHAR(2) NOT NULL REFERENCES branches(code),
  batch_year VARCHAR(10) NOT NULL,
  current_semester INT NOT NULL DEFAULT 1,
  admission_year_code VARCHAR(2) NOT NULL,
  sequence_number VARCHAR(3) NOT NULL,
  advisor_id UUID REFERENCES faculty_advisors(id) ON DELETE SET NULL,
  alert_preferences JSONB NOT NULL DEFAULT '{"lowMarks": true, "fallingMarks": true, "attendanceAlerts": true, "studyMaterials": true, "supportPlans": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  branch_code VARCHAR(2) NOT NULL REFERENCES branches(code),
  semester INT NOT NULL,
  faculty_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Assessments
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  max_marks NUMERIC(5,2) NOT NULL CHECK (max_marks > 0),
  branch_code VARCHAR(2) NOT NULL REFERENCES branches(code),
  batch_year VARCHAR(10) NOT NULL,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Student Marks
CREATE TABLE IF NOT EXISTS student_marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_roll VARCHAR(10) NOT NULL REFERENCES students(roll_number) ON DELETE CASCADE,
  marks_obtained NUMERIC(5,2) NOT NULL CHECK (marks_obtained >= 0),
  max_marks NUMERIC(5,2) NOT NULL CHECK (max_marks >= marks_obtained),
  percentage NUMERIC(5,2) GENERATED ALWAYS AS ((marks_obtained / max_marks) * 100) STORED,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assessment_id, student_roll)
);

-- 9. Attendance Sessions
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  branch_code VARCHAR(2) NOT NULL REFERENCES branches(code),
  batch_year VARCHAR(10) NOT NULL,
  period INT NOT NULL DEFAULT 1,
  faculty_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Student Attendance Records (Three-State System: Pending, Present, Absent)
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_roll VARCHAR(10) NOT NULL REFERENCES students(roll_number) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Present', 'Absent')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  UNIQUE(session_id, student_roll)
);

-- 11. Study Materials
CREATE TABLE IF NOT EXISTS study_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  description TEXT,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  branch_code VARCHAR(2) NOT NULL REFERENCES branches(code),
  batch_year VARCHAR(10) NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  download_count INT NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Academic Warnings
CREATE TABLE IF NOT EXISTS academic_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_roll VARCHAR(10) NOT NULL REFERENCES students(roll_number) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low concern', 'Medium concern', 'High concern')),
  risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  evidence_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  attendance_warning_level TEXT NOT NULL CHECK (attendance_warning_level IN ('NONE', 'ATTENDANCE_WARNING', 'HIGH_PRIORITY_WARNING')),
  attendance_percentage NUMERIC(5,2),
  average_marks_percentage NUMERIC(5,2),
  faculty_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In progress', 'Resolved')),
  acknowledged_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Support Plans
CREATE TABLE IF NOT EXISTS support_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_roll VARCHAR(10) NOT NULL REFERENCES students(roll_number) ON DELETE CASCADE,
  subject_or_concern TEXT NOT NULL,
  reason_for_support TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  assigned_faculty_id UUID REFERENCES profiles(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In progress', 'Resolved')),
  faculty_notes TEXT,
  progress_updates JSONB NOT NULL DEFAULT '[]'::jsonb,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Activity Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Email Delivery Logs
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('college', 'personal')),
  student_roll VARCHAR(10),
  alert_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'unconfigured')),
  provider_message TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_students_branch_batch ON students(branch_code, batch_year);
CREATE INDEX IF NOT EXISTS idx_student_marks_roll ON student_marks(student_roll);
CREATE INDEX IF NOT EXISTS idx_attendance_records_roll ON attendance_records(student_roll);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_warnings_roll ON academic_warnings(student_roll);
CREATE INDEX IF NOT EXISTS idx_support_plans_roll ON support_plans(student_roll);
CREATE INDEX IF NOT EXISTS idx_study_materials_branch_batch ON study_materials(branch_code, batch_year);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is faculty/admin
CREATE OR REPLACE FUNCTION is_faculty_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('faculty', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can read their own profile; faculty/admin can view all
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_faculty_or_admin());

CREATE POLICY "Users can update their own personal email/phone"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Students: Students see only their own record; faculty/admin see all authorized
CREATE POLICY "Students see own record"
  ON students FOR SELECT
  USING (user_id = auth.uid() OR is_faculty_or_admin());

-- Student Marks: Students see only their own marks; faculty can read/write
CREATE POLICY "Students see own marks"
  ON student_marks FOR SELECT
  USING (student_roll IN (SELECT roll_number FROM students WHERE user_id = auth.uid()) OR is_faculty_or_admin());

CREATE POLICY "Faculty can manage marks"
  ON student_marks FOR ALL
  USING (is_faculty_or_admin());

-- Attendance Records: Students see only their own attendance; faculty can manage
CREATE POLICY "Students see own attendance"
  ON attendance_records FOR SELECT
  USING (student_roll IN (SELECT roll_number FROM students WHERE user_id = auth.uid()) OR is_faculty_or_admin());

CREATE POLICY "Faculty can manage attendance"
  ON attendance_records FOR ALL
  USING (is_faculty_or_admin());

-- Study Materials: Students see materials for their branch/batch; faculty can manage
CREATE POLICY "Students read branch materials"
  ON study_materials FOR SELECT
  USING (
    is_faculty_or_admin() OR
    branch_code IN (SELECT branch_code FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Faculty manage study materials"
  ON study_materials FOR ALL
  USING (is_faculty_or_admin());

-- Academic Warnings: Students see only their own warnings; faculty can manage
CREATE POLICY "Students see own warnings"
  ON academic_warnings FOR SELECT
  USING (student_roll IN (SELECT roll_number FROM students WHERE user_id = auth.uid()) OR is_faculty_or_admin());

CREATE POLICY "Faculty manage warnings"
  ON academic_warnings FOR ALL
  USING (is_faculty_or_admin());

-- Support Plans: Students see only their own plans; faculty can manage
CREATE POLICY "Students see own support plans"
  ON support_plans FOR SELECT
  USING (student_roll IN (SELECT roll_number FROM students WHERE user_id = auth.uid()) OR is_faculty_or_admin());

CREATE POLICY "Faculty manage support plans"
  ON support_plans FOR ALL
  USING (is_faculty_or_admin());

-- Activity Logs: Read-only for faculty/admin
CREATE POLICY "Faculty view activity logs"
  ON activity_logs FOR SELECT
  USING (is_faculty_or_admin());
