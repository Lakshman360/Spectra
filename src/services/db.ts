/**
 * SPECTRA Persistent Database Repository
 *
 * Implements persistent academic records for GPREC students and faculty.
 * Synchronizes marks, attendance, study materials, warnings, and support plans.
 */

import type {
  StudentProfile,
  Subject,
  Assessment,
  StudentMark,
  AttendanceSession,
  AttendanceRecord,
  StudyMaterial,
  AcademicWarning,
  SupportPlan,
  FacultyAdvisor,
  ActivityLog,
  EmailDeliveryLog,
  AttendanceStatus,
} from '../types/spectra';
import { calculateAttendance } from '../utils/attendanceCalculator';
import { evaluateStudentRisk } from '../utils/riskEngine';

const STORAGE_KEY = 'spectra_production_v2_db';

export interface DatabaseState {
  students: StudentProfile[];
  subjects: Subject[];
  assessments: Assessment[];
  marks: StudentMark[];
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  studyMaterials: StudyMaterial[];
  academicWarnings: AcademicWarning[];
  supportPlans: SupportPlan[];
  advisors: FacultyAdvisor[];
  activityLogs: ActivityLog[];
  emailLogs: EmailDeliveryLog[];
}

// Initial GPREC Authorized Records
const initialStudents: StudentProfile[] = [
  {
    id: 'st-01',
    rollNumber: '259XA05308',
    fullName: 'Aarav Sharma',
    collegeEmail: '259xa05308@gprec.ac.in',
    personalEmail: 'aarav.sharma.personal@gmail.com',
    personalEmailVerified: true,
    branchCode: '05',
    branchName: 'CSE',
    batchYear: '2025-29',
    currentSemester: 1,
    admissionYearCode: '25',
    sequenceNumber: '308',
    advisorId: 'fa-01',
    advisorName: 'Dr. R. Sudhakar',
    advisorEmail: 'sudhakar.cse@gprec.ac.in',
    advisorCabin: 'CSE Block, Cabin 304',
    advisorOfficeHours: 'Mon & Wed 3:00 PM – 4:30 PM',
    alertPreferences: {
      lowMarks: true,
      fallingMarks: true,
      attendanceAlerts: true,
      studyMaterials: true,
      supportPlans: true,
    },
  },
  {
    id: 'st-02',
    rollNumber: '259XA05301',
    fullName: 'Meera Iyer',
    collegeEmail: '259xa05301@gprec.ac.in',
    personalEmail: 'meera.iyer.gprec@gmail.com',
    personalEmailVerified: true,
    branchCode: '05',
    branchName: 'CSE',
    batchYear: '2025-29',
    currentSemester: 1,
    admissionYearCode: '25',
    sequenceNumber: '301',
    advisorId: 'fa-01',
    advisorName: 'Dr. R. Sudhakar',
    advisorEmail: 'sudhakar.cse@gprec.ac.in',
    advisorCabin: 'CSE Block, Cabin 304',
    advisorOfficeHours: 'Mon & Wed 3:00 PM – 4:30 PM',
    alertPreferences: {
      lowMarks: true,
      fallingMarks: true,
      attendanceAlerts: true,
      studyMaterials: true,
      supportPlans: true,
    },
  },
  {
    id: 'st-03',
    rollNumber: '259XA33102',
    fullName: 'Rohan Patel',
    collegeEmail: '259xa33102@gprec.ac.in',
    personalEmail: undefined,
    personalEmailVerified: false,
    branchCode: '33',
    branchName: 'CSM',
    batchYear: '2025-29',
    currentSemester: 1,
    admissionYearCode: '25',
    sequenceNumber: '102',
    advisorId: 'fa-02',
    advisorName: 'Prof. S. Rao',
    advisorEmail: 'srao.csm@gprec.ac.in',
    advisorCabin: 'AI & ML Block, Cabin 108',
    advisorOfficeHours: 'Tue & Thu 2:00 PM – 3:30 PM',
    alertPreferences: {
      lowMarks: true,
      fallingMarks: true,
      attendanceAlerts: true,
      studyMaterials: true,
      supportPlans: true,
    },
  },
  {
    id: 'st-04',
    rollNumber: '259XA33115',
    fullName: 'Priya Nair',
    collegeEmail: '259xa33115@gprec.ac.in',
    personalEmail: 'priya.nair.study@gmail.com',
    personalEmailVerified: false,
    branchCode: '33',
    branchName: 'CSM',
    batchYear: '2025-29',
    currentSemester: 1,
    admissionYearCode: '25',
    sequenceNumber: '115',
    advisorId: 'fa-02',
    advisorName: 'Prof. S. Rao',
    advisorEmail: 'srao.csm@gprec.ac.in',
    advisorCabin: 'AI & ML Block, Cabin 108',
    advisorOfficeHours: 'Tue & Thu 2:00 PM – 3:30 PM',
    alertPreferences: {
      lowMarks: true,
      fallingMarks: true,
      attendanceAlerts: true,
      studyMaterials: true,
      supportPlans: true,
    },
  },
  {
    id: 'st-05',
    rollNumber: '249XA04205',
    fullName: 'Kavya Reddy',
    collegeEmail: '249xa04205@gprec.ac.in',
    personalEmail: 'kavya.reddy.academic@gmail.com',
    personalEmailVerified: true,
    branchCode: '04',
    branchName: 'EEE',
    batchYear: '2024-28',
    currentSemester: 3,
    admissionYearCode: '24',
    sequenceNumber: '205',
    advisorId: 'fa-03',
    advisorName: 'Dr. K. Varma',
    advisorEmail: 'kvarma.eee@gprec.ac.in',
    advisorCabin: 'EEE Block, Cabin 202',
    advisorOfficeHours: 'Fri 10:00 AM – 12:00 PM',
    alertPreferences: {
      lowMarks: true,
      fallingMarks: true,
      attendanceAlerts: true,
      studyMaterials: true,
      supportPlans: true,
    },
  },
];

