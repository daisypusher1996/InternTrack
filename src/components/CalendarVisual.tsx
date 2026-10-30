import React, { useState } from 'react';
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
} from 'lucide-react';
import { Student, AttendanceLog, AccomplishmentReport } from '../types';

interface CalendarVisualProps {
  student: Student;
  attendanceLogs: AttendanceLog[];
  accomplishmentReports: AccomplishmentReport[];
  onOpenReportModal?: (dateStr: string) => void;
  onOpenExcuseModal?: (dateStr: string) => void;
}

export const CalendarVisual: React.FC<CalendarVisualProps> = ({
  student,
  attendanceLogs,
  accomplishmentReports,
  onOpenReportModal,
  onOpenExcuseModal,
}) => {
  // Calendar navigation state (defaults to current date)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const [selectedDayData, setSelectedDayData] = useState<{
    dateStr: string;
    dateObj: Date;
    log?: AttendanceLog;
    report?: AccomplishmentReport;
  } | null>(null);

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

  // Find logs and reports for a given date string
  const getDayInfo = (day: number) => {
    const dateStr = formatDateForLookup(day);
    const log = attendanceLogs.find(
      (l) => l.studentId === student.id && (l.date === dateStr || l.date.includes(`${monthNames[month]} ${day}`))
    );
    const report = accomplishmentReports.find(
      (r) => r.studentId === student.id && (r.date === dateStr || r.date.includes(`${monthNames[month]} ${day}`))
    );
    return { dateStr, log, report };
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
    const { dateStr, log, report } = getDayInfo(day);
    const dateObj = new Date(year, month, day);
    dateObj.setHours(0, 0, 0, 0);
    const isToday =
      new Date().toDateString() === dateObj.toDateString();
    const isSelected = selectedDayData?.dateStr === dateStr;

    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const isBeforeStart = Boolean(startDateObj && dateObj < startDateObj);

    calendarCells.push(
      <button
        key={`day-${day}`}
        onClick={() => {
          setSelectedDayData({
            dateStr,
            dateObj,
            log,
            report,
          });
        }}
        className={`min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 border text-left flex flex-col justify-between transition-all duration-150 relative group rounded-lg text-xs active:scale-95 cursor-pointer ${
          isSelected
            ? 'bg-amber-50/90 dark:bg-amber-950/50 border-[#F26522] ring-2 ring-[#F26522]/40 shadow-xs z-10 scale-[1.02]'
            : isToday
            ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600'
            : isWeekend
            ? 'bg-slate-50/60 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
            : isBeforeStart
            ? 'bg-slate-50/40 dark:bg-slate-950/30 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/60'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs dark:shadow-none'
        }`}
      >
        {/* Top: Day number + Today pill */}
        <div className="flex items-center justify-between w-full">
          <span
            className={`font-bold text-xs ${
              isToday
                ? 'w-5 h-5 rounded-md bg-[#F26522] text-white flex items-center justify-center font-black shadow-xs'
                : isWeekend
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {day}
          </span>
          {isToday && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#F26522] dark:text-orange-400">
              Today
            </span>
          )}
        </div>

        {/* Middle/Bottom: DTR Punch & Report Badges */}
        <div className="space-y-1 w-full pt-1">
          {log && (
            <div
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center justify-between truncate ${
                log.status === 'present'
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : log.status === 'late'
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
              title={`${log.status.toUpperCase()}: ${log.actualTimeIn || 'None'} - ${log.actualTimeOut || 'Pending'} (${log.hoursRendered}h)`}
            >
              <span className="capitalize truncate">
                {log.status === 'present' ? '✓ In' : log.status === 'late' ? '⚠ Late' : '✕ Missed'}
              </span>
              <span className="font-mono ml-1 font-extrabold">{log.hoursRendered}h</span>
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

          {!log && !report && !isWeekend && (
            <div className="hidden group-hover:block text-[9px] text-slate-400 dark:text-slate-500 italic">
              {isBeforeStart ? 'Pre-start date' : 'Click to view log'}
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
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 py-1.5 bg-slate-50 dark:bg-slate-800/60 px-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
        <span className="font-bold text-slate-800 dark:text-white text-[11px] uppercase tracking-wider">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700" />
          <span>Present (Full 8h Credit)</span>
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
          <span className="w-3 h-3 rounded bg-[#FFF0E6] dark:bg-orange-950 border border-[#FED7AA] dark:border-orange-800" />
          <span>Accomplishment Report Filed</span>
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
                      {selectedDayData.log.status === 'present' ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-200 dark:border-emerald-800">
                          PRESENT • ON-TIME PUNCH
                        </span>
                      ) : selectedDayData.log.status === 'late' ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] border border-amber-200 dark:border-amber-800">
                          LATE WINDOW ARRIVAL
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
                        <span className="text-slate-500 dark:text-slate-400">Authorized Workstation IP:</span>
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
                ) : (startDateObj && selectedDayData.dateObj < startDateObj) ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1">
                    <p className="text-slate-700 dark:text-slate-300 font-bold text-xs">
                      Pre-Internship Period ({selectedDayData.dateStr})
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      This date is prior to your official internship start date{startDateStr ? ` (${startDateStr})` : ''}. Attendance evaluation is inactive for pre-deployment dates.
                    </p>
                  </div>
                ) : (
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
                        className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1.5 active:scale-95 transition-all"
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
                        className="px-4 py-2 rounded-lg bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-95"
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
