import React, { useState } from 'react';
import {
  Brain,
  AlertTriangle,
  Mail,
  Bell,
  CheckCircle2,
  Play,
  RotateCw,
  Clock,
  Users,
  FileText,
  ShieldAlert,
  Send,
  Sliders,
  Terminal,
} from 'lucide-react';
import { Group, Student, AttendanceAlert, AISummary } from '../types';

interface AIAnalyticsViewProps {
  groups: Group[];
  students: Student[];
  alerts: AttendanceAlert[];
  summaries: AISummary[];
  onRunAnomalyDetection: (studentId?: string) => Promise<void>;
  onTriggerGroupSummary: (groupId: string) => Promise<void>;
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
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [testStudentId, setTestStudentId] = useState('stu-4'); // Juan Dela Cruz by default
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'nlp'>('attendance');
  const [notificationChannel, setNotificationChannel] = useState<'all' | 'email' | 'push'>('all');

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const groupSummaries = summaries.filter((s) => s.groupId === selectedGroup?.id);
  const activeSummary = groupSummaries[0] || summaries[0];

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
              <span className="text-slate-300 text-xs">
                BSCS Practicum AI Component Implementation
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              AI Attendance Alerts & NLP Accomplishment Summaries
            </h1>
            <p className="text-slate-200 text-sm mt-1 max-w-3xl">
              Integrates Python rule-based schedule logic and statistical anomaly detection with Google GenAI LLM API weekly progress synthesis to reduce coordinator supervision burden.
            </p>
          </div>