const initialAdvisors: FacultyAdvisor[] = [
  {
    id: 'fa-01',
    facultyName: 'Dr. R. Sudhakar',
    email: 'sudhakar.cse@gprec.ac.in',
    cabinLocation: 'CSE Block, Cabin 304',
    officeHours: 'Mon & Wed 3:00 PM – 4:30 PM',
    branchCode: '05',
    assignedBatches: ['2025-29'],
  },
  {
    id: 'fa-02',
    facultyName: 'Prof. S. Rao',
    email: 'srao.csm@gprec.ac.in',
    cabinLocation: 'AI & ML Block, Cabin 108',
    officeHours: 'Tue & Thu 2:00 PM – 3:30 PM',
    branchCode: '33',
    assignedBatches: ['2025-29'],
  },
  {
    id: 'fa-03',
    facultyName: 'Dr. K. Varma',
    email: 'kvarma.eee@gprec.ac.in',
    cabinLocation: 'EEE Block, Cabin 202',
    officeHours: 'Fri 10:00 AM – 12:00 PM',
    branchCode: '04',
    assignedBatches: ['2024-28'],
  },
];

const initialSubjects: Subject[] = [
  { id: 'sub-01', code: '23CS101', name: 'Mathematics II', branchCode: '05', semester: 1 },
  { id: 'sub-02', code: '23CS102', name: 'Programming in C', branchCode: '05', semester: 1 },
  { id: 'sub-03', code: '23CS103', name: 'Data Structures', branchCode: '05', semester: 1 },
  { id: 'sub-04', code: '23AI101', name: 'Discrete Mathematics', branchCode: '33', semester: 1 },
  { id: 'sub-05', code: '23AI102', name: 'Python for AI/ML', branchCode: '33', semester: 1 },
  { id: 'sub-06', code: '23EE201', name: 'Electric Circuits', branchCode: '04', semester: 3 },
  { id: 'sub-07', code: '23EE202', name: 'Signals & Systems', branchCode: '04', semester: 3 },
];

const initialAssessments: Assessment[] = [
  { id: 'ass-01', subjectId: 'sub-01', subjectName: 'Mathematics II', testName: 'Mid Test 1', maxMarks: 30, branchCode: '05', batchYear: '2025-29', date: '2026-09-15' },
  { id: 'ass-02', subjectId: 'sub-02', subjectName: 'Programming in C', testName: 'Mid Test 1', maxMarks: 30, branchCode: '05', batchYear: '2025-29', date: '2026-09-18' },
  { id: 'ass-03', subjectId: 'sub-03', subjectName: 'Data Structures', testName: 'Mid Test 1', maxMarks: 30, branchCode: '05', batchYear: '2025-29', date: '2026-09-22' },
  { id: 'ass-04', subjectId: 'sub-04', subjectName: 'Discrete Mathematics', testName: 'Mid Test 1', maxMarks: 30, branchCode: '33', batchYear: '2025-29', date: '2026-09-16' },
  { id: 'ass-05', subjectId: 'sub-05', subjectName: 'Python for AI/ML', testName: 'Mid Test 1', maxMarks: 30, branchCode: '33', batchYear: '2025-29', date: '2026-09-20' },
  { id: 'ass-06', subjectId: 'sub-06', subjectName: 'Electric Circuits', testName: 'Mid Test 1', maxMarks: 30, branchCode: '04', batchYear: '2024-28', date: '2026-09-17' },
];

