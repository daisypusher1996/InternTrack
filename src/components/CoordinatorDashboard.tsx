import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Send,
  ExternalLink,
  ChevronRight,
  Search,
  Filter,
  Archive,
  UserCheck,
  UserX,
  FileText,
  Calendar,
  Laptop,
  Check,
  X,
  Shield,
  Layers,
  Download,
  User as UserIcon,
  Loader2,
} from 'lucide-react';
import {
  Student,
  Group,
  Company,
  AttendanceAlert,
  AccomplishmentReport,
  SystemStats,
  AISummary,
  AttendanceLog,
  User,
} from '../types';
import { BUMascotWelcome } from './BUMascotWelcome';

interface CoordinatorDashboardProps {
  currentUser?: User | null;
  stats: SystemStats | null;
  groups: Group[];
  students: Student[];
  companies: Company[];
  alerts: AttendanceAlert[];
  recentReports: AccomplishmentReport[];
  attendanceLogs?: AttendanceLog[];
  latestSummary: AISummary | null;
  onResolveAlert: (id: string, action: 'acknowledge' | 'excuse' | 'sanction') => void;
  onTriggerGroupSummary: (groupId: string) => void;
  onNavigateToTab: (tab: string) => void;
  onApproveCompletion: (studentId: string) => Promise<void>;
  onArchiveStudent: (studentId: string) => Promise<void>;
  onCreditHours: (studentId: string, hours: number) => Promise<void>;
  onApproveEnrollment?: (studentId: string) => Promise<void>;
  onDeclineEnrollment?: (studentId: string, reason?: string) => Promise<void>;
  onCancelEnrollment?: (studentId: string) => Promise<void>;
  onArchiveCourseBlock?: (blockSection: string, academicYear: string) => Promise<void>;
  isSummarizing: boolean;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  currentUser,
  stats,
  groups,
  students,
  companies,
  alerts,
  recentReports,
  attendanceLogs = [],
  latestSummary,
  onResolveAlert,
  onTriggerGroupSummary,
  onNavigateToTab,
  onApproveCompletion,
  onArchiveStudent,
  onCreditHours,
  onApproveEnrollment,
  onDeclineEnrollment,
  onCancelEnrollment,
  onArchiveCourseBlock,
  isSummarizing,
}) => {
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [internFilter, setInternFilter] = useState<'unfinished' | 'approved' | 'all'>('unfinished');

  // Course/Block Directorate Selector state & Accordion state
  const [selectedBlock, setSelectedBlock] = useState<string>('BSCS 4-A');
  const [expandedBlock, setExpandedBlock] = useState<string | null>('BSCS 4-A');
  const [blockViewTab, setBlockViewTab] = useState<'dtr' | 'reports' | 'excuses'>('dtr');

  // Decline enrollment modal/reason state
  const [decliningStudentId, setDecliningStudentId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');

  // Course Block Archival Modal
  const [archivingBlock, setArchivingBlock] = useState<string | null>(null);
  const [archiveTargetSY, setArchiveTargetSY] = useState<string>('2026-2027');

  const pendingAlerts = alerts.filter((a) => a.status === 'pending_review');

  // Filter students strictly to only those under this coordinator's supervision
  const assignedStudents = React.useMemo(() => {
    if (!currentUser || currentUser.role !== 'coordinator') return students;
    return students.filter((s) => {
      if (s.coordinatorId && s.coordinatorId === currentUser.id) return true;
      if (
        s.coordinatorName &&
        currentUser.fullName &&
        s.coordinatorName.toLowerCase().trim() === currentUser.fullName.toLowerCase().trim()
      ) {
        return true;
      }
      // If student has no designated coordinator, display under current coordinator so they don't get lost
      if (!s.coordinatorId && !s.coordinatorName) {
        return true;
      }
      return false;
    });
  }, [students, currentUser]);

  // Pending Enrollments Queue (Students about to start Student Internship or awaiting cohort approvals)
  const pendingEnrollments = assignedStudents.filter(
    (s) =>
      (s.enrollmentStatus === 'pending_approval' || s.enrollmentStatus === 'pending_peer_approval') &&
      !s.isArchived
  );

  // Strictly filter students who are officially enrolled & deployed
  const enrolledAssignedStudents = useMemo(() => {
    return assignedStudents.filter(
      (s) => s.enrollmentStatus === 'approved' && s.deploymentApproved && !s.isArchived
    );
  }, [assignedStudents]);

  // Unfinished Interns vs Approved Interns Lists (Strictly enrolled & deployed students)
  const unfinishedInternsList = enrolledAssignedStudents.filter(
    (s) => !s.completionApproved && s.renderedHours < s.targetHours
  );
  const approvedInternsList = enrolledAssignedStudents.filter(
    (s) => s.completionApproved || s.renderedHours >= s.targetHours
  );
  const activeUnarchivedList = enrolledAssignedStudents;

  const displayedInterns =
    internFilter === 'unfinished'
      ? unfinishedInternsList
      : internFilter === 'approved'
      ? approvedInternsList
      : activeUnarchivedList;

  // Helper to reliably resolve a student's course and class block
  const resolveStudentCourseBlock = (s: Student): string => {
    if (s.classBlock && s.classBlock.trim() !== '' && s.classBlock !== 'Unassigned Block') {
      return s.classBlock.trim();
    }
    if (s.degree) {
      if (s.degree.includes('Computer Science') || s.degree.includes('BSCS')) return 'BSCS 4-A';
      if (s.degree.includes('Information Tech') || s.degree.includes('BSIT')) return 'BSIT 4-A';
      if (s.degree.includes('Information Sys') || s.degree.includes('BSIS')) return 'BSIS 4-A';
      if (s.degree.includes('Biology')) return 'BSBIO 4-A';
      if (s.degree.includes('Chemistry')) return 'BSCHEM 4-A';
      return `${s.degree} 4-A`;
    }
    return 'BSCS 4-A';
  };

  // Helper to format DTR punch times accurately in local time
  const formatDtrTime = (timeVal?: string | null): string => {
    if (!timeVal || timeVal === '--:--') return '--:--';
    try {
      if (timeVal.includes('T')) {
        const d = new Date(timeVal);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }
      const clean = timeVal.trim();
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(clean)) {
        const parts = clean.split(':').map(Number);
        const h = parts[0];
        const m = parts[1];
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
      }
      return timeVal;
    } catch {
      return String(timeVal);
    }
  };

  // Handled Course/Blocks list: lists cohorts with active enrolled students
  const availableBlocks = useMemo(() => {
    const blocksWithEnrolledStudents = enrolledAssignedStudents.map((s) => resolveStudentCourseBlock(s));
    return Array.from(new Set(blocksWithEnrolledStudents)).sort();
  }, [enrolledAssignedStudents]);

  // Students in selected block
  const blockStudents = enrolledAssignedStudents.filter(
    (s) => resolveStudentCourseBlock(s) === selectedBlock
  );
  const blockTotalHours = blockStudents.reduce((acc, s) => acc + s.renderedHours, 0);

  // Today's date string
  const todayStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Filter attendance logs to only include enrolled students to preserve relational integrity
  const enrolledStudentIds = useMemo(() => {
    return new Set(enrolledAssignedStudents.map((s) => s.id));
  }, [enrolledAssignedStudents]);

  const filteredAttendanceLogs = useMemo(() => {
    return attendanceLogs.filter((l) => enrolledStudentIds.has(l.studentId));
  }, [attendanceLogs, enrolledStudentIds]);

  // Today's DTR logs for selected block (from filtered logs)
  const blockLogsToday = blockStudents.map((s) => {
    const log = filteredAttendanceLogs.find(
      (l) => l.studentId === s.id && (l.date === todayStr || l.date.includes('2026'))
    );
    return { student: s, log };
  });

  // Reports for selected block
  const blockReports = recentReports.filter((r) =>
    blockStudents.some((s) => s.id === r.studentId)
  );

  // Alerts & excuses for selected block
  const blockAlerts = alerts.filter((a) =>
    blockStudents.some((s) => s.id === a.studentId)
  );

  const handleBatchArchive = async () => {
    setProcessingId('batch');
    try {
      for (const s of approvedInternsList) {
        await onArchiveStudent(s.id);
      }
      setActionFeedback(`Successfully archived ${approvedInternsList.length} approved intern(s) into their Class Block repository!`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveEnrollment = async (studentId: string) => {
    setProcessingId(studentId);
    try {
      if (onApproveEnrollment) {
        await onApproveEnrollment(studentId);
      } else {
        const res = await fetch(`/api/students/${studentId}/approve-enrollment`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error('Failed to approve enrollment');
      }
      setActionFeedback(`Student internship enrollment & HTE deployment officially approved!`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmDecline = async () => {
    if (!decliningStudentId) return;
    setProcessingId(decliningStudentId);
    try {
      if (onDeclineEnrollment) {
        await onDeclineEnrollment(decliningStudentId, declineReason);
      } else {
        await fetch(`/api/students/${decliningStudentId}/decline-enrollment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: declineReason || 'Enrollment rejected by coordinator.' }),
        });
      }
      setActionFeedback(`Student enrollment application has been declined.`);
      setDecliningStudentId(null);
      setDeclineReason('');
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelEnrollment = async (studentId: string) => {
    setProcessingId(studentId);
    try {
      if (onCancelEnrollment) {
        await onCancelEnrollment(studentId);
      } else {
        const res = await fetch(`/api/students/${studentId}/cancel-enrollment`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error('Failed to cancel enrollment');
      }
      setActionFeedback(`Student enrollment application has been cancelled and reset.`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleArchiveCourseBlock = async () => {
    if (!archivingBlock) return;
    setProcessingId(`block-${archivingBlock}`);
    try {
      if (onArchiveCourseBlock) {
        await onArchiveCourseBlock(archivingBlock, archiveTargetSY);
      } else {
        const res = await fetch('/api/batches/archive-course-block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockSection: archivingBlock, academicYear: archiveTargetSY }),
        });
        if (!res.ok) throw new Error('Failed to archive block');
      }
      setActionFeedback(`Course/Block ${archivingBlock} successfully archived to School Year ${archiveTargetSY} Archive!`);
      setArchivingBlock(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredStudents = assignedStudents.filter((s) => {
    const matchesComp =
      selectedCompanyFilter === 'all' || s.companyId === selectedCompanyFilter;
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.buId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesComp && matchesSearch;
  });

  return (
    <div className="space-y-6">


      {/* 1. Time-Based Welcome Mascot Banner */}
      <BUMascotWelcome
        userName={currentUser?.fullName || 'Practicum Coordinator'}
        role="coordinator"
        pendingApprovalsCount={pendingEnrollments.length}
      />

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="p-4 bg-white dark:bg-[#1e1e1e] border border-emerald-500 rounded-lg text-slate-900 dark:text-white text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => onNavigateToTab('archive')}
            className="text-[11px] text-[#0875e1] hover:text-blue-500 font-extrabold underline flex items-center gap-1 cursor-pointer"
          >
            Open Record Archive <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric / Stat Cards: Responsive light/dark cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Enrolled Interns */}
        <div className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2a2a2a] rounded-lg p-5 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider">Total Enrolled Interns</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-[#2a2a2a] text-[#0875e1]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{enrolledAssignedStudents.length}</div>
            <div className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-1 flex items-center gap-1.5">
              <span className="text-[#10B981] font-bold">Enrolled & Deployed</span>
              <span>•</span>
              <span>{availableBlocks.length} Course Block{availableBlocks.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Partner Establishments (HTEs) */}
        <div className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2a2a2a] rounded-lg p-5 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider">Partner Companies (HTE)</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-[#2a2a2a] text-[#F59E0B]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{companies.length}</div>
            <div className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-1 flex items-center gap-1.5">
              <span className="text-[#10B981] font-bold">Verified Host Partners</span>
              <span>•</span>
              <span>DOST & DICT</span>
            </div>
          </div>
        </div>

        {/* Card 3: Practicum Hours Completed */}
        <div className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2a2a2a] rounded-lg p-5 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider">Hours Rendered</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-[#2a2a2a] text-[#0875e1]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {enrolledAssignedStudents.reduce((acc, s) => acc + s.renderedHours, 0).toFixed(0)}
              <span className="text-lg font-bold text-slate-500 dark:text-[#9CA3AF] ml-1">hrs</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-1 flex items-center gap-1.5">
              <span className="text-[#0875e1] font-bold">Accumulation</span>
              <span>•</span>
              <span>240h Required</span>
            </div>
          </div>
        </div>

        {/* Card 4: Attendance Compliance Rate */}
        <div className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2a2a2a] rounded-lg p-5 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wider">Compliance Rate</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-[#2a2a2a] text-[#10B981]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#10B981] tracking-tight">{stats?.avgAttendanceRate || '98.5'}%</div>
            <div className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-1 flex items-center gap-1.5">
              <span className="text-[#10B981] font-bold">Punctuality Cleared</span>
              <span>•</span>
              <span>15m Grace</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Coordinator Review Queue: Approve or Decline Student Enrollment & Partner Company Deployment */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-slate-200 dark:border-[#2a2a2a] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#2a2a2a]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500 dark:text-[#9CA3AF] font-medium">
                Approval Required for Student Duty Time-In
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#0875e1]" />
              <span>Pending Student Enrollment & Partner Company Deployments</span>
            </h2>
          </div>

          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0875e1] text-white self-start sm:self-auto shadow-xs">
            {pendingEnrollments.length} Application(s) Pending
          </span>
        </div>

        {pendingEnrollments.length === 0 ? (
          <div className="p-6 bg-slate-50 dark:bg-[#121212] rounded-lg border border-slate-200 dark:border-[#2a2a2a] text-center space-y-1.5">
            <CheckCircle2 className="w-7 h-7 text-[#10B981] mx-auto" />
            <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
              All Student Practicum Enrollments & HTE Deployments Verified
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-[#9CA3AF] max-w-md mx-auto">
              No students are currently awaiting placement endorsement. All active interns have verified HTE partner allocations and active duty punches.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingEnrollments.map((stu) => (
              <div
                key={stu.id}
                className="p-4 bg-white dark:bg-[#181818] rounded-lg border border-slate-200 dark:border-[#2a2a2a] hover:border-[#0875e1]/50 shadow-2xs space-y-3 flex flex-col justify-between transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {stu.avatarUrl && stu.avatarUrl.trim() !== '' ? (
                        <img
                          src={stu.avatarUrl}
                          alt={stu.fullName}
                          className="w-11 h-11 rounded-lg object-cover ring-2 ring-[#0875e1]"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                          <UserIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{stu.fullName}</h4>
                        <div className="text-[11px] text-slate-500 dark:text-[#9CA3AF] font-mono">
                          {stu.buId} • {stu.classBlock || 'BSCS 4-A'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#F97316] text-white font-bold text-[10px] uppercase shadow-2xs">
                      Pending Approval
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#121212] rounded-lg border border-slate-200 dark:border-[#2a2a2a] space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-[#9CA3AF]">Requested Host Company (HTE):</span>
                      <strong className="text-slate-900 dark:text-white font-bold">{stu.companyName}</strong>
                    </div>
                    {stu.companyBranch && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-[#9CA3AF]">Company Branch / Site:</span>
                        <strong className="text-blue-500 dark:text-blue-400 font-bold">{stu.companyBranch}</strong>
                      </div>
                    )}
                    {stu.scheduledDeploymentDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-[#9CA3AF]">Scheduled Deployment Date:</span>
                        <strong className="text-[#F26522] font-bold">{stu.scheduledDeploymentDate}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-[#9CA3AF]">Target Practicum Hours:</span>
                      <strong className="text-[#10B981] font-bold">{stu.targetHours} Hours</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-[#9CA3AF]">Scheduled Duty Window:</span>
                      <strong className="text-slate-900 dark:text-white font-mono">{stu.dutyStart} – {stu.dutyEnd}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-[#9CA3AF]">HTE Company Mentor:</span>
                      <strong className="text-slate-900 dark:text-white">{stu.mentorName}</strong>
                    </div>
                  </div>
                </div>

                {/* Approve / Decline / Cancel Action Controls */}
                <div className="pt-2 border-t border-slate-200 dark:border-[#2a2a2a] flex items-center justify-end gap-2 text-xs flex-wrap">
                  <button
                    onClick={() => handleCancelEnrollment(stu.id)}
                    disabled={processingId === stu.id}
                    className="px-3.5 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-[#D94B0A] dark:text-orange-400 font-bold transition-all active:scale-95 flex items-center gap-1.5 border border-[#FED7AA] dark:border-orange-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Enrollment</span>
                  </button>

                  <button
                    onClick={() => setDecliningStudentId(stu.id)}
                    disabled={processingId === stu.id}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-red-50 dark:bg-[#2a2a2a] dark:hover:bg-red-500/20 text-slate-700 hover:text-red-600 dark:text-[#9CA3AF] dark:hover:text-red-400 font-bold transition-all active:scale-95 flex items-center gap-1.5 border border-slate-300 dark:border-[#333333] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>

                  <button
                    onClick={() => handleApproveEnrollment(stu.id)}
                    disabled={processingId === stu.id}
                    className="px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-bold transition-all active:scale-95 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{processingId === stu.id ? 'Approving...' : 'Approve Enrollment & HTE'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Up-to-Date Tracking of Current Handled Course/Blocks - Accordion Layout */}
      <div className="bg-white dark:bg-[#18181b] rounded-2xl shadow-md shadow-slate-200/50 dark:shadow-black/30 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-[#0875e1]/10 text-[#0875e1] font-extrabold text-[10px] uppercase">
                Academic Course/Block Practicum Supervision
              </span>
              <span className="text-xs text-slate-500 dark:text-[#9CA3AF] font-medium">
                Live DTR Punches, Daily Reports & Excuse Slips
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0875e1]" />
              <span>Current Handled Course / Blocks Live Tracking</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click any course block below to expand or collapse real-time cohort tracking.
          </p>
        </div>

        {/* Course Blocks Accordion */}
        {availableBlocks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#141416]/50">
            <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Active Course Block Cohorts Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Cohorts only appear here once student interns have enrolled into their corresponding course and class block under your practicum supervision.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableBlocks.map((blk) => {
              const currStudents = enrolledAssignedStudents.filter((s) => resolveStudentCourseBlock(s) === blk);
              const currHours = currStudents.reduce((acc, s) => acc + s.renderedHours, 0);
              const currLogsToday = currStudents.map((s) => {
                const log = filteredAttendanceLogs.find(
                  (l) => l.studentId === s.id && (l.date === todayStr || l.date.includes('2026'))
                );
                return { student: s, log };
              });
            const currReports = recentReports.filter((r) =>
              currStudents.some((s) => s.id === r.studentId)
            );
            const currAlerts = alerts.filter((a) =>
              currStudents.some((s) => s.id === a.studentId)
            );
            const onDutyCount = currLogsToday.filter(
              (item) => item.log?.actualTimeIn && !item.log?.actualTimeOut
            ).length;

            const isExpanded = expandedBlock === blk;

            return (
              <div
                key={blk}
                className="bg-slate-50/80 dark:bg-[#1f1f23] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
              >
                {/* Accordion Trigger Header */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedBlock(isExpanded ? null : blk);
                    setSelectedBlock(blk);
                  }}
                  className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-[#25252a] cursor-pointer"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-sm transition-colors ${
                        isExpanded
                          ? 'bg-[#0875e1] text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {blk.split(' ')[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                          {blk} Practicum Cohort
                        </h3>
                        <span className="text-[10px] text-[#10B981] bg-[#10B981]/15 px-2.5 py-1 rounded-md font-bold">
                          Active in Practicum
                        </span>
                        {onDutyCount > 0 && (
                          <span className="text-[10px] text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 px-2.5 py-1 rounded-md font-bold">
                            {onDutyCount} On Duty Now
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5 truncate">
                        {currStudents.length} Students Handled • {currHours.toFixed(1)} Cumulative Hours • {currReports.length} Reports
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden xs:inline">
                      {isExpanded ? 'Hide Details' : 'View Live Tracking'}
                    </span>
                    <div
                      className={`p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </button>

                {/* Accordion Expandable Content */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-slate-200/70 dark:border-slate-800 space-y-4">
                    {/* Controls Strip: Sub-Tabs & Archive Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
                      {/* Sub-Tabs */}
                      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#141416] rounded-lg text-xs font-bold shadow-xs overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setBlockViewTab('dtr')}
                          className={`px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            blockViewTab === 'dtr'
                              ? 'bg-[#0875e1] text-white shadow-sm'
                              : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Today's DTR Punches</span>
                          <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px]">
                            {currLogsToday.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBlockViewTab('reports')}
                          className={`px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            blockViewTab === 'reports'
                              ? 'bg-[#0875e1] text-white shadow-sm'
                              : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Accomplishments</span>
                          <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px]">
                            {currReports.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBlockViewTab('excuses')}
                          className={`px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            blockViewTab === 'excuses'
                              ? 'bg-[#0875e1] text-white shadow-sm'
                              : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Absences & Excuses</span>
                          <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px]">
                            {currAlerts.length}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                        {/* Archive Block Button */}
                        <button
                          type="button"
                          onClick={() => setArchivingBlock(blk)}
                          className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 dark:bg-[#252529] dark:hover:bg-[#2e2e33] text-slate-800 dark:text-white font-bold text-xs transition-all active:scale-95 shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
                        >
                          <Archive className="w-4 h-4 text-[#F59E0B]" />
                          <span>Archive {blk} Cohort</span>
                        </button>
                      </div>
                    </div>

                    {/* SUBVIEW 1: Live Today's Time Ins/Outs */}
                    {blockViewTab === 'dtr' && (
                      <div className="overflow-x-auto rounded-lg bg-white dark:bg-[#141416] shadow-xs">
                        <table className="w-full text-left text-xs min-w-[720px]">
                          <thead className="bg-slate-100/70 dark:bg-[#1a1a1e] text-slate-600 dark:text-[#9CA3AF] border-b border-slate-200/60 dark:border-slate-800">
                            <tr>
                              <th className="py-3 px-3.5">Student Intern</th>
                              <th className="py-3 px-3.5">BU ID</th>
                              <th className="py-3 px-3.5">Host Company (HTE)</th>
                              <th className="py-3 px-3.5">Duty Window</th>
                              <th className="py-3 px-3.5">Time-In</th>
                              <th className="py-3 px-3.5">Time-Out</th>
                              <th className="py-3 px-3.5">Today's Duty Status</th>
                              <th className="py-3 px-3.5">Workstation IP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {currLogsToday.map(({ student: s, log }) => (
                              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#1c1c20] transition-colors">
                                <td className="py-3 px-3.5">
                                  <div className="flex items-center gap-2.5">
                                    {s.avatarUrl && s.avatarUrl.trim() !== '' ? (
                                      <img
                                        src={s.avatarUrl}
                                        alt={s.fullName}
                                        className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                                        <UserIcon className="w-4 h-4" />
                                      </div>
                                    )}
                                    <span className="font-bold text-slate-900 dark:text-white">{s.fullName}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3.5 font-mono text-slate-500 dark:text-[#9CA3AF]">{s.buId}</td>
                                <td className="py-3 px-3.5 text-slate-600 dark:text-[#9CA3AF]">{s.companyName}</td>
                                <td className="py-3 px-3.5 font-mono text-slate-500 dark:text-[#9CA3AF]">
                                  {s.dutyStart} – {s.dutyEnd}
                                </td>
                                <td className="py-3 px-3.5 font-mono font-bold text-[#10B981]">
                                  {log?.actualTimeIn ? formatDtrTime(log.actualTimeIn) : <span className="text-slate-400 dark:text-[#9CA3AF]/60 font-normal">--:--</span>}
                                </td>
                                <td className="py-3 px-3.5 font-mono font-bold text-[#10B981]">
                                  {log?.actualTimeOut ? formatDtrTime(log.actualTimeOut) : log?.actualTimeIn ? <span className="text-amber-600 dark:text-amber-400 font-bold">Active On Duty</span> : <span className="text-slate-400 dark:text-[#9CA3AF]/60 font-normal">--:--</span>}
                                </td>
                                <td className="py-3 px-3.5">
                                  {log?.actualTimeIn ? (
                                    <span className="px-2.5 py-1 rounded-md bg-[#10B981]/15 text-[#10B981] font-extrabold text-[10px]">
                                      ON DUTY (PRESENT)
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-[#9CA3AF] font-medium text-[10px]">
                                      NOT YET LOGGED
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 dark:text-[#9CA3AF]">
                                  {log?.workstationIp || 'Intranet Subnet'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* SUBVIEW 2: Accomplishment Reports for Block */}
                    {blockViewTab === 'reports' && (
                      <div className="space-y-3">
                        {currReports.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] italic p-6 text-center bg-white dark:bg-[#141416] rounded-lg shadow-xs">
                            No accomplishment reports filed yet by students in {blk}.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {currReports.map((rep) => (
                              <div
                                key={rep.id}
                                className="p-4 bg-white dark:bg-[#141416] rounded-lg shadow-xs hover:shadow-md transition-shadow space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#F97316] text-white shadow-xs">
                                    {rep.workCategory}
                                  </span>
                                  <span className="font-mono text-slate-500 dark:text-[#9CA3AF] text-[11px]">{rep.date}</span>
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-slate-900 dark:text-white">{rep.taskTitle}</h4>
                                  <p className="text-slate-600 dark:text-[#9CA3AF] text-[11px] mt-0.5 line-clamp-2">
                                    {rep.taskDescription}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] gap-2">
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-white">{rep.studentName}</span>
                                    <span className="font-mono font-bold text-[#10B981] ml-2">+{rep.hoursSpent}h</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUBVIEW 3: Absences & Excuses for Block */}
                    {blockViewTab === 'excuses' && (
                      <div className="space-y-3">
                        {currAlerts.length === 0 ? (
                          <p className="text-xs text-[#10B981] font-semibold p-4 text-center bg-[#10B981]/10 rounded-lg shadow-xs">
                            ✓ No unexcused absences or flagged schedule anomalies for {blk}!
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {currAlerts.map((alt) => (
                              <div
                                key={alt.id}
                                className="p-4 bg-white dark:bg-[#141416] rounded-lg shadow-xs space-y-3 text-xs"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#F59E0B]/20 text-[#F59E0B]">
                                        {alt.anomalyType.replace(/_/g, ' ')}
                                      </span>
                                      <strong className="text-slate-900 dark:text-white text-xs">{alt.studentName}</strong>
                                    </div>
                                    <p className="text-slate-600 dark:text-[#9CA3AF] mt-1 leading-relaxed">"{alt.message}"</p>
                                  </div>
                                  <span className="text-[11px] text-slate-500 dark:text-[#9CA3AF] font-mono shrink-0">
                                    {alt.expectedSchedule}
                                  </span>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-[11px] text-slate-500 dark:text-[#9CA3AF]">
                                    Status: <strong className="text-slate-900 dark:text-white">{alt.status.replace(/_/g, ' ').toUpperCase()}</strong>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => onResolveAlert(alt.id, 'sanction')}
                                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 font-bold transition-all active:scale-95 text-xs shadow-xs hover:shadow cursor-pointer"
                                    >
                                      Decline / Sanction
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onResolveAlert(alt.id, 'excuse')}
                                      className="px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-bold transition-all active:scale-95 text-xs shadow-sm hover:shadow-md cursor-pointer"
                                    >
                                      Approve Official Excuse Slip
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* 4. Current Unfinished Interns in Terms of Hours (Coordinator Deficit Tracker & Archival Approval) */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-slate-200 dark:border-[#2a2a2a] p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500 dark:text-[#9CA3AF] font-semibold">
                Required Target: 240.0 Hours Standard
              </span>
            </div>
            <h2 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0875e1]" />
              <span>Current Unfinished Interns in Terms of Hours</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF] max-w-2xl">
              Monitors active interns working toward the 240-hour threshold. Once verified and approved of completion by the coordinator, they can be officially archived into their respective Class Block repository.
            </p>
          </div>

          {/* Filter Pills for Unfinished vs Approved Interns */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#121212] rounded-lg border border-slate-200 dark:border-[#2a2a2a] text-xs font-semibold self-start md:self-auto">
            <button
              onClick={() => setInternFilter('unfinished')}
              className={`px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                internFilter === 'unfinished'
                  ? 'bg-[#0875e1] text-white font-extrabold shadow-xs'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Unfinished (&lt; 240h)</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 font-bold">
                {unfinishedInternsList.length}
              </span>
            </button>

            <button
              onClick={() => setInternFilter('approved')}
              className={`px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                internFilter === 'approved'
                  ? 'bg-[#0875e1] text-white font-extrabold shadow-xs'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Ready to Archive</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-emerald-100 dark:bg-[#10B981]/30 text-emerald-800 dark:text-[#10B981] font-bold">
                {approvedInternsList.length}
              </span>
            </button>

            <button
              onClick={() => setInternFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                internFilter === 'all'
                  ? 'bg-[#0875e1] text-white font-extrabold shadow-xs'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>All Active</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-200 dark:bg-[#2a2a2a] text-slate-700 dark:text-[#9CA3AF] font-bold">
                {activeUnarchivedList.length}
              </span>
            </button>
          </div>
        </div>

        {/* Batch Archival Banner when Approved Interns Exist */}
        {approvedInternsList.length > 0 && (
          <div className="p-4 bg-emerald-50/80 dark:bg-[#181818] border border-emerald-300 dark:border-[#10B981]/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#10B981] text-white rounded-lg shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                  {approvedInternsList.length} Intern(s) Approved for Practicum Completion
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-[#9CA3AF]">
                  These interns have completed 240 hours or received clearance endorsement. Ready to be moved to the Class Block Record Archive.
                </p>
              </div>
            </div>
            <button
              onClick={handleBatchArchive}
              disabled={processingId === 'batch'}
              className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-lg transition-all active:scale-95 shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              <span>
                {processingId === 'batch'
                  ? 'Archiving...'
                  : `Archive All Approved (${approvedInternsList.length})`}
              </span>
            </button>
          </div>
        )}

        {/* Cards Grid */}
        {displayedInterns.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-[#181818] rounded-lg border border-slate-200 dark:border-[#2a2a2a] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              {internFilter === 'approved'
                ? 'No Interns Currently Awaiting Archival'
                : 'No Interns Match the Current Filter'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF] max-w-md mx-auto">
              All interns are currently up-to-date or already archived.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedInterns.map((s) => {
              const deficit = Math.max(0, s.targetHours - s.renderedHours);
              const percent = Math.min(100, Math.round((s.renderedHours / s.targetHours) * 100));
              const isEligibleOrComplete = s.renderedHours >= s.targetHours || s.completionApproved;

              return (
                <div
                  key={s.id}
                  className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                    s.completionApproved
                      ? 'bg-emerald-50/40 dark:bg-[#181818] border-emerald-300 dark:border-[#10B981]/50 shadow-xs'
                      : deficit === 0
                      ? 'bg-amber-50/40 dark:bg-[#181818] border-amber-300 dark:border-[#F59E0B]/50 shadow-xs'
                      : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-[#2a2a2a] hover:border-[#0875e1]/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {s.avatarUrl && s.avatarUrl.trim() !== '' ? (
                          <img
                            src={s.avatarUrl}
                            alt={s.fullName}
                            className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-[#2a2a2a]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                            <UserIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs">{s.fullName}</h4>
                          <div className="text-[11px] text-slate-500 dark:text-[#9CA3AF] font-mono">
                            {s.buId} • {s.classBlock || 'BSCS 4-A'}
                          </div>
                        </div>
                      </div>

                      {s.completionApproved ? (
                        <span className="px-2.5 py-1 rounded-md bg-[#10B981]/15 text-[#10B981] font-extrabold text-[10px] border border-[#10B981]/30">
                          COMPLETION APPROVED
                        </span>
                      ) : deficit === 0 ? (
                        <span className="px-2.5 py-1 rounded-md bg-[#F59E0B]/15 text-[#F59E0B] font-extrabold text-[10px] border border-[#F59E0B]/30">
                          HOURS COMPLETED (240h)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold text-[10px] border border-red-200 dark:border-red-800/40">
                          -{deficit.toFixed(1)}h DEFICIT
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-[#121212] rounded-lg border border-slate-200 dark:border-[#2a2a2a] space-y-1.5 text-[11px]">
                      <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                        <span>Host Company (HTE):</span>
                        <strong className="truncate max-w-[170px] text-slate-900 dark:text-white">{s.companyName}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                        <span>Rendered Progress:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {s.renderedHours.toFixed(1)} / {s.targetHours}h ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-[#2a2a2a] rounded-md h-2 mt-1 overflow-hidden">
                        <div
                          className={`h-2 rounded-md ${
                            s.completionApproved
                              ? 'bg-[#10B981]'
                              : 'bg-gradient-to-r from-[#0875e1] to-[#10B981]'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 dark:text-[#9CA3AF] pt-0.5">
                        <span>Punctuality: <strong className="text-slate-900 dark:text-white">{s.attendanceRate}%</strong></span>
                        <span className={deficit > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-[#10B981] font-bold'}>
                          {deficit > 0 ? `${deficit.toFixed(1)}h remaining` : 'Target fulfilled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Coordinator */}
                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-[#2a2a2a] flex items-center justify-between gap-2 text-xs">
                    <div>
                      {s.completionApproved ? (
                        <span className="text-[11px] text-[#10B981] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed • Ready for Archival
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 dark:text-[#9CA3AF] font-medium">
                          Practicum in progress
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!s.completionApproved ? (
                        <button
                          onClick={async () => {
                            setProcessingId(s.id);
                            try {
                              await onApproveCompletion(s.id);
                              s.completionApproved = true;
                              s.status = 'completed';
                              setActionFeedback(`Practicum completion officially approved for ${s.fullName}. You can now archive them into their Class Block repository.`);
                              setTimeout(() => setActionFeedback(null), 3500);
                            } catch (err: any) {
                              setActionFeedback(err.message || 'Failed to approve completion.');
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          disabled={processingId === s.id}
                          className="px-3 py-1.5 rounded-lg bg-[#0875e1] hover:bg-[#007BFF] text-white font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          {processingId === s.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Approving...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve Completion</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            setProcessingId(s.id);
                            try {
                              await onArchiveStudent(s.id);
                              s.isArchived = true;
                              setActionFeedback(`Successfully transferred ${s.fullName} to the Class Block (${s.classBlock || 'BSCS 4-A'}) Record Archive!`);
                              setTimeout(() => setActionFeedback(null), 4000);
                            } catch (err: any) {
                              setActionFeedback(err.message || 'Failed to archive student.');
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          disabled={processingId === s.id}
                          className="px-3 py-1.5 rounded-lg bg-[#0875e1] hover:bg-[#007BFF] text-white font-bold text-xs transition-all active:scale-95 shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archive Intern Record</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: DECLINE ENROLLMENT REASON */}
      {decliningStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a2a2a] overflow-hidden">
            <div className="bg-slate-50 dark:bg-[#121212] text-slate-900 dark:text-white p-5 px-6 flex items-center justify-between border-b border-slate-200 dark:border-[#2a2a2a]">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Decline Student Practicum Enrollment</h3>
              <button
                onClick={() => setDecliningStudentId(null)}
                className="p-1.5 rounded-lg text-slate-400 dark:text-[#9CA3AF] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-slate-800 dark:text-white">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-[#9CA3AF] mb-1">
                  Reason for Decline (Transmitted to Student) *
                </label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Host company capacity reached; please choose an alternative HTE partner..."
                  className="w-full p-2.5 bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2a2a2a] rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-[#0875e1]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={() => setDecliningStudentId(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-[#2a2a2a] hover:bg-slate-200 dark:hover:bg-[#333333] text-slate-700 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecline}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ARCHIVE COURSE/BLOCK TO SCHOOL YEAR */}
      {archivingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a2a2a] overflow-hidden">
            <div className="bg-slate-50 dark:bg-[#121212] text-slate-900 dark:text-white p-5 px-6 flex items-center justify-between border-b border-slate-200 dark:border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Archive Course/Block to School Year</h3>
              </div>
              <button
                onClick={() => setArchivingBlock(null)}
                className="p-1.5 rounded-lg text-slate-400 dark:text-[#9CA3AF] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-slate-800 dark:text-white">
              <p className="text-slate-600 dark:text-[#9CA3AF] leading-relaxed">
                You are about to transfer all finished student intern records in{' '}
                <strong className="text-slate-900 dark:text-white">{archivingBlock}</strong> into the official School Year archive.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-[#9CA3AF] mb-1">
                  Target Academic School Year Archive *
                </label>
                <select
                  value={archiveTargetSY}
                  onChange={(e) => setArchiveTargetSY(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2a2a2a] rounded-lg font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-[#0875e1]"
                >
                  <option value="2026-2027">SY 2026-2027 (Current Academic Year)</option>
                  <option value="2025-2026">SY 2025-2026 (Previous Academic Year)</option>
                  <option value="2024-2025">SY 2024-2025 (Historical Archive)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-[#121212] rounded-lg border border-amber-200 dark:border-[#F59E0B]/30 text-amber-800 dark:text-[#F59E0B] text-[11px]">
                Students will be stored permanently under their Course & Block Section in the Record Archive repository.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={() => setArchivingBlock(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-[#2a2a2a] hover:bg-slate-200 dark:hover:bg-[#333333] text-slate-700 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleArchiveCourseBlock}
                  className="px-4 py-2 bg-[#0875e1] hover:bg-[#007BFF] text-white font-bold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  Archive Course Block Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
