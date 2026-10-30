import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  Building2,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  ChevronDown,
  Layers,
  ShieldCheck,
  Award,
  Clock,
  Sparkles as _NoSparkles, // unused
} from 'lucide-react';
import { Student, AttendanceLog, AccomplishmentReport } from '../types';
import { exportBUAccomplishmentDocx, BUDocxExportOptions } from '../lib/buDocxExport';

interface BUAccomplishmentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudentId?: string;
  attendanceLogs: AttendanceLog[];
  accomplishmentReports: AccomplishmentReport[];
  isCoordinator?: boolean;
}

export const BUAccomplishmentExportModal: React.FC<BUAccomplishmentExportModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudentId,
  attendanceLogs,
  accomplishmentReports,
  isCoordinator = false,
}) => {
  // Selected student
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || students[0]?.id || ''
  );

  // Form type
  const [formType, setFormType] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');

  // Campus selection
  const [campus, setCampus] = useState<'polangui' | 'science' | 'custom'>('polangui');
  const [customCampusName, setCustomCampusName] = useState('POLANGUI');
  const [customCampusAddress, setCustomCampusAddress] = useState('Polangui, Albay');
  const [customCampusEmail, setCustomCampusEmail] = useState('bupc-dean@bicol-u.edu.ph');

  // Find active student
  const currentStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  // Student specific logs & reports
  const studentLogs = useMemo(() => {
    if (!currentStudent) return [];
    return attendanceLogs
      .filter((l) => l.studentId === currentStudent.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [attendanceLogs, currentStudent]);

  const studentReports = useMemo(() => {
    if (!currentStudent) return [];
    return accomplishmentReports
      .filter((r) => r.studentId === currentStudent.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [accomplishmentReports, currentStudent]);

  // Date range
  const [startDate, setStartDate] = useState<string>(() => {
    if (studentLogs.length > 0) return studentLogs[0].date;
    return 'May 06, 2026';
  });

  const [endDate, setEndDate] = useState<string>(() => {
    if (studentLogs.length > 0) return studentLogs[studentLogs.length - 1].date;
    return 'June 20, 2026';
  });

  // Supervisor info
  const [supervisorName, setSupervisorName] = useState<string>(() => {
    return currentStudent?.mentorName || 'Engr. Mark Villanueva';
  });
  const [supervisorPosition, setSupervisorPosition] = useState<string>('Senior Technical Lead / SIP Mentor');

  // Weekly duties
  const [day1, setDay1] = useState('');
  const [day2, setDay2] = useState('');
  const [day3, setDay3] = useState('');
  const [day4, setDay4] = useState('');
  const [day5, setDay5] = useState('');

  // Monthly duties
  const [week1, setWeek1] = useState('');
  const [week2, setWeek2] = useState('');
  const [week3, setWeek3] = useState('');
  const [week4, setWeek4] = useState('');

  // Enrichments
  const [trainings, setTrainings] = useState('');
  const [activity1, setActivity1] = useState('');
  const [accomplishment1, setAccomplishment1] = useState('');
  const [activity2, setActivity2] = useState('');
  const [accomplishment2, setAccomplishment2] = useState('');

  const [problem1, setProblem1] = useState('');
  const [problem2, setProblem2] = useState('');

  const [solution1, setSolution1] = useState('');
  const [solution2, setSolution2] = useState('');

  const [goal1, setGoal1] = useState('');
  const [goal2, setGoal2] = useState('');

  // Tab view inside modal: "editor" vs "preview"
  const [modalTab, setModalTab] = useState<'editor' | 'preview'>('preview');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Sync duties when student changes
  React.useEffect(() => {
    if (currentStudent) {
      setSupervisorName(currentStudent.mentorName || '');
      if (studentReports.length > 0) {
        setDay1(studentReports[0]?.taskDescription || studentReports[0]?.taskTitle || '');
        setDay2(studentReports[1]?.taskDescription || studentReports[1]?.taskTitle || '');
        setDay3(studentReports[2]?.taskDescription || studentReports[2]?.taskTitle || '');
        setDay4(studentReports[3]?.taskDescription || studentReports[3]?.taskTitle || '');
        setDay5(studentReports[4]?.taskDescription || studentReports[4]?.taskTitle || '');

        setWeek1(studentReports[0]?.taskDescription || studentReports[0]?.taskTitle || '');
        setWeek2(studentReports[1]?.taskDescription || studentReports[1]?.taskTitle || '');
        setWeek3(studentReports[2]?.taskDescription || studentReports[2]?.taskTitle || '');
        setWeek4(studentReports[3]?.taskDescription || studentReports[3]?.taskTitle || '');

        setActivity1(studentReports[0]?.supervisorAssignedDuty || studentReports[0]?.taskTitle || '');
        setAccomplishment1(studentReports[0]?.taskDescription || studentReports[0]?.taskTitle || '');

        setActivity2(studentReports[1]?.supervisorAssignedDuty || studentReports[1]?.taskTitle || '');
        setAccomplishment2(studentReports[1]?.taskDescription || studentReports[1]?.taskTitle || '');
      } else {
        setDay1('');
        setDay2('');
        setDay3('');
        setDay4('');
        setDay5('');

        setWeek1('');
        setWeek2('');
        setWeek3('');
        setWeek4('');

        setActivity1('');
        setAccomplishment1('');
        setActivity2('');
        setAccomplishment2('');
      }
    }
  }, [currentStudent, studentReports]);

  if (!isOpen || !currentStudent) return null;

  // Resolved Campus Details
  const campusDetails = {
    name:
      campus === 'polangui'
        ? 'POLANGUI'
        : campus === 'science'
        ? 'COLLEGE OF SCIENCE'
        : customCampusName,
    address:
      campus === 'polangui'
        ? 'Polangui, Albay'
        : campus === 'science'
        ? 'Legazpi City, Albay'
        : customCampusAddress,
    email:
      campus === 'polangui'
        ? 'bupc-dean@bicol-u.edu.ph'
        : campus === 'science'
        ? 'bucs-dean@bicol-u.edu.ph'
        : customCampusEmail,
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      const options: BUDocxExportOptions = {
        student: currentStudent,
        campusName: campusDetails.name,
        campusAddress: campusDetails.address,
        campusEmail: campusDetails.email,
        supervisorName,
        supervisorPosition,
        startDate,
        endDate,
        formType,
        trainings,
        proposedActivities: [
          { activity: activity1, accomplishment: accomplishment1 },
          { activity: activity2, accomplishment: accomplishment2 },
        ],
        problemsEncountered: [problem1, problem2].filter(Boolean),
        solutionsApplied: [solution1, solution2].filter(Boolean),
        nextPeriodGoals: [goal1, goal2].filter(Boolean),
        weeklyBreakdown: { day1, day2, day3, day4, day5 },
        monthlyBreakdown: { week1, week2, week3, week4 },
      };

      await exportBUAccomplishmentDocx(options, studentLogs, studentReports);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to export DOCX:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0875e1] to-[#0556a5] flex items-center justify-center text-white shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Export Official BU Accomplishment Report (.docx)
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  BU Portfolio Format
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Daily Attendance, Weekly, and Monthly Practicum Forms for Bicol University
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setModalTab('preview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                modalTab === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Paper Document Preview
            </button>
            <button
              onClick={() => setModalTab('editor')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                modalTab === 'editor'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Configure & Edit Content
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg shadow-sm transition"
              title="Print document preview"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Print Preview</span>
            </button>

            <button
              onClick={handleExportDocx}
              disabled={isExporting}
              type="button"
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-[#0875e1] hover:bg-[#0660bb] active:bg-[#05519f] rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating DOCX...' : 'Download Official .DOCX'}</span>
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {exportSuccess && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 text-xs shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Official BU document successfully generated! Your Microsoft Word (.docx) file has downloaded and is ready for your internship portfolio submission.
            </span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Options Row: Form Type & Student Picker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            {/* Form Selection */}
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-[#0875e1]" />
                <span>Document Format to Export:</span>
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0875e1]/20"
              >
                <option value="all">Complete Portfolio Pack (Daily + Weekly + Monthly)</option>
                <option value="daily">Daily Attendance & Accomplishment Form (Page 1)</option>
                <option value="weekly">Weekly Accomplishment Form (Page 2)</option>
                <option value="monthly">Monthly Accomplishment Form (Page 3)</option>
              </select>
            </div>

            {/* Student Picker (for coordinators or verification) */}
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <UserIcon className="w-3.5 h-3.5 text-[#0875e1]" />
                <span>Student Intern:</span>
              </label>
              {isCoordinator ? (
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0875e1]/20"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.buId}) - {s.companyName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 truncate">
                  {currentStudent.fullName} ({currentStudent.buId})
                </div>
              )}
            </div>

            {/* Campus Selector */}
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-[#0875e1]" />
                <span>BU Campus / Unit Header:</span>
              </label>
              <select
                value={campus}
                onChange={(e) => setCampus(e.target.value as any)}
                className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0875e1]/20"
              >
                <option value="polangui">Bicol University Polangui (BUPC)</option>
                <option value="science">Bicol University College of Science (BUCS)</option>
                <option value="custom">Custom Campus Header</option>
              </select>
            </div>
          </div>

          {/* TAB 1: Paper Document Visual Preview */}
          {modalTab === 'preview' && (
            <div className="space-y-8">
              {/* Daily Form Preview (Shown if 'daily' or 'all') */}
              {(formType === 'daily' || formType === 'all') && (
                <div className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg p-6 sm:p-10 shadow-md text-slate-900 dark:text-slate-100 font-sans max-w-4xl mx-auto">
                  {/* BU Official Header */}
                  <div className="text-center space-y-1 border-b-2 border-slate-900 dark:border-slate-300 pb-4 mb-6">
                    <p className="text-xs tracking-wider font-semibold text-slate-600 dark:text-slate-400">
                      REPUBLIC OF THE PHILIPPINES
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      BICOL UNIVERSITY
                    </h3>
                    <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                      {campusDetails.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{campusDetails.address}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Email: {campusDetails.email} &nbsp;|&nbsp; ISO 9001: 2015 SOCOTEC SCP000722Q &nbsp;|&nbsp; BAGONG PILIPINAS
                    </p>
                  </div>

                  {/* Form Title */}
                  <div className="text-center space-y-1 mb-6">
                    <h4 className="text-base sm:text-lg font-bold tracking-wide uppercase">
                      DAILY ATTENDANCE AND ACCOMPLISHMENT FORM
                    </h4>
                    <p className="text-xs italic text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                      (Please keep one copy of this form and give one to the Company to serve as a sign-in sheet to
                      document your internship hours. Give a copy of the completed time sheet to your Student
                      Internship Program (SIP) Coordinator every Saturday at minimum.)
                    </p>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-y-2 text-xs mb-6 font-medium">
                    <div>
                      <span className="font-bold">Student Name: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[200px]">
                        {currentStudent.fullName}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Internship Site: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[200px]">
                        {currentStudent.companyName}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Beginning Date: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[150px]">
                        {startDate}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Ending Date: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[150px]">
                        {endDate}
                      </span>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto border border-slate-900 dark:border-slate-400 mb-6">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-900 dark:border-slate-400 text-center">
                          <th className="p-2 border-r border-slate-900 dark:border-slate-400 w-24">Date</th>
                          <th className="p-2 border-r border-slate-900 dark:border-slate-400 w-20">Arrival Time</th>
                          <th className="p-2 border-r border-slate-900 dark:border-slate-400 w-20">Departure Time</th>
                          <th className="p-2 border-r border-slate-900 dark:border-slate-400">Accomplishment/s</th>
                          <th className="p-2 border-r border-slate-900 dark:border-slate-400 w-16">Total Hours</th>
                          <th className="p-2 w-20">Verified by</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 dark:divide-slate-400">
                        {studentLogs.slice(0, 8).map((log, idx) => {
                          const matchingAccomplishment = studentReports.find((r) => r.date === log.date);
                          const desc =
                            matchingAccomplishment?.taskDescription ||
                            matchingAccomplishment?.taskTitle ||
                            log.remarks ||
                            'Practicum software development, testing, and team syncing.';

                          return (
                            <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="p-2 border-r border-slate-900 dark:border-slate-400 text-center font-medium">
                                {log.date}
                              </td>
                              <td className="p-2 border-r border-slate-900 dark:border-slate-400 text-center">
                                {log.actualTimeIn || '08:00 AM'}
                              </td>
                              <td className="p-2 border-r border-slate-900 dark:border-slate-400 text-center">
                                {log.actualTimeOut || '05:00 PM'}
                              </td>
                              <td className="p-2 border-r border-slate-900 dark:border-slate-400 text-slate-700 dark:text-slate-300">
                                {desc}
                              </td>
                              <td className="p-2 border-r border-slate-900 dark:border-slate-400 text-center font-semibold">
                                {(Number(log.hoursRendered) || 8).toFixed(1)}
                              </td>
                              <td className="p-2 text-center text-slate-600 dark:text-slate-400 italic">
                                {log.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
                              </td>
                            </tr>
                          );
                        })}

                        {studentLogs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-500 italic">
                              No live attendance punches found yet. The exported DOCX will include official template rows with calculated hours.
                            </td>
                          </tr>
                        )}

                        {/* Total Hours Row */}
                        <tr className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-900 dark:border-slate-400">
                          <td colSpan={4} className="p-2 text-right border-r border-slate-900 dark:border-slate-400">
                            Total Hours:
                          </td>
                          <td className="p-2 text-center border-r border-slate-900 dark:border-slate-400">
                            {(currentStudent.renderedHours || 40).toFixed(1)} hrs
                          </td>
                          <td className="p-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-8 text-xs pt-4 font-medium">
                    <div className="space-y-1">
                      <div className="w-48 border-b border-slate-900 dark:border-slate-300 pt-8 mb-1"></div>
                      <p className="font-bold">Company Supervisor’s Signature</p>
                      <p className="text-slate-600 dark:text-slate-400 italic">Name: {supervisorName}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="pt-8 mb-1">
                        <span className="font-bold">Date: </span>
                        <span className="border-b border-slate-900 dark:border-slate-300 inline-block w-36"></span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="w-48 border-b border-slate-900 dark:border-slate-300 pt-8 mb-1"></div>
                      <p className="font-bold">Student Intern’s Signature</p>
                      <p className="text-slate-600 dark:text-slate-400 italic">Name: {currentStudent.fullName}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="pt-8 mb-1">
                        <span className="font-bold">Date: </span>
                        <span className="border-b border-slate-900 dark:border-slate-300 inline-block w-36"></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Weekly Form Preview (Shown if 'weekly' or 'all') */}
              {(formType === 'weekly' || formType === 'all') && (
                <div className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg p-6 sm:p-10 shadow-md text-slate-900 dark:text-slate-100 font-sans max-w-4xl mx-auto">
                  {/* BU Official Header */}
                  <div className="text-center space-y-1 border-b-2 border-slate-900 dark:border-slate-300 pb-4 mb-6">
                    <p className="text-xs tracking-wider font-semibold text-slate-600 dark:text-slate-400">
                      REPUBLIC OF THE PHILIPPINES
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      BICOL UNIVERSITY
                    </h3>
                    <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                      {campusDetails.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{campusDetails.address}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Email: {campusDetails.email} &nbsp;|&nbsp; ISO 9001: 2015 SOCOTEC SCP000722Q &nbsp;|&nbsp; BAGONG PILIPINAS
                    </p>
                  </div>

                  <div className="text-center mb-6">
                    <h4 className="text-base sm:text-lg font-bold tracking-wide uppercase">
                      WEEKLY ACCOMPLISHMENT FORM
                    </h4>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-y-2 text-xs mb-6 font-medium">
                    <div>
                      <span className="font-bold">Student Name: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[200px]">
                        {currentStudent.fullName}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Company Name: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[200px]">
                        {currentStudent.companyName}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Beginning Date: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[150px]">
                        {startDate}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Ending Date: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[150px]">
                        {endDate}
                      </span>
                    </div>
                  </div>

                  {/* Main Boxed Layout matching BU PDF */}
                  <div className="border border-slate-900 dark:border-slate-400 text-xs divide-y divide-slate-900 dark:divide-slate-400">
                    {/* Section 1: Duties Performed this week */}
                    <div className="p-3 space-y-1.5">
                      <p className="font-bold text-slate-900 dark:text-white">Duties Performed this week:</p>
                      <p className="pl-2">
                        <span className="font-semibold">Day 1: </span>
                        {day1}
                      </p>
                      <p className="pl-2">
                        <span className="font-semibold">Day 2: </span>
                        {day2}
                      </p>
                      <p className="pl-2">
                        <span className="font-semibold">Day 3: </span>
                        {day3}
                      </p>
                      <p className="pl-2">
                        <span className="font-semibold">Day 4: </span>
                        {day4}
                      </p>
                      <p className="pl-2">
                        <span className="font-semibold">Day 5: </span>
                        {day5}
                      </p>
                    </div>

                    {/* Section 2: What new training/s took place this week */}
                    <div className="p-3 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        What new training/s took place this week?
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 pl-2">{trainings}</p>
                    </div>

                    {/* Section 3: Major Accomplishments Table */}
                    <div className="p-3 space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">
                        What are your major accomplishments based from the Proposed Activities in your Training Schedule Form? Provide a detailed description of the tasks involved in the accomplishment.
                      </p>
                      <div className="border border-slate-900 dark:border-slate-400">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-900 dark:border-slate-400 font-bold text-center">
                              <th className="p-2 border-r border-slate-900 dark:border-slate-400 w-1/2">
                                PROPOSED ACTIVITY/IES
                              </th>
                              <th className="p-2 w-1/2">ACCOMPLISHMENTS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 dark:divide-slate-400">
                            <tr>
                              <td className="p-2 border-r border-slate-900 dark:border-slate-400">
                                • {activity1}
                              </td>
                              <td className="p-2">• {accomplishment1}</td>
                            </tr>
                            <tr>
                              <td className="p-2 border-r border-slate-900 dark:border-slate-400">
                                • {activity2}
                              </td>
                              <td className="p-2">• {accomplishment2}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 4: What problems have you encountered this week */}
                    <div className="p-3 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        What problems have you encountered this week?
                      </p>
                      <p className="pl-2 text-slate-700 dark:text-slate-300">• {problem1}</p>
                      {problem2 && <p className="pl-2 text-slate-700 dark:text-slate-300">• {problem2}</p>}
                    </div>

                    {/* Section 5: How did you overcome or solve those problems */}
                    <div className="p-3 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        How did you overcome or solve those problems?
                      </p>
                      <p className="pl-2 text-slate-700 dark:text-slate-300">• {solution1}</p>
                      {solution2 && <p className="pl-2 text-slate-700 dark:text-slate-300">• {solution2}</p>}
                    </div>

                    {/* Section 6: Goals for next week */}
                    <div className="p-3 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        List one or two goals you have set for yourself next week.
                      </p>
                      <p className="pl-2 text-slate-700 dark:text-slate-300">• {goal1}</p>
                      {goal2 && <p className="pl-2 text-slate-700 dark:text-slate-300">• {goal2}</p>}
                    </div>
                  </div>

                  {/* Noted by Footer */}
                  <div className="mt-8 text-xs font-medium space-y-1">
                    <p>Noted by:</p>
                    <div className="w-52 border-b border-slate-900 dark:border-slate-300 pt-8 mb-1"></div>
                    <p className="font-bold">{supervisorName}</p>
                    <p className="text-slate-500 italic">{supervisorPosition}</p>
                  </div>
                </div>
              )}

              {/* Monthly Form Preview (Shown if 'monthly' or 'all') */}
              {(formType === 'monthly' || formType === 'all') && (
                <div className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg p-6 sm:p-10 shadow-md text-slate-900 dark:text-slate-100 font-sans max-w-4xl mx-auto">
                  {/* BU Official Header */}
                  <div className="text-center space-y-1 border-b-2 border-slate-900 dark:border-slate-300 pb-4 mb-6">
                    <p className="text-xs tracking-wider font-semibold text-slate-600 dark:text-slate-400">
                      REPUBLIC OF THE PHILIPPINES
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      BICOL UNIVERSITY
                    </h3>
                    <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                      {campusDetails.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{campusDetails.address}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Email: {campusDetails.email} &nbsp;|&nbsp; ISO 9001: 2015 SOCOTEC SCP000722Q &nbsp;|&nbsp; BAGONG PILIPINAS
                    </p>
                  </div>

                  <div className="text-center mb-6">
                    <h4 className="text-base sm:text-lg font-bold tracking-wide uppercase">
                      MONTHLY ACCOMPLISHMENT FORM
                    </h4>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-y-2 text-xs mb-6 font-medium">
                    <div>
                      <span className="font-bold">Student Name: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[200px]">
                        {currentStudent.fullName}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Company Name: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[200px]">
                        {currentStudent.companyName}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Beginning Date: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[150px]">
                        {startDate}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Ending Date: </span>
                      <span className="border-b border-slate-800 dark:border-slate-300 pb-0.5 px-2 inline-block min-w-[150px]">
                        {endDate}
                      </span>
                    </div>
                  </div>

                  {/* Main Boxed Layout matching BU PDF */}
                  <div className="border border-slate-900 dark:border-slate-400 text-xs divide-y divide-slate-900 dark:divide-slate-400">
                    {/* Section 1: Duties Performed this month */}
                    <div className="p-3 space-y-1.5">
                      <p className="font-bold text-slate-900 dark:text-white">Duties Performed this month:</p>
                      <p className="pl-2">
                        <span className="font-semibold">Week 1: </span>
                        {week1}
                      </p>
                      <p className="pl-2">
                        <span className="font-semibold">Week 2: </span>
                        {week2}
                      </p>
                      <p className="pl-2">
                        <span className="font-semibold">Week 3: </span>
                        {week3}
                      </p>
                      <p className="pl-2">
                        <span className="font-semibold">Week 4: </span>
                        {week4}
                      </p>
                    </div>

                    {/* Section 2: What new training/s took place this month */}
                    <div className="p-3 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        What new training/s took place this month?
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 pl-2">{trainings}</p>
                    </div>

                    {/* Section 3: Major Accomplishments Table */}
                    <div className="p-3 space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">
                        What are your major accomplishments based from the Proposed Activities in your Training Schedule Form? Provide a detailed description of the tasks involved in the accomplishment.
                      </p>
                      <div className="border border-slate-900 dark:border-slate-400">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-900 dark:border-slate-400 font-bold text-center">
                              <th className="p-2 border-r border-slate-900 dark:border-slate-400 w-1/2">
                                PROPOSED ACTIVITY/IES
                              </th>
                              <th className="p-2 w-1/2">ACCOMPLISHMENTS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 dark:divide-slate-400">
                            <tr>
                              <td className="p-2 border-r border-slate-900 dark:border-slate-400">
                                • {activity1}
                              </td>
                              <td className="p-2">• {accomplishment1}</td>
                            </tr>
                            <tr>
                              <td className="p-2 border-r border-slate-900 dark:border-slate-400">
                                • {activity2}
                              </td>
                              <td className="p-2">• {accomplishment2}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 4: What problems have you encountered this month */}
                    <div className="p-3 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        What problems have you encountered this month?
                      </p>
                      <p className="pl-2 text-slate-700 dark:text-slate-300">• {problem1}</p>
                      {problem2 && <p className="pl-2 text-slate-700 dark:text-slate-300">• {problem2}</p>}
                    </div>

                    {/* Section 5: How did you overcome or solve those problems */}
                    <div className="p-3 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        How did you overcome or solve those problems?
                      </p>
                      <p className="pl-2 text-slate-700 dark:text-slate-300">• {solution1}</p>
                      {solution2 && <p className="pl-2 text-slate-700 dark:text-slate-300">• {solution2}</p>}
                    </div>

                    {/* Section 6: Goals for next period */}
                    <div className="p-3 space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        List one or two goals you have set for yourself next week.
                      </p>
                      <p className="pl-2 text-slate-700 dark:text-slate-300">• {goal1}</p>
                      {goal2 && <p className="pl-2 text-slate-700 dark:text-slate-300">• {goal2}</p>}
                    </div>
                  </div>

                  {/* Noted by Footer */}
                  <div className="mt-8 text-xs font-medium space-y-1">
                    <p>Noted by:</p>
                    <div className="w-52 border-b border-slate-900 dark:border-slate-300 pt-8 mb-1"></div>
                    <p className="font-bold">{supervisorName}</p>
                    <p className="text-slate-500 italic">{supervisorPosition}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Form Content Configuration / Editor */}
          {modalTab === 'editor' && (
            <div className="space-y-6">
              {/* Institutional & Supervisor Settings */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-[#0875e1]" />
                  <span>Institutional Signatory & Date Range Settings</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Beginning Date
                    </label>
                    <input
                      type="text"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Ending Date
                    </label>
                    <input
                      type="text"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Supervisor / Mentor Name
                    </label>
                    <input
                      type="text"
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Supervisor Position / Title
                    </label>
                    <input
                      type="text"
                      value={supervisorPosition}
                      onChange={(e) => setSupervisorPosition(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Weekly Duties Day 1-5 */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-[#0875e1]" />
                  <span>Weekly Duties Performed (Day 1 to Day 5)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">Day 1 Duty:</label>
                    <input
                      type="text"
                      value={day1}
                      onChange={(e) => setDay1(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">Day 2 Duty:</label>
                    <input
                      type="text"
                      value={day2}
                      onChange={(e) => setDay2(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">Day 3 Duty:</label>
                    <input
                      type="text"
                      value={day3}
                      onChange={(e) => setDay3(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">Day 4 Duty:</label>
                    <input
                      type="text"
                      value={day4}
                      onChange={(e) => setDay4(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">Day 5 Duty:</label>
                    <input
                      type="text"
                      value={day5}
                      onChange={(e) => setDay5(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Monthly Duties Week 1-4 */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-[#0875e1]" />
                  <span>Monthly Duties Performed (Week 1 to Week 4)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">Week 1 Summary:</label>
                    <input
                      type="text"
                      value={week1}
                      onChange={(e) => setWeek1(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">Week 2 Summary:</label>
                    <input
                      type="text"
                      value={week2}
                      onChange={(e) => setWeek2(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">Week 3 Summary:</label>
                    <input
                      type="text"
                      value={week3}
                      onChange={(e) => setWeek3(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">Week 4 Summary:</label>
                    <input
                      type="text"
                      value={week4}
                      onChange={(e) => setWeek4(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Trainings, Major Accomplishments, Problems & Solutions */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    What new training/s took place this period?
                  </label>
                  <textarea
                    rows={2}
                    value={trainings}
                    onChange={(e) => setTrainings(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Proposed Activities vs Accomplishments (Item 1)
                    </label>
                    <input
                      type="text"
                      placeholder="Proposed Activity 1"
                      value={activity1}
                      onChange={(e) => setActivity1(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm mb-1"
                    />
                    <textarea
                      rows={2}
                      placeholder="Accomplishment Description 1"
                      value={accomplishment1}
                      onChange={(e) => setAccomplishment1(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Proposed Activities vs Accomplishments (Item 2)
                    </label>
                    <input
                      type="text"
                      placeholder="Proposed Activity 2"
                      value={activity2}
                      onChange={(e) => setActivity2(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm mb-1"
                    />
                    <textarea
                      rows={2}
                      placeholder="Accomplishment Description 2"
                      value={accomplishment2}
                      onChange={(e) => setAccomplishment2(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Problems Encountered
                    </label>
                    <input
                      type="text"
                      placeholder="Problem 1"
                      value={problem1}
                      onChange={(e) => setProblem1(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm mb-2"
                    />
                    <input
                      type="text"
                      placeholder="Problem 2 (optional)"
                      value={problem2}
                      onChange={(e) => setProblem2(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      How You Overcame Those Problems
                    </label>
                    <input
                      type="text"
                      placeholder="Solution 1"
                      value={solution1}
                      onChange={(e) => setSolution1(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm mb-2"
                    />
                    <input
                      type="text"
                      placeholder="Solution 2 (optional)"
                      value={solution2}
                      onChange={(e) => setSolution2(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Goals Set for Next Period
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Goal 1"
                      value={goal1}
                      onChange={(e) => setGoal1(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                    <input
                      type="text"
                      placeholder="Goal 2 (optional)"
                      value={goal2}
                      onChange={(e) => setGoal2(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Compliant with Bicol University Student Internship Program (SIP) Portfolio Guidelines</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={handleExportDocx}
              disabled={isExporting}
              type="button"
              className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0875e1] hover:bg-[#0660bb] active:bg-[#05519f] rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating DOCX...' : 'Download Official .DOCX'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