const initialMarks: StudentMark[] = [
  // Aarav Sharma (259XA05308) - Falling/Low marks in Math & C
  { id: 'm-01', assessmentId: 'ass-01', studentRoll: '259XA05308', subjectId: 'sub-01', subjectName: 'Mathematics II', testName: 'Mid Test 1', marksObtained: 12, maxMarks: 30, percentage: 40.0, recordedByFacultyId: 'f-cse', updatedAt: '2026-09-16T10:00:00Z' },
  { id: 'm-02', assessmentId: 'ass-02', studentRoll: '259XA05308', subjectId: 'sub-02', subjectName: 'Programming in C', testName: 'Mid Test 1', marksObtained: 14, maxMarks: 30, percentage: 46.7, recordedByFacultyId: 'f-cse', updatedAt: '2026-09-19T10:00:00Z' },
  { id: 'm-03', assessmentId: 'ass-03', studentRoll: '259XA05308', subjectId: 'sub-03', subjectName: 'Data Structures', testName: 'Mid Test 1', marksObtained: 17, maxMarks: 30, percentage: 56.7, recordedByFacultyId: 'f-cse', updatedAt: '2026-09-23T10:00:00Z' },

  // Meera Iyer (259XA05301) - High marks
  { id: 'm-04', assessmentId: 'ass-01', studentRoll: '259XA05301', subjectId: 'sub-01', subjectName: 'Mathematics II', testName: 'Mid Test 1', marksObtained: 28, maxMarks: 30, percentage: 93.3, recordedByFacultyId: 'f-cse', updatedAt: '2026-09-16T10:00:00Z' },
  { id: 'm-05', assessmentId: 'ass-02', studentRoll: '259XA05301', subjectId: 'sub-02', subjectName: 'Programming in C', testName: 'Mid Test 1', marksObtained: 27, maxMarks: 30, percentage: 90.0, recordedByFacultyId: 'f-cse', updatedAt: '2026-09-19T10:00:00Z' },
  { id: 'm-06', assessmentId: 'ass-03', studentRoll: '259XA05301', subjectId: 'sub-03', subjectName: 'Data Structures', testName: 'Mid Test 1', marksObtained: 29, maxMarks: 30, percentage: 96.7, recordedByFacultyId: 'f-cse', updatedAt: '2026-09-23T10:00:00Z' },

  // Priya Nair (259XA33115) - Moderate marks
  { id: 'm-07', assessmentId: 'ass-04', studentRoll: '259XA33115', subjectId: 'sub-04', subjectName: 'Discrete Mathematics', testName: 'Mid Test 1', marksObtained: 18, maxMarks: 30, percentage: 60.0, recordedByFacultyId: 'f-csm', updatedAt: '2026-09-17T10:00:00Z' },
  { id: 'm-08', assessmentId: 'ass-05', studentRoll: '259XA33115', subjectId: 'sub-05', subjectName: 'Python for AI/ML', testName: 'Mid Test 1', marksObtained: 20, maxMarks: 30, percentage: 66.7, recordedByFacultyId: 'f-csm', updatedAt: '2026-09-21T10:00:00Z' },

  // Rohan Patel (259XA33102) - Good marks
  { id: 'm-09', assessmentId: 'ass-04', studentRoll: '259XA33102', subjectId: 'sub-04', subjectName: 'Discrete Mathematics', testName: 'Mid Test 1', marksObtained: 24, maxMarks: 30, percentage: 80.0, recordedByFacultyId: 'f-csm', updatedAt: '2026-09-17T10:00:00Z' },
  { id: 'm-10', assessmentId: 'ass-05', studentRoll: '259XA33102', subjectId: 'sub-05', subjectName: 'Python for AI/ML', testName: 'Mid Test 1', marksObtained: 25, maxMarks: 30, percentage: 83.3, recordedByFacultyId: 'f-csm', updatedAt: '2026-09-21T10:00:00Z' },

  // Kavya Reddy (249XA04205) - Good marks
  { id: 'm-11', assessmentId: 'ass-06', studentRoll: '249XA04205', subjectId: 'sub-06', subjectName: 'Electric Circuits', testName: 'Mid Test 1', marksObtained: 23, maxMarks: 30, percentage: 76.7, recordedByFacultyId: 'f-eee', updatedAt: '2026-09-18T10:00:00Z' },
];

// Attendance Sessions (10 sessions created)
const initialAttendanceSessions: AttendanceSession[] = [
  { id: 'ses-01', date: '2026-09-01', subjectId: 'sub-01', subjectName: 'Mathematics II', branchCode: '05', batchYear: '2025-29', period: 1, facultyId: 'f-cse', facultyName: 'Dr. R. Sudhakar', createdAt: '2026-09-01T08:30:00Z' },
  { id: 'ses-02', date: '2026-09-03', subjectId: 'sub-01', subjectName: 'Mathematics II', branchCode: '05', batchYear: '2025-29', period: 2, facultyId: 'f-cse', facultyName: 'Dr. R. Sudhakar', createdAt: '2026-09-03T09:30:00Z' },
  { id: 'ses-03', date: '2026-09-05', subjectId: 'sub-02', subjectName: 'Programming in C', branchCode: '05', batchYear: '2025-29', period: 3, facultyId: 'f-cse', facultyName: 'Dr. R. Sudhakar', createdAt: '2026-09-05T10:30:00Z' },
  { id: 'ses-04', date: '2026-09-08', subjectId: 'sub-02', subjectName: 'Programming in C', branchCode: '05', batchYear: '2025-29', period: 1, facultyId: 'f-cse', facultyName: 'Dr. R. Sudhakar', createdAt: '2026-09-08T08:30:00Z' },
  { id: 'ses-05', date: '2026-09-10', subjectId: 'sub-03', subjectName: 'Data Structures', branchCode: '05', batchYear: '2025-29', period: 2, facultyId: 'f-cse', facultyName: 'Dr. R. Sudhakar', createdAt: '2026-09-10T09:30:00Z' },
  { id: 'ses-06', date: '2026-09-12', subjectId: 'sub-03', subjectName: 'Data Structures', branchCode: '05', batchYear: '2025-29', period: 4, facultyId: 'f-cse', facultyName: 'Dr. R. Sudhakar', createdAt: '2026-09-12T11:30:00Z' },
  { id: 'ses-07', date: '2026-09-15', subjectId: 'sub-01', subjectName: 'Mathematics II', branchCode: '05', batchYear: '2025-29', period: 1, facultyId: 'f-cse', facultyName: 'Dr. R. Sudhakar', createdAt: '2026-09-15T08:30:00Z' },
  { id: 'ses-08', date: '2026-09-17', subjectId: 'sub-02', subjectName: 'Programming in C', branchCode: '05', batchYear: '2025-29', period: 2, facultyId: 'f-cse', facultyName: 'Dr. R. Sudhakar', createdAt: '2026-09-17T09:30:00Z' },
  { id: 'ses-09', date: '2026-09-22', subjectId: 'sub-01', subjectName: 'Mathematics II', branchCode: '05', batchYear: '2025-29', period: 3, facultyId: 'f-cse', facultyName: 'Dr. R. Sudhakar', createdAt: '2026-09-22T10:30:00Z' },
  { id: 'ses-10', date: '2026-10-08', subjectId: 'sub-03', subjectName: 'Data Structures', branchCode: '05', batchYear: '2025-29', period: 1, facultyId: 'f-cse', facultyName: 'Dr. R. Sudhakar', createdAt: '2026-10-08T08:30:00Z' },
];

