import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  ShieldCheck,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Building2,
  User,
  History,
  Laptop,
  Search,
  Filter,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Student, AttendanceLog } from '../types';

interface AttendancePortalProps {
  students: Student[];
  attendanceLogs: AttendanceLog[];
  onTimeIn: (studentId: string, remarks?: string, dtrImageLink?: string) => Promise<void>;
  onTimeOut: (studentId: string, remarks?: string, dtrImageLink?: string) => Promise<void>;
  isCoordinator?: boolean;
  coordinatorName?: string;
}

export const AttendancePortal: React.FC<AttendancePortalProps> = ({
  students,
  attendanceLogs,
  onTimeIn,
  onTimeOut,
  isCoordinator = false,
  coordinatorName,
}) => {
  // Strictly filter enrolled students for coordinator views & DTR logs
  const enrolledStudents = useMemo(() => {
    return students.filter(
      (s) => s.enrollmentStatus === 'approved' && s.deploymentApproved && !s.isArchived
    );
  }, [students]);

  const enrolledStudentIds = useMemo(() => {
    return new Set(enrolledStudents.map((s) => s.id));
  }, [enrolledStudents]);

  const activeStudentList = isCoordinator ? enrolledStudents : students;

  const validAttendanceLogs = useMemo(() => {
    return isCoordinator
      ? attendanceLogs.filter((l) => enrolledStudentIds.has(l.studentId))
      : attendanceLogs;
  }, [attendanceLogs, enrolledStudentIds, isCoordinator]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    activeStudentList[0]?.id || ''
  );
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [remarks, setRemarks] = useState('');
  const [dtrImageLink, setDtrImageLink] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter state for coordinator audit table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'active_on_duty' | 'absent'>('all');

  // Live clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentStudent = activeStudentList.find((s) => s.id === selectedStudentId) || activeStudentList[0] || students[0];

  // Check today's log for the student
  const todayStr = currentTime.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const currentStudentLog = validAttendanceLogs.find(
    (l) => l.studentId === currentStudent?.id && l.date === todayStr
  );

  const hasTimedIn = Boolean(currentStudentLog && currentStudentLog.actualTimeIn);
  const hasTimedOut = Boolean(currentStudentLog && currentStudentLog.actualTimeOut);

  const handleTimeIn = async () => {
    if (!currentStudent) return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onTimeIn(currentStudent.id, remarks || 'Workstation authenticated time-in', dtrImageLink);
      setFeedback({
        type: 'success',
        message: `Time-in successfully logged for ${currentStudent.fullName} at ${currentStudent.companyName}.`,
      });
      setRemarks('');
      setDtrImageLink('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record time-in' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimeOut = async () => {
    if (!currentStudent) return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onTimeOut(currentStudent.id, remarks || 'Workstation authenticated time-out', dtrImageLink);
      setFeedback({
        type: 'success',
        message: `Time-out successfully logged for ${currentStudent.fullName}. Hours credited to practicum record.`,
      });
      setRemarks('');
      setDtrImageLink('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record time-out' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered attendance logs for the DTR Audit Log, sorted chronologically by date
  const filteredLogs = validAttendanceLogs
    .filter((log) => {
      const matchesSearch =
        log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.date.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'present' && log.status === 'present') ||
        (statusFilter === 'late' && log.status === 'late') ||
        (statusFilter === 'absent' && log.status === 'absent') ||
        (statusFilter === 'active_on_duty' && log.actualTimeIn && !log.actualTimeOut);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.studentName.localeCompare(b.studentName));

  // Coordinator stats calculations
  const presentTodayCount = validAttendanceLogs.filter((l) => l.actualTimeIn).length;
  const activeOnDutyCount = validAttendanceLogs.filter((l) => l.actualTimeIn && !l.actualTimeOut).length;
  const completedDutiesCount = validAttendanceLogs.filter((l) => l.actualTimeIn && l.actualTimeOut).length;
  const lateCount = validAttendanceLogs.filter((l) => l.status === 'late').length;

  return (
    <div className="space-y-6">
      {/* Header and Live Clock Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400 font-bold text-xs border border-[#FED7AA] dark:border-orange-800">
                Verifiable Online Attendance System
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bicol University Student Internship Portal</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B2545] dark:text-white">
              {isCoordinator
                ? 'Verifiable Daily Time Records (DTR) & Attendance Audit'
                : 'Daily Time-In & Time-Out Station'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              {isCoordinator
                ? 'Audit and inspect tamper-evident daily time-in/out records submitted by student interns from host training establishments.'
                : 'Tied to your specific partner company assignment with IP subnet verification. Replaces manual paper logbooks and unstructured chat reports.'}
            </p>
          </div>

          {/* Live Digital Clock */}
          <div className="bg-[#020617] text-white p-4 rounded-2xl shadow-sm border border-slate-800 flex items-center gap-4 shrink-0">
            <div className="p-3 bg-[#F26522] rounded-lg text-white">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Philippine Standard Time (PST)
              </div>
              <div className="text-2xl md:text-3xl font-mono font-extrabold text-[#FED7AA] tracking-tight">
                {currentTime.toLocaleTimeString('en-US', { hour12: true })}
              </div>
              <div className="text-xs text-slate-400">
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Coordinator Notice Banner: No manual punches */}
        {isCoordinator && (
          <div className="mt-4 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-lg flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Coordinator Audit Directorate:</strong> Time-in and time-out punches are recorded directly by student interns from their verified host company workstations.
              Manual punch inputs are disabled for coordinator accounts to maintain strict tamper-evident compliance and verifiable audit trails.
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg border flex items-center gap-2 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* COORDINATOR VIEW: Live Attendance Analytics & Compliance Overview */}
      {isCoordinator && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Recorded Punches Today
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {presentTodayCount}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              Verified workstation logs
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Currently Active On Duty
            </div>
            <div className="text-2xl font-black text-[#F26522] mt-1">
              {activeOnDutyCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Timed in, awaiting shift completion
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Completed Duty Shifts
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {completedDutiesCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Both time-in & out logged
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Late Arrivals Flagged
            </div>
            <div className="text-2xl font-black text-amber-500 mt-1">
              {lateCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Beyond 15-minute grace window
            </div>
          </div>
        </div>
      )}

      {/* STUDENT VIEW ONLY: Check-in Console with Time-In / Time-Out Buttons */}
      {!isCoordinator && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <h2 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-[#F26522]" />
                Workstation Attendance Console
              </h2>

              {/* Student Switcher for Simulation */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Active Intern:</span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setFeedback(null);
                  }}
                  className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#F26522]"
                >
                  {activeStudentList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.companyName.split('(')[0]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Profile & Assignment Card */}
            {currentStudent && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {currentStudent.avatarUrl && currentStudent.avatarUrl.trim() !== '' ? (
                    <img
                      src={currentStudent.avatarUrl}
                      alt={currentStudent.fullName}
                      className="w-12 h-12 rounded-lg object-cover ring-2 ring-[#FED7AA] dark:ring-orange-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{currentStudent.fullName}</h3>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                        {currentStudent.buId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-[#F26522]" />
                      <span>{currentStudent.companyName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cohort: <strong className="dark:text-slate-200">{currentStudent.groupName || 'Individual Track'}</strong> • Mentor:{' '}
                      <strong className="dark:text-slate-200">{currentStudent.mentorName}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  <div className="text-slate-500 dark:text-slate-400">Expected Duty Window:</div>
                  <div className="font-mono font-bold text-[#0B2545] dark:text-white text-sm">
                    {currentStudent.dutyStart} – {currentStudent.dutyEnd}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    15-min grace period enabled
                  </div>
                </div>
              </div>
            )}

            {/* Status Indicators & IP Verification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-950 dark:text-emerald-200">Workstation IP Verified</div>
                  <div className="text-emerald-800 dark:text-emerald-400 text-[11px]">
                    Subnet: 192.168.10.155 (DOST Legazpi Intranet)
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800/80 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <div className="font-bold text-blue-950 dark:text-blue-200">Geolocation Coordinate Check</div>
                  <div className="text-blue-800 dark:text-blue-400 text-[11px]">
                    Legazpi City, Albay (Host Facility Perimeter)
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Remarks & Backup DTR Link inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duty Remarks / Terminal Location (Optional)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Science & Tech Center, 2nd Floor IT Station 4"
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Backup DTR Image Link (e.g., Google Drive)
                </label>
                <input
                  type="text"
                  value={dtrImageLink}
                  onChange={(e) => setDtrImageLink(e.target.value)}
                  placeholder="e.g. https://drive.google.com/file/d/12345..."
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522] focus:outline-none"
                />
              </div>
            </div>

            {/* Check-In / Check-Out Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={handleTimeIn}
                disabled={isProcessing || hasTimedIn}
                className={`py-3.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer ${
                  hasTimedIn
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                    : 'bg-[#F26522] hover:bg-[#D94B0A] text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                {hasTimedIn
                  ? `Time-In Recorded (${currentStudentLog?.actualTimeIn})`
                  : 'Record Duty Time-In'}
              </button>

              <button
                onClick={handleTimeOut}
                disabled={isProcessing || !hasTimedIn || hasTimedOut}
                className={`py-3.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer ${
                  !hasTimedIn
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                    : hasTimedOut
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                    : 'bg-[#020617] hover:bg-slate-800 text-white border border-slate-700'
                }`}
              >
                <LogOut className="w-4 h-4" />
                {hasTimedOut
                  ? `Time-Out Recorded (${currentStudentLog?.actualTimeOut})`
                  : 'Record Duty Time-Out'}
              </button>
            </div>
          </div>

          {/* Student Progress Snapshot Sidebar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#0B2545] dark:text-white">Student Practicum Accumulation</h3>

            {currentStudent && (
              <div className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/80 text-center">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Total Hours Rendered</span>
                  <span className="text-3xl font-extrabold text-[#0B2545] dark:text-white">
                    {currentStudent.renderedHours}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs"> / {currentStudent.targetHours} Target Hours</span>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-md h-2 mt-3 overflow-hidden">
                    <div
                      className="bg-[#F26522] h-2 rounded-md"
                      style={{
                        width: `${Math.min(
                          100,
                          (currentStudent.renderedHours / currentStudent.targetHours) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                    {Math.round((currentStudent.renderedHours / currentStudent.targetHours) * 100)}%
                    Requirement Completed
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Attendance Rate:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{currentStudent.attendanceRate}%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Assigned HTE:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-right truncate max-w-[150px]">
                      {currentStudent.companyName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Student Internship Coordinator:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{coordinatorName || 'Department Practicum Coordinator'}</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                  <strong>Schedule Verification Rule:</strong> If time-in is not logged within 15 minutes of duty start ({currentStudent.dutyStart}), the AI engine flags the entry and automatically dispatches alerts.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verifiable Daily Time Records (DTR) Audit Logbook (Full Width Table) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#F26522]" />
              <span>Verifiable Daily Time Records (DTR) & Workstation Audit ({filteredLogs.length})</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tamper-evident logs tied to host training establishments with IP verification audits.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search intern or company..."
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F26522] w-52"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-[#F26522]"
            >
              <option value="all">All Logs</option>
              <option value="present">Present</option>
              <option value="active_on_duty">Active On Duty</option>
              <option value="late">Late Arrival</option>
              <option value="absent">Window Missed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 font-semibold">Student Intern</th>
                <th className="py-3 px-4 font-semibold">Partner Company</th>
                <th className="py-3 px-4 font-semibold">Expected Window</th>
                <th className="py-3 px-4 font-semibold">Actual Time-In</th>
                <th className="py-3 px-4 font-semibold">Actual Time-Out</th>
                <th className="py-3 px-4 font-semibold">Hours Rendered</th>
                <th className="py-3 px-4 font-semibold">Verification Audit</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No attendance records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const isNewDate = index === 0 || log.date !== filteredLogs[index - 1].date;
                  return (
                    <React.Fragment key={log.id}>
                      {isNewDate && (
                        <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
                          <td colSpan={8} className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#F26522]" />
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Duty Date:
                                </span>
                                <span className="text-xs font-extrabold text-[#0B2545] dark:text-[#FED7AA]">
                                  {log.date}
                                </span>
                              </div>
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {filteredLogs.filter((l) => l.date === log.date).length} student record{filteredLogs.filter((l) => l.date === log.date).length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-[#0B2545] dark:bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {log.studentName.charAt(0)}
                            </div>
                            <span>{log.studentName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{log.companyName}</td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {log.expectedTimeIn} – {log.expectedTimeOut}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {log.actualTimeIn ? (
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{log.actualTimeIn}</span>
                          ) : (
                            <span className="text-red-500 font-bold bg-red-50 dark:bg-red-950/80 px-2 py-0.5 rounded">
                              Not Logged
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {log.actualTimeOut ? (
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{log.actualTimeOut}</span>
                          ) : log.actualTimeIn ? (
                            <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded">
                              Active On Duty
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">--:--</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#0B2545] dark:text-white">
                          {log.hoursRendered > 0 ? `${log.hoursRendered} hrs` : '0.0 hrs'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{log.workstationIp}</span>
                          </div>
                          {log.remarks && (
                            <div className="text-[10px] text-slate-400 italic truncate max-w-[150px]">
                              {log.remarks}
                            </div>
                          )}
                          {log.dtrImageLink && (
                            <a
                              href={log.dtrImageLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5 mt-0.5"
                            >
                              <span>DTR Proof Link</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {log.status === 'present' ? (
                            <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                              Present
                            </span>
                          ) : log.status === 'late' ? (
                            <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                              Late
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 font-bold text-[10px]">
                              Window Missed
                            </span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
