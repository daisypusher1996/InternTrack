import React, { useState } from 'react';
import {
  Archive,
  FolderArchive,
  Calendar,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Shield,
  GraduationCap,
  ExternalLink,
  X,
  BookOpen,
  Award,
  User as UserIcon,
} from 'lucide-react';
import { ClassBatch, Student, Company, Group } from '../types';

interface RecordArchiveViewProps {
  batches: ClassBatch[];
  students: Student[];
  companies: Company[];
  groups: Group[];
  isCoordinator: boolean;
  onCreateBatch: (batchData: any) => Promise<void>;
  onToggleArchive: (batchId: string) => Promise<void>;
  onUnarchiveStudent?: (studentId: string) => Promise<void>;
}

export const RecordArchiveView: React.FC<RecordArchiveViewProps> = ({
  batches,
  students,
  companies,
  groups,
  isCoordinator,
  onCreateBatch,
  onToggleArchive,
  onUnarchiveStudent,
}) => {
  // Dimensions filters
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedBlock, setSelectedBlock] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inspectingBatch, setInspectingBatch] = useState<ClassBatch | null>(null);

  // New Batch Form State
  const [newSchoolYear, setNewSchoolYear] = useState('2026-2027');
  const [newCourse, setNewCourse] = useState('BS Computer Science');
  const [newBlockSection, setNewBlockSection] = useState('BSCS 4-A');
  const [newSemester, setNewSemester] = useState('1st Semester');
  const [newBatchName, setNewBatchName] = useState('');
  const [newTargetHours, setNewTargetHours] = useState('240');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Batches
  const filteredBatches = batches.filter((b) => {
    const matchesYear = selectedSchoolYear === 'all' || b.academicYear === selectedSchoolYear;
    const matchesBlock = selectedBlock === 'all' || b.blockSection === selectedBlock;
    const matchesSem = selectedSemester === 'all' || b.semester === selectedSemester;
    const matchesSearch =
      b.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.batchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.blockSection.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesYear && matchesBlock && matchesSem && matchesSearch;
  });

  // Unique available academic years from batches
  const availableYears = Array.from(
    new Set(['2026-2027', '2025-2026', '2024-2025', ...batches.map((b) => b.academicYear)])
  ).filter(Boolean);

  const availableSemesters = [
    { id: '1st Semester', label: '1st Semester' },
    { id: '2nd Semester', label: '2nd Semester' },
    { id: 'Midyear Term', label: 'Summer / Midyear' },
  ];

  // Students who have been archived or completed
  const archivedStudents = students.filter(
    (s) => s.isArchived || s.status === 'completed'
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateBatch({
        academicYear: newSchoolYear,
        blockSection: newBlockSection,
        semester: newSemester,
        batchName:
          newBatchName ||
          `${newCourse} (${newBlockSection}) Practicum Archive - A.Y. ${newSchoolYear} ${newSemester}`,
        targetHours: newTargetHours,
      });
      setIsCreateModalOpen(false);
      setNewBatchName('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = (batch: ClassBatch) => {
    const batchStudents = students.filter(
      (s) => s.batchId === batch.id || (!batch.isArchived && s.classBlock === batch.blockSection)
    );

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `BICOL UNIVERSITY - COLLEGE OF SCIENCE\n`;
    csvContent += `DEPARTMENT OF COMPUTER SCIENCE PRACTICUM ARCHIVE\n`;
    csvContent += `School Year: A.Y. ${batch.academicYear}, Course/Program: BS Computer Science, Block: ${batch.blockSection}, Semester: ${batch.semester}\n\n`;
    csvContent += `BU ID,Student Full Name,Email,Degree Program,Class Block,Host Training Establishment,Rendered Hours,Target Hours,Completion Status\n`;

    batchStudents.forEach((s) => {
      const isCleared =
        s.renderedHours >= s.targetHours || s.completionApproved
          ? 'APPROVED & CLEARED'
          : 'IN_PROGRESS';
      csvContent += `"${s.buId}","${s.fullName}","${s.email}","${s.degree}","${s.classBlock || batch.blockSection}","${s.companyName}",${s.renderedHours},${s.targetHours},"${isCleared}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${batch.batchCode}_Student_Internship_Archive.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inspectedStudents = inspectingBatch
    ? students.filter(
        (s) =>
          s.batchId === inspectingBatch.id ||
          (!inspectingBatch.isArchived && s.classBlock === inspectingBatch.blockSection)
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Top Academic Archive Banner */}
      <div className="bg-gradient-to-r from-[#0B2545] via-[#134074] to-[#0B2545] rounded-2xl p-6 text-white shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#F26522] text-white font-bold text-xs uppercase tracking-wide">
                Practicum Record Archive
              </span>
              <span className="text-slate-300 text-xs">
                Class Block & School Year Repository
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Student Internship Record Archive & Cohort Batches
            </h1>
            <p className="text-slate-200 text-sm mt-1 max-w-2xl">
              Archived repository structured by <strong>School Year (A.Y.)</strong>, <strong>College Program/Course</strong>, and <strong>Class Block</strong> with complete completion records.
            </p>
          </div>

          {isCoordinator && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold text-xs transition shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              Create Archival Batch
            </button>
          )}
        </div>
      </div>

      {/* Primary Dimensional Classification Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#F26522]" />
            Archive Classification Filters
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong>{filteredBatches.length}</strong> archived & active batches
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. School Year Display & Filter */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#F26522]" />
              School Year (Academic Year)
            </label>
            <select
              value={selectedSchoolYear}
              onChange={(e) => setSelectedSchoolYear(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-[#F26522]"
            >
              <option value="all">All School Years</option>
              <option value="2026-2027">A.Y. 2026-2027 (Current)</option>
              <option value="2025-2026">A.Y. 2025-2026 (Archived)</option>
              <option value="2024-2025">A.Y. 2024-2025 (Archived)</option>
            </select>
          </div>

          {/* 2. College Program / Course Display & Filter */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-[#0B2545] dark:text-orange-400" />
              College Program / Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-[#F26522]"
            >
              <option value="all">All College Programs</option>
              <option value="BS Computer Science">BS Computer Science (BSCS)</option>
              <option value="BS Information Technology">BS Information Technology (BSIT)</option>
            </select>
          </div>

          {/* 3. Class Block Section Display & Filter */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Class Block Section
            </label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-[#F26522]"
            >
              <option value="all">All Class Blocks</option>
              <option value="BSCS 4-A">Block: BSCS 4-A</option>
              <option value="BSCS 4-B">Block: BSCS 4-B</option>
              <option value="BSIT 4-A">Block: BSIT 4-A</option>
            </select>
          </div>

          {/* 4. Semester */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Semester Term
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-[#F26522]"
            >
              <option value="all">All Semesters</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Midyear Term">Midyear Term</option>
            </select>
          </div>
        </div>

        {/* Year-Based and Semester-Based Fast Filter Toggles */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {/* Year-Based Filter Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[140px] flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#F26522]" />
              Academic Year Filter:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedSchoolYear('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  selectedSchoolYear === 'all'
                    ? 'bg-[#F26522] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Years
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedSchoolYear(yr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    selectedSchoolYear === yr
                      ? 'bg-[#F26522] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  A.Y. {yr} {yr === '2026-2027' ? '(Current)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Semester-Based Filter Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[140px] flex items-center gap-1.5 shrink-0">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Semester Term Filter:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedSemester('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  selectedSemester === 'all'
                    ? 'bg-[#F26522] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Semesters
              </button>
              {availableSemesters.map((sem) => (
                <button
                  key={sem.id}
                  type="button"
                  onClick={() => setSelectedSemester(sem.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    selectedSemester === sem.id
                      ? 'bg-[#F26522] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sem.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Batches Grid with School Year, Course, and Block Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBatches.map((batch) => {
          const totalTargetHours = batch.totalStudents * batch.targetHours;
          const percent = Math.min(
            100,
            Math.round((batch.totalHoursRendered / (totalTargetHours || 1)) * 100)
          );

          return (
            <div
              key={batch.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between hover:shadow-md ${
                batch.isArchived
                  ? 'border-slate-300 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60'
                  : 'border-slate-200 dark:border-slate-800 hover:border-[#FED7AA] dark:hover:border-orange-800'
              }`}
            >
              <div>
                {/* Header Tags: School Year, Course & Block */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#0B2545] dark:bg-slate-800 text-white">
                        A.Y. {batch.academicYear}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400 border border-[#FED7AA] dark:border-orange-800">
                        {batch.blockSection}
                      </span>
                      {batch.isArchived ? (
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          ARCHIVED RECORD
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          ACTIVE PRACTICUM
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#0B2545] dark:text-white mt-1 leading-snug">
                      {batch.batchName}
                    </h3>
                  </div>

                  <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0B2545] dark:text-slate-300 shrink-0">
                    <FolderArchive className="w-5 h-5 text-[#F26522]" />
                  </span>
                </div>

                {/* Classification Metadata Block */}
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/80 mb-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">School Year:</span>
                    <strong className="font-semibold text-slate-900 dark:text-white">A.Y. {batch.academicYear}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">College Course:</span>
                    <strong className="font-semibold text-slate-900 dark:text-white">BS Computer Science</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Class Block:</span>
                    <strong className="font-bold text-[#0B2545] dark:text-blue-300 px-2 py-0.2 bg-blue-50 dark:bg-blue-950/60 rounded">
                      {batch.blockSection}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Semester Term:</span>
                    <span>{batch.semester}</span>
                  </div>
                  {batch.archivedDate && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
                      <span>Archived Date:</span>
                      <span className="font-medium">{batch.archivedDate}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 mb-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Rendered Practicum Hours:</span>
                    <span className="font-bold text-[#0B2545] dark:text-white">
                      {batch.totalHoursRendered.toLocaleString()}h /{' '}
                      {totalTargetHours ? totalTargetHours.toLocaleString() : '—'}h
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        batch.isArchived ? 'bg-slate-500' : 'bg-gradient-to-r from-[#F26522] to-amber-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      Enrolled: <strong className="dark:text-slate-200">{batch.totalStudents} interns</strong>
                    </span>
                    <span>
                      Cleared: <strong className="dark:text-slate-200">{batch.completedStudents} completed</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => setInspectingBatch(batch)}
                  className="px-3 py-1.5 rounded-lg bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400 hover:bg-[#FED7AA] dark:hover:bg-orange-900/60 font-bold transition-all active:scale-95 flex items-center gap-1 border border-[#FED7AA] dark:border-orange-800 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  View Roster
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleExportCSV(batch)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-90 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title="Export Batch Clearance CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {isCoordinator && (
                    <button
                      onClick={() => onToggleArchive(batch.id)}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all active:scale-95 text-[11px] cursor-pointer ${
                        batch.isArchived
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {batch.isArchived ? 'Unarchive' : 'Archive'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ARCHIVED INTERNS CLEARANCE REGISTRY (CLASSIFIED BY SCHOOL YEAR, COURSE & BLOCK) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0B2545] dark:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-wide">
                Clearance & Dossier Repository
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Permanent Academic Records
              </span>
            </div>
            <h2 className="text-base md:text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#F26522]" />
              Archived Interns Clearance Registry
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete catalog of students archived upon completion approval, indexed by <strong>School Year (A.Y.)</strong>, <strong>College Program</strong>, and <strong>Class Block</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold">
              Archived Interns: <strong className="text-[#0B2545] dark:text-white">{archivedStudents.length}</strong>
            </span>
          </div>
        </div>

        {archivedStudents.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <Archive className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs">No Archived Interns Found</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Once an in-progress student reaches 240 hours or is endorsed by the Practicum Coordinator, they can be approved and archived from the Coordinator Dashboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#020617] text-white">
                <tr>
                  <th className="py-3 px-4 font-semibold">Student Intern</th>
                  <th className="py-3 px-4 font-semibold">BU ID Number</th>
                  <th className="py-3 px-4 font-semibold">School Year (A.Y.)</th>
                  <th className="py-3 px-4 font-semibold">College Program</th>
                  <th className="py-3 px-4 font-semibold">Class Block</th>
                  <th className="py-3 px-4 font-semibold">Host Company (HTE)</th>
                  <th className="py-3 px-4 font-semibold">Rendered Hours</th>
                  <th className="py-3 px-4 font-semibold">Clearance Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {archivedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {s.avatarUrl && s.avatarUrl.trim() !== '' ? (
                          <img
                            src={s.avatarUrl}
                            alt={s.fullName}
                            className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{s.fullName}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{s.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-[#0B2545] dark:text-orange-400">
                      {s.buId}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        A.Y. 2026-2027
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {s.degree || 'BS Computer Science'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-[11px] px-2 py-0.5 rounded bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400 border border-[#FED7AA] dark:border-orange-800">
                        {s.classBlock || 'BSCS 4-A'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold block dark:text-white">{s.companyName}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Mentor: {s.mentorName}</span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {s.renderedHours.toFixed(1)} / {s.targetHours}h
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        CLEARED & ARCHIVED
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            const slip = `BICOL UNIVERSITY - COLLEGE OF SCIENCE\nPRACTICUM COMPLETION & ARCHIVAL CLEARANCE CERTIFICATE\n\nStudent: ${s.fullName}\nBU ID: ${s.buId}\nProgram: ${s.degree}\nClass Block: ${s.classBlock || 'BSCS 4-A'}\nAcademic Year: 2026-2027\nHost Training Establishment: ${s.companyName}\nRendered Hours: ${s.renderedHours} / ${s.targetHours} Hours\nStatus: FULLY CLEARED & ARCHIVED\nDate Issued: ${new Date().toLocaleDateString()}`;
                            const blob = new Blob([slip], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Clearance_${s.buId}.txt`;
                            a.click();
                          }}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-[#F26522] dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-90 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          title="Download Clearance Certificate"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {isCoordinator && onUnarchiveStudent && (
                          <button
                            onClick={() => onUnarchiveStudent(s.id)}
                            className="px-2 py-1 text-[10px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded font-semibold transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700"
                            title="Restore student back to active dashboard roster"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: BATCH ROSTER INSPECTOR */}
      {inspectingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#020617] w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]">
            <div className="bg-[#020617] text-white p-5 px-6 flex items-center justify-between border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#F26522] text-white text-[10px] font-bold">
                    {inspectingBatch.blockSection}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-900 text-blue-200 text-[10px] font-mono">
                    A.Y. {inspectingBatch.academicYear}
                  </span>
                  <h2 className="text-base font-bold text-white">{inspectingBatch.batchName}</h2>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Course: BS Computer Science • Term: {inspectingBatch.semester} • Code:{' '}
                  {inspectingBatch.batchCode}
                </p>
              </div>
              <button
                onClick={() => setInspectingBatch(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 text-slate-800 dark:text-slate-200">
              {/* Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block">Class Block Roster:</span>
                  <strong className="text-base font-bold text-[#0B2545] dark:text-white">
                    {inspectingBatch.blockSection} ({inspectedStudents.length} Students)
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block">Total Hours Rendered:</span>
                  <strong className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                    {inspectingBatch.totalHoursRendered} /{' '}
                    {inspectingBatch.totalStudents * inspectingBatch.targetHours}h
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block">Clearance Status:</span>
                  <strong className="text-base font-bold text-blue-700 dark:text-blue-400">
                    {inspectingBatch.completedStudents} Cleared
                  </strong>
                </div>
              </div>

              {/* Roster Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Class Block Intern Roster ({inspectedStudents.length})
                  </h3>
                  <button
                    onClick={() => handleExportCSV(inspectingBatch)}
                    className="text-xs text-[#F26522] hover:text-[#D94B0A] font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download DTR Archive CSV
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">BU ID</th>
                        <th className="py-2.5 px-3">Course / Block</th>
                        <th className="py-2.5 px-3">Partner Company (HTE)</th>
                        <th className="py-2.5 px-3">Rendered Hours</th>
                        <th className="py-2.5 px-3">Clearance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {inspectedStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{s.fullName}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{s.buId}</td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                            {s.degree} ({s.classBlock || inspectingBatch.blockSection})
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{s.companyName}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0B2545] dark:text-emerald-400">
                            {s.renderedHours} / {s.targetHours}h
                          </td>
                          <td className="py-2.5 px-3">
                            {s.renderedHours >= s.targetHours || s.completionApproved ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                                APPROVED & CLEARED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-bold text-[10px]">
                                IN PROGRESS
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 px-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectingBatch(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE ARCHIVAL BATCH */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#020617] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-[#020617] text-white p-5 px-6 flex items-center justify-between border-b border-slate-800/80">
              <div>
                <h2 className="text-base font-bold text-white">Create Archival Class Block Batch</h2>
                <p className="text-xs text-slate-300">
                  Provision an archival record classified by School Year, Course, and Block
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    School Year (A.Y.) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSchoolYear}
                    onChange={(e) => setNewSchoolYear(e.target.value)}
                    placeholder="2026-2027"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    College Program / Course *
                  </label>
                  <select
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  >
                    <option value="BS Computer Science">BS Computer Science</option>
                    <option value="BS Information Technology">BS Information Technology</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Class Block Section *
                  </label>
                  <select
                    value={newBlockSection}
                    onChange={(e) => setNewBlockSection(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  >
                    <option value="BSCS 4-A">BSCS 4-A</option>
                    <option value="BSCS 4-B">BSCS 4-B</option>
                    <option value="BSCS 4-C">BSCS 4-C</option>
                    <option value="BSIT 4-A">BSIT 4-A</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Semester Term *</label>
                  <select
                    value={newSemester}
                    onChange={(e) => setNewSemester(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  >
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="Midyear Term">Midyear Term</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batch Title (Optional)
                </label>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. BSCS 4-A Practicum Archive - A.Y. 2026-2027 1st Semester"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold rounded-xl transition-all active:scale-95 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Batch Archive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