// Attendance Records:
// Aarav Sharma (259XA05308): 5 Present, 3 Absent, 2 Pending
// Finalized = 8. Present = 5. (5 / 8) * 100 = 62.5% -> High-Priority Warning (<65%)!
// Meera Iyer (259XA05301): 8 Present, 0 Absent, 2 Pending
// Finalized = 8. Present = 8. (8 / 8) * 100 = 100% -> No Warning!
const initialAttendanceRecords: AttendanceRecord[] = [
  // Aarav Sharma
  { id: 'ar-01', sessionId: 'ses-01', studentRoll: '259XA05308', status: 'Present', recordedAt: '2026-09-01T09:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-02', sessionId: 'ses-02', studentRoll: '259XA05308', status: 'Absent', recordedAt: '2026-09-03T10:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-03', sessionId: 'ses-03', studentRoll: '259XA05308', status: 'Present', recordedAt: '2026-09-05T11:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-04', sessionId: 'ses-04', studentRoll: '259XA05308', status: 'Absent', recordedAt: '2026-09-08T09:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-05', sessionId: 'ses-05', studentRoll: '259XA05308', status: 'Present', recordedAt: '2026-09-10T10:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-06', sessionId: 'ses-06', studentRoll: '259XA05308', status: 'Absent', recordedAt: '2026-09-12T12:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-07', sessionId: 'ses-07', studentRoll: '259XA05308', status: 'Present', recordedAt: '2026-09-15T09:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-08', sessionId: 'ses-08', studentRoll: '259XA05308', status: 'Present', recordedAt: '2026-09-17T10:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-09', sessionId: 'ses-09', studentRoll: '259XA05308', status: 'Pending', recordedAt: '2026-09-22T11:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-10', sessionId: 'ses-10', studentRoll: '259XA05308', status: 'Pending', recordedAt: '2026-10-08T09:00:00Z', updatedByFacultyId: 'f-cse' },

  // Meera Iyer
  { id: 'ar-11', sessionId: 'ses-01', studentRoll: '259XA05301', status: 'Present', recordedAt: '2026-09-01T09:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-12', sessionId: 'ses-02', studentRoll: '259XA05301', status: 'Present', recordedAt: '2026-09-03T10:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-13', sessionId: 'ses-03', studentRoll: '259XA05301', status: 'Present', recordedAt: '2026-09-05T11:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-14', sessionId: 'ses-04', studentRoll: '259XA05301', status: 'Present', recordedAt: '2026-09-08T09:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-15', sessionId: 'ses-05', studentRoll: '259XA05301', status: 'Present', recordedAt: '2026-09-10T10:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-16', sessionId: 'ses-06', studentRoll: '259XA05301', status: 'Present', recordedAt: '2026-09-12T12:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-17', sessionId: 'ses-07', studentRoll: '259XA05301', status: 'Present', recordedAt: '2026-09-15T09:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-18', sessionId: 'ses-08', studentRoll: '259XA05301', status: 'Present', recordedAt: '2026-09-17T10:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-19', sessionId: 'ses-09', studentRoll: '259XA05301', status: 'Pending', recordedAt: '2026-09-22T11:00:00Z', updatedByFacultyId: 'f-cse' },
  { id: 'ar-20', sessionId: 'ses-10', studentRoll: '259XA05301', status: 'Pending', recordedAt: '2026-10-08T09:00:00Z', updatedByFacultyId: 'f-cse' },
];

