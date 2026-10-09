import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileCode,
  Image,
  Download,
  Calendar,
  User,
  HardDrive,
  ArrowRight,
  Search,
  Plus,
  BookOpen,
  Filter,
  Layers,
  Trash2,
} from 'lucide-react';
import type { StudyMaterial } from '../types/spectra';

export interface RecentStudyMaterialsProps {
  materials: StudyMaterial[];
  onDownload: (material: StudyMaterial) => void;
  onViewAll?: () => void;
  onAddMaterial?: () => void;
  onDelete?: (material: StudyMaterial) => void;
  isLoading?: boolean;
  isFaculty?: boolean;
  limit?: number;
  showSearch?: boolean;
  title?: string;
  subtitle?: string;
}

export function getFileTypeBadge(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return {
      label: 'PDF',
      fullLabel: 'PDF Document',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.25)',
      Icon: FileText,
    };
  }
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
    return {
      label: 'PPTX',
      fullLabel: 'Presentation Slides',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.25)',
      Icon: Layers,
    };
  }
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
    return {
      label: 'DOCX',
      fullLabel: 'Word Document',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.25)',
      Icon: FileText,
    };
  }
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return {
      label: 'IMG',
      fullLabel: 'Image Graphic',
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.12)',
      border: 'rgba(168, 85, 247, 0.25)',
      Icon: Image,
    };
  }
  return {
    label: 'TXT',
    fullLabel: 'Code / Text File',
    color: '#38d9ce',
    bg: 'rgba(56, 217, 206, 0.12)',
    border: 'rgba(56, 217, 206, 0.25)',
    Icon: FileCode,
  };
}

