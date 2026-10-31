import React, { useState, useEffect } from 'react';
import {
  Brain,
  AlertTriangle,
  Mail,
  Bell,
  CheckCircle2,
  Play,
  Clock,
  Users,
  UserCheck,
  ShieldAlert,
  Terminal,
  Activity,
  UserX,
  Laptop,
} from 'lucide-react';
import { Group, Student, AttendanceAlert, AISummary } from '../types';

interface AIAnalyticsViewProps {
  groups: Group[];
  students: Student[];
  alerts: AttendanceAlert[];
  summaries: AISummary[];
  onRunAnomalyDetection: (studentId?: string) => Promise<any>;
  onTriggerGroupSummary: (groupId: string, studentId?: string) => Promise<any>;
  onResolveAlert: (id: string, action: 'acknowledge' | 'excuse' | 'sanction') => void;
  isRunningDetection: boolean;
  isSummarizing: boolean;
}

export const AIAnalyticsView: React.FC<AIAnalyticsViewProps> = ({
  groups,
  students,
  alerts,
  summaries,
  onRunAnomalyDetection,
  onTriggerGroupSummary,
  onResolveAlert,
  isRunningDetection,
  isSummarizing,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'nlp'>('attendance');

  // Filter only officially enrolled and deployed students
  const enrolledStudents = students.filter(
    (s) => s.enrollmentStatus === 'approved' && s.deploymentApproved && !s.isArchived
  );

  // Anomaly evaluation selector state
  const [selectedStudentForEval, setSelectedStudentForEval] = useState<string>('all');
  const [anomalyEvaluationResult, setAnomalyEvaluationResult] = useState<{
    evaluatedAt: string;
    metrics: {
      total: number;
      doingFine: number;
      lackingHours: number;
      absent: number;
    };
    evaluatedStudents: Array<{
      studentId: string;
      fullName: string;
      buId: string;
      companyName: string;
      status: 'doing_fine' | 'lacking_hours' | 'absent' | 'wfh';
      statusLabel: string;
      actualTimeIn: string | null;
      actualTimeOut: string | null;
      expectedSchedule: string;
      hoursRendered: number;
      detailMessage: string;
    }>;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('interntrack_anomaly_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Synthesis target: either "group:<id>" or "student:<id>"
  const [selectedSynthesisTarget, setSelectedSynthesisTarget] = useState<string>(() => {
    if (groups.length > 0) return `group:${groups[0].id}`;
    if (enrolledStudents.length > 0) return `student:${enrolledStudents[0].id}`;
    return '';
  });

  // Persistent Synthesis Result (ensures results never disappear)
  const [displayedSummary, setDisplayedSummary] = useState<AISummary | null>(() => {
    try {
      const saved = localStorage.getItem('interntrack_active_summary');
      if (saved) return JSON.parse(saved);
    } catch {}
    return summaries[0] || null;
  });

  useEffect(() => {
    if (summaries.length > 0 && !displayedSummary) {
      setDisplayedSummary(summaries[0]);
    }
  }, [summaries, displayedSummary]);

  const handleExecuteAnomaly = async () => {
    const res = await onRunAnomalyDetection(selectedStudentForEval);
    if (res && res.metrics && res.evaluatedStudents) {
      const resultObj = {
        evaluatedAt: res.evaluatedAt || new Date().toISOString(),
        metrics: res.metrics,
        evaluatedStudents: res.evaluatedStudents,
      };
      setAnomalyEvaluationResult(resultObj);
      try {
        localStorage.setItem('interntrack_anomaly_result', JSON.stringify(resultObj));
      } catch {}
    }
  };

  const handleGenerateHighlight = async () => {
    if (!selectedSynthesisTarget) return;
    const [type, id] = selectedSynthesisTarget.split(':');
    let summaryResult: AISummary | null = null;
    if (type === 'student') {
      summaryResult = await onTriggerGroupSummary('', id);
    } else {
      summaryResult = await onTriggerGroupSummary(id);
    }

    if (summaryResult) {
      setDisplayedSummary(summaryResult);
      try {
        localStorage.setItem('interntrack_active_summary', JSON.stringify(summaryResult));
      } catch {}
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B2545] via-[#134074] to-[#0B2545] rounded-2xl p-6 text-white shadow-md border border-slate-700">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#F26522] text-white font-bold text-xs uppercase tracking-wide">
                AI Analytics & Decision Support
              </span>
              <span className="text-slate-300 text-xs font-medium">
                Practicum Supervision Intelligence Suite
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              AI Attendance Alerts & Accomplishment Summaries
            </h1>
            <p className="text-slate-200 text-sm mt-1 max-w-3xl">
              Real-time attendance anomaly monitoring and weekly accomplishment synthesis for practicum coordinators.
            </p>
          </div>

          <div className="inline-flex flex-wrap bg-white/10 p-1 rounded-lg backdrop-blur-sm border border-white/20 text-xs font-semibold self-start">
            <button
              onClick={() => setActiveSubTab('attendance')}
              className={`px-3.5 py-2 rounded-lg transition cursor-pointer ${
                activeSubTab === 'attendance'
                  ? 'bg-[#F26522] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1. Attendance Anomaly Detection
            </button>
            <button
              onClick={() => setActiveSubTab('nlp')}
              className={`px-3.5 py-2 rounded-lg transition cursor-pointer ${
                activeSubTab === 'nlp'
                  ? 'bg-[#F26522] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              2. Accomplishment Synthesis Engine
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: ATTENDANCE ANOMALY DETECTOR */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-6">
          {/* Engine Controller Card with Dropdown & Execution */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors duration-200">
            <div>
              <h2 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#F26522]" />
                <span>Attendance Anomaly Detection</span>
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <div className="flex-1">
                <select
                  value={selectedStudentForEval}
                  onChange={(e) => setSelectedStudentForEval(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-bold focus:ring-1 focus:ring-[#F26522]"
                >
                  <option value="all">All Enrolled Student Interns ({enrolledStudents.length} Students)</option>
                  {enrolledStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.buId}) — {s.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleExecuteAnomaly}
                disabled={isRunningDetection}
                className="px-5 py-2.5 bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-4 h-4 ${isRunningDetection ? 'animate-spin' : ''}`} />
                <span>{isRunningDetection ? 'Evaluating Status...' : 'Execute Anomaly Engine'}</span>
              </button>
            </div>

            {/* Comprehensive Result Bar (Evaluating Doing Fine, Lacking Hours, Absent) */}
            {anomalyEvaluationResult && (
              <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-[#F26522]" />
                      <span>Real-Time Duty Status Result Bar</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      Evaluated: {new Date(anomalyEvaluationResult.evaluatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Segmented Color Bar */}
                  <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                    <div
                      style={{
                        width: `${Math.round(
                          (anomalyEvaluationResult.metrics.doingFine / (anomalyEvaluationResult.metrics.total || 1)) * 100
                        )}%`,
                      }}
                      className="bg-emerald-500 h-full transition-all duration-300"
                      title={`Doing Fine: ${anomalyEvaluationResult.metrics.doingFine}`}
                    />
                    <div
                      style={{
                        width: `${Math.round(
                          (anomalyEvaluationResult.metrics.lackingHours / (anomalyEvaluationResult.metrics.total || 1)) * 100
                        )}%`,
                      }}
                      className="bg-amber-500 h-full transition-all duration-300"
                      title={`Lacking Hours: ${anomalyEvaluationResult.metrics.lackingHours}`}
                    />
                    <div
                      style={{
                        width: `${Math.round(
                          (anomalyEvaluationResult.metrics.absent / (anomalyEvaluationResult.metrics.total || 1)) * 100
                        )}%`,
                      }}
                      className="bg-red-500 h-full transition-all duration-300"
                      title={`Absent: ${anomalyEvaluationResult.metrics.absent}`}
                    />
                  </div>

                  {/* Summary Status Counts Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">Total Evaluated</span>
                      <strong className="text-lg font-black text-slate-900 dark:text-white">
                        {anomalyEvaluationResult.metrics.total}
                      </strong>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <span className="text-emerald-700 dark:text-emerald-400 block text-[11px] font-bold">Doing Fine / On Duty</span>
                      <strong className="text-lg font-black text-emerald-800 dark:text-emerald-300">
                        {anomalyEvaluationResult.metrics.doingFine}
                      </strong>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
                      <span className="text-amber-800 dark:text-amber-400 block text-[11px] font-bold">Lacking Duty Hours</span>
                      <strong className="text-lg font-black text-amber-900 dark:text-amber-300">
                        {anomalyEvaluationResult.metrics.lackingHours}
                      </strong>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800">
                      <span className="text-red-700 dark:text-red-400 block text-[11px] font-bold">Flagged Absent</span>
                      <strong className="text-lg font-black text-red-800 dark:text-red-300">
                        {anomalyEvaluationResult.metrics.absent}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Individual Intern Status Evaluation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {anomalyEvaluationResult.evaluatedStudents.map((ev) => (
                    <div
                      key={ev.studentId}
                      className={`p-4 rounded-xl border transition-all ${
                        ev.status === 'doing_fine'
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                          : ev.status === 'lacking_hours'
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                          : ev.status === 'wfh'
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                          : 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs">{ev.fullName}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            BU ID: {ev.buId || 'Verified'} • {ev.companyName}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                            ev.status === 'doing_fine'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : ev.status === 'lacking_hours'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              : ev.status === 'wfh'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300'
                          }`}
                        >
                          {ev.statusLabel}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Today Time-In:</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-mono">
                            {ev.actualTimeIn ? (ev.actualTimeIn.includes('T') ? new Date(ev.actualTimeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ev.actualTimeIn) : 'None Recorded'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Duty Hours Rendered:</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-mono">
                            {ev.hoursRendered.toFixed(1)}h / 8.0h
                          </strong>
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {ev.detailMessage}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Generated Alerts Grid */}
          {alerts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <span>Pending Anomaly Alert Transmissions</span>
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {alerts.length} Flagged Record{alerts.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-200 dark:border-amber-800/70 p-6 shadow-xs space-y-4"
                  >
                    {/* Alert Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 font-extrabold text-[11px]">
                          {alert.anomalyType}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Intern: <strong className="dark:text-white">{alert.studentName}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                            alert.status === 'pending_review'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                              : alert.status === 'excused'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Status: {alert.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 rounded-lg border border-amber-200/80 dark:border-amber-800/60">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                        "{alert.message}"
                      </p>
                    </div>

                    {/* Dual Notification Channels Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-[#F26522]" />
                            Automated Institutional Email Notice
                          </span>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded">
                            DISPATCHED
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 font-mono">
                          <div>
                            <strong>To:</strong> {alert.studentName.toLowerCase().replace(/ /g, '.')}@bicol-u.edu.ph
                          </div>
                          <div>
                            <strong>Subject:</strong> [InternTrack Alert] Attendance Status Notice: {alert.studentName}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <Bell className="w-4 h-4 text-[#0B2545] dark:text-orange-400" />
                            Web Push & Mobile Alert Notification
                          </span>
                          <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded">
                            ACTIVE PUSH
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1 text-[11px]">
                          <span className="font-bold text-slate-800 dark:text-white">InternTrack Attendance Status Flag</span>
                          <p className="text-slate-600 dark:text-slate-300">
                            Attendance record flagged for {alert.studentName} at {alert.companyName}.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Coordinator Action Toolbar */}
                    <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800 gap-2 text-xs">
                      <button
                        onClick={() => onResolveAlert(alert.id, 'acknowledge')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all active:scale-95 cursor-pointer"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => onResolveAlert(alert.id, 'excuse')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all active:scale-95 shadow-2xs cursor-pointer"
                      >
                        Accept / Mark Excused
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: NLP ACCOMPLISHMENT SUMMARIZATION */}
      {activeSubTab === 'nlp' && (
        <div className="space-y-6">
          {/* Cohort & Student Selector with Button BELOW Dropdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors duration-200">
            <div>
              <h2 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#F26522]" />
                <span>Accomplishment Synthesis Engine</span>
              </h2>
            </div>

            <div className="space-y-3 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Practicum Group Cohort or Individual Intern:
                </label>
                <select
                  value={selectedSynthesisTarget}
                  onChange={(e) => setSelectedSynthesisTarget(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-bold focus:ring-1 focus:ring-[#F26522]"
                >
                  <optgroup label="Practicum Group Cohorts">
                    {groups.map((g) => (
                      <option key={g.id} value={`group:${g.id}`}>
                        {g.name} ({g.companyName})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Individual Enrolled Interns">
                    {enrolledStudents.map((s) => (
                      <option key={s.id} value={`student:${s.id}`}>
                        {s.fullName} ({s.buId}) — {s.companyName}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Generate Weekly Highlight Placed Below Dropdown to Prevent Cramping */}
              <div className="pt-1">
                <button
                  onClick={handleGenerateHighlight}
                  disabled={isSummarizing}
                  className="w-full sm:w-auto py-2.5 px-6 bg-[#020617] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Brain className={`w-4 h-4 text-[#F26522] ${isSummarizing ? 'animate-pulse' : ''}`} />
                  <span>{isSummarizing ? 'Synthesizing Weekly Accomplishments...' : 'Generate Weekly Highlight'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Synthesis Showcase (Persistently Displayed - Never Disappears) */}
          {displayedSummary && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-800 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400 font-extrabold text-xs border border-[#FED7AA] dark:border-orange-800">
                      Week {displayedSummary.weekNumber} Highlight Report
                    </span>
                    <span className="text-xs font-bold text-[#0B2545] dark:text-white">{displayedSummary.groupName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Generated: {new Date(displayedSummary.generatedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    Decision-Support Ready
                  </span>
                </div>
              </div>

              {/* Highlight Formulation Box */}
              <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl border-l-4 border-[#F26522] space-y-2">
                <span className="text-[11px] font-bold text-[#D94B0A] dark:text-orange-400 uppercase tracking-wider block">
                  AI-Generated Highlight:
                </span>
                <p className="text-base font-extrabold text-slate-900 dark:text-white leading-relaxed italic">
                  "{displayedSummary.aiHighlight}"
                </p>
              </div>

              {/* Aggregated Statistical Analytics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Participation</span>
                  <span className="text-2xl font-extrabold text-[#0B2545] dark:text-white">
                    {displayedSummary.membersAttended} / {displayedSummary.totalMembers}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                    100% Active Attendance
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Rendered Hours This Week</span>
                  <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                    {displayedSummary.totalHoursRendered}h
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                    Accumulated duty
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Tasks Completed</span>
                  <span className="text-2xl font-extrabold text-blue-700 dark:text-blue-400">
                    {displayedSummary.tasksCompleted} / {displayedSummary.tasksSubmitted}
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block mt-0.5">
                    {Math.round((displayedSummary.tasksCompleted / (displayedSummary.tasksSubmitted || 1)) * 100)}% Completion Rate
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Dominant Work Areas</span>
                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    {displayedSummary.dominantWorkAreas.map((area, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold text-[10px] border border-slate-200 dark:border-slate-700"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Synthesized Key Findings */}
              {displayedSummary.keyFindings && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Synthesized Technical Accomplishments & Work Streams:
                  </h4>
                  <div className="space-y-2">
                    {displayedSummary.keyFindings.map((finding, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-700 dark:text-slate-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision-Support Supervision Box */}
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800/80 text-xs text-blue-950 dark:text-blue-200 space-y-1">
                <strong className="text-blue-950 dark:text-blue-200">Practicum Coordinator Supervisory Recommendation:</strong>
                <p className="text-blue-900 dark:text-blue-300 leading-relaxed">
                  {displayedSummary.decisionSupportNotes}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