// Study Materials with authentic text data URIs allowing genuine downloads!
const initialStudyMaterials: StudyMaterial[] = [
  {
    id: 'sm-01',
    title: 'Mathematics II — Differential Equations & Fourier Series',
    subjectId: 'sub-01',
    subjectName: 'Mathematics II',
    description: 'Unit 1 & 2 comprehensive lecture notes with worked examples and problem sets for GPREC CSE Batch 2025-29.',
    fileName: 'GPREC_Math_II_Unit1_2_Notes.pdf',
    fileSizeBytes: 245000,
    fileType: 'application/pdf',
    branchCode: '05',
    batchYear: '2025-29',
    uploadedByFacultyId: 'fa-01',
    uploadedByFacultyName: 'Dr. R. Sudhakar',
    uploadedAt: '2026-09-10T14:30:00Z',
    downloadCount: 38,
    // Real downloadable text file wrapped as data URL
    storageUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent('G. PULLA REDDY ENGINEERING COLLEGE (GPREC)\nDepartment of Computer Science & Engineering\nCourse: Mathematics II (23CS101)\n\nUnit 1: First Order Linear Differential Equations\nUnit 2: Fourier Series and Harmonic Analysis\n\nStudy Material & Tutorial Problems.\nVerified GPREC Academic Resource.'),
  },
  {
    id: 'sm-02',
    title: 'Programming in C — Pointers, Dynamic Memory & Structs',
    subjectId: 'sub-02',
    subjectName: 'Programming in C',
    description: 'Code snippets, pointer diagrams, memory layout explanations, and debugging exercises for First Year CSE.',
    fileName: 'GPREC_C_Programming_Pointers_LabGuide.pdf',
    fileSizeBytes: 182000,
    fileType: 'application/pdf',
    branchCode: '05',
    batchYear: '2025-29',
    uploadedByFacultyId: 'fa-01',
    uploadedByFacultyName: 'Dr. R. Sudhakar',
    uploadedAt: '2026-09-14T11:20:00Z',
    downloadCount: 45,
    storageUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent('G. PULLA REDDY ENGINEERING COLLEGE (GPREC)\nCourse: Programming in C (23CS102)\n\nTopic: Pointer Arithmetic, malloc/free, Dynamic Data Structures\n\nFaculty: Dr. R. Sudhakar\nOfficial GPREC Courseware.'),
  },
  {
    id: 'sm-03',
    title: 'Data Structures — Linear and Non-linear Structures Overview',
    subjectId: 'sub-03',
    subjectName: 'Data Structures',
    description: 'Stacks, Queues, Linked Lists, Trees, and Asymptotic Complexity analysis slides.',
    fileName: 'GPREC_DataStructures_LectureSlides.pptx',
    fileSizeBytes: 310000,
    fileType: 'application/vnd.ms-powerpoint',
    branchCode: '05',
    batchYear: '2025-29',
    uploadedByFacultyId: 'fa-01',
    uploadedByFacultyName: 'Dr. R. Sudhakar',
    uploadedAt: '2026-09-20T09:15:00Z',
    downloadCount: 52,
    storageUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent('GPREC CSE Department\nData Structures (23CS103)\nStacks, Queues, Trees, Complexity Analysis.\nVerified GPREC Learning Resource.'),
  },
  {
    id: 'sm-04',
    title: 'Discrete Mathematics — Set Theory and Graph Theory',
    subjectId: 'sub-04',
    subjectName: 'Discrete Mathematics',
    description: 'Mathematical induction, relations, propositional calculus, and Eulerian graphs for CSM batch.',
    fileName: 'GPREC_CSM_Discrete_Math_Reference.pdf',
    fileSizeBytes: 215000,
    fileType: 'application/pdf',
    branchCode: '33',
    batchYear: '2025-29',
    uploadedByFacultyId: 'fa-02',
    uploadedByFacultyName: 'Prof. S. Rao',
    uploadedAt: '2026-09-15T16:00:00Z',
    downloadCount: 29,
    storageUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent('GPREC CSM Department\nDiscrete Mathematics (23AI101)\nOfficial Lecture Notes & Reference Guide.'),
  },
];

const initialSupportPlans: SupportPlan[] = [
  {
    id: 'sp-01',
    studentRoll: '259XA05308',
    studentName: 'Aarav Sharma',
    subjectOrConcern: 'Mathematics II & Low Attendance',
    reasonForSupport: 'Attendance dropped below 65% (62.5% finalized) and Mid Test score was 40%.',
    suggestedAction: 'Extra practice worksheets on differential calculus; bi-weekly attendance check-in with faculty advisor.',
    assignedFacultyId: 'fa-01',
    assignedFacultyName: 'Dr. R. Sudhakar',
    startDate: '2026-09-25',
    targetDate: '2026-10-30',
    status: 'In progress',
    facultyNotes: 'Met with Aarav on Sept 26. Provided prerequisite algebra worksheet. Student agreed to attend morning tutorial sessions.',
    progressUpdates: [
      '2026-09-26: Initial counseling completed. Problem sets 1 and 2 assigned.',
      '2026-10-02: Submitted first tutorial assignment with 75% accuracy.',
    ],
    createdAt: '2026-09-25T11:00:00Z',
    updatedAt: '2026-10-02T16:30:00Z',
  },
];

const initialActivityLogs: ActivityLog[] = [
  {
    id: 'act-01',
    userId: 'fa-01',
    userEmail: 'sudhakar.cse@gprec.ac.in',
    action: 'RECORDED_MARKS',
    entityType: 'Marks',
    entityId: 'ass-01',
    details: 'Entered Mid Test 1 marks for Mathematics II (CSE Batch 2025-29).',
    timestamp: '2026-09-16T10:05:00Z',
  },
  {
    id: 'act-02',
    userId: 'fa-01',
    userEmail: 'sudhakar.cse@gprec.ac.in',
    action: 'CREATED_SUPPORT_PLAN',
    entityType: 'SupportPlan',
    entityId: 'sp-01',
    details: 'Initiated Support Plan for 259XA05308 (Aarav Sharma) in Mathematics II.',
    timestamp: '2026-09-25T11:00:00Z',
  },
];

const initialEmailLogs: EmailDeliveryLog[] = [
  {
    id: 'el-01',
    recipientEmail: '259xa05308@gprec.ac.in',
    recipientType: 'college',
    studentRoll: '259XA05308',
    alertType: 'ATTENDANCE_CRITICAL',
    subject: 'GPREC Academic Notice: Attendance Below 65%',
    status: 'delivered',
    providerMessage: 'Delivered to official GPREC mailbox via college mail server.',
    timestamp: '2026-09-20T08:30:00Z',
  },
  {
    id: 'el-02',
    recipientEmail: 'aarav.sharma.personal@gmail.com',
    recipientType: 'personal',
    studentRoll: '259XA05308',
    alertType: 'ATTENDANCE_CRITICAL',
    subject: 'SPECTRA Alert: Attendance Support Plan',
    status: 'delivered',
    providerMessage: 'Sent to verified personal Gmail.',
    timestamp: '2026-09-20T08:30:05Z',
  },
];

