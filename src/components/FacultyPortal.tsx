import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  Award,
  CalendarCheck,
  BookOpen,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Upload,
  ArrowRight,
  TrendingUp,
  Activity,
  ShieldCheck,
  ChevronRight,
  Save,
  Check,
  Edit2,
  Trash2,
  LogOut,
  Send,
  Eye,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import type {
  UserAccount,
  StudentProfile,
  Subject,
  Assessment,
  StudentMark,
  AttendanceSession,
  AttendanceRecord,
  AttendanceStatus,
  StudyMaterial,
  AcademicWarning,
  SupportPlan,
} from '../types/spectra';
import { db } from '../services/db';
import { auth, INITIAL_PROVISIONED_PASSWORD } from '../services/auth';
import { parseGprecRollNumber, GPREC_BRANCHES } from '../utils/gprecRollNumber';
import { calculateAttendance } from '../utils/attendanceCalculator';
import { downloadCsvFile } from '../utils/csvExporter';
import { emailService } from '../services/emailService';
import { RecentStudyMaterials } from './RecentStudyMaterials';

interface FacultyPortalProps {
  user: UserAccount;
  onLogout: () => void;
  onOpenBackendStatus: () => void;
}

export const FacultyPortal: React.FC<FacultyPortalProps> = ({
  user,
  onLogout,
  onOpenBackendStatus,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'Overview'
    | 'Students'
    | 'Marks'
    | 'Attendance'
    | 'Materials'
    | 'Warnings'
    | 'Advisors'
    | 'Reports'
  >('Overview');

  const [toast, setToast] = useState('');
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Live state from persistent db
  const [studentsList, setStudentsList] = useState<StudentProfile[]>(() => db.getStudents());
  const subjects = useMemo(() => db.getAllSubjects(), []);
  const assessments = useMemo(() => db.getAllAssessments(), []);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>(() => db.getStudyMaterials());
  const [supportPlans, setSupportPlans] = useState<SupportPlan[]>(() => db.getSupportPlans());
  const advisors = useMemo(() => db.getAdvisors(), []);
  const activityLogs = useMemo(() => db.getActivityLogs(15), [toast]);

  const reloadData = () => {
    setStudentsList(db.getStudents());
    setStudyMaterials(db.getStudyMaterials());
    setSupportPlans(db.getSupportPlans());
  };

  // Student details modal / drawer
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

  // Search & Filter state for Students
  const [studentQuery, setStudentQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');

  const filteredStudents = useMemo(() => {
    return studentsList.filter((s) => {
      const matchQuery =
        s.fullName.toLowerCase().includes(studentQuery.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(studentQuery.toLowerCase()) ||
        s.branchName.toLowerCase().includes(studentQuery.toLowerCase());
      const matchBranch = branchFilter === 'All' || s.branchCode === branchFilter;
      return matchQuery && matchBranch;
    });
  }, [studentsList, studentQuery, branchFilter]);

  // Attendance management state
  const sessions = useMemo(() => db.getAttendanceSessions(), [toast]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id || ''
  );
  const [sessionDraftRecords, setSessionDraftRecords] = useState<Record<string, AttendanceStatus>>({});

  // When selected session changes, populate draft records
  React.useEffect(() => {
    if (selectedSessionId) {
      const records = db.getSessionAttendanceRecords(selectedSessionId);
      const map: Record<string, AttendanceStatus> = {};
      records.forEach((r) => {
        map[r.studentRoll] = r.status;
      });
      // Ensure all students have an entry (defaulting to Pending if not yet created)
      studentsList.forEach((s) => {
        if (!map[s.rollNumber]) {
          map[s.rollNumber] = 'Pending';
        }
      });
      setSessionDraftRecords(map);
    }
  }, [selectedSessionId, studentsList]);

  // New Attendance Session Modal state
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionSubject, setNewSessionSubject] = useState(subjects[0]?.id || '');
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSessionPeriod, setNewSessionPeriod] = useState(1);
  const [newSessionBranch, setNewSessionBranch] = useState('05');

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const subj = subjects.find((s) => s.id === newSessionSubject);
    const enrolledStudents = studentsList
      .filter((s) => s.branchCode === newSessionBranch)
      .map((s) => s.rollNumber);

    const created = db.createAttendanceSession(
      {
        date: newSessionDate,
        subjectId: newSessionSubject,
        subjectName: subj?.name || 'Class Session',
        branchCode: newSessionBranch,
        batchYear: '2025-29',
        period: Number(newSessionPeriod),
        facultyId: user.id,
        facultyName: user.fullName,
      },
      enrolledStudents
    );

    setSelectedSessionId(created.id);
    setShowNewSessionModal(false);
    notify(`Attendance session created. ${enrolledStudents.length} students initialized as Pending.`);
  };

  const handleSaveAttendance = () => {
    if (!selectedSessionId) return;
    const batchData = Object.entries(sessionDraftRecords).map(([studentRoll, status]) => ({
      studentRoll,
      status,
    }));
    db.batchSaveAttendanceRecords(selectedSessionId, batchData, user.id);
    notify('Attendance records successfully saved and synchronized to student portals!');
    reloadData();
  };

  // Marks management state
  const [marksSubjectId, setMarksSubjectId] = useState(subjects[0]?.id || '');
  const [marksAssessmentId, setMarksAssessmentId] = useState(assessments[0]?.id || '');
  const currentAssessment = assessments.find((a) => a.id === marksAssessmentId);
  const marksForAssessment = useMemo(() => {
    return db.getMarks({ assessmentId: marksAssessmentId });
  }, [marksAssessmentId, toast]);

  const [editingMarks, setEditingMarks] = useState<Record<string, number>>({});

  const handleSaveMarkEntry = (studentRoll: string, subjectName: string) => {
    const val = editingMarks[studentRoll];
    if (val === undefined || isNaN(val)) {
      notify('Please enter a valid numeric mark.');
      return;
    }
    const max = currentAssessment?.maxMarks || 30;
    if (val > max) {
      notify(`Marks obtained cannot exceed maximum marks (${max}).`);
      return;
    }
    if (val < 0) {
      notify('Marks cannot be negative.');
      return;
    }

    db.saveMark({
      assessmentId: marksAssessmentId,
      studentRoll,
      subjectId: marksSubjectId,
      subjectName,
      testName: currentAssessment?.testName || 'Test',
      marksObtained: val,
      maxMarks: max,
      recordedByFacultyId: user.id,
    });
    notify(`Saved mark for ${studentRoll}: ${val}/${max}`);
    reloadData();
  };

  // Add Study Material state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubjectId, setUploadSubjectId] = useState(subjects[0]?.id || '');
  const [uploadBranch, setUploadBranch] = useState('05');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileContent, setUploadFileContent] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setUploadFileContent(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadFileName) {
      notify('Title and file are required.');
      return;
    }

    const subj = subjects.find((s) => s.id === uploadSubjectId);
    db.addStudyMaterial({
      title: uploadTitle.trim(),
      subjectId: uploadSubjectId,
      subjectName: subj?.name || 'General Engineering',
      description: uploadDesc.trim(),
      fileName: uploadFileName,
      fileSizeBytes: 240000,
      fileType: 'application/pdf',
      branchCode: uploadBranch,
      batchYear: '2025-29',
      uploadedByFacultyId: user.id,
      uploadedByFacultyName: user.fullName,
      storageUrl: uploadFileContent || undefined,
    });

    setShowUploadModal(false);
    setUploadTitle('');
    setUploadFileName('');
    setUploadDesc('');
    notify('Study material uploaded successfully and available to students!');
    reloadData();
  };

  // Study Material download and delete handlers
  const handleDownloadMaterial = (m: StudyMaterial) => {
    db.incrementDownloadCount(m.id);
    if (m.storageUrl && m.storageUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = m.storageUrl;
      link.download = m.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify(`Downloading ${m.fileName}...`);
    } else {
      const blob = new Blob(
        [`GPREC Study Material: ${m.title}\nSubject: ${m.subjectName}\nBranch: ${m.branchCode}\nVerified Academic Resource.`],
        { type: m.fileType || 'text/plain' }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = m.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(`Downloading ${m.fileName}...`);
    }
  };

  const handleDeleteMaterial = (m: StudyMaterial) => {
    db.deleteStudyMaterial(m.id, user.id);
    notify(`Deleted ${m.fileName}`);
    reloadData();
  };

  // CHANGE 13: Add Student state & provisioning
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentBranch, setNewStudentBranch] = useState(user.branchCode || '05');
  const [newStudentBatch, setNewStudentBatch] = useState('2025-29');
  const [addStudentSubmitting, setAddStudentSubmitting] = useState(false);
  const [addStudentError, setAddStudentError] = useState('');

  // Live roll preview & validation
  const liveParsedRoll = useMemo(() => {
    if (!newStudentRoll.trim()) return null;
    return parseGprecRollNumber(newStudentRoll);
  }, [newStudentRoll]);

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStudentError('');

    const normRoll = newStudentRoll.trim().toUpperCase();
    const fullName = newStudentName.trim();

    if (!fullName) {
      setAddStudentError('Student full name is required.');
      return;
    }

    const parsed = parseGprecRollNumber(normRoll);
    if (!parsed.isValid) {
      setAddStudentError(parsed.error || 'Invalid GPREC roll number.');
      return;
    }

    // Permission check: Faculty can only add students within their authorized permissions
    if (user.branchCode && user.role !== 'admin' && parsed.branchCode !== user.branchCode) {
      setAddStudentError(
        `Permission denied: You are authorized to enroll students for Branch ${user.branchCode} (${user.branchName || 'your branch'}) only. Roll number corresponds to Branch ${parsed.branchCode} (${parsed.branchName}).`
      );
      return;
    }

    // Check duplicate roll number
    if (db.getStudentByRoll(normRoll)) {
      setAddStudentError(`Student with roll number ${normRoll} already exists.`);
      return;
    }

    // Check duplicate college email in DB
    const existingEmailStudent = db.getStudents().find(
      (s) => s.collegeEmail.toLowerCase() === parsed.collegeEmail.toLowerCase()
    );
    if (existingEmailStudent) {
      setAddStudentError(`A student with college email ${parsed.collegeEmail} already exists.`);
      return;
    }

    setAddStudentSubmitting(true);

    try {
      const batchYear = newStudentBatch || `20${parsed.admissionYear}-29`;

      // Step 1: Save student profile to database
      db.addStudent({
        id: `st-${normRoll.toLowerCase()}`,
        rollNumber: normRoll,
        fullName,
        collegeEmail: parsed.collegeEmail,
        personalEmailVerified: false,
        branchCode: parsed.branchCode,
        branchName: parsed.branchName,
        batchYear,
        currentSemester: 1,
        admissionYearCode: parsed.admissionYear,
        sequenceNumber: parsed.sequenceNumber,
        alertPreferences: {
          lowMarks: true,
          fallingMarks: true,
          attendanceAlerts: true,
          studyMaterials: true,
          supportPlans: true,
        },
      });

      // Step 2: Provision login-ready authentication account
      const provRes = await auth.provisionStudentAccount({
        fullName,
        rollNumber: normRoll,
        collegeEmail: parsed.collegeEmail,
        branchCode: parsed.branchCode,
        branchName: parsed.branchName,
        batchYear,
        initialPassword: INITIAL_PROVISIONED_PASSWORD,
      });

      if (!provRes.success) {
        // Safe partial-failure rollback: remove created DB profile
        db.deleteStudent(normRoll);
        setAddStudentError(
          `Incomplete step: Login account provisioning failed (${provRes.error || 'Authentication error'}). Database profile was safely rolled back. Please retry.`
        );
        setAddStudentSubmitting(false);
        return;
      }

      // Display "Student added successfully" only when both profile and login provisioning steps have completed!
      notify('Student added successfully');
      setShowAddStudentModal(false);
      setNewStudentRoll('');
      setNewStudentName('');
      setAddStudentError('');
      reloadData();
    } catch (err: any) {
      db.deleteStudent(normRoll);
      setAddStudentError(err.message || 'An unexpected error occurred while adding student.');
    } finally {
      setAddStudentSubmitting(false);
    }
  };

  // Export CSV Handlers
  const handleExportStudentsCsv = () => {
    const headers = ['Roll Number', 'Full Name', 'Branch', 'Batch', 'College Email', 'Personal Email Verified'];
    const rows = filteredStudents.map((s) => [
      s.rollNumber,
      s.fullName,
      s.branchName,
      s.batchYear,
      s.collegeEmail,
      s.personalEmailVerified ? 'Yes' : 'No',
    ]);
    downloadCsvFile('GPREC_Students_Directory', headers, rows);
    notify('Exported students directory to CSV.');
  };

  const handleExportMarksCsv = () => {
    const headers = ['Student Roll', 'Subject', 'Assessment', 'Marks Obtained', 'Max Marks', 'Percentage'];
    const rows = marksForAssessment.map((m) => [
      m.studentRoll,
      m.subjectName,
      m.testName,
      m.marksObtained,
      m.maxMarks,
      `${m.percentage}%`,
    ]);
    downloadCsvFile(`GPREC_Marks_${currentAssessment?.testName || 'Results'}`, headers, rows);
    notify('Exported assessment marks to CSV.');
  };

  const handleExportAttendanceCsv = () => {
    const headers = ['Roll Number', 'Student Name', 'Present', 'Absent', 'Pending', 'Attendance Rate', 'Warning Level'];
    const rows = studentsList.map((s) => {
      const att = calculateAttendance(db.getStudentAttendance(s.rollNumber));
      return [
        s.rollNumber,
        s.fullName,
        att.presentCount,
        att.absentCount,
        att.pendingCount,
        att.displayPercentage,
        att.warningLevel,
      ];
    });
    downloadCsvFile('GPREC_Attendance_Summary_Report', headers, rows);
    notify('Exported consolidated attendance report to CSV.');
  };

  // Evaluated student warnings for Overview & Warnings tab
  const allStudentWarnings = useMemo(() => {
    return studentsList.map((s) => ({
      student: s,
      warning: db.getStudentEvaluatedWarning(s.rollNumber),
      attendance: calculateAttendance(db.getStudentAttendance(s.rollNumber)),
    }));
  }, [studentsList, toast]);

  const criticalAttendanceStudents = useMemo(() => {
    return allStudentWarnings.filter(
      (w) => w.attendance.warningLevel === 'HIGH_PRIORITY_WARNING'
    );
  }, [allStudentWarnings]);

  const regularAttendanceStudents = useMemo(() => {
    return allStudentWarnings.filter(
      (w) => w.attendance.warningLevel === 'ATTENDANCE_WARNING'
    );
  }, [allStudentWarnings]);

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <div className="brand-name">
              SPECTRA<span>•</span>
            </div>
            <div className="brand-sub">FACULTY PORTAL</div>
          </div>
        </div>

        <div className="workspace">
          <div className="workspace-icon">
            <Users size={18} />
          </div>
          <div>
            <strong>{user.fullName}</strong>
            <small>{user.department || 'GPREC Faculty'}</small>
          </div>
        </div>

        <div className="nav-label">COHORT TOOLS</div>
        <nav>
          <button
            className={`nav-item ${activeTab === 'Overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('Overview')}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'Students' ? 'active' : ''}`}
            onClick={() => setActiveTab('Students')}
          >
            <Users size={18} />
            <span>Student Details</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'Marks' ? 'active' : ''}`}
            onClick={() => setActiveTab('Marks')}
          >
            <Award size={18} />
            <span>Marks & Results</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'Attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('Attendance')}
          >
            <CalendarCheck size={18} />
            <span>Attendance</span>
            {criticalAttendanceStudents.length > 0 && (
              <span className="nav-count">{criticalAttendanceStudents.length}</span>
            )}
          </button>

          <button
            className={`nav-item ${activeTab === 'Warnings' ? 'active' : ''}`}
            onClick={() => setActiveTab('Warnings')}
          >
            <AlertTriangle size={18} />
            <span>Warnings</span>
            <span className="nav-count">
              {allStudentWarnings.filter((w) => w.warning.riskLevel !== 'Low concern').length}
            </span>
          </button>

          <button
            className={`nav-item ${activeTab === 'Materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('Materials')}
          >
            <BookOpen size={18} />
            <span>Study Materials</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'Advisors' ? 'active' : ''}`}
            onClick={() => setActiveTab('Advisors')}
          >
            <UserCheck size={18} />
            <span>Faculty Advisors</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'Reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('Reports')}
          >
            <FileSpreadsheet size={18} />
            <span>Academic Reports</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={onOpenBackendStatus} style={{ marginBottom: 6 }}>
            <ShieldCheck size={17} color="#38D9CE" />
            <span>Backend Status</span>
          </button>
          <button className="nav-item" onClick={onLogout} style={{ color: '#ff8b8b' }}>
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Faculty Workspace <span>/</span> <strong>{activeTab}</strong>
          </div>
          <div className="top-actions">
            <div className="badge-tag">
              <span className="live-dot" />
              <span>G. Pulla Reddy Engineering College</span>
            </div>
            <div className="avatar avatar-cyan">
              {user.fullName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="content">
          {/* TAB: OVERVIEW */}
          {activeTab === 'Overview' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">COHORT MANAGEMENT</div>
                  <h1>Faculty Overview</h1>
                  <p>Monitoring {studentsList.length} registered students across GPREC engineering branches.</p>
                </div>
                <div className="heading-actions">
                  <button className="btn btn-outline" onClick={handleExportAttendanceCsv}>
                    <Download size={15} />
                    <span>Export Attendance Report</span>
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowAddStudentModal(true)}>
                    <Plus size={15} />
                    <span>Add Student</span>
                  </button>
                </div>
              </div>

              {/* KPIs */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-top">
                    <span>Students Monitored</span>
                    <div className="kpi-icon blue"><Users size={18} /></div>
                  </div>
                  <div className="kpi-value">{studentsList.length}</div>
                  <div className="kpi-change">
                    <span>CSE, CSM, and EEE Batches</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span>Need Support</span>
                    <div className="kpi-icon rose"><AlertTriangle size={18} /></div>
                  </div>
                  <div className="kpi-value" style={{ color: '#ff8b8b' }}>
                    {allStudentWarnings.filter((w) => w.warning.riskLevel !== 'Low concern').length}
                  </div>
                  <div className="kpi-change down">
                    <span>{criticalAttendanceStudents.length} high priority (&lt;65% att)</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span>Attendance Rate</span>
                    <div className="kpi-icon mint"><CalendarCheck size={18} /></div>
                  </div>
                  <div className="kpi-value">
                    {Math.round(
                      allStudentWarnings
                        .map((w) => w.attendance.rawPercentage || 0)
                        .reduce((a, b) => a + b, 0) / Math.max(1, allStudentWarnings.length)
                    )}%
                  </div>
                  <div className="kpi-change up">
                    <span>Cohort mean finalized attendance</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span>Study Materials</span>
                    <div className="kpi-icon violet"><BookOpen size={18} /></div>
                  </div>
                  <div className="kpi-value">{studyMaterials.length}</div>
                  <div className="kpi-change">
                    <span>Uploaded course resources</span>
                  </div>
                </div>
              </div>

              {/* High Priority Warnings Notice Banner */}
              {criticalAttendanceStudents.length > 0 && (
                <div className="alert-banner critical">
                  <AlertCircle size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>High-Priority Attendance Shortage Alert</strong>
                    <p style={{ marginTop: 4 }}>
                      {criticalAttendanceStudents.length} student(s) currently have finalized attendance below 65%. GPREC rules require prompt faculty advisor counseling.
                    </p>
                    <div style={{ marginTop: 8, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {criticalAttendanceStudents.map((c) => (
                        <button
                          key={c.student.rollNumber}
                          className="btn btn-quiet"
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                          onClick={() => setSelectedStudent(c.student)}
                        >
                          {c.student.fullName} ({c.student.rollNumber}: {c.attendance.displayPercentage})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Grid: Priority Follow-ups and Recent Uploads */}
              <div className="dashboard-two-col">
                <div className="panel" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <div className="panel-head">
                    <div>
                      <h3>Priority Student Follow-Ups</h3>
                      <p>Students requiring immediate academic support or attendance review</p>
                    </div>
                    <button className="btn btn-quiet" onClick={() => setActiveTab('Warnings')} style={{ fontSize: '10px', padding: '5px 8px' }}>
                      View All Warnings
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    {allStudentWarnings
                      .filter((w) => w.warning.riskLevel !== 'Low concern')
                      .map((w) => (
                        <div
                          key={w.student.rollNumber}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            background: '#151d36',
                            border: '1px solid #243154',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className={`avatar ${w.warning.riskLevel === 'High concern' ? 'avatar-rose' : 'avatar-amber'}`}>
                              {w.student.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ fontSize: '12px', color: '#fff' }}>{w.student.fullName}</strong>
                              <small style={{ color: '#959cb3', fontSize: '10px', display: 'block' }}>
                                {w.student.rollNumber} · {w.student.branchName} · Attendance: {w.attendance.displayPercentage}
                              </small>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              className={`risk-badge ${w.warning.riskLevel === 'High concern' ? 'critical' : 'elevated'}`}
                            >
                              <i />
                              {w.warning.riskLevel}
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '6px 10px', fontSize: '10.5px' }}
                              onClick={() => setSelectedStudent(w.student)}
                            >
                              Review
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Activity History Log */}
                <div className="panel" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <div className="panel-head">
                    <div>
                      <h3>Recent Activity History</h3>
                      <p>Audit trail of marks, attendance, and resource updates</p>
                    </div>
                    <Activity size={18} color="#38D9CE" />
                  </div>
                  <div style={{ display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          fontSize: '11px',
                          padding: '10px',
                          background: '#151d36',
                          borderRadius: '8px',
                          border: '1px solid #222d4f',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38D9CE', fontWeight: 600 }}>
                          <span>{log.action}</span>
                          <span style={{ color: '#8890ab', fontSize: '9.5px' }}>
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ color: '#c9d0e7', margin: '4px 0 0', lineHeight: 1.4 }}>{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CHANGE 14: Recent Study Materials */}
              <div style={{ marginBottom: '22px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                <RecentStudyMaterials
                  materials={studyMaterials}
                  limit={4}
                  onViewAll={() => setActiveTab('Materials')}
                  onAddMaterial={() => setShowUploadModal(true)}
                  onDownload={handleDownloadMaterial}
                  isFaculty={true}
                  title="Recent Study Materials"
                  subtitle="Latest institutional courseware and notes"
                />
              </div>
            </>
          )}

          {/* TAB: STUDENT DETAILS */}
          {activeTab === 'Students' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">DIRECTORY & DOSSIERS</div>
                  <h1>Student Details</h1>
                  <p>Authorized student profiles, roll-number verification, and academic history.</p>
                </div>
                <div className="heading-actions">
                  <button className="btn btn-outline" onClick={handleExportStudentsCsv}>
                    <Download size={15} />
                    <span>Export CSV</span>
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowAddStudentModal(true)}>
                    <Plus size={15} />
                    <span>Add Student</span>
                  </button>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="table-toolbar">
                  <div className="search-box">
                    <Search size={16} />
                    <input
                      placeholder="Search by student name or full roll number (YY9XADDNNN)..."
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                    />
                  </div>
                  <div className="filter-wrap">
                    <Filter size={14} />
                    <select
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value)}
                    >
                      <option value="All">All Branches</option>
                      <option value="05">CSE (05)</option>
                      <option value="33">CSM (33)</option>
                      <option value="04">EEE (04)</option>
                    </select>
                  </div>
                  <span className="results-count">{filteredStudents.length} authorized students</span>
                </div>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Roll Number</th>
                        <th>Branch</th>
                        <th>Batch</th>
                        <th>Attendance Rate</th>
                        <th>Risk Standing</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s) => {
                        const att = calculateAttendance(db.getStudentAttendance(s.rollNumber));
                        const warn = db.getStudentEvaluatedWarning(s.rollNumber);
                        return (
                          <tr
                            key={s.rollNumber}
                            className="click-row"
                            onClick={() => setSelectedStudent(s)}
                          >
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="avatar avatar-purple">
                                  {s.fullName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <strong>{s.fullName}</strong>
                                  <small>{s.collegeEmail}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <code>{s.rollNumber}</code>
                            </td>
                            <td>{s.branchName}</td>
                            <td>{s.batchYear}</td>
                            <td>
                              <strong
                                style={{
                                  color:
                                    att.warningLevel === 'HIGH_PRIORITY_WARNING'
                                      ? '#ff8b8b'
                                      : att.warningLevel === 'ATTENDANCE_WARNING'
                                      ? '#fbbf24'
                                      : '#34d399',
                                }}
                              >
                                {att.displayPercentage}
                              </strong>
                              <small>{att.presentCount} P / {att.absentCount} A / {att.pendingCount} Pending</small>
                            </td>
                            <td>
                              <span
                                className={`risk-badge ${
                                  warn.riskLevel === 'High concern'
                                    ? 'critical'
                                    : warn.riskLevel === 'Medium concern'
                                    ? 'elevated'
                                    : 'safe'
                                }`}
                              >
                                <i />
                                {warn.riskLevel}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ padding: '5px 8px', fontSize: '10px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStudent(s);
                                }}
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB: MARKS & RESULTS */}
          {activeTab === 'Marks' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">EVALUATIONS & MARKS</div>
                  <h1>Marks & Results</h1>
                  <p>Enter, edit, and validate test marks. Numerical validation prevents exceeding maximum marks.</p>
                </div>
                <div className="heading-actions">
                  <button className="btn btn-outline" onClick={handleExportMarksCsv}>
                    <Download size={15} />
                    <span>Export Marks CSV</span>
                  </button>
                </div>
              </div>

              {/* Assessment Selector */}
              <div className="panel" style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className="field-label" style={{ minWidth: '220px' }}>
                    <span>Select Assessment</span>
                    <select
                      className="input-dark"
                      value={marksAssessmentId}
                      onChange={(e) => setMarksAssessmentId(e.target.value)}
                    >
                      {assessments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.subjectName} — {a.testName} (Max: {a.maxMarks})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ marginTop: '20px', fontSize: '12px', color: '#c9d0e7' }}>
                    Maximum Marks: <strong>{currentAssessment?.maxMarks || 30}</strong> · Date: {currentAssessment?.date}
                  </div>
                </div>
              </div>

              {/* Marks Entry Table */}
              <div className="panel table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Current Score</th>
                        <th>Percentage</th>
                        <th>Enter / Update Marks</th>
                        <th>Save</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsList
                        .filter((s) => s.branchCode === currentAssessment?.branchCode)
                        .map((s) => {
                          const existing = marksForAssessment.find((m) => m.studentRoll === s.rollNumber);
                          const inputVal = editingMarks[s.rollNumber] ?? existing?.marksObtained ?? '';
                          return (
                            <tr key={s.rollNumber}>
                              <td><code>{s.rollNumber}</code></td>
                              <td><strong>{s.fullName}</strong></td>
                              <td>{existing ? `${existing.marksObtained} / ${existing.maxMarks}` : 'Not recorded'}</td>
                              <td>
                                {existing ? (
                                  <strong style={{ color: existing.percentage < 50 ? '#ff8b8b' : '#34d399' }}>
                                    {existing.percentage}%
                                  </strong>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td style={{ width: '180px' }}>
                                <input
                                  type="number"
                                  min={0}
                                  max={currentAssessment?.maxMarks || 30}
                                  className="input-dark"
                                  style={{ width: '100px', padding: '6px 8px' }}
                                  value={inputVal}
                                  onChange={(e) => {
                                    setEditingMarks({
                                      ...editingMarks,
                                      [s.rollNumber]: Number(e.target.value),
                                    });
                                  }}
                                  placeholder={`0 - ${currentAssessment?.maxMarks || 30}`}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '6px 12px', fontSize: '11px' }}
                                  onClick={() => handleSaveMarkEntry(s.rollNumber, currentAssessment?.subjectName || '')}
                                >
                                  <Save size={13} />
                                  <span>Save</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB: THREE-STATE ATTENDANCE SYSTEM */}
          {activeTab === 'Attendance' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">THREE-STATE ATTENDANCE SYSTEM</div>
                  <h1>Attendance Management</h1>
                  <p>
                    Sessions initialize as <strong>Pending</strong>. Mark Present or Absent and save. Pending does not lower attendance percentages.
                  </p>
                </div>
                <div className="heading-actions">
                  <button className="btn btn-outline" onClick={handleExportAttendanceCsv}>
                    <Download size={15} />
                    <span>Export Attendance CSV</span>
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowNewSessionModal(true)}>
                    <Plus size={15} />
                    <span>Create Session</span>
                  </button>
                </div>
              </div>

              {/* Session Selector & Batch Actions */}
              <div className="panel" style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <label className="field-label" style={{ minWidth: '300px' }}>
                    <span>Choose Attendance Session</span>
                    <select
                      className="input-dark"
                      value={selectedSessionId}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                    >
                      {sessions.map((ses) => (
                        <option key={ses.id} value={ses.id}>
                          {ses.date} · {ses.subjectName} (Period {ses.period} · Branch {ses.branchCode})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-quiet"
                      onClick={() => {
                        const next: Record<string, AttendanceStatus> = {};
                        studentsList.forEach((s) => (next[s.rollNumber] = 'Present'));
                        setSessionDraftRecords(next);
                      }}
                    >
                      Mark All Present
                    </button>

                    <button
                      type="button"
                      className="btn btn-quiet"
                      onClick={() => {
                        const next: Record<string, AttendanceStatus> = {};
                        studentsList.forEach((s) => (next[s.rollNumber] = 'Absent'));
                        setSessionDraftRecords(next);
                      }}
                    >
                      Mark All Absent
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveAttendance}
                    >
                      <Save size={15} />
                      <span>Save & Finalize Attendance</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="panel table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Status in This Session</th>
                        <th>Action Toggle</th>
                        <th>Cumulative Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsList.map((s) => {
                        const currentStatus = sessionDraftRecords[s.rollNumber] || 'Pending';
                        const att = calculateAttendance(db.getStudentAttendance(s.rollNumber));
                        return (
                          <tr key={s.rollNumber}>
                            <td><code>{s.rollNumber}</code></td>
                            <td><strong>{s.fullName}</strong></td>
                            <td>
                              <span
                                className={`status-pill ${
                                  currentStatus === 'Present'
                                    ? 'resolved'
                                    : currentStatus === 'Absent'
                                    ? 'open'
                                    : 'in-progress'
                                }`}
                              >
                                {currentStatus}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className={`btn ${currentStatus === 'Present' ? 'btn-primary' : 'btn-quiet'}`}
                                  style={{ padding: '5px 9px', fontSize: '10px' }}
                                  onClick={() =>
                                    setSessionDraftRecords({
                                      ...sessionDraftRecords,
                                      [s.rollNumber]: 'Present',
                                    })
                                  }
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${currentStatus === 'Absent' ? 'btn-danger' : 'btn-quiet'}`}
                                  style={{ padding: '5px 9px', fontSize: '10px' }}
                                  onClick={() =>
                                    setSessionDraftRecords({
                                      ...sessionDraftRecords,
                                      [s.rollNumber]: 'Absent',
                                    })
                                  }
                                >
                                  Absent
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${currentStatus === 'Pending' ? 'btn-outline' : 'btn-quiet'}`}
                                  style={{ padding: '5px 9px', fontSize: '10px' }}
                                  onClick={() =>
                                    setSessionDraftRecords({
                                      ...sessionDraftRecords,
                                      [s.rollNumber]: 'Pending',
                                    })
                                  }
                                >
                                  Pending
                                </button>
                              </div>
                            </td>
                            <td>
                              <strong
                                style={{
                                  color:
                                    att.warningLevel === 'HIGH_PRIORITY_WARNING'
                                      ? '#ff8b8b'
                                      : att.warningLevel === 'ATTENDANCE_WARNING'
                                      ? '#fbbf24'
                                      : '#34d399',
                                }}
                              >
                                {att.displayPercentage}
                              </strong>
                              <small>{att.presentCount} Present / {att.absentCount} Absent</small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB: ACADEMIC EARLY WARNINGS */}
          {activeTab === 'Warnings' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">EARLY WARNING & SUPPORT</div>
                  <h1>Academic Warnings</h1>
                  <p>Explainable student risk flags, transparent evidence, and support plan assignments.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '14px' }}>
                {allStudentWarnings.map((w) => (
                  <div
                    key={w.student.rollNumber}
                    className="panel"
                    style={{
                      borderLeft:
                        w.warning.riskLevel === 'High concern'
                          ? '4px solid #ef4444'
                          : w.warning.riskLevel === 'Medium concern'
                          ? '4px solid #f59e0b'
                          : '4px solid #10b981',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '16px', color: '#fff', margin: 0 }}>
                            {w.student.fullName} (<code>{w.student.rollNumber}</code>)
                          </h3>
                          <span
                            className={`risk-badge ${
                              w.warning.riskLevel === 'High concern'
                                ? 'critical'
                                : w.warning.riskLevel === 'Medium concern'
                                ? 'elevated'
                                : 'safe'
                            }`}
                          >
                            <i />
                            {w.warning.riskLevel} (Score: {w.warning.riskScore}/100)
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#959cb3', margin: '4px 0 0' }}>
                          {w.student.branchName} · Batch {w.student.batchYear} · Finalized Attendance: {w.attendance.displayPercentage}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setSelectedStudent(w.student)}
                        >
                          Review Student Profile
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', background: '#151d36', padding: '12px', borderRadius: '8px' }}>
                      <span className="eyebrow" style={{ color: '#38D9CE', fontSize: '9px' }}>
                        TRANSPARENT EVIDENCE LOG:
                      </span>
                      <ul style={{ paddingLeft: '18px', marginTop: '6px', fontSize: '11.5px', color: '#cdd4ed' }}>
                        {w.warning.evidenceReasons.map((ev, i) => (
                          <li key={i} style={{ marginBottom: 3 }}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB: STUDY MATERIALS */}
          {activeTab === 'Materials' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">COURSEWARE REPOSITORY</div>
                  <h1>Study Materials</h1>
                  <p>Upload and manage lecture notes, problem sets, and presentations for authorized batches.</p>
                </div>
                <div className="heading-actions">
                  <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                    <Upload size={15} />
                    <span>Upload New Material</span>
                  </button>
                </div>
              </div>

              <RecentStudyMaterials
                materials={studyMaterials}
                showSearch={true}
                onDownload={handleDownloadMaterial}
                onDelete={handleDeleteMaterial}
                onAddMaterial={() => setShowUploadModal(true)}
                isFaculty={true}
                title="All Course Materials"
                subtitle="Complete repository of faculty courseware with functional downloads"
              />
            </>
          )}

          {/* TAB: ADVISORS */}
          {activeTab === 'Advisors' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">FACULTY ADVISING REGISTRY</div>
                  <h1>Faculty Advisors</h1>
                  <p>Designated academic advisors and batch mentor assignments.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {advisors.map((adv) => (
                  <div key={adv.id} className="panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div className="avatar avatar-purple" style={{ width: '42px', height: '42px', fontSize: '14px' }}>
                        {adv.facultyName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#fff' }}>{adv.facultyName}</strong>
                        <small style={{ color: '#38D9CE', display: 'block', fontSize: '10px' }}>
                          Branch {adv.branchCode} Advisor
                        </small>
                      </div>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#c9d0e7', display: 'grid', gap: '6px' }}>
                      <div>Email: <code>{adv.email}</code></div>
                      <div>Cabin: {adv.cabinLocation}</div>
                      <div>Hours: {adv.officeHours}</div>
                      <div>Assigned Batches: {adv.assignedBatches.join(', ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB: ACADEMIC REPORTS */}
          {activeTab === 'Reports' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">CONSOLIDATED METRICS</div>
                  <h1>Academic Reports</h1>
                  <p>Export certified academic reports with UTF-8 BOM and formula injection protection.</p>
                </div>
                <div className="heading-actions">
                  <button className="btn btn-primary" onClick={handleExportAttendanceCsv}>
                    <Download size={15} />
                    <span>Export Attendance Summary CSV</span>
                  </button>
                  <button className="btn btn-outline" onClick={handleExportStudentsCsv}>
                    <Download size={15} />
                    <span>Export Student Directory CSV</span>
                  </button>
                </div>
              </div>

              <div className="panel" style={{ padding: '24px' }}>
                <h3>Institutional Compliance Report</h3>
                <p style={{ fontSize: '12px', color: '#959cb3', margin: '6px 0 16px' }}>
                  This report includes total enrolled students, attendance thresholds (&gt;=75%, 65-74%, &lt;65%), and student risk standing.
                </p>

                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-top"><span>Total Enrolled</span></div>
                    <div className="kpi-value">{studentsList.length}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-top"><span>Above 75% Target</span></div>
                    <div className="kpi-value" style={{ color: '#34d399' }}>
                      {allStudentWarnings.filter((w) => (w.attendance.rawPercentage || 0) >= 75).length}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-top"><span>Attendance Warning (65-74%)</span></div>
                    <div className="kpi-value" style={{ color: '#fbbf24' }}>
                      {regularAttendanceStudents.length}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-top"><span>Critical (&lt;65%)</span></div>
                    <div className="kpi-value" style={{ color: '#ff8b8b' }}>
                      {criticalAttendanceStudents.length}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="footer">
          <span>© 2026 SPECTRA · G. Pulla Reddy Engineering College (GPREC)</span>
          <span>
            <ShieldCheck size={14} color="#38D9CE" />
            <span>Authorized Faculty Portal · Strict Dark Mode</span>
          </span>
        </footer>
      </main>

      {/* Student Profile Drawer */}
      {selectedStudent && (
        <>
          <div className="drawer-scrim" onClick={() => setSelectedStudent(null)} />
          <aside className="student-drawer">
            <div className="drawer-top">
              <span className="eyebrow">STUDENT PROFILE</span>
              <button className="icon-btn" onClick={() => setSelectedStudent(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-profile">
              <div className="avatar avatar-large avatar-purple">
                {selectedStudent.fullName.slice(0, 2).toUpperCase()}
              </div>
              <h2>{selectedStudent.fullName}</h2>
              <p>
                <code>{selectedStudent.rollNumber}</code> · {selectedStudent.branchName} · Batch {selectedStudent.batchYear}
              </p>
              <div style={{ fontSize: '11px', color: '#959cb3' }}>
                Email: <code>{selectedStudent.collegeEmail}</code>
              </div>
            </div>

            {/* Attendance & Standing Stats */}
            {(() => {
              const att = calculateAttendance(db.getStudentAttendance(selectedStudent.rollNumber));
              const warn = db.getStudentEvaluatedWarning(selectedStudent.rollNumber);
              const marks = db.getMarks({ studentRoll: selectedStudent.rollNumber });
              const plans = db.getSupportPlans(selectedStudent.rollNumber);

              return (
                <>
                  <div className="drawer-stats">
                    <div>
                      <span>Finalized Attendance</span>
                      <strong style={{ color: att.warningLevel === 'HIGH_PRIORITY_WARNING' ? '#ff8b8b' : '#34d399' }}>
                        {att.displayPercentage}
                      </strong>
                      <small>{att.presentCount} P / {att.absentCount} A / {att.pendingCount} Pending</small>
                    </div>
                    <div>
                      <span>Risk Standing</span>
                      <strong style={{ color: warn.riskLevel === 'High concern' ? '#ff8b8b' : '#34d399' }}>
                        {warn.riskLevel}
                      </strong>
                      <small>Score: {warn.riskScore}/100</small>
                    </div>
                  </div>

                  <div className="drawer-section">
                    <h3>Transparent Evidence</h3>
                    <ul style={{ paddingLeft: '18px', fontSize: '11.5px', color: '#c9d0e7' }}>
                      {warn.evidenceReasons.map((ev, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>{ev}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="drawer-section">
                    <h3>Marks History</h3>
                    {marks.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 0',
                          fontSize: '11.5px',
                          borderBottom: '1px solid #1a233e',
                        }}
                      >
                        <span>{m.subjectName} ({m.testName})</span>
                        <strong>{m.marksObtained}/{m.maxMarks} ({m.percentage}%)</strong>
                      </div>
                    ))}
                  </div>

                  <div className="drawer-section">
                    <h3>Support Plans</h3>
                    {plans.map((p) => (
                      <div key={p.id} style={{ background: '#151d36', padding: '10px', borderRadius: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{p.subjectOrConcern}</strong>
                          <span className="status-pill in-progress">{p.status}</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#959cb3', margin: '4px 0' }}>{p.suggestedAction}</p>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ width: '100%', marginTop: '6px' }}
                      onClick={() => {
                        db.addSupportPlan({
                          studentRoll: selectedStudent.rollNumber,
                          studentName: selectedStudent.fullName,
                          subjectOrConcern: 'Academic & Attendance Recovery',
                          reasonForSupport: 'Identified through early warning signals.',
                          suggestedAction: 'Extra tutorial classes and advisor check-ins.',
                          assignedFacultyId: user.id,
                          assignedFacultyName: user.fullName,
                          startDate: new Date().toISOString().split('T')[0],
                          targetDate: '2026-11-15',
                          status: 'In progress',
                          facultyNotes: 'Plan initiated by faculty.',
                          progressUpdates: ['Initial review completed.'],
                        });
                        notify('Support plan created for student.');
                        reloadData();
                      }}
                    >
                      <Plus size={14} />
                      <span>Initiate New Support Plan</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </aside>
        </>
      )}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="modal-backdrop" onClick={() => setShowNewSessionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">ATTENDANCE SESSION</span>
                <h2>Create Attendance Session</h2>
                <p>New sessions initialize all enrolled students as Pending.</p>
              </div>
              <button className="icon-btn" onClick={() => setShowNewSessionModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSession} style={{ display: 'grid', gap: '14px' }}>
              <label className="field-label">
                <span>Subject</span>
                <select
                  className="input-dark"
                  value={newSessionSubject}
                  onChange={(e) => setNewSessionSubject(e.target.value)}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label className="field-label">
                  <span>Date</span>
                  <input
                    type="date"
                    required
                    className="input-dark"
                    value={newSessionDate}
                    onChange={(e) => setNewSessionDate(e.target.value)}
                  />
                </label>

                <label className="field-label">
                  <span>Period (1 - 8)</span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    required
                    className="input-dark"
                    value={newSessionPeriod}
                    onChange={(e) => setNewSessionPeriod(Number(e.target.value))}
                  />
                </label>
              </div>

              <label className="field-label">
                <span>Branch</span>
                <select
                  className="input-dark"
                  value={newSessionBranch}
                  onChange={(e) => setNewSessionBranch(e.target.value)}
                >
                  <option value="05">CSE (05)</option>
                  <option value="33">CSM (33)</option>
                  <option value="04">EEE (04)</option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => setShowNewSessionModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={14} />
                  <span>Initialize Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Material Modal */}
      {showUploadModal && (
        <div className="modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">RESOURCE UPLOAD</span>
                <h2>Upload Study Material</h2>
                <p>Attach notes, problem sheets, or presentations for your class.</p>
              </div>
              <button className="icon-btn" onClick={() => setShowUploadModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'grid', gap: '12px' }}>
              <label className="field-label">
                <span>Title</span>
                <input
                  type="text"
                  required
                  className="input-dark"
                  placeholder="e.g. Unit 3 Lecture Notes & Problems"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
              </label>

              <label className="field-label">
                <span>Subject</span>
                <select
                  className="input-dark"
                  value={uploadSubjectId}
                  onChange={(e) => setUploadSubjectId(e.target.value)}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                <span>Description</span>
                <textarea
                  className="input-dark"
                  rows={2}
                  placeholder="Summary of topics covered"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                />
              </label>

              <label className="field-label">
                <span>Select File (PDF, PPTX, DOCX, TXT)</span>
                <input
                  type="file"
                  required
                  className="input-dark"
                  onChange={handleFileSelect}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Upload size={14} />
                  <span>Upload File</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="modal-backdrop" onClick={() => setShowAddStudentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">ENROLL STUDENT</span>
                <h2>Add GPREC Student</h2>
                <p>Roll number must strictly adhere to YY9XADDNNN format.</p>
              </div>
              <button className="icon-btn" onClick={() => setShowAddStudentModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} style={{ display: 'grid', gap: '12px' }}>
              {addStudentError && (
                <div className="alert-banner critical">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '11.5px' }}>{addStudentError}</span>
                </div>
              )}

              <label className="field-label">
                <span>Student Full Name</span>
                <input
                  type="text"
                  required
                  className="input-dark"
                  placeholder="e.g. Aditi Sharma"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </label>

              <label className="field-label">
                <span>Full GPREC Roll Number (e.g. 259XA05309)</span>
                <input
                  type="text"
                  required
                  maxLength={10}
                  className="input-dark"
                  placeholder="YY9XADDNNN"
                  value={newStudentRoll}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setNewStudentRoll(val);
                    const parsed = parseGprecRollNumber(val);
                    if (parsed.isValid) {
                      setNewStudentBranch(parsed.branchCode);
                      setNewStudentBatch(`20${parsed.admissionYear}-29`);
                    }
                  }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label className="field-label">
                  <span>Branch</span>
                  <select
                    className="input-dark"
                    value={newStudentBranch}
                    onChange={(e) => setNewStudentBranch(e.target.value)}
                  >
                    <option value="05">05 — Computer Science (CSE)</option>
                    <option value="33">33 — AI & Machine Learning (CSM)</option>
                    <option value="04">04 — Electrical & Electronics (EEE)</option>
                  </select>
                </label>

                <label className="field-label">
                  <span>Batch / Admission Year</span>
                  <select
                    className="input-dark"
                    value={newStudentBatch}
                    onChange={(e) => setNewStudentBatch(e.target.value)}
                  >
                    <option value="2025-29">Batch 2025-29</option>
                    <option value="2024-28">Batch 2024-28</option>
                    <option value="2023-27">Batch 2023-27</option>
                    <option value="2022-26">Batch 2022-26</option>
                  </select>
                </label>
              </div>

              <label className="field-label">
                <span>College Email (Generated from Verified Roll Number)</span>
                <input
                  type="text"
                  readOnly
                  className="input-dark"
                  style={{ opacity: 0.85, cursor: 'not-allowed', background: '#0e1529' }}
                  value={
                    liveParsedRoll?.collegeEmail ||
                    (newStudentRoll.trim() ? `${newStudentRoll.trim().toLowerCase()}@gprec.ac.in` : 'Will generate: rollnumber@gprec.ac.in')
                  }
                />
              </label>

              <div
                style={{
                  background: '#151d36',
                  border: '1px solid #233157',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '11px',
                  color: '#c9d1e8',
                  display: 'grid',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38D9CE', fontWeight: 600 }}>
                  <ShieldCheck size={14} />
                  <span>Login Provisioning & First-Login Security</span>
                </div>
                <p style={{ margin: 0, fontSize: '10.5px', color: '#959cb3', lineHeight: 1.4 }}>
                  Student will be immediately login-ready with initial password <code>GPREC#123</code>. SPECTRA enforces a mandatory password change on first sign-in.
                </p>
                {user.branchCode && (
                  <div style={{ marginTop: '2px', fontSize: '10px', color: '#fbbf24' }}>
                    Note: Authorized for Branch {user.branchCode} only.
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setAddStudentError('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={addStudentSubmitting} className="btn btn-primary">
                  <Plus size={14} />
                  <span>{addStudentSubmitting ? 'Provisioning Account...' : 'Enroll & Provision Student'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
