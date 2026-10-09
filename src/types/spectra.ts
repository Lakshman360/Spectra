/**
 * SPECTRA — G. Pulla Reddy Engineering College (GPREC)
 * Academic Performance & Early Warning System Types
 */

export type Role = 'student' | 'faculty' | 'admin';

export type BranchCode = '05' | '33' | '04' | string;

export interface BranchInfo {
  code: string;
  shortName: string;
  fullName: string;
}

export interface GprecRollDetails {
  isValid: boolean;
  normalizedRoll: string;
  admissionYear: string;
  rollCode: string;
  branchCode: string;
  branchName: string;
  sequenceNumber: string;
  collegeEmail: string;
  error?: string;
}

export type AttendanceStatus = 'Pending' | 'Present' | 'Absent';

export type AttendanceWarningLevel = 'NONE' | 'ATTENDANCE_WARNING' | 'HIGH_PRIORITY_WARNING';

export interface AttendanceCalculationResult {
  presentCount: number;
  absentCount: number;
  pendingCount: number;
  finalizedCount: number;
  totalSessions: number;
  rawPercentage: number | null;
  displayPercentage: string;
  warningLevel: AttendanceWarningLevel;
  studentMessage: string | null;
  facultyNotice: string | null;
}

export type RiskLevel = 'Low concern' | 'Medium concern' | 'High concern';

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
  verifiedRollNumber?: string;
  branchCode?: string;
  branchName?: string;
  batchYear?: string;
  personalEmail?: string;
  personalEmailVerified?: boolean;
  advisorId?: string;
  phoneNumber?: string;
  department?: string;
  avatarInitials: string;
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  rollNumber: string;
  fullName: string;
  collegeEmail: string;
  personalEmail?: string;
  personalEmailVerified: boolean;
  branchCode: string;
  branchName: string;
  batchYear: string;
  currentSemester: number;
  admissionYearCode: string;
  sequenceNumber: string;
  advisorId?: string;
  advisorName?: string;
  advisorEmail?: string;
  advisorCabin?: string;
  advisorOfficeHours?: string;
  alertPreferences: {
    lowMarks: boolean;
    fallingMarks: boolean;
    attendanceAlerts: boolean;
    studyMaterials: boolean;
    supportPlans: boolean;
  };
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  branchCode: string;
  semester: number;
  facultyId?: string;
  facultyName?: string;
}

export interface Assessment {
  id: string;
  subjectId: string;
  subjectName: string;
  testName: string; // e.g. "Mid Test 1", "Assignment 1", "Quiz 1"
  maxMarks: number;
  branchCode: string;
  batchYear: string;
  date: string;
}

export interface StudentMark {
  id: string;
  assessmentId: string;
  studentRoll: string;
  subjectId: string;
  subjectName: string;
  testName: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  recordedByFacultyId: string;
  updatedAt: string;
}

export interface AttendanceSession {
  id: string;
  date: string;
  subjectId: string;
  subjectName: string;
  branchCode: string;
  batchYear: string;
  period: number;
  facultyId: string;
  facultyName: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentRoll: string;
  status: AttendanceStatus;
  recordedAt: string;
  updatedByFacultyId: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  description: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: string; // e.g. "application/pdf"
  branchCode: string;
  batchYear: string;
  uploadedByFacultyId: string;
  uploadedByFacultyName: string;
  uploadedAt: string;
  storageUrl?: string; // Supabase public / signed URL or base64 data
  downloadCount: number;
}

export interface AcademicWarning {
  id: string;
  studentRoll: string;
  studentName: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0 - 100
  evidenceReasons: string[];
  attendanceWarningLevel: AttendanceWarningLevel;
  attendancePercentage: number | null;
  averageMarksPercentage: number;
  facultyNotes?: string;
  status: 'Open' | 'In progress' | 'Resolved';
  acknowledgedByFacultyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportPlan {
  id: string;
  studentRoll: string;
  studentName: string;
  subjectOrConcern: string;
  reasonForSupport: string;
  suggestedAction: string;
  assignedFacultyId: string;
  assignedFacultyName: string;
  startDate: string;
  targetDate: string;
  status: 'Open' | 'In progress' | 'Resolved';
  facultyNotes: string;
  progressUpdates: string[];
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacultyAdvisor {
  id: string;
  facultyName: string;
  email: string;
  cabinLocation: string;
  officeHours: string;
  branchCode: string;
  assignedBatches: string[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: 'Marks' | 'Attendance' | 'Resource' | 'Warning' | 'SupportPlan' | 'Auth';
  entityId: string;
  details: string;
  timestamp: string;
}

export interface EmailDeliveryLog {
  id: string;
  recipientEmail: string;
  recipientType: 'college' | 'personal';
  studentRoll: string;
  alertType: string;
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'unconfigured';
  providerMessage: string;
  timestamp: string;
}