class SpectraRepository {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            students: parsed.students || initialStudents,
            subjects: parsed.subjects || initialSubjects,
            assessments: parsed.assessments || initialAssessments,
            marks: parsed.marks || initialMarks,
            attendanceSessions: parsed.attendanceSessions || initialAttendanceSessions,
            attendanceRecords: parsed.attendanceRecords || initialAttendanceRecords,
            studyMaterials: parsed.studyMaterials || initialStudyMaterials,
            academicWarnings: parsed.academicWarnings || [],
            supportPlans: parsed.supportPlans || initialSupportPlans,
            advisors: parsed.advisors || initialAdvisors,
            activityLogs: parsed.activityLogs || initialActivityLogs,
            emailLogs: parsed.emailLogs || initialEmailLogs,
          };
        }
      } catch (e) {
        console.warn('Could not parse saved Spectra database state. Using initial seed.', e);
      }
    }

    const seeded: DatabaseState = {
      students: initialStudents,
      subjects: initialSubjects,
      assessments: initialAssessments,
      marks: initialMarks,
      attendanceSessions: initialAttendanceSessions,
      attendanceRecords: initialAttendanceRecords,
      studyMaterials: initialStudyMaterials,
      academicWarnings: [],
      supportPlans: initialSupportPlans,
      advisors: initialAdvisors,
      activityLogs: initialActivityLogs,
      emailLogs: initialEmailLogs,
    };
    return seeded;
  }

  private saveState(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.error('Failed to save Spectra database state to localStorage:', e);
      }
    }
  }

  // --- Students ---
  public getStudents(filter?: { branchCode?: string; batchYear?: string; query?: string }): StudentProfile[] {
    let list = [...this.state.students];
    if (filter?.branchCode) {
      list = list.filter((s) => s.branchCode === filter.branchCode);
    }
    if (filter?.batchYear) {
      list = list.filter((s) => s.batchYear === filter.batchYear);
    }
    if (filter?.query) {
      const q = filter.query.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          s.collegeEmail.toLowerCase().includes(q) ||
          s.branchName.toLowerCase().includes(q)
      );
    }
    return list;
  }

  public getStudentByRoll(rollNumber: string): StudentProfile | undefined {
    const clean = rollNumber.trim().toUpperCase();
    return this.state.students.find((s) => s.rollNumber.toUpperCase() === clean);
  }

  public updateStudent(rollNumber: string, updates: Partial<StudentProfile>): StudentProfile | null {
    const idx = this.state.students.findIndex((s) => s.rollNumber.toUpperCase() === rollNumber.toUpperCase());
    if (idx === -1) return null;
    this.state.students[idx] = { ...this.state.students[idx], ...updates };
    this.saveState();
    return this.state.students[idx];
  }

  public addStudent(student: StudentProfile): void {
    const normRoll = student.rollNumber.trim().toUpperCase();
    const normEmail = student.collegeEmail.trim().toLowerCase();

    if (this.getStudentByRoll(normRoll)) {
      throw new Error(`Student with roll number ${normRoll} already exists.`);
    }

    const existingEmail = this.state.students.find(
      (s) => s.collegeEmail.toLowerCase() === normEmail
    );
    if (existingEmail) {
      throw new Error(`Student with college email ${normEmail} already exists.`);
    }

    this.state.students.push({
      ...student,
      rollNumber: normRoll,
      collegeEmail: normEmail,
    });

    this.logActivity({
      userId: student.id,
      userEmail: normEmail,
      action: 'ADD_STUDENT',
      entityType: 'Auth',
      entityId: normRoll,
      details: `Enrolled student ${student.fullName} (${normRoll}) into ${student.branchName} Batch ${student.batchYear}.`,
    });

    this.saveState();
  }

  public deleteStudent(rollNumber: string): boolean {
    const idx = this.state.students.findIndex(
      (s) => s.rollNumber.toUpperCase() === rollNumber.toUpperCase()
    );
    if (idx === -1) return false;
    this.state.students.splice(idx, 1);
    this.saveState();
    return true;
  }

  // --- Marks & Results ---
  public getMarks(filter?: { studentRoll?: string; subjectId?: string; assessmentId?: string }): StudentMark[] {
    let list = [...this.state.marks];
    if (filter?.studentRoll) {
      list = list.filter((m) => m.studentRoll.toUpperCase() === filter.studentRoll!.toUpperCase());
    }
    if (filter?.subjectId) {
      list = list.filter((m) => m.subjectId === filter.subjectId);
    }
    if (filter?.assessmentId) {
      list = list.filter((m) => m.assessmentId === filter.assessmentId);
    }
    return list;
  }

  public saveMark(newMark: Omit<StudentMark, 'id' | 'percentage' | 'updatedAt'>): StudentMark {
    if (newMark.marksObtained > newMark.maxMarks) {
      throw new Error(`Marks obtained (${newMark.marksObtained}) cannot exceed maximum marks (${newMark.maxMarks}).`);
    }
    if (newMark.marksObtained < 0) {
      throw new Error('Marks cannot be negative.');
    }

    const percentage = Number(((newMark.marksObtained / newMark.maxMarks) * 100).toFixed(1));
    const existingIndex = this.state.marks.findIndex(
      (m) =>
        m.assessmentId === newMark.assessmentId &&
        m.studentRoll.toUpperCase() === newMark.studentRoll.toUpperCase()
    );

    const updatedRecord: StudentMark = {
      ...newMark,
      id: existingIndex >= 0 ? this.state.marks[existingIndex].id : `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      percentage,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.state.marks[existingIndex] = updatedRecord;
    } else {
      this.state.marks.push(updatedRecord);
    }

    this.logActivity({
      userId: newMark.recordedByFacultyId,
      userEmail: 'faculty@gprec.ac.in',
      action: 'UPDATE_MARK',
      entityType: 'Marks',
      entityId: updatedRecord.id,
      details: `Saved mark for ${newMark.studentRoll} in ${newMark.subjectName}: ${newMark.marksObtained}/${newMark.maxMarks}`,
    });

    this.saveState();
    return updatedRecord;
  }

  // --- Attendance Sessions & Records ---
  public getAttendanceSessions(filter?: { branchCode?: string; batchYear?: string; subjectId?: string }): AttendanceSession[] {
    let list = [...this.state.attendanceSessions];
    if (filter?.branchCode) list = list.filter((s) => s.branchCode === filter.branchCode);
    if (filter?.batchYear) list = list.filter((s) => s.batchYear === filter.batchYear);
    if (filter?.subjectId) list = list.filter((s) => s.subjectId === filter.subjectId);
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public createAttendanceSession(
    sessionData: Omit<AttendanceSession, 'id' | 'createdAt'>,
    enrolledStudentRolls: string[]
  ): AttendanceSession {
    const sessionId = `ses-${Date.now()}`;
    const newSession: AttendanceSession = {
      ...sessionData,
      id: sessionId,
      createdAt: new Date().toISOString(),
    };
    this.state.attendanceSessions.unshift(newSession);

    // Initial state: Set every new student attendance record to 'Pending'
    const newRecords: AttendanceRecord[] = enrolledStudentRolls.map((roll, idx) => ({
      id: `ar-${sessionId}-${idx}`,
      sessionId,
      studentRoll: roll,
      status: 'Pending', // Mandatory 3-state initial status
      recordedAt: new Date().toISOString(),
      updatedByFacultyId: sessionData.facultyId,
    }));

    this.state.attendanceRecords.push(...newRecords);

    this.logActivity({
      userId: sessionData.facultyId,
      userEmail: 'faculty@gprec.ac.in',
      action: 'CREATE_ATTENDANCE_SESSION',
      entityType: 'Attendance',
      entityId: sessionId,
      details: `Created attendance session for ${sessionData.subjectName} (${enrolledStudentRolls.length} students initialized as Pending).`,
    });

    this.saveState();
    return newSession;
  }

  public getSessionAttendanceRecords(sessionId: string): AttendanceRecord[] {
    return this.state.attendanceRecords.filter((r) => r.sessionId === sessionId);
  }

  public updateAttendanceRecord(sessionId: string, studentRoll: string, status: AttendanceStatus, facultyId: string): void {
    const record = this.state.attendanceRecords.find(
      (r) => r.sessionId === sessionId && r.studentRoll.toUpperCase() === studentRoll.toUpperCase()
    );
    if (record) {
      record.status = status;
      record.recordedAt = new Date().toISOString();
      record.updatedByFacultyId = facultyId;
    } else {
      this.state.attendanceRecords.push({
        id: `ar-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        sessionId,
        studentRoll,
        status,
        recordedAt: new Date().toISOString(),
        updatedByFacultyId: facultyId,
      });
    }
    this.saveState();
  }

  public batchSaveAttendanceRecords(
    sessionId: string,
    records: Array<{ studentRoll: string; status: AttendanceStatus }>,
    facultyId: string
  ): void {
    for (const item of records) {
      this.updateAttendanceRecord(sessionId, item.studentRoll, item.status, facultyId);
    }
    this.logActivity({
      userId: facultyId,
      userEmail: 'faculty@gprec.ac.in',
      action: 'UPDATE_ATTENDANCE',
      entityType: 'Attendance',
      entityId: sessionId,
      details: `Updated attendance records for session ${sessionId}.`,
    });
    this.saveState();
  }

  public getStudentAttendance(studentRoll: string): AttendanceRecord[] {
    return this.state.attendanceRecords.filter(
      (r) => r.studentRoll.toUpperCase() === studentRoll.toUpperCase()
    );
  }

  // --- Study Materials ---
  public getStudyMaterials(filter?: { branchCode?: string; batchYear?: string; subjectId?: string }): StudyMaterial[] {
    let list = [...this.state.studyMaterials];
    if (filter?.branchCode) list = list.filter((m) => m.branchCode === filter.branchCode);
    if (filter?.batchYear) list = list.filter((m) => m.batchYear === filter.batchYear);
    if (filter?.subjectId) list = list.filter((m) => m.subjectId === filter.subjectId);
    return list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  public addStudyMaterial(material: Omit<StudyMaterial, 'id' | 'uploadedAt' | 'downloadCount'>): StudyMaterial {
    const newMaterial: StudyMaterial = {
      ...material,
      id: `sm-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
      downloadCount: 0,
    };
    this.state.studyMaterials.unshift(newMaterial);

    this.logActivity({
      userId: material.uploadedByFacultyId,
      userEmail: 'faculty@gprec.ac.in',
      action: 'UPLOAD_RESOURCE',
      entityType: 'Resource',
      entityId: newMaterial.id,
      details: `Uploaded study material "${material.title}" for ${material.branchCode} batch ${material.batchYear}.`,
    });

    this.saveState();
    return newMaterial;
  }

  public deleteStudyMaterial(id: string, facultyId: string): boolean {
    const idx = this.state.studyMaterials.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    const removed = this.state.studyMaterials.splice(idx, 1)[0];

    this.logActivity({
      userId: facultyId,
      userEmail: 'faculty@gprec.ac.in',
      action: 'DELETE_RESOURCE',
      entityType: 'Resource',
      entityId: id,
      details: `Deleted study material "${removed.title}".`,
    });

    this.saveState();
    return true;
  }

  public incrementDownloadCount(id: string): void {
    const mat = this.state.studyMaterials.find((m) => m.id === id);
    if (mat) {
      mat.downloadCount += 1;
      this.saveState();
    }
  }

  // --- Support Plans ---
  public getSupportPlans(studentRoll?: string): SupportPlan[] {
    if (studentRoll) {
      return this.state.supportPlans.filter((p) => p.studentRoll.toUpperCase() === studentRoll.toUpperCase());
    }
    return [...this.state.supportPlans];
  }

  public addSupportPlan(plan: Omit<SupportPlan, 'id' | 'createdAt' | 'updatedAt'>): SupportPlan {
    const newPlan: SupportPlan = {
      ...plan,
      id: `sp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.supportPlans.unshift(newPlan);

    this.logActivity({
      userId: plan.assignedFacultyId,
      userEmail: 'faculty@gprec.ac.in',
      action: 'CREATE_SUPPORT_PLAN',
      entityType: 'SupportPlan',
      entityId: newPlan.id,
      details: `Created support plan for ${plan.studentRoll}: ${plan.subjectOrConcern}`,
    });

    this.saveState();
    return newPlan;
  }

  public updateSupportPlanStatus(
    id: string,
    status: 'Open' | 'In progress' | 'Resolved',
    progressNote?: string
  ): SupportPlan | null {
    const plan = this.state.supportPlans.find((p) => p.id === id);
    if (!plan) return null;
    plan.status = status;
    plan.updatedAt = new Date().toISOString();
    if (progressNote) {
      plan.progressUpdates.push(`${new Date().toLocaleDateString()}: ${progressNote}`);
    }
    this.saveState();
    return plan;
  }

  // --- Advisors ---
  public getAdvisors(): FacultyAdvisor[] {
    return [...this.state.advisors];
  }

  public assignAdvisor(studentRoll: string, advisorId: string): boolean {
    const advisor = this.state.advisors.find((a) => a.id === advisorId);
    if (!advisor) return false;
    const student = this.getStudentByRoll(studentRoll);
    if (!student) return false;

    this.updateStudent(studentRoll, {
      advisorId: advisor.id,
      advisorName: advisor.facultyName,
      advisorEmail: advisor.email,
      advisorCabin: advisor.cabinLocation,
      advisorOfficeHours: advisor.officeHours,
    });
    return true;
  }

  // --- Activity History ---
  public logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): void {
    const newLog: ActivityLog = {
      ...log,
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };
    this.state.activityLogs.unshift(newLog);
    // Keep max 200 logs
    if (this.state.activityLogs.length > 200) {
      this.state.activityLogs = this.state.activityLogs.slice(0, 200);
    }
    this.saveState();
  }

  public getActivityLogs(limit = 50): ActivityLog[] {
    return this.state.activityLogs.slice(0, limit);
  }

  // --- Email Delivery Logs ---
  public logEmailDelivery(log: Omit<EmailDeliveryLog, 'id' | 'timestamp'>): EmailDeliveryLog {
    const newLog: EmailDeliveryLog = {
      ...log,
      id: `el-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    this.state.emailLogs.unshift(newLog);
    this.saveState();
    return newLog;
  }

  public getEmailLogs(studentRoll?: string): EmailDeliveryLog[] {
    if (studentRoll) {
      return this.state.emailLogs.filter((e) => e.studentRoll.toUpperCase() === studentRoll.toUpperCase());
    }
    return [...this.state.emailLogs];
  }

  // --- Academic Warnings / Risk Calculation Helper ---
  public getStudentEvaluatedWarning(studentRoll: string): AcademicWarning {
    const student = this.getStudentByRoll(studentRoll);
    const marks = this.getMarks({ studentRoll });
    const attRecords = this.getStudentAttendance(studentRoll);
    const attCalc = calculateAttendance(attRecords);

    const riskEval = evaluateStudentRisk({
      rollNumber: studentRoll,
      studentName: student?.fullName || studentRoll,
      marks,
      attendance: attCalc,
    });

    const avgMarks =
      marks.length > 0 ? marks.reduce((sum, m) => sum + m.percentage, 0) / marks.length : 0;

    return {
      id: `warn-${studentRoll}`,
      studentRoll,
      studentName: student?.fullName || studentRoll,
      riskLevel: riskEval.riskLevel,
      riskScore: riskEval.riskScore,
      evidenceReasons: riskEval.evidenceReasons,
      attendanceWarningLevel: attCalc.warningLevel,
      attendancePercentage: attCalc.rawPercentage,
      averageMarksPercentage: Number(avgMarks.toFixed(1)),
      status: riskEval.riskLevel === 'Low concern' ? 'Resolved' : 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public getAllSubjects(): Subject[] {
    return [...this.state.subjects];
  }

  public getAllAssessments(): Assessment[] {
    return [...this.state.assessments];
  }
}

export const db = new SpectraRepository();
