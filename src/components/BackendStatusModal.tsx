import React, { useState } from 'react';
import {
  Database,
  Cloud,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { getBackendStatus } from '../services/supabaseClient';

interface BackendStatusModalProps {
  onClose: () => void;
}

export const BackendStatusModal: React.FC<BackendStatusModalProps> = ({ onClose }) => {
  const status = getBackendStatus();
  const [activeTab, setActiveTab] = useState<'status' | 'sql'>('status');
  const [copied, setCopied] = useState(false);

  const sampleSqlMigration = `-- SPECTRA Production Database Schema
-- Run this in Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  code VARCHAR(2) PRIMARY KEY,
  short_name VARCHAR(10) NOT NULL,
  full_name TEXT NOT NULL
);
INSERT INTO branches (code, short_name, full_name) VALUES
  ('05', 'CSE', 'Computer Science and Engineering'),
  ('33', 'CSM', 'Computer Science and Machine Learning (AI & ML)'),
  ('04', 'EEE', 'Electrical and Electronics Engineering')
ON CONFLICT (code) DO NOTHING;

-- Students Table with GPREC Roll Number constraints
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roll_number VARCHAR(10) UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  college_email TEXT UNIQUE NOT NULL,
  personal_email TEXT,
  branch_code VARCHAR(2) NOT NULL REFERENCES branches(code),
  batch_year VARCHAR(10) NOT NULL
);

-- Three-State Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  student_roll VARCHAR(10) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Present', 'Absent')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sampleSqlMigration);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 'min(640px, 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">SYSTEM ARCHITECTURE</span>
            <h2>Backend & Storage Status</h2>
            <p>Inspection of persistent services, Supabase database, and cloud storage.</p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="tab-strip" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            Connection Status
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'sql' ? 'active' : ''}`}
            onClick={() => setActiveTab('sql')}
          >
            Supabase SQL Schema
          </button>
        </div>

        {activeTab === 'status' ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {/* Database Service */}
            <div
              style={{
                background: '#151d36',
                border: '1px solid #243154',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: status.isSupabaseConfigured
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(56, 217, 206, 0.15)',
                  display: 'grid',
                  placeItems: 'center',
                  color: status.isSupabaseConfigured ? '#34d399' : '#38d9ce',
                }}
              >
                <Database size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#fff' }}>Database Storage</strong>
                  <span
                    className={`status-pill ${status.isSupabaseConfigured ? 'resolved' : 'in-progress'}`}
                  >
                    {status.activeStorageMode}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#959cb3', margin: '4px 0 0' }}>
                  {status.isSupabaseConfigured
                    ? `Connected to Supabase PostgreSQL at ${status.supabaseUrl}`
                    : 'Using client-side persistent storage engine with relational constraints & full audit trail.'}
                </p>
              </div>
            </div>

            {/* Storage Bucket */}
            <div
              style={{
                background: '#151d36',
                border: '1px solid #243154',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(121, 101, 245, 0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#9d8fff',
                }}
              >
                <Cloud size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#fff' }}>File Storage (Study Materials)</strong>
                  <span className="status-pill resolved">Operational</span>
                </div>
                <p style={{ fontSize: '11px', color: '#959cb3', margin: '4px 0 0' }}>
                  {status.hasStorageBucket
                    ? 'Connected to Supabase Storage Bucket study-materials'
                    : 'Encapsulated data URIs with MIME preservation for PDF, PPTX, DOCX, and TXT.'}
                </p>
              </div>
            </div>

            {/* Email Provider */}
            <div
              style={{
                background: '#151d36',
                border: '1px solid #243154',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: status.isEmailServiceConfigured
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(245, 158, 11, 0.15)',
                  display: 'grid',
                  placeItems: 'center',
                  color: status.isEmailServiceConfigured ? '#34d399' : '#f59e0b',
                }}
              >
                <Mail size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#fff' }}>Email Alert Delivery</strong>
                  <span
                    className={`status-pill ${status.isEmailServiceConfigured ? 'resolved' : 'open'}`}
                  >
                    {status.isEmailServiceConfigured ? 'Live Provider Connected' : 'Unconfigured'}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#959cb3', margin: '4px 0 0' }}>
                  {status.isEmailServiceConfigured
                    ? 'Dispatches to official college email & verified personal Gmail.'
                    : 'External provider secrets (VITE_RESEND_API_KEY) not set. Alerts logged to Activity History.'}
                </p>
              </div>
            </div>

            <div className="alert-banner info" style={{ marginTop: '6px' }}>
              <ShieldCheck size={16} style={{ flexShrink: 0 }} />
              <div>
                <strong>Production Readiness Notice:</strong> To connect your live Supabase database, set{' '}
                <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your environment or <code>.env</code> file.
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#959cb3' }}>
                Found in: <code>supabase/migrations/20261009000000_spectra_schema.sql</code>
              </span>
              <button className="btn btn-outline" onClick={handleCopySql} style={{ padding: '6px 10px', fontSize: '11px' }}>
                {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copied ? 'Copied SQL' : 'Copy SQL Script'}</span>
              </button>
            </div>
            <pre
              style={{
                background: '#090e1c',
                border: '1px solid #233054',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '11px',
                color: '#a7b2d6',
                maxHeight: '260px',
                overflowY: 'auto',
                lineHeight: 1.5,
              }}
            >
              {sampleSqlMigration}
            </pre>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
