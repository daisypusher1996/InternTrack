import { AttendanceLog } from '../types';

/**
 * Normalizes any date string (ISO YYYY-MM-DD, ISO timestamp, or locale formatted date)
 * into a standard YYYY-MM-DD string without timezone shifting.
 */
export function normalizeDateToYMD(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}
  return trimmed;
}

/**
 * Consolidates daily attendance records for the same student within the same day:
 * - If the student clocked in & out once (e.g. morning), it is preserved as is.
 * - If the student clocked in & out a second time (e.g. afternoon), it merges into a
 *   single display record keeping the morning Time-In and updating with the afternoon Time-Out,
 *   while combining rendered hours for the full duty day.
 */
export function consolidateDailyAttendanceLogs(logs: AttendanceLog[]): AttendanceLog[] {
  const groups = new Map<string, AttendanceLog[]>();

  for (const log of logs) {
    const key = `${log.studentId}:::${log.date}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(log);
    } else {
      groups.set(key, [log]);
    }
  }

  const consolidated: AttendanceLog[] = [];

  for (const [, dayLogs] of groups) {
    if (dayLogs.length === 1) {
      consolidated.push(dayLogs[0]);
      continue;
    }

    // Sort chronologically by time_in / id
    dayLogs.sort((a, b) => {
      const timeA = a.actualTimeIn ? new Date(a.actualTimeIn).getTime() : 0;
      const timeB = b.actualTimeIn ? new Date(b.actualTimeIn).getTime() : 0;
      return timeA - timeB;
    });

    const firstLog = dayLogs[0];
    const lastLog = dayLogs[dayLogs.length - 1];

    // Earliest morning time-in
    const earliestTimeIn = firstLog.actualTimeIn;

    // Afternoon time-out:
    // If the latest afternoon log is still active (no time-out), actualTimeOut remains null (Active on Duty).
    // If the latest afternoon log has timed out, take that time-out.
    const latestTimeOut = lastLog.actualTimeOut !== undefined ? lastLog.actualTimeOut : null;

    // Sum all hours rendered across shifts
    const totalHours = dayLogs.reduce((acc, l) => acc + (Number(l.hoursRendered) || 0), 0);

    const hasLate = dayLogs.some((l) => l.status === 'late');
    const isWfh = dayLogs.some((l) => l.status === 'wfh');
    const consolidatedStatus = isWfh ? 'wfh' : hasLate ? 'late' : 'present';

    const remarksList = Array.from(new Set(dayLogs.map((l) => l.remarks).filter(Boolean)));
    const mergedRemarks = remarksList.join(' • ');

    consolidated.push({
      ...lastLog,
      id: `${firstLog.id}-merged`,
      actualTimeIn: earliestTimeIn || null,
      actualTimeOut: latestTimeOut || null,
      hoursRendered: Math.round(totalHours * 10) / 10,
      status: consolidatedStatus,
      remarks: mergedRemarks || firstLog.remarks,
      dtrImageLink: lastLog.dtrImageLink || firstLog.dtrImageLink,
    });
  }

  return consolidated;
}
