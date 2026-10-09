import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Award,
  CalendarCheck,
  BookOpen,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  Settings,
  LogOut,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Mail,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Target,
  Clock,
  Send,
  KeyRound,
  Check,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { UserAccount, StudentProfile, StudentMark, StudyMaterial } from '../types/spectra';
import { db } from '../services/db';
import { auth } from '../services/auth';
import { emailService } from '../services/emailService';
import { calculateAttendance, ATTENDANCE_CONFIG } from '../utils/attendanceCalculator';
import { RecentStudyMaterials } from './RecentStudyMaterials';

interface StudentPortalProps {
  user: UserAccount;
  onLogout: () => void;
  onOpenBackendStatus: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  user,
  onLogout,
  onOpenBackendStatus,
}) => {
  const rollNumber = user.verifiedRollNumber || '259XA05308';
  const student = db.getStudentByRoll(rollNumber);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    'Overview' | 'Marks' | 'Attendance' | 'Materials' | 'Advisors' | 'Warnings' | 'Progress' | 'Settings'
  >('Overview');

  const [toast, setToast] = useState('');
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Queries for the logged-in student ONLY (Role isolation)
  const studentMarks = useMemo(() => db.getMarks({ studentRoll: rollNumber }), [rollNumber]);
  const attendanceRecords = useMemo(() => db.getStudentAttendance(rollNumber), [rollNumber]);
  const attendanceSummary = useMemo(() => calculateAttendance(attendanceRecords), [attendanceRecords]);
  const studentMaterials = useMemo(
    () => db.getStudyMaterials({ branchCode: student?.branchCode, batchYear: student?.batchYear }),
    [student?.branchCode, student?.batchYear]
  );
  const supportPlans = useMemo(() => db.getSupportPlans(rollNumber), [rollNumber]);
  const evaluatedWarning = useMemo(() => db.getStudentEvaluatedWarning(rollNumber), [rollNumber]);

  // Account Settings state
  const [personalEmailInput, setPersonalEmailInput] = useState(student?.personalEmail || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Handle actual file download
  const handleDownloadMaterial = (material: StudyMaterial) => {
    try {
      db.incrementDownloadCount(material.id);

      if (material.storageUrl && material.storageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = material.storageUrl;
        link.download = material.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        notify(`Downloading ${material.fileName}...`);
      } else {
        // Fallback create blob from mock text content
        const blob = new Blob(
          [`GPREC Study Material: ${material.title}\nSubject: ${material.subjectName}\nBranch: ${material.branchCode}\nVerified Academic Resource.`],
          { type: material.fileType || 'text/plain' }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = material.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notify(`Downloading ${material.fileName}...`);
      }
    } catch (err) {
      notify('Download failed. Please check network connection.');
    }
  };

  // Handle personal Gmail verification dispatch
  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalEmailInput.toLowerCase().endsWith('@gmail.com')) {
      notify('Personal email must be a valid @gmail.com address.');
      return;
    }
    const res = await emailService.sendPersonalEmailVerificationCode(rollNumber, personalEmailInput);
    if (res.success) {
      setGeneratedCode(res.verificationCode);
      setVerificationSent(true);
      notify(res.message);
    } else {
      notify(res.message);
    }
  };

  const handleConfirmVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode === generatedCode && verificationCode.length > 0) {
      db.updateStudent(rollNumber, {
        personalEmail: personalEmailInput,
        personalEmailVerified: true,
      });
      notify('Personal Gmail verified successfully!');
      setVerificationSent(false);
    } else {
      notify('Invalid 6-digit verification code. Please check and retry.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await auth.changePassword(user.id, currentPw, newPw, confirmPw);
    if (res.success) {
      notify('Password updated successfully!');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } else {
      notify(res.error || 'Password update failed.');
    }
  };

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
            <div className="brand-sub">STUDENT PORTAL</div>
          </div>
        </div>

        <div className="workspace">
          <div className="workspace-icon">
            <UserCheck size={18} />
          </div>
          <div>
            <strong>{student?.fullName || user.fullName}</strong>
            <small>{rollNumber} · {student?.branchName || 'GPREC'}</small>
          </div>
        </div>

        <div className="nav-label">MY ACADEMICS</div>
        <nav>
          <button
            className={`nav-item ${activeTab === 'Overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('Overview')}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
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
            {attendanceSummary.warningLevel !== 'NONE' && (
              <span className="nav-count">!</span>
            )}
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
            className={`nav-item ${activeTab === 'Warnings' ? 'active' : ''}`}
            onClick={() => setActiveTab('Warnings')}
          >
            <AlertTriangle size={18} />
            <span>Warnings</span>
            {evaluatedWarning.riskLevel !== 'Low concern' && (
              <span className="nav-count">1</span>
            )}
          </button>

          <button
            className={`nav-item ${activeTab === 'Progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('Progress')}
          >
            <TrendingUp size={18} />
            <span>Progress Tracking</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('Settings')}
          >
            <Settings size={18} />
            <span>Account Settings</span>
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
        {/* Topbar */}
        <header className="topbar">
          <div className="breadcrumb">
            Student Portal <span>/</span> <strong>{activeTab}</strong>
          </div>
          <div className="top-actions">
            <div className="badge-tag">
              <span className="live-dot" />
              <span>GPREC · {student?.branchName} Batch {student?.batchYear}</span>
            </div>
            <div className="avatar avatar-purple">
              {student?.fullName ? student.fullName.slice(0, 2).toUpperCase() : 'ST'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="content">
          {/* TAB: OVERVIEW */}
          {activeTab === 'Overview' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ACADEMIC DASHBOARD</div>
                  <h1>Welcome, {student?.fullName}</h1>
                  <p>
                    Verified Roll Number: <strong>{rollNumber}</strong> · Official College Mailbox:{' '}
                    <code>{student?.collegeEmail}</code>
                  </p>
                </div>
              </div>

              {/* Exact Attendance Threshold Banners */}
              {attendanceSummary.warningLevel === 'HIGH_PRIORITY_WARNING' && (
                <div className="alert-banner critical">
                  <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>High-Priority Attendance Warning</strong>
                    <p style={{ marginTop: 4 }}>{ATTENDANCE_CONFIG.highPriorityStudentMessage}</p>
                    <div style={{ marginTop: 6, fontSize: '11px' }}>
                      Current attendance: <strong>{attendanceSummary.displayPercentage}</strong> (Below 65% limit).
                    </div>
                  </div>
                </div>
              )}

              {attendanceSummary.warningLevel === 'ATTENDANCE_WARNING' && (
                <div className="alert-banner warning">
                  <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Attendance Notice</strong>
                    <p style={{ marginTop: 4 }}>{ATTENDANCE_CONFIG.regularStudentMessage}</p>
                    <div style={{ marginTop: 6, fontSize: '11px' }}>
                      Current attendance: <strong>{attendanceSummary.displayPercentage}</strong> (Below 75% target).
                    </div>
                  </div>
                </div>
              )}

              {/* KPIs */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-top">
                    <span>Attendance Rate</span>
                    <div className="kpi-icon blue">
                      <CalendarCheck size={18} />
                    </div>
                  </div>
                  <div className="kpi-value">{attendanceSummary.displayPercentage}</div>
                  <div className="kpi-change">
                    {attendanceSummary.rawPercentage !== null && attendanceSummary.rawPercentage >= 75 ? (
                      <span style={{ color: '#34d399' }}>Above 75% Target</span>
                    ) : (
                      <span style={{ color: '#ff8b8b' }}>Finalized Records Only</span>
                    )}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span>Average Marks</span>
                    <div className="kpi-icon violet">
                      <Award size={18} />
                    </div>
                  </div>
                  <div className="kpi-value">
                    {studentMarks.length > 0
                      ? `${(studentMarks.reduce((a, b) => a + b.percentage, 0) / studentMarks.length).toFixed(0)}%`
                      : 'N/A'}
                  </div>
                  <div className="kpi-change">
                    <span>Across {studentMarks.length} Assessments</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span>Active Warnings</span>
                    <div className="kpi-icon rose">
                      <AlertTriangle size={18} />
                    </div>
                  </div>
                  <div className="kpi-value">
                    {evaluatedWarning.riskLevel === 'Low concern' ? '0' : '1'}
                  </div>
                  <div className="kpi-change">
                    <span>Status: {evaluatedWarning.riskLevel}</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span>Study Materials</span>
                    <div className="kpi-icon mint">
                      <BookOpen size={18} />
                    </div>
                  </div>
                  <div className="kpi-value">{studentMaterials.length}</div>
                  <div className="kpi-change">
                    <span>Available for your batch</span>
                  </div>
                </div>
              </div>

              {/* Quick Sections Grid */}
              <div className="dashboard-two-col">
                {/* Advisor Card */}
                <div className="panel" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <div className="panel-head">
                    <div>
                      <h3>Assigned Faculty Advisor</h3>
                      <p>Institutional advisor for academic guidance and counseling</p>
                    </div>
                    <UserCheck size={20} color="#38D9CE" />
                  </div>
                  {student?.advisorName ? (
                    <div style={{ padding: '8px 0' }}>
                      <strong style={{ fontSize: '15px', color: '#fff' }}>{student.advisorName}</strong>
                      <div style={{ fontSize: '11px', color: '#959cb3', marginTop: '4px' }}>
                        <div>Email: <code>{student.advisorEmail}</code></div>
                        <div>Cabin: {student.advisorCabin}</div>
                        <div>Office Hours: {student.advisorOfficeHours}</div>
                      </div>
                      <div style={{ marginTop: '14px' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setActiveTab('Advisors')}
                        >
                          View Advisor Feedback & Support Plans
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#959cb3', fontSize: '11px' }}>
                      No faculty advisor currently assigned to this batch.
                    </div>
                  )}
                </div>

                {/* Quick Materials */}
                <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <RecentStudyMaterials
                    materials={studentMaterials}
                    limit={3}
                    onViewAll={() => setActiveTab('Materials')}
                    onDownload={handleDownloadMaterial}
                    isFaculty={false}
                    title="Recent Study Materials"
                    subtitle="Latest institutional courseware and notes"
                  />
                </div>
              </div>
            </>
          )}

          {/* TAB: MARKS & RESULTS */}
          {activeTab === 'Marks' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ASSESSMENT PERFORMANCE</div>
                  <h1>Marks & Results</h1>
                  <p>Private academic record of your test scores, subject percentages, and weak areas.</p>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Subject Name</th>
                        <th>Test / Assessment</th>
                        <th>Marks Obtained</th>
                        <th>Max Marks</th>
                        <th>Score (%)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentMarks.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <strong>{m.subjectName}</strong>
                          </td>
                          <td>{m.testName}</td>
                          <td>
                            <strong>{m.marksObtained}</strong>
                          </td>
                          <td>{m.maxMarks}</td>
                          <td>
                            <strong style={{ color: m.percentage < 50 ? '#ff8b8b' : m.percentage >= 75 ? '#34d399' : '#fbbf24' }}>
                              {m.percentage}%
                            </strong>
                          </td>
                          <td>
                            <span className={`status-pill ${m.percentage < 50 ? 'open' : m.percentage >= 75 ? 'resolved' : 'in-progress'}`}>
                              {m.percentage < 50 ? 'Needs Attention' : m.percentage >= 75 ? 'Strong' : 'Satisfactory'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {studentMarks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#959cb3' }}>
                      No assessment marks have been recorded for your account yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB: ATTENDANCE */}
          {activeTab === 'Attendance' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ATTENDANCE SYSTEM</div>
                  <h1>Attendance Details</h1>
                  <p>Comprehensive record of your Present, Absent, and Pending class sessions.</p>
                </div>
              </div>

              {/* Exact Warning Banner */}
              {attendanceSummary.warningLevel === 'HIGH_PRIORITY_WARNING' && (
                <div className="alert-banner critical">
                  <AlertCircle size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>High-priority warning: Your attendance is below 65%. Please contact your faculty advisor as soon as possible.</strong>
                    <p style={{ marginTop: 4, fontSize: '11px' }}>
                      Official finalized attendance rate: {attendanceSummary.displayPercentage} ({attendanceSummary.presentCount} attended out of {attendanceSummary.finalizedCount} finalized classes).
                    </p>
                  </div>
                </div>
              )}

              {attendanceSummary.warningLevel === 'ATTENDANCE_WARNING' && (
                <div className="alert-banner warning">
                  <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Your attendance is below 75%. Please improve your attendance and contact your faculty advisor if you need support.</strong>
                    <p style={{ marginTop: 4, fontSize: '11px' }}>
                      Official finalized attendance rate: {attendanceSummary.displayPercentage} ({attendanceSummary.presentCount} attended out of {attendanceSummary.finalizedCount} finalized classes).
                    </p>
                  </div>
                </div>
              )}

              <div className="kpi-grid" style={{ marginBottom: '18px' }}>
                <div className="kpi-card">
                  <div className="kpi-top"><span>Finalized Attendance %</span></div>
                  <div className="kpi-value">{attendanceSummary.displayPercentage}</div>
                  <div className="kpi-change">
                    <span>Formula: Present ÷ (Present + Absent)</span>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-top"><span>Present Sessions</span></div>
                  <div className="kpi-value" style={{ color: '#34d399' }}>{attendanceSummary.presentCount}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-top"><span>Absent Sessions</span></div>
                  <div className="kpi-value" style={{ color: '#ff8b8b' }}>{attendanceSummary.absentCount}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-top"><span>Pending Sessions</span></div>
                  <div className="kpi-value" style={{ color: '#fbbf24' }}>{attendanceSummary.pendingCount}</div>
                  <div className="kpi-change">
                    <span>Does NOT lower percentage</span>
                  </div>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Period</th>
                        <th>Attendance Status</th>
                        <th>Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((r) => {
                        const sess = db.getAttendanceSessions().find((s) => s.id === r.sessionId);
                        return (
                          <tr key={r.id}>
                            <td>{sess?.date || '2026-09-01'}</td>
                            <td><strong>{sess?.subjectName || 'Coursework'}</strong></td>
                            <td>Period {sess?.period || 1}</td>
                            <td>
                              <span
                                className={`status-pill ${
                                  r.status === 'Present'
                                    ? 'resolved'
                                    : r.status === 'Absent'
                                    ? 'open'
                                    : 'in-progress'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td>
                              <small style={{ color: '#959cb3' }}>
                                Recorded by {sess?.facultyName || 'Faculty'}
                              </small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {attendanceRecords.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#959cb3' }}>
                      No attendance records have been initialized for your roll number.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB: STUDY MATERIALS (WORKING DOWNLOADS) */}
          {activeTab === 'Materials' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ACADEMIC RESOURCES</div>
                  <h1>Study Materials</h1>
                  <p>Lecture notes, problem sheets, and presentations authorized for {student?.branchName} Batch {student?.batchYear}.</p>
                </div>
              </div>

              <RecentStudyMaterials
                materials={studentMaterials}
                showSearch={true}
                onDownload={handleDownloadMaterial}
                isFaculty={false}
                title="All Course Materials"
                subtitle={`Authorized downloads for ${student?.branchName || 'your branch'} Batch ${student?.batchYear || ''}`}
              />
            </>
          )}

          {/* TAB: ADVISORS */}
          {activeTab === 'Advisors' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">FACULTY COUNSELING</div>
                  <h1>Faculty Advisors & Support Plans</h1>
                  <p>Your institutional faculty advisor and active personal academic support plans.</p>
                </div>
              </div>

              <div className="dashboard-two-col">
                <div className="panel" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <div className="panel-head">
                    <div>
                      <h3>Institutional Advisor</h3>
                      <p>Designated contact for attendance and study support</p>
                    </div>
                  </div>
                  {student?.advisorName ? (
                    <div style={{ padding: '10px 0' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                        {student.advisorName}
                      </h2>
                      <div style={{ marginTop: '10px', display: 'grid', gap: '8px', fontSize: '12px', color: '#cbd2e8' }}>
                        <div><strong>Official Email:</strong> <code>{student.advisorEmail}</code></div>
                        <div><strong>Cabin Location:</strong> {student.advisorCabin}</div>
                        <div><strong>Office Hours:</strong> {student.advisorOfficeHours}</div>
                      </div>
                      <div className="alert-banner info" style={{ marginTop: '18px' }}>
                        <HelpCircle size={16} style={{ flexShrink: 0 }} />
                        <div>
                          If your attendance is below 75% or you have questions on recent test results, schedule an appointment during office hours.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#959cb3', fontSize: '12px' }}>No advisor assigned yet.</p>
                  )}
                </div>

                <div className="panel" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <div className="panel-head">
                    <div>
                      <h3>Support Plans</h3>
                      <p>Active support assigned by faculty</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {supportPlans.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          background: '#151d36',
                          border: '1px solid #243154',
                          borderRadius: '10px',
                          padding: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '12.5px', color: '#fff' }}>{p.subjectOrConcern}</strong>
                          <span className={`status-pill ${p.status === 'Resolved' ? 'resolved' : 'in-progress'}`}>
                            {p.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#959cb3', margin: '6px 0' }}>{p.suggestedAction}</p>
                        <div style={{ fontSize: '10px', color: '#8891ae' }}>
                          Target Date: {p.targetDate} · Assigned by {p.assignedFacultyName}
                        </div>
                      </div>
                    ))}
                    {supportPlans.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#959cb3', fontSize: '11px' }}>
                        No open support plans. You are currently on track!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB: WARNINGS */}
          {activeTab === 'Warnings' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">EARLY WARNING SIGNALS</div>
                  <h1>Academic Warnings & Evidence</h1>
                  <p>Transparent explanation of any attendance or performance flags.</p>
                </div>
              </div>

              <div className="panel" style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="eyebrow" style={{ color: '#38D9CE' }}>OVERALL STANDING</span>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0', color: '#fff' }}>
                      Status: {evaluatedWarning.riskLevel}
                    </h2>
                    <p style={{ fontSize: '11px', color: '#959cb3', margin: 0 }}>
                      Based on transparent academic score and attendance rules.
                    </p>
                  </div>
                  <span
                    className={`risk-badge ${
                      evaluatedWarning.riskLevel === 'High concern'
                        ? 'critical'
                        : evaluatedWarning.riskLevel === 'Medium concern'
                        ? 'elevated'
                        : 'safe'
                    }`}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    <i />
                    <span>{evaluatedWarning.riskLevel}</span>
                  </span>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Transparent Evidence Log</h3>
                    <p>Specific metrics that triggered this standing</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {evaluatedWarning.evidenceReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        background: '#151d36',
                        border: '1px solid #243154',
                        borderRadius: '8px',
                      }}
                    >
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          background: 'rgba(121, 101, 245, 0.2)',
                          color: '#b7a9ff',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#c9d0e7', lineHeight: 1.5 }}>
                        {reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB: PROGRESS TRACKING */}
          {activeTab === 'Progress' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">PERFORMANCE OVER TIME</div>
                  <h1>Progress Tracking</h1>
                  <p>Study progress trends across tests and attendance continuity.</p>
                </div>
              </div>

              <div className="panel" style={{ marginBottom: '18px' }}>
                <div className="panel-head">
                  <div>
                    <h3>Assessment Lift & Score History</h3>
                    <p>Your performance across recent evaluations</p>
                  </div>
                </div>
                <div className="line-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={studentMarks.map((m) => ({
                        test: m.testName + ' (' + m.subjectName.slice(0, 7) + ')',
                        score: m.percentage,
                      }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7965F5" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#7965F5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#222d4f" strokeDasharray="3 5" vertical={false} />
                      <XAxis dataKey="test" stroke="#6e7690" fontSize={11} />
                      <YAxis domain={[0, 100]} stroke="#6e7690" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: '#11182e',
                          border: '1px solid #233056',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#7965F5"
                        strokeWidth={2.5}
                        fill="url(#scoreColor)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* TAB: ACCOUNT SETTINGS */}
          {activeTab === 'Settings' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">USER PROFILE & PREFERENCES</div>
                  <h1>Account Settings</h1>
                  <p>Manage your verified personal Gmail, change password, and notification preferences.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                {/* Personal Gmail Registration */}
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Personal Gmail Verification</h3>
                      <p>Register personal Gmail for eligible academic alert duplicates</p>
                    </div>
                    <Mail size={18} color="#38D9CE" />
                  </div>

                  <div style={{ marginBottom: '14px', fontSize: '11px', color: '#959cb3' }}>
                    Current Status:{' '}
                    {student?.personalEmailVerified ? (
                      <span className="status-pill resolved" style={{ marginLeft: 6 }}>
                        Verified: {student.personalEmail}
                      </span>
                    ) : (
                      <span className="status-pill open" style={{ marginLeft: 6 }}>
                        Not Verified
                      </span>
                    )}
                  </div>

                  {!verificationSent ? (
                    <form onSubmit={handleSendVerification} style={{ display: 'grid', gap: '12px' }}>
                      <label className="field-label">
                        <span>Personal Gmail Address (@gmail.com)</span>
                        <input
                          type="email"
                          required
                          className="input-dark"
                          value={personalEmailInput}
                          onChange={(e) => setPersonalEmailInput(e.target.value)}
                          placeholder="e.g. aarav.sharma.personal@gmail.com"
                        />
                      </label>
                      <button type="submit" className="btn btn-outline" style={{ justifySelf: 'start' }}>
                        <Send size={14} />
                        <span>Send 6-Digit Verification Code</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleConfirmVerification} style={{ display: 'grid', gap: '12px' }}>
                      <div className="alert-banner info">
                        <span>Code sent to {personalEmailInput}. (Demo code: <strong>{generatedCode}</strong>)</span>
                      </div>
                      <label className="field-label">
                        <span>Enter 6-Digit Code</span>
                        <input
                          type="text"
                          required
                          className="input-dark"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="123456"
                        />
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary">
                          <CheckCircle2 size={14} />
                          <span>Verify & Save Email</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-quiet"
                          onClick={() => setVerificationSent(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Change Password */}
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Change SPECTRA Password</h3>
                      <p>Update your SPECTRA login password</p>
                    </div>
                    <KeyRound size={18} color="#7965F5" />
                  </div>

                  <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '12px' }}>
                    <label className="field-label">
                      <span>Current Password</span>
                      <input
                        type="password"
                        required
                        className="input-dark"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                      />
                    </label>

                    <label className="field-label">
                      <span>New Password (min 8 chars)</span>
                      <input
                        type="password"
                        required
                        className="input-dark"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                      />
                    </label>

                    <label className="field-label">
                      <span>Confirm New Password</span>
                      <input
                        type="password"
                        required
                        className="input-dark"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                      />
                    </label>

                    <button type="submit" className="btn btn-primary" style={{ justifySelf: 'start', marginTop: '4px' }}>
                      <KeyRound size={14} />
                      <span>Update Password</span>
                    </button>
                  </form>
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
            <span>Strict Dark Mode · Roll Number: {rollNumber}</span>
          </span>
        </footer>
      </main>

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