          <div className="inline-flex flex-wrap bg-white/10 p-1 rounded-lg backdrop-blur-sm border border-white/20 text-xs font-semibold self-start">
            <button
              onClick={() => setActiveSubTab('attendance')}
              className={`px-3 py-2 rounded-lg transition cursor-pointer ${
                activeSubTab === 'attendance'
                  ? 'bg-[#F26522] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1. Attendance Anomaly Detection
            </button>
            <button
              onClick={() => setActiveSubTab('nlp')}
              className={`px-3 py-2 rounded-lg transition cursor-pointer ${
                activeSubTab === 'nlp'
                  ? 'bg-[#F26522] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              2. NLP Accomplishment Synthesis
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: ATTENDANCE ANOMALY DETECTOR */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-6">
          {/* Engine Controller Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors duration-200">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-[#F26522]" />
                  Python Schedule Anomaly & Attendance Alert Engine
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Evaluates expected duty schedules (8:00 AM – 5:00 PM) against real-time logs with a 15-minute grace period and statistical Z-score scoring.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <select
                  value={testStudentId}
                  onChange={(e) => setTestStudentId(e.target.value)}
                  className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-semibold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      Test on: {s.fullName} ({s.status === 'at_risk' ? 'Flagged Absent' : 'Present'})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => onRunAnomalyDetection(testStudentId)}
                  disabled={isRunningDetection}
                  className="px-4 py-2.5 bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold text-xs rounded-lg transition-all active:scale-95 shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <Play className={`w-4 h-4 ${isRunningDetection ? 'animate-spin' : ''}`} />
                  {isRunningDetection ? 'Evaluating Logs...' : 'Execute Anomaly Engine'}
                </button>
              </div>
            </div>

            {/* Algorithm Specifications Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/80">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Rule-Based Evaluation</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Detects unrecorded duty check-ins past expected duty start + 15m grace window.
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/80">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Machine-Learning / Z-Score</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Calculates distribution variance over 5-day rolling check-ins to flag statistical deviations.
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/80">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Multi-Channel Alerts</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Dispatches automated notices to both the student intern and Student Internship Coordinator.
                </p>
              </div>
            </div>
          </div>

          {/* Active Generated Alerts Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                Detected Attendance Anomalies & Automated Notification Payloads
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {alerts.length} generated anomaly records
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
                        Method: <strong className="dark:text-white">{alert.detectionMethod}</strong>
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

                  {/* Core Formatted Message from Concept Paper */}
                  <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 rounded-lg border border-amber-200/80 dark:border-amber-800/60">
                    <div className="text-[11px] font-bold text-[#D94B0A] dark:text-orange-400 uppercase tracking-wider mb-1">
                      Concept Paper Decision-Support Output:
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                      "{alert.message}"
                    </p>
                  </div>

                  {/* Dual Notification Channels Preview (Student & Professor) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Channel 1: Automated Email Dispatch */}
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
                          <strong>To:</strong> {alert.studentName.toLowerCase().replace(/ /g, '.')}@bicol-u.edu.ph, coordinator@bicol-u.edu.ph
                        </div>
                        <div>
                          <strong>Subject:</strong> [InternTrack Alert] Missed Duty Window Notice: {alert.studentName}
                        </div>
                        <div className="pt-2 text-slate-700 dark:text-slate-300 font-sans leading-relaxed border-t border-slate-100 dark:border-slate-800">
                          Dear {alert.studentName} and Practicum Coordinator,<br />
                          {alert.message}<br />
                          <em>Host Training Establishment: {alert.companyName}</em>
                        </div>
                      </div>
                    </div>

                    {/* Channel 2: Web Push / In-App Notification */}
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
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-[#F26522] text-white flex items-center justify-center font-bold text-[10px]">
                            BU
                          </div>
                          <span className="font-bold text-slate-800 dark:text-white">
                            InternTrack Duty Window Missed
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">
                          No check-in detected for {alert.studentName} at {alert.companyName}. Practicum coordinator flagged.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Coordinator Decision Support Action Toolbar */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 italic">
                      "AI-generated alerts are meant purely as decision-support information. Any flagged absence still has to be judged by the professor."
                    </span>
                    <div className="flex items-center gap-2">
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
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: NLP ACCOMPLISHMENT SUMMARIZATION */}
      {activeSubTab === 'nlp' && (
        <div className="space-y-6">
          {/* Cohort Selector & LLM Trigger Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
            <div>
              <h2 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#F26522]" />
                Cohort Accomplishment NLP Synthesis Engine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Large Language Model (LLM API: gemini-3.8-flash) consolidates dozens of daily entries into weekly executive highlights.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-bold"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.companyName})
                  </option>
                ))}
              </select>

              <button
                onClick={() => onTriggerGroupSummary(selectedGroupId)}
                disabled={isSummarizing}
                className="px-4 py-2.5 bg-[#020617] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all active:scale-95 shadow-sm hover:shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Brain className={`w-4 h-4 text-[#F26522] ${isSummarizing ? 'animate-pulse' : ''}`} />
                {isSummarizing ? 'Synthesizing with Gemini...' : 'Generate Weekly Highlight'}
              </button>
            </div>
          </div>

          {/* Active Synthesis Showcase */}
          {activeSummary && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-800 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400 font-extrabold text-xs border border-[#FED7AA] dark:border-orange-800">
                      Week {activeSummary.weekNumber} Highlight Report
                    </span>
                    <span className="text-xs font-bold text-[#0B2545] dark:text-white">{activeSummary.groupName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Model: <strong>gemini-3.8-flash</strong> • Generated: {new Date(activeSummary.generatedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    Decision-Support Ready
                  </span>
                </div>
              </div>

              {/* Research Concept Paper Exact Formulation Box */}
              <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl border-l-4 border-[#F26522] space-y-2">
                <span className="text-[11px] font-bold text-[#D94B0A] dark:text-orange-400 uppercase tracking-wider block">
                  AI-Generated Highlight (Concept Paper Specification):
                </span>
                <p className="text-base font-extrabold text-slate-900 dark:text-white leading-relaxed italic">
                  "{activeSummary.aiHighlight}"
                </p>
              </div>

              {/* Aggregated Statistical Analytics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Cohort Attendance</span>
                  <span className="text-2xl font-extrabold text-[#0B2545] dark:text-white">
                    {activeSummary.membersAttended} / {activeSummary.totalMembers}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                    100% Active Attendance
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Rendered Hours This Week</span>
                  <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                    {activeSummary.totalHoursRendered}h
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                    Accumulated by group
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Tasks Completed</span>
                  <span className="text-2xl font-extrabold text-blue-700 dark:text-blue-400">
                    {activeSummary.tasksCompleted} / {activeSummary.tasksSubmitted}
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block mt-0.5">
                    {Math.round((activeSummary.tasksCompleted / (activeSummary.tasksSubmitted || 1)) * 100)}% Completion Rate
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Dominant Work Areas</span>
                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    {activeSummary.dominantWorkAreas.map((area, idx) => (
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
              {activeSummary.keyFindings && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Synthesized Technical Accomplishments & Work Streams:
                  </h4>
                  <div className="space-y-2">
                    {activeSummary.keyFindings.map((finding, idx) => (
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
                <strong className="text-blue-950 dark:text-blue-200">Student Internship Coordinator Supervisory Recommendation:</strong>
                <p className="text-blue-900 dark:text-blue-300 leading-relaxed">
                  {activeSummary.decisionSupportNotes}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
