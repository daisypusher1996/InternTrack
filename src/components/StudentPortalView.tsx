import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Calendar as CalendarIcon,
  FileText,
  Laptop,
  LogIn,
  LogOut,
  ChevronRight,
  TrendingUp,
  FileCheck,
  AlertCircle,
  Plus,
  HelpCircle,
  XCircle,
  Check,
  Download,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import {
  Student,
  AttendanceLog,
  AccomplishmentReport,
  AttendanceAlert,
  User,
} from '../types';
import { BUMascotWelcome } from './BUMascotWelcome';
import { CalendarVisual } from './CalendarVisual';
import { BUAccomplishmentExportModal } from './BUAccomplishmentExportModal';
import { useAttendanceStateMachine } from '../hooks/useAttendanceStateMachine';
import {
  updateStudentScheduleInSupabase,
  fetchStudentRegisteredCompany,
} from '../lib/supabase';

interface StudentPortalViewProps {
  currentUser: User;
  student: Student;
  attendanceLogs: AttendanceLog[];
  accomplishmentReports: AccomplishmentReport[];
  alerts: AttendanceAlert[];
  onTimeIn: (studentId: string, remarks?: string, dtrImageLink?: string) => Promise<void>;
  onTimeOut: (studentId: string, remarks?: string, dtrImageLink?: string) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
  onSubmitExcuse: (alertId: string, excuseNotes: string) => Promise<void>;
  onSubmitReport?: (reportData: any) => Promise<void>;
  onCancelEnrollment?: (studentId: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
  coordinatorName?: string;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  currentUser,
  student,
  attendanceLogs,
  accomplishmentReports,
  alerts,
  onTimeIn,
  onTimeOut,
  onNavigateToTab,
  onSubmitExcuse,
  onSubmitReport,
  onCancelEnrollment,
  onRefreshData,
  coordinatorName,
}) => {
  const [remarks, setRemarks] = useState('');
  const [dtrImageLink, setDtrImageLink] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Excuse Slip Modal State
  const [excuseNotes, setExcuseNotes] = useState('');
  const [selectedAlertForExcuse, setSelectedAlertForExcuse] = useState<AttendanceAlert | null>(null);
  const [isExcuseSubmitted, setIsExcuseSubmitted] = useState(false);

  // Accomplishment Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState(() =>
    new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  );
  const [reportCategory, setReportCategory] = useState<
    'System Testing & QA' | 'Documentation' | 'Frontend Dev' | 'Backend Dev' | 'Network & IT Support' | 'Data Analytics'
  >('System Testing & QA');
  const [reportSupervisorDuty, setReportSupervisorDuty] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportHours, setReportHours] = useState('8.0');
  const [reportObstacles, setReportObstacles] = useState('');
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [reportSuccessFeedback, setReportSuccessFeedback] = useState<string | null>(null);

  // BU Accomplishment Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic Schedule State (Persisted to Supabase)
  const [currentDutyStart, setCurrentDutyStart] = useState(student.dutyStart || '08:00');
  const [currentDutyEnd, setCurrentDutyEnd] = useState(student.dutyEnd || '17:00');
  const [isEditScheduleModalOpen, setIsEditScheduleModalOpen] = useState(false);
  const [scheduleStartInput, setScheduleStartInput] = useState(student.dutyStart || '08:00');
  const [scheduleEndInput, setScheduleEndInput] = useState(student.dutyEnd || '17:00');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleSuccessMessage, setScheduleSuccessMessage] = useState<string | null>(null);

  // Registered Company State (Persisted in Supabase - No Mock Data)
  const [registeredCompany, setRegisteredCompany] = useState<{
    id?: string;
    name?: string;
    branch?: string;
    sector?: string;
  } | null>(null);

  useEffect(() => {
    setCurrentDutyStart(student.dutyStart || '08:00');
    setCurrentDutyEnd(student.dutyEnd || '17:00');
    setScheduleStartInput(student.dutyStart || '08:00');
    setScheduleEndInput(student.dutyEnd || '17:00');
  }, [student.dutyStart, student.dutyEnd]);

  useEffect(() => {
    let isMounted = true;
    fetchStudentRegisteredCompany(student.id).then(({ company }) => {
      if (isMounted && company) {
        setRegisteredCompany(company);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [student.id]);

  const displayCompanyName =
    (student.companyName && student.companyName !== 'Not Yet Enrolled (Pending Application)')
      ? student.companyName
      : (registeredCompany?.name || 'Albay Provincial Information Technology Office');

  // Today's log for the student
  const todayStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Strict Attendance State Machine (Validated Directly Against Supabase)
  const {
    todayRecords,
    stateMachine,
    isLoading: isAttendanceLoading,
    isMutating: isAttendanceMutating,
    activeAction,
    error: stateMachineError,
    handleTimeIn: punchTimeIn,
    handleTimeOut: punchTimeOut,
    dismissError: dismissAttendanceError,
  } = useAttendanceStateMachine({
    studentId: student.id,
    studentName: student.fullName,
    companyId: student.companyId,
    companyName: displayCompanyName,
    dutyStart: currentDutyStart,
    dutyEnd: currentDutyEnd,
  });

  const formatPunchTime = (isoString?: string | null): string => {
    if (!isoString) return '—';
    try {
      if (isoString.includes('T')) {
        const d = new Date(isoString);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }
      return isoString.slice(0, 5);
    } catch {
      return String(isoString);
    }
  };

  // Filter logs & reports for this student
  const studentLogs = attendanceLogs.filter((l) => l.studentId === student.id);
  const studentReports = accomplishmentReports.filter((r) => r.studentId === student.id);
  const studentAlerts = alerts.filter(
    (a) => a.studentId === student.id && a.status === 'pending_review'
  );

  const percentCompleted = Math.min(
    100,
    Math.round((student.renderedHours / student.targetHours) * 100)
  );
  const hoursRemaining = Math.max(0, student.targetHours - student.renderedHours);
  const estimatedDaysRemaining = Math.ceil(hoursRemaining / 8);

  const isApproved = student.enrollmentStatus === 'approved';
  const isEnrollmentPending = student.enrollmentStatus === 'pending_approval';
  const isEnrollmentDeclined = student.enrollmentStatus === 'declined';

  // Calculate unaccomplished / forgotten required tasks
  const unaccomplishedTasks = [];

  if (isEnrollmentPending) {
    unaccomplishedTasks.push({
      id: 'task-enrollment',
      type: 'enrollment',
      urgency: 'high',
      title: 'Practicum Enrollment Pending Approval',
      description:
        'Your enrollment application for Host Training Establishment is awaiting Practicum Coordinator approval.',
      actionText: 'View Enrollment Details',
      onClick: () => onNavigateToTab('enrollment'),
    });
  }

  // Check if student has an active open shift (State B or State D) requiring Time-Out
  const hasActiveOpenShift = stateMachine.state === 'B' || stateMachine.state === 'D';
  if (hasActiveOpenShift) {
    const shiftLabel = stateMachine.state === 'B' ? 'Shift 1' : 'Shift 2';
    unaccomplishedTasks.push({
      id: 'task-time-out',
      type: 'time_out',
      urgency: 'urgent',
      title: `Missing Duty Time-Out (${shiftLabel})`,
      description: `Your ${shiftLabel} is currently in progress. Don't forget to record your Time-Out upon shift conclusion.`,
      actionText: 'Record Time-Out Now',
      onClick: () => handleTimeOut(),
    });
  }

  // Check if today has a log but no accomplishment report filed
  const todayReport = studentReports.find(
    (r) => r.date === todayStr || r.date.includes(todayStr.split(',')[0])
  );
  if (todayRecords.length > 0 && !todayReport) {
    unaccomplishedTasks.push({
      id: 'task-report',
      type: 'report',
      urgency: 'high',
      title: 'Pending Daily Accomplishment Report',
      description:
        'You have active duty hours recorded for today. Please document your technical tasks and competencies.',
      actionText: 'Submit Daily Report',
      onClick: () => {
        setReportDate(todayStr);
        setIsReportModalOpen(true);
      },
    });
  }

  // Note: Attendance alert notifications are coordinator-only and not displayed to students

  const handleTimeIn = async () => {
    if (isEnrollmentPending && !student.deploymentApproved) return;
    setAttendanceError(null);
    try {
      await punchTimeIn(remarks || 'Student workstation time-in', dtrImageLink);
      setRemarks('');
      setDtrImageLink('');
    } catch (err: any) {
      setAttendanceError(err.message || 'Failed to record time-in');
    }
  };

  const handleTimeOut = async () => {
    setAttendanceError(null);
    try {
      await punchTimeOut(remarks || 'Student workstation time-out', dtrImageLink);
      setRemarks('');
      setDtrImageLink('');
    } catch (err: any) {
      setAttendanceError(err.message || 'Failed to record time-out');
    }
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const res = await updateStudentScheduleInSupabase({
        studentId: student.id,
        dutyStart: scheduleStartInput,
        dutyEnd: scheduleEndInput,
      });

      if (!res.success && res.error) {
        throw res.error;
      }

      setCurrentDutyStart(scheduleStartInput);
      setCurrentDutyEnd(scheduleEndInput);
      student.dutyStart = scheduleStartInput;
      student.dutyEnd = scheduleEndInput;
      setIsEditScheduleModalOpen(false);
      setScheduleSuccessMessage('Duty schedule updated successfully and saved to Supabase!');
      setTimeout(() => setScheduleSuccessMessage(null), 4000);

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update schedule.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleExcuseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForExcuse || !excuseNotes) return;
    try {
      await onSubmitExcuse(selectedAlertForExcuse.id, excuseNotes);
      setIsExcuseSubmitted(true);
      setTimeout(() => {
        setIsExcuseSubmitted(false);
        setSelectedAlertForExcuse(null);
        setExcuseNotes('');
      }, 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAccomplishmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle || !reportDescription) return;
    setIsReportSubmitting(true);
    try {
      if (onSubmitReport) {
        await onSubmitReport({
          studentId: student.id,
          groupId: student.groupId,
          date: reportDate,
          workCategory: reportCategory,
          taskTitle: reportTitle,
          taskDescription: reportDescription,
          supervisorAssignedDuty: reportSupervisorDuty.trim() || undefined,
          hoursSpent: Number(reportHours) || 8.0,
          obstaclesFaced: reportObstacles,
        });
      }
      setReportSuccessFeedback(`Accomplishment report "${reportTitle}" filed successfully!`);
      setTimeout(() => {
        setReportSuccessFeedback(null);
        setIsReportModalOpen(false);
        setReportTitle('');
        setReportDescription('');
        setReportSupervisorDuty('');
        setReportObstacles('');
      }, 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReportSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Time-Based Welcome Mascot Banner */}
      <BUMascotWelcome
        userName={student.fullName}
        role="student"
        classBlock={student.classBlock || 'BSCS 4-A'}
        hoursRemaining={isApproved ? hoursRemaining : undefined}
        isEnrolled={isApproved}
        enrollmentStatus={student.enrollmentStatus}
      />

      {/* 2. Mandatory Practicum Enrollment Approval Status Gate */}
      {isEnrollmentPending ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-extrabold text-[10px] uppercase">
                    Enrollment Approval Required
                  </span>
                  <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
                    Status: Pending Coordinator Endorsement
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-100">
                  Internship Enrollment Pending Coordinator Approval
                </h3>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 max-w-2xl leading-relaxed mt-1">
                  Your practicum placement details for <strong>{student.companyName}</strong> in <strong>{student.classBlock || 'BSCS 4-A'}</strong> have been registered. In accordance with Practicum guidelines, your coordinator must endorse your host establishment deployment before duty Time-In punches are unlocked.
                </p>
              </div>
            </div>

            {onCancelEnrollment && (
              <button
                type="button"
                onClick={() => onCancelEnrollment(student.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
                title="Cancel enrollment application to select a different HTE"
              >
                <span>Cancel Enrollment</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 bg-white dark:bg-slate-900/90 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Host Company (HTE):</span>
              <strong className="text-slate-900 dark:text-white">{student.companyName}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Class Block Section:</span>
              <strong className="text-slate-900 dark:text-white">{student.classBlock || 'BSCS 4-A'}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Duty Status:</span>
              <strong className="text-slate-900 dark:text-white font-mono">Pending Coordinator Review</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Practicum Target:</span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-black">{student.targetHours} Hours Required</strong>
            </div>
          </div>
        </div>
      ) : isEnrollmentDeclined ? (
        <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 rounded-2xl p-5 shadow-xs flex items-start justify-between gap-3.5">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h3 className="font-extrabold text-red-950 dark:text-red-200 text-sm">
                Practicum Enrollment Declined by Coordinator
              </h3>
              <p className="text-red-900 dark:text-red-300">
                {student.enrollmentDeclinedReason || 'Please contact your Practicum Coordinator to update your Host Training Establishment assignment.'}
              </p>
            </div>
          </div>


          <button
            onClick={() => onNavigateToTab('enrollment')}
            className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold transition-all active:scale-95 text-xs cursor-pointer shadow-xs"
          >
            Update Enrollment Application
          </button>
        </div>
      ) : null}

      {/* 3. Alerts for Unaccomplished or Forgotten Required Tasks */}
      {unaccomplishedTasks.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#FED7AA] dark:border-orange-950/70 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#F26522] text-white rounded-lg shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#020617] dark:text-white">
                  Task Reminders & Unaccomplished Actions ({unaccomplishedTasks.length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Required tasks pending completion inside the InternTrack system
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 uppercase">
              Action Required
            </span>
          </div>

          <div className="space-y-2">
            {unaccomplishedTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                        task.urgency === 'urgent'
                          ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {task.urgency}
                    </span>
                    <strong className="text-slate-900 dark:text-white font-bold">{task.title}</strong>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">{task.description}</p>
                </div>

                <button
                  onClick={task.onClick}
                  className="px-3.5 py-1.5 rounded-lg bg-[#020617] hover:bg-slate-800 text-white font-bold text-xs transition-all active:scale-95 shadow-2xs shrink-0 self-start sm:self-auto flex items-center gap-1.5 cursor-pointer border border-slate-700/60"
                >
                  <span>{task.actionText}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Student Workstation Check-In Station & Hours Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workstation Time-In Station Square */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-[#020617] dark:text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-[#F26522]" />
                <span>Workstation Attendance Duty Console</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized HTE Subnet: <strong className="text-slate-700 dark:text-slate-200">{displayCompanyName}</strong>
              </p>
            </div>

            {/* Live Clock Display Square */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-[#F26522]" />
              <span className="font-extrabold text-[#020617] dark:text-amber-300">{currentTimeStr || '08:00:00 AM'}</span>
            </div>
          </div>

          {(attendanceError || stateMachineError) && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
              <span>{attendanceError || stateMachineError}</span>
              <button
                onClick={() => {
                  setAttendanceError(null);
                  dismissAttendanceError();
                }}
                className="font-bold underline text-[11px] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {scheduleSuccessMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{scheduleSuccessMessage}</span>
            </div>
          )}

          {/* Schedule & Subnet Details Square */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Host Establishment (HTE):</span>
              <strong className="text-slate-900 dark:text-white font-bold block">{displayCompanyName}</strong>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Mentor: {student.mentorName}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 block">Scheduled Duty Hours:</span>
                <button
                  type="button"
                  onClick={() => setIsEditScheduleModalOpen(true)}
                  className="text-[11px] text-[#F26522] hover:text-[#D94B0A] font-bold flex items-center gap-1 underline cursor-pointer"
                >
                  <Clock className="w-3 h-3" />
                  <span>Edit Schedule</span>
                </button>
              </div>
              <strong className="text-slate-900 dark:text-white font-bold font-mono">
                {currentDutyStart} – {currentDutyEnd}
              </strong>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                15-minute grace period active (dynamic)
              </span>
            </div>
          </div>

          {/* Today's Shifts Verified State Machine Card (Validated Against Supabase) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Today's Verified Duty Shifts
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    stateMachine.state === 'A'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : stateMachine.state === 'B'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                      : stateMachine.state === 'C'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : stateMachine.state === 'D'
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 animate-pulse'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  State {stateMachine.state}: {stateMachine.statusMessage}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {stateMachine.closedCount} / 2 Shifts Completed Today
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Shift 1 Card */}
              <div
                className={`p-3 rounded-lg border ${
                  todayRecords[0]
                    ? todayRecords[0].time_out
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                    Shift 1 (Morning)
                  </span>
                  {todayRecords[0]?.time_out ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                  ) : todayRecords[0]?.time_in ? (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" /> In Progress
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Pending</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Time-In</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      {formatPunchTime(todayRecords[0]?.time_in)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Time-Out</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      {formatPunchTime(todayRecords[0]?.time_out)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Hours</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      {todayRecords[0]?.hours_rendered
                        ? `${Number(todayRecords[0].hours_rendered).toFixed(2)}h`
                        : todayRecords[0]?.time_in
                        ? 'Active'
                        : '—'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Shift 2 Card */}
              <div
                className={`p-3 rounded-lg border ${
                  todayRecords[1]
                    ? todayRecords[1].time_out
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                    Shift 2 (Afternoon)
                  </span>
                  {todayRecords[1]?.time_out ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                  ) : todayRecords[1]?.time_in ? (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" /> In Progress
                    </span>
                  ) : stateMachine.state === 'C' ? (
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Ready</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Locked</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Time-In</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      {formatPunchTime(todayRecords[1]?.time_in)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Time-Out</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      {formatPunchTime(todayRecords[1]?.time_out)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Hours</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      {todayRecords[1]?.hours_rendered
                        ? `${Number(todayRecords[1].hours_rendered).toFixed(2)}h`
                        : todayRecords[1]?.time_in
                        ? 'Active'
                        : '—'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duty Notes / Specific Workstation (Optional)
              </label>
              <input
                type="text"
                value={remarks}
                disabled={isEnrollmentPending || isAttendanceMutating}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Science & Tech Center Station 3 - Cypress QA Automation"
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Backup DTR Image Link (e.g., Google Drive)
              </label>
              <input
                type="text"
                value={dtrImageLink}
                disabled={isEnrollmentPending || isAttendanceMutating}
                onChange={(e) => setDtrImageLink(e.target.value)}
                placeholder="e.g. https://drive.google.com/file/d/12345..."
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Punch Buttons - Strict State Machine & Anti-Spam Lockout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <button
              onClick={handleTimeIn}
              disabled={isAttendanceMutating || isAttendanceLoading || (isEnrollmentPending && !student.deploymentApproved) || !stateMachine.isTimeInEnabled}
              className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-150 shadow-sm ${
                (isEnrollmentPending && !student.deploymentApproved) || isAttendanceLoading || !stateMachine.isTimeInEnabled || isAttendanceMutating
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-[#F26522] hover:bg-[#D94B0A] text-white hover:shadow-md cursor-pointer active:scale-95'
              }`}
            >
              {isAttendanceMutating && activeAction === 'in' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Recording Time-In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>
                    {(isEnrollmentPending && !student.deploymentApproved)
                      ? 'Time-In Locked (Pending Approval)'
                      : stateMachine.state === 'A'
                      ? 'Record Duty Time-In (Shift 1)'
                      : stateMachine.state === 'B'
                      ? 'Shift 1 Time-In Recorded'
                      : stateMachine.state === 'C'
                      ? 'Record Duty Time-In (Shift 2)'
                      : stateMachine.state === 'D'
                      ? 'Shift 2 Time-In Recorded'
                      : 'Daily Maximum Reached (2 Shifts)'}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={handleTimeOut}
              disabled={isAttendanceMutating || isAttendanceLoading || !stateMachine.isTimeOutEnabled}
              className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-150 shadow-sm ${
                isAttendanceLoading || !stateMachine.isTimeOutEnabled || isAttendanceMutating
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-[#020617] hover:bg-slate-800 text-white border border-slate-700/80 hover:shadow-md cursor-pointer active:scale-95'
              }`}
            >
              {isAttendanceMutating && activeAction === 'out' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Recording Time-Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>
                    {stateMachine.state === 'A'
                      ? 'Record Duty Time-Out'
                      : stateMachine.state === 'B'
                      ? 'Record Duty Time-Out (Shift 1)'
                      : stateMachine.state === 'C'
                      ? 'Shift 1 Time-Out Recorded'
                      : stateMachine.state === 'D'
                      ? 'Record Duty Time-Out (Shift 2)'
                      : '2 Shifts Completed Today'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Practicum Hours Remaining & Accumulation Gauge Square */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#020617] dark:text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#F26522]" />
              <span>Practicum Hours Remaining Gauge</span>
            </h3>

            <div className="p-5 bg-gradient-to-br from-slate-50 dark:from-slate-800/80 to-orange-50/40 dark:to-orange-950/20 rounded-xl border border-slate-200 dark:border-slate-700/80 text-center space-y-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Rendered Practicum Progress
              </span>
              <div className="text-4xl font-black text-[#020617] dark:text-white tracking-tight">
                {student.renderedHours.toFixed(1)}h
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Target: <strong>{student.targetHours} Hours</strong>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#F26522] to-amber-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${percentCompleted}%` }}
                />
              </div>

              {/* Hours Remaining Callout Square */}
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-[#FED7AA] dark:border-orange-900/60 space-y-0.5">
                <div className="text-base font-black text-[#D94B0A] dark:text-orange-400">
                  {hoursRemaining.toFixed(1)} Hours Left to Complete
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {percentCompleted}% completed • ~{estimatedDaysRemaining} duty days remaining (at 8h/day)
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800 pt-1">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">Class Block:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{student.classBlock || 'BSCS 4-A'}</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">Company Branch:</span>
                <strong className="text-slate-900 dark:text-white">{student.companyBranch || 'Main Branch'}</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">Attendance Punctuality:</span>
                <strong className="text-emerald-700 dark:text-emerald-400">{student.attendanceRate}%</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">Practicum Coordinator:</span>
                <strong className="text-slate-900 dark:text-white">{coordinatorName || 'Department Practicum Coordinator'}</strong>
              </div>
            </div>
          </div>

          {/* Quick Submit Accomplishment & Export Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                setReportDate(todayStr);
                setIsReportModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold text-xs transition-all duration-150 active:scale-95 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>File Accomplishment Report</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-[#0875e1] hover:bg-[#0660bb] text-white font-bold text-xs transition-all duration-150 active:scale-95 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export BU Portfolio Form (.docx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Calendar Visual (Clickable month calendar with DTR & Accomplishments) */}
      <CalendarVisual
        student={student}
        attendanceLogs={attendanceLogs}
        accomplishmentReports={accomplishmentReports}
        onRefreshData={onRefreshData}
        onOpenReportModal={(dateStr) => {
          setReportDate(dateStr);
          setIsReportModalOpen(true);
        }}
        onOpenExcuseModal={(dateStr) => {
          setSelectedAlertForExcuse({
            id: `alert-manual-${Date.now()}`,
            studentId: student.id,
            studentName: student.fullName,
            companyName: student.companyName,
            anomalyType: 'MISSED_ATTENDANCE_WINDOW',
            severity: 'medium',
            detectionMethod: 'Manual Excuse Filing',
            anomalyScore: 1.0,
            expectedSchedule: `${dateStr} (08:00 - 17:00)`,
            message: `Absence recorded on ${dateStr}`,
            emailDispatched: false,
            pushDispatched: false,
            status: 'pending_review',
            createdAt: new Date().toISOString(),
          });
        }}
      />

      {/* BU Official Accomplishment Report (.docx) Export Action Bar - Positioned Below Calendar */}
      <div className="bg-gradient-to-r from-[#020617] via-[#0B2545] to-[#133E68] rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#0875e1]/30 border border-[#0875e1]/60 text-blue-200 text-[10px] font-bold uppercase tracking-wider">
              Bicol University Official SIP Document
            </span>
            <span className="text-xs text-slate-400">CS Form 2026 Portfolio Paper</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Export Official BU Accomplishment Report (.docx)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Generate and export your genuine Daily, Weekly, and Monthly Practicum Portfolio papers directly adhering to Bicol University's student internship report format.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="shrink-0 px-5 py-3 rounded-xl bg-[#0875e1] hover:bg-[#0660bb] text-white font-bold text-xs transition-all duration-150 active:scale-95 shadow-md hover:shadow-lg flex items-center gap-2.5 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export BU Portfolio (.docx)</span>
        </button>
      </div>

      {/* 6. MODAL: SUBMIT ACCOMPLISHMENT REPORT */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#020617] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#020617] text-white p-5 px-6 flex items-center justify-between border-b border-slate-800/80">
              <div>
                <h3 className="text-base font-extrabold text-white">Submit Daily Accomplishment Report</h3>
                <p className="text-xs text-slate-300">
                  Logs task accomplishments for practicum credit & AI weekly synthesis
                </p>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAccomplishmentSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1 text-slate-800 dark:text-slate-200">
              {reportSuccessFeedback && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{reportSuccessFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duty Date *
                  </label>
                  <input
                    type="text"
                    required
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hours Spent *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={reportHours}
                    onChange={(e) => setReportHours(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Technical Work Category *
                </label>
                <select
                  value={reportCategory}
                  onChange={(e: any) => setReportCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                >
                  <option value="System Testing & QA">System Testing & QA</option>
                  <option value="Frontend Dev">Frontend Dev</option>
                  <option value="Backend Dev">Backend Dev</option>
                  <option value="Documentation">Technical Documentation</option>
                  <option value="Network & IT Support">Network & IT Support</option>
                  <option value="Data Analytics">Data Analytics</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Supervisor-Assigned Duty / Directive (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">HTE Directive</span>
                </div>
                <input
                  type="text"
                  value={reportSupervisorDuty}
                  onChange={(e) => setReportSupervisorDuty(e.target.value)}
                  placeholder="e.g. Assigned to configure staging database cluster and perform regression checks"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Implemented Cypress automated test suite for login modules"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Narrative of Accomplishments *
                </label>
                <textarea
                  required
                  rows={4}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe your technical contributions, tools utilized, code written, and outcomes achieved..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Technical Hurdles / Obstacles Faced (Optional)
                </label>
                <input
                  type="text"
                  value={reportObstacles}
                  onChange={(e) => setReportObstacles(e.target.value)}
                  placeholder="e.g. VPN gateway timeout resolved with DOST network administrator"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReportSubmitting}
                  className="px-5 py-2.5 bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold rounded-xl transition-all duration-150 active:scale-95 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isReportSubmitting ? 'Submitting...' : 'Submit Accomplishment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: SUBMIT OFFICIAL EXCUSE SLIP */}
      {selectedAlertForExcuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#020617] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-[#020617] text-white p-5 px-6 flex items-center justify-between border-b border-slate-800/80">
              <div>
                <h3 className="text-base font-bold text-white">Submit Practicum Excuse Slip</h3>
                <p className="text-xs text-slate-300">
                  Transmitted directly to Practicum Coordinator {coordinatorName ? coordinatorName : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedAlertForExcuse(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExcuseSubmit} className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-slate-800 dark:text-amber-200 font-medium leading-relaxed">
                <span className="font-bold text-[#D94B0A] dark:text-orange-400">Flagged Event: </span>
                "{selectedAlertForExcuse.message}"
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Justification / Official Excuse Narrative *
                </label>
                <textarea
                  required
                  rows={4}
                  value={excuseNotes}
                  onChange={(e) => setExcuseNotes(e.target.value)}
                  placeholder="State the reason for missed time-in (e.g. Official DOST field assignment, medical emergency with certificate, transport suspension)..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>

              {isExcuseSubmitted && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Excuse slip transmitted to coordinator for endorsement!</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAlertForExcuse(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold rounded-xl transition-all duration-150 active:scale-95 shadow-xs cursor-pointer"
                >
                  Submit Excuse Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expected Time Window Modal (Dynamic Schedule) */}
      {isEditScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-950/60 text-[#F26522] rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Update Expected Duty Schedule
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configure official daily duty window in Supabase
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditScheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>Dynamic Time Window:</strong> Your attendance "Late" status will be calculated against this duty start time. A 15-minute grace period is automatically provided.
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duty Start Time
                </label>
                <input
                  type="time"
                  value={scheduleStartInput}
                  onChange={(e) => setScheduleStartInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duty End Time
                </label>
                <input
                  type="time"
                  value={scheduleEndInput}
                  onChange={(e) => setScheduleEndInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditScheduleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={isSavingSchedule}
                className="px-4 py-2 bg-[#F26522] hover:bg-[#D94B0A] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingSchedule ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Schedule</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BU Accomplishment Form DOCX Export Modal */}
      <BUAccomplishmentExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={[student]}
        initialStudentId={student.id}
        attendanceLogs={attendanceLogs}
        accomplishmentReports={accomplishmentReports}
        isCoordinator={false}
      />
    </div>
  );
};