export const RecentStudyMaterials: React.FC<RecentStudyMaterialsProps> = ({
  materials,
  onDownload,
  onViewAll,
  onAddMaterial,
  onDelete,
  isLoading = false,
  isFaculty = false,
  limit,
  showSearch = false,
  title = 'Recent Study Materials',
  subtitle = 'Latest institutional courseware and notes',
}) => {
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('ALL');

  // Sort by actual upload time, newest first
  const sorted = useMemo(() => {
    return [...materials].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [materials]);

  // Filter based on search & format
  const filtered = useMemo(() => {
    return sorted.filter((m) => {
      const matchQuery =
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.subjectName.toLowerCase().includes(query.toLowerCase()) ||
        m.fileName.toLowerCase().includes(query.toLowerCase());

      const matchFormat =
        formatFilter === 'ALL' ||
        (formatFilter === 'PDF' && m.fileName.toLowerCase().endsWith('.pdf')) ||
        (formatFilter === 'PPT' && (m.fileName.toLowerCase().endsWith('.ppt') || m.fileName.toLowerCase().endsWith('.pptx'))) ||
        (formatFilter === 'DOC' && (m.fileName.toLowerCase().endsWith('.doc') || m.fileName.toLowerCase().endsWith('.docx')));

      return matchQuery && matchFormat;
    });
  }, [sorted, query, formatFilter]);

  const displayedItems = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div className="materials-panel">
      {/* Section Header */}
      <div className="materials-header">
        <div className="materials-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="eyebrow" style={{ color: '#38D9CE', fontSize: '9.5px', letterSpacing: '1.4px' }}>
              COURSEWARE
            </span>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: '6px',
                background: '#182342',
                border: '1px solid #283760',
                color: '#CBD2E8',
              }}
            >
              {materials.length} uploaded
            </span>
          </div>
          <h3 className="materials-header-title">{title}</h3>
          <p className="materials-header-subtitle">{subtitle}</p>
        </div>

        <div className="materials-header-actions">
          {isFaculty && onAddMaterial && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '6px 11px', fontSize: '11px', height: '32px' }}
              onClick={onAddMaterial}
            >
              <Plus size={13} />
              <span>Add Resource</span>
            </button>
          )}

          {onViewAll && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '11px', height: '32px' }}
              onClick={onViewAll}
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Optional Search & Filter Bar */}
      {showSearch && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          <div className="search-box" style={{ maxWidth: '360px', flex: 1, minWidth: '180px' }}>
            <Search size={14} />
            <input
              placeholder="Search resource title or subject..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ fontSize: '11.5px' }}
            />
          </div>

          <div className="filter-wrap" style={{ flexShrink: 0 }}>
            <Filter size={13} />
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              style={{ fontSize: '11px' }}
            >
              <option value="ALL">All File Types</option>
              <option value="PDF">PDF Documents</option>
              <option value="PPT">Presentations (PPT/PPTX)</option>
              <option value="DOC">Word Docs (DOCX)</option>
            </select>
          </div>
        </div>
      )}

      {/* Resource Cards List */}
      {isLoading ? (
        <div className="materials-list">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                height: '72px',
                background: '#121a30',
                borderRadius: '10px',
                border: '1px solid #1f2c4e',
                display: 'flex',
                alignItems: 'center',
                padding: '12px 14px',
                gap: '12px',
                boxSizing: 'border-box',
                width: '100%',
                opacity: 0.65,
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '9px', background: '#1c2646', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'grid', gap: '6px', minWidth: 0 }}>
                <div style={{ width: '30%', height: '11px', background: '#1c2646', borderRadius: '4px' }} />
                <div style={{ width: '60%', height: '13px', background: '#182342', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : displayedItems.length > 0 ? (
        <div className="materials-list">
          {displayedItems.map((m) => {
            const badge = getFileTypeBadge(m.fileName);
            const BadgeIcon = badge.Icon;
            const fileSizeKb = Math.max(1, Math.round(m.fileSizeBytes / 1024));

            return (
              <div key={m.id} className="material-card">
                {/* Column 1: Document Icon Container */}
                <div
                  className="material-card-icon"
                  style={{
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    color: badge.color,
                  }}
                  title={badge.fullLabel}
                >
                  <BadgeIcon size={19} />
                </div>

                {/* Column 2: Flexible Content Area */}
                <div className="material-card-content">
                  {/* Top Row: Badges & Action Buttons */}
                  <div className="material-card-top">
                    <div className="material-card-badges">
                      <span
                        className="material-badge-type"
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span className="material-badge-subject">{m.subjectName}</span>
                      {m.branchCode && (
                        <span className="material-badge-branch">
                          Branch {m.branchCode}{m.batchYear ? ` · ${m.batchYear}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="material-card-actions">
                      <button
                        type="button"
                        className="material-btn-download"
                        onClick={() => onDownload(m)}
                        title={`Download ${m.fileName}`}
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </button>

                      {isFaculty && onDelete && (
                        <button
                          type="button"
                          className="material-btn-delete"
                          onClick={() => onDelete(m)}
                          title={`Delete ${m.fileName}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="material-card-title" title={m.title}>
                    {m.title}
                  </h4>

                  {/* Secondary Metadata Row */}
                  <div className="material-card-meta">
                    <span>
                      <Calendar size={11} style={{ opacity: 0.8 }} />
                      {new Date(m.uploadedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="material-meta-dot">•</span>
                    <span>
                      <HardDrive size={11} style={{ opacity: 0.8 }} />
                      {fileSizeKb} KB
                    </span>
                    <span className="material-meta-dot">•</span>
                    <span>
                      <User size={11} style={{ opacity: 0.8 }} />
                      {m.uploadedByFacultyName}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            textAlign: 'center',
            padding: '36px 18px',
            background: '#121a30',
            border: '1px dashed #24355a',
            borderRadius: '10px',
            boxSizing: 'border-box',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <BookOpen size={28} color="#7965F5" style={{ marginBottom: '8px', opacity: 0.85 }} />
          <strong style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '4px' }}>
            No study materials have been shared yet
          </strong>
          <p style={{ fontSize: '11px', color: '#959cb3', margin: 0, lineHeight: 1.4 }}>
            {isFaculty
              ? 'Upload your first lecture notes, slides, or problem sets for this cohort.'
              : 'Course materials uploaded by faculty advisors will appear here automatically.'}
          </p>
          {isFaculty && onAddMaterial && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '14px', fontSize: '11px', padding: '6px 12px' }}
              onClick={onAddMaterial}
            >
              <Plus size={13} />
              <span>Add Study Material</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
