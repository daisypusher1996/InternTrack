import React, { useState, useEffect } from 'react';
import {
  Database,
  Copy,
  Check,
  Download,
  Table,
  Key,
  Shield,
  Layers,
  Brain,
} from './icons';

export const SchemaExplorer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [schemaDdl, setSchemaDdl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'tables' | 'sql'>('tables');

  useEffect(() => {
    fetch('/api/schema')
      .then((res) => res.json())
      .then((data) => {
        if (data.ddl) setSchemaDdl(data.ddl);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleCopy = () => {
    if (!schemaDdl) return;
    navigator.clipboard.writeText(schemaDdl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([schemaDdl], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interntrack_bicol_university_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const tablesInfo = [
    {
      name: 'users',
      purpose: 'Students, Faculty Coordinators, Department Chairs, and Company Mentors',
      keys: 'id (PK UUID), bu_id_number (UNIQUE)',
      aiRole: 'Links alerts and supervisory dashboards to specific individuals',
    },
    {
      name: 'partner_companies',
      purpose: 'Host Training Establishments (HTEs) with MOA agreements and capacity',
      keys: 'id (PK UUID), moa_status, workstation_ip_subnet',
      aiRole: 'Enforces location & IP subnet anomaly verification rules',
    },
    {
      name: 'internship_groups',
      purpose: 'Self-formed student cohorts mapped to specific partner companies',
      keys: 'id (PK UUID), group_code (UNIQUE), partner_company_id (FK)',
      aiRole: 'Powers group-level NLP accomplishment summarization',
    },
    {
      name: 'group_members',
      purpose: 'Associates student interns with self-formed cohort groups',
      keys: 'id (PK UUID), group_id (FK), student_id (FK)',
      aiRole: 'Tracks cohort attendance ratios and peer distribution',
    },
    {
      name: 'student_enrollments',
      purpose: 'Stores expected duty schedules (start, end, days, grace period) and target hours',
      keys: 'id (PK UUID), student_id (FK), duty_schedule_start, duty_schedule_end',
      aiRole: 'Source of truth for Python anomaly detector window comparisons',
    },
    {
      name: 'attendance_logs',
      purpose: 'Verifiable Daily Time Records with workstation IP and biometric/timestamp audit',
      keys: 'id (PK UUID), log_date, expected_time_in, actual_time_in, actual_time_out',
      aiRole: 'Feeds arrival timestamps into statistical Z-Score ML model',
    },
    {
      name: 'accomplishment_reports',
      purpose: 'Daily task logs, category classification, hours, status, and obstacles',
      keys: 'id (PK UUID), student_id (FK), group_id (FK), work_category, task_status',
      aiRole: 'Input text corpus ingested by Gemini LLM API for summarization',
    },
    {
      name: 'ai_weekly_summaries',
      purpose: 'Synthesized cohort highlights, completed tasks count, and work area analysis',
      keys: 'id (PK UUID), group_id (FK), week_number, dominant_work_areas',
      aiRole: 'Stores NLP generated summaries matching research paper benchmarks',
    },
    {
      name: 'ai_attendance_alerts',
      purpose: 'Rule violations, missed duty windows, anomaly scores, and notification logs',
      keys: 'id (PK UUID), anomaly_score, is_email_dispatched, is_push_dispatched',
      aiRole: 'Dispatches multi-channel notices to student and professor',
    },
    {
      name: 'iso_evaluations',
      purpose: 'ISO/IEC 25010 Software Product Quality Model evaluation metrics',
      keys: 'id (PK UUID), functional_suitability, reliability, usability',
      aiRole: 'Measures thesis performance efficiency and operational impact',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0E6] text-[#D94B0A] font-bold text-xs border border-[#FED7AA]">
                Relational Architecture
              </span>
              <span className="text-xs text-slate-500 font-medium">PostgreSQL 16+ Engine</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B2545]">
              PostgreSQL Schema & AI Entity Architecture
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Engineered specifically for Bicol University's individual and group-based practicum model. Accounts for independent company assignments, biometric/IP attendance logs, and LLM summarization training sets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-200"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied SQL' : 'Copy DDL'}
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-2 bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4" />
              Download .sql
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 mt-6 space-x-4 text-xs font-bold">
          <button
            onClick={() => setActiveSchemaTab('tables')}
            className={`pb-2 transition border-b-2 ${
              activeSchemaTab === 'tables'
                ? 'border-[#F26522] text-[#F26522]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Table Catalog & AI Entity Roles (10 Tables)
          </button>
          <button
            onClick={() => setActiveSchemaTab('sql')}
            className={`pb-2 transition border-b-2 ${
              activeSchemaTab === 'sql'
                ? 'border-[#F26522] text-[#F26522]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Raw PostgreSQL DDL Script (`schema.sql`)
          </button>
        </div>
      </div>

      {activeSchemaTab === 'tables' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tablesInfo.map((tbl, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-[#FED7AA] transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#FFF0E6] text-[#D94B0A] rounded-lg">
                    <Table className="w-4 h-4" />
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{tbl.name}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  PostgreSQL Table
                </span>
              </div>

              <p className="text-xs text-slate-600">{tbl.purpose}</p>

              <div className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-slate-700">
                <strong>Keys & Constrains:</strong> {tbl.keys}
              </div>

              <div className="flex items-start gap-1.5 text-xs text-[#0B2545] bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                <Brain className="w-3.5 h-3.5 text-[#F26522] shrink-0 mt-0.5" />
                <span>
                  <strong>AI Pipeline Integration:</strong> {tbl.aiRole}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSchemaTab === 'sql' && (
        <div className="bg-[#06182C] text-slate-200 rounded-2xl p-6 shadow-md border border-slate-800 font-mono text-xs overflow-x-auto max-h-[650px] leading-relaxed">
          <pre>{schemaDdl || 'Loading PostgreSQL DDL schema...'}</pre>
        </div>
      )}
    </div>
  );
};
