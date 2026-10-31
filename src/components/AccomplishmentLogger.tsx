import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  Brain,
  Filter,
  Search,
  Tag,
  Paperclip,
  Check,
  Layers,
  Info,
  Calendar,
  Download,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Student, AccomplishmentReport, Group, AttendanceLog, AISummary } from '../types';
import { BUAccomplishmentExportModal } from './BUAccomplishmentExportModal';
import { deleteAccomplishmentFromSupabase } from '../lib/supabase';

interface AccomplishmentLoggerProps {
  students: Student[];
  groups: Group[];
  accomplishmentReports: AccomplishmentReport[];
  onSubmitReport: (reportData: any) => Promise<void>;
  onDeleteReport?: (reportId: string) => Promise<void>;
  onTriggerGroupSummary: (groupId: string, studentId?: string) => Promise<any> | void;
  isCoordinator?: boolean;
  attendanceLogs?: AttendanceLog[];
  currentUser?: any;
  currentStudent?: Student;
}

export const AccomplishmentLogger: React.FC<AccomplishmentLoggerProps> = ({
  students,
  groups,
  accomplishmentReports,
  onSubmitReport,
  onDeleteReport,
  onTriggerGroupSummary,
  isCoordinator = false,
  attendanceLogs = [],
  currentUser,
  currentStudent,
}) => {
  // Local reports state for immediate UI feedback on deletion
  const [localReports, setLocalReports] = useState<AccomplishmentReport[]>(accomplishmentReports);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dynamic AI Weekly Summary state
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [latestSummary, setLatestSummary] = useState<AISummary | null>(() => {
    try {
      const saved = localStorage.getItem('interntrack_student_ai_summary');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    setLocalReports(accomplishmentReports);
  }, [accomplishmentReports]);

  // Modal state for exporting official BU forms
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTargetStudentId, setExportTargetStudentId] = useState<string>('');

  // Securely resolve the authenticated student - strictly no dropdown selection
  const effectiveStudent: Student =
    currentStudent ||
    (currentUser?.role === 'student'
      ? students.find((s) => s.id === currentUser.id || s.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        currentUser.studentProfile ||
        students[0]
      : students[0]);

  const [workCategory, setWorkCategory] = useState<
    'System Testing & QA' | 'Documentation' | 'Frontend Dev' | 'Backend Dev' | 'Network & IT Support' | 'Data Analytics'
  >('System Testing & QA');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [supervisorAssignedDuty, setSupervisorAssignedDuty] = useState('');
  const [hoursSpent, setHoursSpent] = useState('8.0');
  const [taskStatus, setTaskStatus] = useState<'completed' | 'in_progress' | 'blocked'>('completed');
  const [obstaclesFaced, setObstaclesFaced] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters for reports list
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedGroupSummary, setSelectedGroupSummary] = useState<string>(groups[0]?.id || '');

  const handleTriggerSynthesis = async () => {
    setIsSynthesizing(true);
    try {
      const targetGroupId = effectiveStudent?.groupId || '';
      const targetStudentId = effectiveStudent?.id || '';
      const res = await onTriggerGroupSummary(targetGroupId, targetStudentId);
      if (res && (res.aiHighlight || (res as any).highlight)) {
        setLatestSummary(res);
        try {
          localStorage.setItem('interntrack_student_ai_summary', JSON.stringify(res));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to trigger AI weekly synthesis:', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleDeleteReport = async (reportId: string, studentId: string, date: string) => {
    const confirmDelete = window.confirm('Are you sure you want to unsubmit / delete this accomplishment report? This will remove the entry from the official logbook.');
    if (!confirmDelete) return;

    setDeletingId(reportId);
    try {
      setLocalReports((prev) => prev.filter((r) => r.id !== reportId));
      if (onDeleteReport) {
        await onDeleteReport(reportId);
      } else {
        await deleteAccomplishmentFromSupabase(reportId, studentId, date);
      }
    } catch (err) {
      console.error('Failed to unsubmit accomplishment report:', err);
      setLocalReports(accomplishmentReports);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDescription) return;

    setIsSubmitting(true);
    try {
      await onSubmitReport({
        studentId: effectiveStudent.id,
        studentName: effectiveStudent.fullName,
        companyId: effectiveStudent.companyId,
        companyName: effectiveStudent.companyName,
        workCategory,
        taskTitle,
        taskDescription,
        supervisorAssignedDuty: supervisorAssignedDuty.trim() || undefined,
        hoursSpent,
        taskStatus,
        obstaclesFaced,
      });

      setSuccessMessage('Daily accomplishment report successfully submitted for practicum review!');
      setTaskTitle('');
      setTaskDescription('');
      setSupervisorAssignedDuty('');
      setObstaclesFaced('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReports = localReports.filter((r) => {
    const matchesCat = categoryFilter === 'all' || r.workCategory === categoryFilter;
    const matchesSearch =
      r.taskTitle.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.taskDescription.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.studentName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.companyName.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalHoursLogged = localReports.reduce((acc, r) => acc + (Number(r.hoursSpent) || 0), 0);
  const uniqueStudentContributors = new Set(localReports.map((r) => r.studentId)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400 font-bold text-xs border border-[#FED7AA] dark:border-orange-800">
                Daily Accomplishment Reporting
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Practicum Output Directorate</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B2545] dark:text-white">
              {isCoordinator
                ? 'Intern Daily Accomplishment Reports & Monitoring'
                : 'Daily Internship Accomplishment Form'}
            </h1>
            {isCoordinator && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                Review verified daily deliverables, technical milestones, and obstacles documented by student interns across host establishments.
              </p>
            )}
          </div>

          {/* Action Triggers: AI Synthesis & BU DOCX Export */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isCoordinator && (
              <button
                onClick={() => {
                  setExportTargetStudentId(currentStudent?.id || students[0]?.id || '');
                  setIsExportModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-lg bg-[#0875e1] hover:bg-[#0660bb] text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-2 shadow-sm hover:shadow-md shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export BU Portfolio (.docx)</span>
              </button>
            )}

            {isCoordinator && groups.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedGroupSummary}
                  onChange={(e) => setSelectedGroupSummary(e.target.value)}
                  className="py-2 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#F26522]"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onTriggerGroupSummary(selectedGroupSummary)}
                  className="px-4 py-2.5 rounded-lg bg-[#020617] hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-2 shadow-sm hover:shadow-md shrink-0 cursor-pointer"
                >
                  <Brain className="w-4 h-4 text-[#F26522]" />
                  <span>Synthesize Weekly AI Highlight</span>
                </button>
              </div>
            )}

            {!isCoordinator && (
              <button
                onClick={handleTriggerSynthesis}
                disabled={isSynthesizing}
                className="px-4 py-2.5 rounded-lg bg-[#020617] hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-2 shadow-sm hover:shadow-md shrink-0 cursor-pointer"
              >
                {isSynthesizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#F26522]" />
                    <span>Synthesizing AI Highlight...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 text-[#F26522]" />
                    <span>Synthesize Weekly Highlight</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Role Compliance Notice Banner for Coordinator */}
        {isCoordinator && (
          <div className="mt-4 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-lg flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Coordinator Review Directorate:</strong> Daily accomplishment entries are authored and logged exclusively by student interns.
              Coordinators monitor task outputs, analyze technical categories, and utilize AI NLP highlights to supervise student learning without manual reading overload.
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Coordinator Summary Metrics Bar */}
      {isCoordinator && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Total Reports Filed
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {accomplishmentReports.length}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              Verified daily logs
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Output Hours Documented
            </div>
            <div className="text-2xl font-black text-[#F26522] mt-1">
              {totalHoursLogged.toFixed(1)} <span className="text-sm font-semibold text-slate-500">hrs</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Total task duration logged
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Active Intern Contributors
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {uniqueStudentContributors} <span className="text-sm font-semibold text-slate-500">/ {students.length}</span>
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
              Contributing students
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              AI NLP Integration
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-[#F26522]" />
              <span>Weekly NLP Highlights</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Synthesized from daily logs
            </div>
          </div>
        </div>
      )}

      {/* Student Entry Form (ONLY RENDERED FOR STUDENTS, NEVER FOR COORDINATOR) */}
      {!isCoordinator && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#0B2545] dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#F26522]" />
              New Daily Accomplishment Entry
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Authenticated Intern Identity (Secure - No Dropdown) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#F26522] border border-orange-200 dark:border-orange-800 flex items-center justify-center font-bold text-sm shrink-0">
                    {effectiveStudent.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                        {effectiveStudent.fullName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Authenticated Intern</span>
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      BU ID: <strong className="text-slate-700 dark:text-slate-300">{effectiveStudent.buId || effectiveStudent.studentIdNumber || 'Verified'}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right sm:pl-4 sm:border-l border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 shrink-0">
                  <div className="font-bold text-slate-800 dark:text-white flex items-center sm:justify-end gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#F26522]" />
                    <span>{effectiveStudent.companyName}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Cohort: {effectiveStudent.groupName || 'Individual Practicum'}
                  </div>
                </div>
              </div>

              {/* Category and Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Work Category / Area *
                  </label>
                  <select
                    value={workCategory}
                    onChange={(e) => setWorkCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  >
                    <option value="System Testing & QA">System Testing & QA</option>
                    <option value="Documentation">Documentation & Manuals</option>
                    <option value="Frontend Dev">Frontend Development</option>
                    <option value="Backend Dev">Backend & API Integration</option>
                    <option value="Network & IT Support">Network & IT Systems Support</option>
                    <option value="Data Analytics">Data Analytics & Reports</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hours Spent *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>
              </div>

              {/* Supervisor-Assigned Duty (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Supervisor-Assigned Duty / Directive (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">HTE Directive</span>
                </div>
                <input
                  type="text"
                  value={supervisorAssignedDuty}
                  onChange={(e) => setSupervisorAssignedDuty(e.target.value)}
                  placeholder="e.g. Conduct daily API endpoint testing & database migration sanity checks"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Duty or assignment assigned to you by your host establishment supervisor for this date.
                </span>
              </div>

              {/* Task Title */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Accomplishment / Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Automated Test Suite for Regional Science Portal"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Accomplishment Narrative *
                </label>
                <textarea
                  required
                  rows={4}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe specific tasks completed, tools utilized (e.g. Cypress, Docker, Postman), modules touched, and direct outputs produced..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>

              {/* Task Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Task Completion Status</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTaskStatus('completed')}
                      className={`flex-1 py-2 rounded-lg font-bold transition-all active:scale-95 border cursor-pointer ${
                        taskStatus === 'completed'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskStatus('in_progress')}
                      className={`flex-1 py-2 rounded-lg font-bold transition-all active:scale-95 border cursor-pointer ${
                        taskStatus === 'in_progress'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskStatus('blocked')}
                      className={`flex-1 py-2 rounded-lg font-bold transition-all active:scale-95 border cursor-pointer ${
                        taskStatus === 'blocked'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Blocked
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Obstacles Encountered / Dependencies (Optional)
                  </label>
                  <input
                    type="text"
                    value={obstaclesFaced}
                    onChange={(e) => setObstaclesFaced(e.target.value)}
                    placeholder="e.g. Pending staging database credentials from mentor"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold rounded-lg transition-all active:scale-95 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Logging...' : 'Submit Daily Accomplishment'}
              </button>
            </form>
          </div>

          {/* AI Weekly Synthesis Highlight Card */}
          <div className="space-y-4">
            {latestSummary ? (
              <div className="bg-gradient-to-br from-[#020617] to-slate-900 text-white p-5 rounded-2xl shadow-xs space-y-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#F26522] text-white font-bold text-[10px] uppercase tracking-wider">
                    AI Weekly Synthesis
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Week {latestSummary.weekNumber || 6}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">
                    {latestSummary.groupName || 'Practicum Weekly Progress Highlight'}
                  </h3>
                  <p className="text-xs text-slate-200 italic mt-1.5 leading-relaxed border-l-2 border-[#F26522] pl-3 py-0.5">
                    "{latestSummary.aiHighlight || (latestSummary as any).highlight}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Rendered Duty</span>
                    <strong className="text-emerald-400 font-mono text-sm font-bold">
                      {latestSummary.totalHoursRendered}h
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Completed Tasks</span>
                    <strong className="text-blue-400 font-mono text-sm font-bold">
                      {latestSummary.tasksCompleted} / {latestSummary.tasksSubmitted || 1}
                    </strong>
                  </div>
                </div>

                {latestSummary.dominantWorkAreas && latestSummary.dominantWorkAreas.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 block mb-1">Key Focus Areas:</span>
                    <div className="flex flex-wrap gap-1">
                      {latestSummary.dominantWorkAreas.map((area, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-white/10 text-slate-200 text-[10px] font-semibold">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {latestSummary.decisionSupportNotes && (
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-[11px] text-slate-300">
                    <strong className="text-white block mb-0.5">Coordinator Supervisory Recommendation:</strong>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {latestSummary.decisionSupportNotes}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTriggerSynthesis}
                  disabled={isSynthesizing}
                  className="w-full mt-2 py-2 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                >
                  {isSynthesizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F26522]" />
                      <span>Updating Synthesis...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-3.5 h-3.5 text-[#F26522]" />
                      <span>Re-synthesize Weekly Highlight</span>
                    </>
                  )}
                </button>
              </div>
            ) : isSynthesizing ? (
              <div className="bg-gradient-to-br from-[#020617] to-slate-900 text-white p-6 rounded-2xl shadow-xs border border-slate-800 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#F26522] mx-auto" />
                <h4 className="text-xs font-bold text-white">Synthesizing Accomplishment Highlights...</h4>
                <p className="text-[11px] text-slate-400">
                  Synthesizing daily accomplishment logs into weekly executive highlight.
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#020617] to-slate-900 text-white p-5 rounded-2xl shadow-xs space-y-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#F26522] text-white font-bold text-[10px] uppercase tracking-wider">
                    AI Weekly Synthesis
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">Weekly Accomplishment Highlights</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Synthesize your verified daily task submissions into weekly executive highlights for coordinator review.
                </p>
                <button
                  type="button"
                  onClick={handleTriggerSynthesis}
                  disabled={isSynthesizing}
                  className="w-full py-2.5 px-3 bg-[#F26522] hover:bg-[#D94B0A] text-white text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Brain className="w-4 h-4" />
                  <span>Synthesize Weekly Progress Highlight</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submitted Accomplishments Logbook (Full Width for Coordinator Review) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#F26522]" />
              <span>Accomplishment History Logbook ({filteredReports.length})</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified daily task entries submitted across all cohort deployments.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setExportTargetStudentId(currentStudent?.id || students[0]?.id || '');
                setIsExportModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-[#0875e1] hover:bg-[#0660bb] text-white rounded-lg shadow-sm hover:shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export DOCX</span>
            </button>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search accomplishments..."
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F26522] w-52"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-[#F26522]"
            >
              <option value="all">All Categories</option>
              <option value="System Testing & QA">System Testing & QA</option>
              <option value="Documentation">Documentation</option>
              <option value="Frontend Dev">Frontend Dev</option>
              <option value="Backend Dev">Backend Dev</option>
              <option value="Network & IT Support">Network & IT Support</option>
              <option value="Data Analytics">Data Analytics</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredReports.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
              No accomplishment records found matching your query.
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.id} className="py-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{report.taskTitle}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400 border border-[#FED7AA] dark:border-orange-800">
                      {report.workCategory}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        report.taskStatus === 'completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : report.taskStatus === 'in_progress'
                          ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {report.taskStatus === 'completed'
                        ? 'Completed'
                        : report.taskStatus === 'in_progress'
                        ? 'In Progress'
                        : 'Blocked'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{report.taskDescription}</p>

                  {report.obstaclesFaced && (
                    <div className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/80">
                      <strong>Obstacle noted:</strong> {report.obstaclesFaced}
                    </div>
                  )}
                </div>

                <div className="text-right text-xs shrink-0 text-slate-500 dark:text-slate-400 md:pl-4 md:border-l border-slate-100 dark:border-slate-800 min-w-[160px] flex flex-col items-end justify-between">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white text-xs">{report.studentName}</div>
                    <div className="text-[11px] text-[#F26522] font-semibold flex items-center gap-1 justify-end mt-0.5">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate max-w-[140px]">{report.companyName}</span>
                    </div>
                    <div className="font-mono text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                      +{report.hoursSpent} hrs
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">{report.date}</div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2.5">
                    <button
                      onClick={() => handleDeleteReport(report.id, report.studentId, report.date)}
                      disabled={deletingId === report.id}
                      className="px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:text-white hover:bg-red-600 bg-red-50 dark:bg-red-950/60 dark:hover:bg-red-600 border border-red-200 dark:border-red-900 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-xs"
                      title="Unsubmit and delete this accomplishment record from logbook"
                    >
                      {deletingId === report.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          <span>Unsubmit</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setExportTargetStudentId(report.studentId);
                        setIsExportModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#0875e1] hover:text-white hover:bg-[#0875e1] bg-blue-50 dark:bg-blue-950/60 dark:hover:bg-[#0875e1] border border-blue-200 dark:border-blue-900 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs hover:shadow-xs"
                      title="Export official BU portfolio form for this student"
                    >
                      <Download className="w-3 h-3" />
                      <span>BU Form DOCX</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BU Accomplishment Official DOCX Export Modal */}
      <BUAccomplishmentExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={students}
        initialStudentId={exportTargetStudentId || currentStudent?.id || students[0]?.id}
        attendanceLogs={attendanceLogs}
        accomplishmentReports={accomplishmentReports}
        isCoordinator={isCoordinator}
      />
    </div>
  );
};
