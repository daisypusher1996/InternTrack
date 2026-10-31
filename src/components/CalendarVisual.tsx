import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Plus,
  ExternalLink,
  Home,
  Send,
  Check,
} from './icons';
import { Student, AttendanceLog, AccomplishmentReport } from '../types';
import { requestOvertimeToSupabase, markFridayWfhInSupabase } from '../lib/supabase';

interface CalendarVisualProps {
  student: Student;
  attendanceLogs: AttendanceLog[];
  accomplishmentReports: AccomplishmentReport[];
  onOpenReportModal?: (dateStr: string) => void;
  onOpenExcuseModal?: (dateStr: string) => void;
  onRefreshData?: () => Promise<void>;
}

export const CalendarVisual: React.FC<CalendarVisualProps> = ({
  student,
  attendanceLogs,
  accomplishmentReports,
  onOpenReportModal,
  onOpenExcuseModal,
  onRefreshData,
}) => {
  // Calendar navigation state (defaults to current date)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const [localLogs, setLocalLogs] = useState<AttendanceLog[]>(attendanceLogs);
  const [localWfhDates, setLocalWfhDates] = useState<string[]>(student.wfhDates || []);

  useEffect(() => {
    setLocalLogs(attendanceLogs);
  }, [attendanceLogs]);

  useEffect(() => {
    setLocalWfhDates(student.wfhDates || []);
  }, [student.wfhDates]);

  const [selectedDayData, setSelectedDayData] = useState<{
    dateStr: string;
    dateObj: Date;
    isoDateStr: string;
    log?: AttendanceLog;
    report?: AccomplishmentReport;
    isWfh?: boolean;
    isWeekend?: boolean;
    isFriday?: boolean;
  } | null>(null);

  // Overtime Request Form State
  const [isRequestingOvertime, setIsRequestingOvertime] = useState(false);
  const [overtimeHours, setOvertimeHours] = useState('8');
  const [overtimeReason, setOvertimeReason] = useState('Weekend Practicum Task Execution & System Testing');
  const [isSubmittingOvertime, setIsSubmittingOvertime] = useState(false);
  const [overtimeFeedback, setOvertimeFeedback] = useState<string | null>(null);

  // WFH Toggle State
  const [isUpdatingWfh, setIsUpdatingWfh] = useState(false);
  const [wfhFeedback, setWfhFeedback] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days in current month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to format date matching logs format e.g. "August 19, 2026"
  const formatDateForLookup = (day: number) => {
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format ISO date string "YYYY-MM-DD"
  const formatIsoDate = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Find logs and reports for a given date string
  const getDayInfo = (day: number) => {
    const dateStr = formatDateForLookup(day);
    const isoDateStr = formatIsoDate(day);
    const dateObj = new Date(year, month, day);
    dateObj.setHours(0, 0, 0, 0);

    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const isFriday = dateObj.getDay() === 5;

    let log = localLogs.find(
      (l) =>
        l.studentId === student.id &&
        (l.date === dateStr || l.date === isoDateStr || l.date.includes(`${monthNames[month]} ${day}`))
    );

    const isWfh =
      localWfhDates.includes(isoDateStr) ||
      localWfhDates.includes(dateStr) ||
      log?.status === 'wfh';

    if (isWfh && !log) {
      log = {
        id: `wfh-${isoDateStr}`,
        studentId: student.id,
        studentName: student.fullName,
        companyId: student.companyId,
        companyName: student.companyName,
        date: dateStr,
        expectedTimeIn: '08:00',
        actualTimeIn: '08:00',
        expectedTimeOut: '17:00',
        actualTimeOut: '17:00',
        hoursRendered: 8,
        status: 'wfh',
        verificationStatus: 'verified',
        workstationIp: 'Remote WFH',
        remarks: 'Work From Home (WFH) Authorized',
      };
    } else if (isWfh && log) {
      log = {
        ...log,
        status: 'wfh',
        hoursRendered: log.hoursRendered || 8,
        remarks: log.remarks || 'Work From Home (WFH) Authorized',
      };
    }

    const report = accomplishmentReports.find(
      (r) =>
        r.studentId === student.id &&
        (r.date === dateStr || r.date === isoDateStr || r.date.includes(`${monthNames[month]} ${day}`))
    );

    return { dateStr, dateObj, isoDateStr, log, report, isWfh, isWeekend, isFriday };
  };

  // Handle Friday WFH Toggle
  const handleToggleFridayWfh = async (targetIso: string, targetDisplay: string, makeWfh: boolean) => {
    setIsUpdatingWfh(true);
    setWfhFeedback(null);
    try {
      if (makeWfh) {
        setLocalWfhDates((prev) => (prev.includes(targetIso) ? prev : [...prev, targetIso]));

        const existingLogIndex = localLogs.findIndex(
          (l) => l.studentId === student.id && (l.date === targetIso || l.date === targetDisplay)
        );
        const wfhLog: AttendanceLog = {
          id: `wfh-${targetIso}`,
          studentId: student.id,
          studentName: student.fullName,
          companyId: student.companyId,
          companyName: student.companyName,
          date: targetDisplay,
          expectedTimeIn: '08:00',
          actualTimeIn: '08:00',
          expectedTimeOut: '17:00',
          actualTimeOut: '17:00',
          hoursRendered: 8,
          status: 'wfh',
          verificationStatus: 'verified',
          workstationIp: 'Remote WFH',
          remarks: 'Work From Home (WFH) Authorized',
        };

        if (existingLogIndex !== -1) {
          const updated = [...localLogs];
          updated[existingLogIndex] = wfhLog;
          setLocalLogs(updated);
        } else {
          setLocalLogs((prev) => [wfhLog, ...prev]);
        }

        if (selectedDayData && selectedDayData.isoDateStr === targetIso) {
          setSelectedDayData((prev) => (prev ? { ...prev, isWfh: true, log: wfhLog } : null));
        }
      } else {
        setLocalWfhDates((prev) => prev.filter((d) => d !== targetIso && d !== targetDisplay));
        setLocalLogs((prev) =>
          prev.filter((l) => !(l.id.startsWith('wfh-') && (l.date === targetIso || l.date === targetDisplay)))
        );

        if (selectedDayData && selectedDayData.isoDateStr === targetIso) {
          setSelectedDayData((prev) => (prev ? { ...prev, isWfh: false, log: undefined } : null));
        }
      }

      await markFridayWfhInSupabase({
        studentId: student.id,
        studentName: student.fullName,
        date: targetIso,
        isWfh: makeWfh,
      });

      setWfhFeedback(
        makeWfh
          ? 'Friday successfully marked as Work From Home (WFH). Duty requirement exempted!'
          : 'WFH status removed for this Friday.'
      );

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error('Failed to toggle Friday WFH status:', err);
      setWfhFeedback('Could not update WFH status. Please try again.');
    } finally {
      setIsUpdatingWfh(false);
    }
  };

  // Handle Weekend Overtime Request
  const handleOvertimeSubmit = async (
    e: React.FormEvent,
    targetIso: string,
    targetDisplay: string
  ) => {
    e.preventDefault();
    if (!overtimeReason.trim()) return;

    setIsSubmittingOvertime(true);
    setOvertimeFeedback(null);
    try {
      await requestOvertimeToSupabase({
        studentId: student.id,
        studentName: student.fullName,
        companyId: student.companyId,
        companyName: student.companyName,
        date: targetIso,
        hoursRequested: Number(overtimeHours) || 8,
        reason: overtimeReason.trim(),
      });

      setOvertimeFeedback(
        `Overtime request (${overtimeHours} hrs) successfully filed with your coordinator for review!`
      );
      setIsRequestingOvertime(false);

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error('Failed to submit overtime request:', err);
      setOvertimeFeedback('Could not submit overtime request. Please try again.');
    } finally {
      setIsSubmittingOvertime(false);
    }
  };

  // Render calendar grid cells
  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const prevDay = daysInPrevMonth - i;
    calendarCells.push(
      <div
        key={`prev-${prevDay}`}
        className="min-h-[72px] sm:min-h-[88px] p-1.5 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100/80 dark:border-slate-800/80 text-slate-300 dark:text-slate-600 text-xs cursor-not-allowed select-none rounded-lg"
      >
        <span className="font-medium text-[11px]">{prevDay}</span>
      </div>
    );
  }

  // Student official start date (deployment date)
  const startDateStr = student.startDate || student.scheduledDeploymentDate;
  const startDateObj = startDateStr ? new Date(startDateStr) : null;
  if (startDateObj) {
    startDateObj.setHours(0, 0, 0, 0);
  }

  // Current month active days
  for (let day = 1; day <= daysInMonth; day++) {
    const { dateStr, dateObj, isoDateStr, log, report, isWfh, isWeekend, isFriday } = getDayInfo(day);

    const isToday = new Date().toDateString() === dateObj.toDateString();
    const isSelected = selectedDayData?.dateStr === dateStr;
    const isBeforeStart = Boolean(startDateObj && dateObj < startDateObj);

    calendarCells.push(
      <button
        key={`day-${day}`}
        onClick={() => {
          setSelectedDayData({
            dateStr,
            dateObj,
            isoDateStr,
            log,
            report,
            isWfh,
            isWeekend,
            isFriday,
          });
          setIsRequestingOvertime(false);
          setOvertimeFeedback(null);
          setWfhFeedback(null);
        }}
        className={`min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 border text-left flex flex-col justify-between transition-all duration-150 relative group rounded-lg text-xs active:scale-95 cursor-pointer ${
          isSelected
            ? 'bg-amber-50/90 dark:bg-amber-950/50 border-[#F26522] ring-2 ring-[#F26522]/40 shadow-xs z-10 scale-[1.02]'
            : isToday
            ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600'
            : isWfh
            ? 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
            : isWeekend
            ? 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            : isBeforeStart
            ? 'bg-slate-50/40 dark:bg-slate-950/30 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/60'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs dark:shadow-none'
        }`}
      >
        {/* Top: Day number + Today / Non-Duty badge */}
        <div className="flex items-center justify-between w-full">
          <span
            className={`font-bold text-xs ${
              isToday
                ? 'w-5 h-5 rounded-md bg-[#F26522] text-white flex items-center justify-center font-black shadow-xs'
                : isWeekend
                ? 'text-slate-400 dark:text-slate-500 font-semibold'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {day}
          </span>
          {isToday ? (
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#F26522] dark:text-orange-400">
              Today
            </span>
          ) : isWeekend ? (
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Non-Duty
            </span>
          ) : isWfh ? (
            <span className="text-[8px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              WFH
            </span>
          ) : null}
        </div>

        {/* Middle/Bottom: DTR Punch & Report Badges */}
        <div className="space-y-1 w-full pt-1">
          {log && (
            <div
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center justify-between truncate ${
                log.status === 'wfh'
                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : log.status === 'present'
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : log.status === 'late'
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : isWeekend
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  : 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
              title={
                log.status === 'wfh'
                  ? 'Work From Home (WFH) Authorized - Attendance Exempt'
                  : `${log.status.toUpperCase()}: ${log.actualTimeIn || 'None'} - ${log.actualTimeOut || 'Pending'} (${log.hoursRendered}h)`
              }
            >
              <span className="capitalize truncate flex items-center gap-1">
                {log.status === 'wfh'
                  ? '🏠 WFH'
                  : log.status === 'present'
                  ? (isWeekend ? '✓ Overtime' : '✓ In')
                  : log.status === 'late'
                  ? '⚠ Late'
                  : isWeekend
                  ? 'Non-Duty'
                  : '✕ Missed'}
              </span>
              <span className="font-mono ml-1 font-extrabold">{log.hoursRendered || (log.status === 'wfh' ? 8 : 0)}h</span>
            </div>
          )}

          {report && (
            <div
              className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-300 border border-[#FED7AA] dark:border-orange-800 flex items-center gap-1 truncate"
              title={`Accomplishment Report: ${report.taskTitle} (${report.hoursSpent}h)`}
            >
              <FileText className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{report.taskTitle}</span>
            </div>
          )}

          {!log && !report && isWeekend && (
            <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium italic">
              Weekend
            </div>
          )}

          {!log && !report && !isWeekend && (
            <div className="hidden group-hover:block text-[9px] text-slate-400 dark:text-slate-500 italic">
              {isBeforeStart ? 'Pre-start date' : isFriday ? 'Inspect / WFH' : 'Click to view log'}
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-xs space-y-4 transition-colors duration-200">
      {/* Calendar Header with Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-1">
            <CalendarIcon className="w-5 h-5 text-[#F26522]" />
            <span>Interactive Internship Calendar</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Click any date to inspect details</span>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all active:scale-95"
          >
            Today
          </button>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-90"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-xs text-slate-900 dark:text-white px-3 min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-90"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 py-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
        <span className="font-bold text-slate-800 dark:text-white text-[11px] uppercase tracking-wider">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700" />
          <span>Present (Full 8h Credit)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700" />
          <span>Work From Home (WFH Exempt)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700" />
          <span>Late Window Arrival</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700" />
          <span>Missed Duty / Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
          <span>Weekend (Standard Non-Duty)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#FFF0E6] dark:bg-orange-950 border border-[#FED7AA] dark:border-orange-800" />
          <span>Accomplishment Filed</span>
        </div>
      </div>

      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 dark:text-slate-400 py-1 border-b border-slate-100 dark:border-slate-800">
        {daysOfWeek.map((day) => (
          <div key={day} className={day === 'Sun' || day === 'Sat' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar 7-column Grid of Squares */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {calendarCells}
      </div>

      {/* Day Inspector Modal / Popup (Appears when student clicks on any day) */}
      {selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#020617] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#020617] text-white p-5 px-6 flex items-center justify-between border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#F26522] text-white">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-white">
                    Daily Practicum Log & Report Inspector
                  </h3>
                  <p className="text-xs text-slate-300">{selectedDayData.dateStr}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayData(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800 dark:text-slate-200">
              {/* Feedback messages */}
              {wfhFeedback && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>{wfhFeedback}</span>
                </div>
              )}
              {overtimeFeedback && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{overtimeFeedback}</span>
                </div>
              )}

              {/* FRIDAY WORK FROM HOME (WFH) ACTION CARD */}
              {selectedDayData.isFriday && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 rounded-2xl border border-blue-200 dark:border-blue-800/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-extrabold text-xs text-blue-950 dark:text-blue-200">
                        Friday Work From Home (WFH) Exemption
                      </span>
                    </div>
                    {selectedDayData.isWfh && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white shadow-2xs">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-blue-900/80 dark:text-blue-300 leading-relaxed">
                    Fridays are recognized as standard Work From Home (WFH) duty days for participating companies. Activating WFH exempts this date from physical workstation punches and prevents any missed duty penalties.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() =>
                        handleToggleFridayWfh(
                          selectedDayData.isoDateStr,
                          selectedDayData.dateStr,
                          !selectedDayData.isWfh
                        )
                      }
                      disabled={isUpdatingWfh}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        selectedDayData.isWfh
                          ? 'bg-blue-100 hover:bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:hover:bg-blue-900/80 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      }`}
                    >
                      {isUpdatingWfh ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Updating WFH Status...</span>
                        </>
                      ) : selectedDayData.isWfh ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
                          <span>WFH Active • Click to Remove</span>
                        </>
                      ) : (
                        <>
                          <Home className="w-3.5 h-3.5" />
                          <span>Mark as Work From Home (WFH)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 1: Daily Time Record (DTR) Status */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#F26522]" />
                  Workstation Time-In / Time-Out Punches
                </h4>

                {selectedDayData.log ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">Attendance Verification:</span>
                      {selectedDayData.log.status === 'wfh' ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-extrabold text-[11px] border border-blue-200 dark:border-blue-800">
                          🏠 WORK FROM HOME (WFH) • DUTY EXEMPT
                        </span>
                      ) : selectedDayData.log.status === 'present' ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-200 dark:border-emerald-800">
                          {selectedDayData.isWeekend ? 'WEEKEND OVERTIME PUNCH' : 'PRESENT • ON-TIME PUNCH'}
                        </span>
                      ) : selectedDayData.log.status === 'late' ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] border border-amber-200 dark:border-amber-800">
                          LATE WINDOW ARRIVAL
                        </span>
                      ) : selectedDayData.isWeekend ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-[11px] border border-slate-200 dark:border-slate-700">
                          WEEKEND NON-DUTY
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 font-extrabold text-[11px] border border-red-200 dark:border-red-800">
                          MISSED DUTY WINDOW
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Actual Time-In:</span>
                        <strong className="text-slate-900 dark:text-white font-mono text-sm">
                          {selectedDayData.log.actualTimeIn || 'Not recorded'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Actual Time-Out:</span>
                        <strong className="text-slate-900 dark:text-white font-mono text-sm">
                          {selectedDayData.log.actualTimeOut || 'Pending clock-out'}
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Credited Practicum Hours:</span>
                        <div className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                          +{selectedDayData.log.hoursRendered} hrs
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Authorized Workstation / IP:</span>
                        <div className="font-mono text-slate-700 dark:text-slate-300">
                          {selectedDayData.log.workstationIp || 'Intranet Subnet'}
                        </div>
                      </div>
                    </div>

                    {selectedDayData.log.remarks && (
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-800 dark:text-slate-100">Duty Remarks:</strong> {selectedDayData.log.remarks}
                      </div>
                    )}

                    {selectedDayData.log.dtrImageLink && (
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800 text-[11px] flex items-center justify-between">
                        <span className="text-blue-950 dark:text-blue-200 font-semibold">Backup DTR Proof:</span>
                        <a
                          href={selectedDayData.log.dtrImageLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>Open Image Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : startDateObj && selectedDayData.dateObj < startDateObj ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1">
                    <p className="text-slate-700 dark:text-slate-300 font-bold text-xs">
                      Pre-Internship Period ({selectedDayData.dateStr})
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      This date is prior to your official internship start date{startDateStr ? ` (${startDateStr})` : ''}. Attendance evaluation is inactive for pre-deployment dates.
                    </p>
                  </div>
                ) : selectedDayData.isWeekend ? (
                  /* WEEKEND (SATURDAY / SUNDAY) NON-DUTY & OVERTIME SECTION */
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                    <div className="inline-flex p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <CalendarIcon className="w-5 h-5 text-[#F26522]" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-slate-900 dark:text-white text-xs">
                        Weekend (Standard Non-Duty Day)
                      </h5>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 max-w-sm mx-auto">
                        Saturdays and Sundays are standard non-duty days according to university practicum policy. Weekends are never flagged as missed duty or absent.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
                      {!isRequestingOvertime ? (
                        <button
                          onClick={() => setIsRequestingOvertime(true)}
                          className="px-4 py-2 rounded-xl bg-[#0875e1] hover:bg-[#0660bb] text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Request Overtime</span>
                        </button>
                      ) : (
                        <form
                          onSubmit={(e) =>
                            handleOvertimeSubmit(e, selectedDayData.isoDateStr, selectedDayData.dateStr)
                          }
                          className="space-y-3 text-left p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              Weekend Overtime Request
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsRequestingOvertime(false)}
                              className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Requested Duty Hours
                            </label>
                            <select
                              value={overtimeHours}
                              onChange={(e) => setOvertimeHours(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="4">4 Hours (Half-Day Weekend Shift)</option>
                              <option value="8">8 Hours (Full-Day Weekend Shift)</option>
                              <option value="10">10 Hours (Extended Shift)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Reason / Task Deliverable *
                            </label>
                            <input
                              type="text"
                              required
                              value={overtimeReason}
                              onChange={(e) => setOvertimeReason(e.target.value)}
                              placeholder="e.g. Server Migration & Production Sprint"
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsRequestingOvertime(false)}
                              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmittingOvertime}
                              className="px-4 py-1.5 rounded-lg bg-[#0875e1] hover:bg-[#0660bb] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isSubmittingOvertime ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Submitting...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3" />
                                  <span>Submit to Coordinator</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                  /* WEEKDAY NO RECORD */
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                      No attendance record registered on this date ({selectedDayData.dateStr}).
                    </p>
                    {onOpenExcuseModal && (
                      <button
                        onClick={() => {
                          onOpenExcuseModal(selectedDayData.dateStr);
                          setSelectedDayData(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>File Official Excuse Slip for Missed Duty</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 2: Accomplishment Report Filed for this Date */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#F26522]" />
                  Daily Accomplishment Report
                </h4>

                {selectedDayData.report ? (
                  <div className="p-4 bg-gradient-to-br from-white dark:from-slate-800 to-[#FFF0E6]/30 dark:to-orange-950/20 rounded-2xl border border-[#FED7AA] dark:border-orange-800/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F26522] text-white">
                        {selectedDayData.report.workCategory}
                      </span>
                      <span className="font-mono font-bold text-[#D94B0A] dark:text-orange-400">
                        {selectedDayData.report.hoursSpent} hrs logged
                      </span>
                    </div>

                    <div>
                      <h5 className="font-black text-slate-900 dark:text-white text-sm">
                        {selectedDayData.report.taskTitle}
                      </h5>
                      <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed text-xs">
                        {selectedDayData.report.taskDescription}
                      </p>
                    </div>

                    {selectedDayData.report.obstaclesFaced && (
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px] text-amber-950 dark:text-amber-200">
                        <strong>Technical Hurdles:</strong> {selectedDayData.report.obstaclesFaced}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                      No accomplishment report filed yet for this date.
                    </p>
                    {onOpenReportModal && (
                      <button
                        onClick={() => {
                          onOpenReportModal(selectedDayData.dateStr);
                          setSelectedDayData(null);
                        }}
                        className="px-4 py-2 rounded-lg bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Submit Accomplishment Report for this Day</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedDayData(null)}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs transition-all active:scale-95 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};