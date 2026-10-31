import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Plus,
  Calendar,
  Clock,
  Search,
  Filter,
  UserCheck,
  Briefcase,
  Layers,
  Info,
  MapPin,
  User as UserIcon,
  AlertCircle,
  X,
  Check,
} from './icons';
import { Student, Group, Company } from '../types';

interface EnrollmentModuleProps {
  students: Student[];
  groups?: Group[];
  companies: Company[];
  onEnrollStudent: (studentData: any) => Promise<void>;
  onCreateGroup?: (groupData: any) => Promise<void>;
  onRegisterCompany: (companyData: any) => Promise<void>;
  onApproveEnrollment?: (studentId: string) => Promise<void>;
  onDeclineEnrollment?: (studentId: string, reason?: string) => Promise<void>;
  isCoordinator?: boolean;
}

export const EnrollmentModule: React.FC<EnrollmentModuleProps> = ({
  students,
  groups = [],
  companies,
  onEnrollStudent,
  onCreateGroup,
  onRegisterCompany,
  onApproveEnrollment,
  onDeclineEnrollment,
  isCoordinator = false,
}) => {
  // If coordinator, default tab is 'deployments' (view-only directory)
  const [activeTab, setActiveTab] = useState<'pending' | 'deployments' | 'categories' | 'company'>('deployments');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null);
  const [decliningStudentId, setDecliningStudentId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Search & filter states for deployments directory
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending_approval' | 'declined'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  // Quick Add Company Modal / Drawer State
  const [isQuickAddCompOpen, setIsQuickAddCompOpen] = useState(false);
  const [quickCompName, setQuickCompName] = useState('');
  const [quickCompSector, setQuickCompSector] = useState('ICT & Software Development');
  const [quickCompAddress, setQuickCompAddress] = useState('');
  const [quickCompBranch, setQuickCompBranch] = useState('');
  const [quickCompPerson, setQuickCompPerson] = useState('');
  const [quickCompEmail, setQuickCompEmail] = useState('');
  const [quickCompPhone, setQuickCompPhone] = useState('');

  // Company Form State
  const [compName, setCompName] = useState('');
  const [compSector, setCompSector] = useState('Government Science & ICT');
  const [compAddress, setCompAddress] = useState('Regional Center Site, Rawis, Legazpi City');
  const [compBranch, setCompBranch] = useState('Regional Center Site, Rawis, Legazpi City');
  const [compLiaison, setCompLiaison] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compCapacity, setCompCapacity] = useState('8');

  // Categorize students by Company and Branch
  const companyBranchGroups = useMemo(() => {
    const map = new Map<string, {
      companyName: string;
      branch: string;
      companyId: string;
      students: Student[];
      totalHoursRendered: number;
      mentorName?: string;
      sector?: string;
    }>();

    // Populate registered partner companies
    companies.forEach((comp) => {
      const branchName = comp.branch || comp.address || 'Main Branch';
      const key = `${comp.name}:::${branchName}`;
      map.set(key, {
        companyName: comp.name,
        branch: branchName,
        companyId: comp.id,
        students: [],
        totalHoursRendered: 0,
        mentorName: comp.contactPerson,
        sector: comp.sector,
      });
    });

    // Group active students by company and branch
    students.forEach((stu) => {
      if (!stu.isArchived && stu.companyName && stu.companyName !== 'Not Yet Enrolled (Pending Application)') {
        const branchName = stu.companyBranch || 'Main Branch';
        const key = `${stu.companyName}:::${branchName}`;
        if (!map.has(key)) {
          map.set(key, {
            companyName: stu.companyName,
            branch: branchName,
            companyId: stu.companyId || 'comp-custom',
            students: [],
            totalHoursRendered: 0,
            mentorName: stu.mentorName,
          });
        }
        const item = map.get(key)!;
        item.students.push(stu);
        item.totalHoursRendered += stu.renderedHours;
      }
    });

    return Array.from(map.values());
  }, [companies, students]);

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onRegisterCompany({
        name: compName,
        sector: compSector,
        address: compAddress,
        branch: compBranch || compAddress || 'Main Branch',
        contactPerson: compLiaison,
        contactEmail: compEmail,
        contactPhone: compPhone,
        maxInterns: compCapacity,
      });
      setSuccessMessage(`Partner Company "${compName} (${compBranch || 'Main Branch'})" successfully added with verified MOA.`);
      setCompName('');
      setCompBranch('');
      setCompLiaison('');
      setCompEmail('');
      setCompPhone('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pending students waiting for coordinator's approval
  const pendingStudents = useMemo(() => {
    return students.filter(
      (s) =>
        (s.enrollmentStatus === 'pending_approval' || s.enrollmentStatus === 'pending_peer_approval') &&
        !s.isArchived
    );
  }, [students]);

  // Active deployments: strictly enrolled & approved students
  const activeEnrolledStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.enrollmentStatus === 'approved' &&
        !s.isArchived &&
        s.companyName &&
        s.companyName !== 'Not Yet Enrolled (Pending Application)'
    );
  }, [students]);

  const handleApprove = async (studentId: string) => {
    if (!onApproveEnrollment) return;
    setProcessingStudentId(studentId);
    try {
      await onApproveEnrollment(studentId);
      setSuccessMessage('Student intern enrollment approved successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setProcessingStudentId(null);
    }
  };

  const handleDecline = async (studentId: string) => {
    if (!onDeclineEnrollment) return;
    setProcessingStudentId(studentId);
    try {
      await onDeclineEnrollment(studentId, declineReason || 'Enrollment application declined by coordinator.');
      setDecliningStudentId(null);
      setDeclineReason('');
      setSuccessMessage('Student intern enrollment application declined.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setProcessingStudentId(null);
    }
  };

  // Filtered list of student deployments (strictly enrolled & approved students)
  const filteredStudents = activeEnrolledStudents.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.buId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.groupName && s.groupName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'approved' && s.enrollmentStatus === 'approved') ||
      (statusFilter === 'pending_approval' && s.enrollmentStatus === 'pending_approval') ||
      (statusFilter === 'declined' && s.enrollmentStatus === 'declined');

    const matchesCompany =
      companyFilter === 'all' || s.companyId === companyFilter || s.companyName === companyFilter;

    return matchesSearch && matchesStatus && matchesCompany && !s.isArchived;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs transition-colors duration-200">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400 font-bold text-xs border border-[#FED7AA] dark:border-orange-800">
                Practicum Directorate
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bicol University Student Internship Program Policy</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B2545] dark:text-white">
              Student Deployments & Partner Establishments
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 max-w-4xl">
              Monitor verified host training establishment (HTE) assignments, self-formed student cohorts, and active practicum placements.
              Students submit their own enrollment details upon registration for coordinator review and approval.
            </p>
          </div>

          {/* Navigation Tabs Placed Cleanly Below the Description */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Pending Student Interns button placed before Active Deployments */}
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold border ${
                activeTab === 'pending'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-400/40 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending Student Interns ({pendingStudents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('deployments')}
              className={`px-4 py-2 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold border ${
                activeTab === 'deployments'
                  ? 'bg-orange-50 dark:bg-orange-950/40 text-[#F26522] border-[#F26522]/30 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Active Deployments ({activeEnrolledStudents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold border ${
                activeTab === 'categories'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-400/30 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#F26522]" />
              <span>Company & Branch Categories ({companyBranchGroups.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`px-4 py-2 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold border ${
                activeTab === 'company'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-400/30 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Register Partner HTE</span>
            </button>
          </div>
        </div>

        {/* Read-Only Role Compliance Banner for Coordinator */}
        <div className="mt-4 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-lg flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Student-Led Enrollment Architecture:</strong> Students input and submit their own Host Training Establishment (HTE) details, duty schedules, and target hours during account setup.
            Coordinators audit, approve, or decline applications in the <em>Pending Applications</em> queue on the main dashboard without entering student data manually.
          </div>
        </div>

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Tab 0: Pending Student Interns (Awaiting Coordinator Review & Approval) */}
      {activeTab === 'pending' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <span>Pending Student Interns ({pendingStudents.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Student interns waiting for the coordinator's review and official approval before commencing duty.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {pendingStudents.length} Application{pendingStudents.length === 1 ? '' : 's'} Pending Review
            </div>
          </div>

          {decliningStudentId && (
            <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-red-800 dark:text-red-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Specify Reason for Declining Enrollment Application
              </h4>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="State why this application is declined (e.g. invalid host training establishment, unverified MOA, schedule conflicts)..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setDecliningStudentId(null); setDeclineReason(''); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDecline(decliningStudentId)}
                  disabled={processingStudentId === decliningStudentId}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all active:scale-95 shadow-xs"
                >
                  {processingStudentId === decliningStudentId ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          )}

          {pendingStudents.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Pending Student Interns</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                All registered student interns have either been approved for active deployment or have not yet submitted their HTE application.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingStudents.map((stu) => (
                <div
                  key={stu.id}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0B2545] dark:bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                        {stu.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-[#0B2545] dark:text-white">{stu.fullName}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {stu.buId || stu.studentIdNumber || 'Verified ID'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {stu.degree || 'Bachelor of Science in Computer Science'} • {stu.classBlock || 'BSCS 4-A'}
                        </p>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                      Pending Coordinator Approval
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Host Training Establishment (HTE)</span>
                      <strong className="text-slate-900 dark:text-white font-semibold flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#F26522] shrink-0" />
                        <span>{stu.companyName || 'Not Assigned'}</span>
                      </strong>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{stu.companyBranch || 'Main Branch'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Duty Schedule & Hours</span>
                      <strong className="text-slate-900 dark:text-white font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{stu.dutyStart || '08:00'} – {stu.dutyEnd || '17:00'}</span>
                      </strong>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">{stu.targetHours || 240} Required Hours</span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Deployment Target</span>
                      <strong className="text-slate-900 dark:text-white font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#F26522] shrink-0" />
                        <span>{stu.scheduledDeploymentDate || stu.startDate || 'Immediate Start'}</span>
                      </strong>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{stu.dutyDays || 'Monday - Friday'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Company Mentor / Liaison</span>
                      <strong className="text-slate-900 dark:text-white font-semibold flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{stu.mentorName || 'Company Supervisor'}</span>
                      </strong>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{stu.groupName ? `Cohort: ${stu.groupName}` : 'Individual'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDecliningStudentId(stu.id)}
                      disabled={processingStudentId === stu.id}
                      className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-700 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 font-bold transition-all active:scale-95 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(stu.id)}
                      disabled={processingStudentId === stu.id}
                      className="px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-bold transition-all active:scale-95 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{processingStudentId === stu.id ? 'Approving...' : 'Approve Enrollment & HTE'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Active Deployments Directory (View-Only Table & Audit for Coordinator) */}
      {activeTab === 'deployments' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#F26522]" />
                <span>Intern Practicum Deployments Directory ({filteredStudents.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official roster of student intern assignments, host companies, and schedule parameters.
              </p>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search intern, ID, or company..."
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F26522] w-56"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-[#F26522]"
              >
                <option value="all">All Active Deployments</option>
                <option value="approved">Approved & Active</option>
                <option value="declined">Declined</option>
              </select>

              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-[#F26522]"
              >
                <option value="all">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deployments Directory Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">Student Intern</th>
                  <th className="py-3 px-4 font-semibold">BU ID & Block</th>
                  <th className="py-3 px-4 font-semibold">Host Training Establishment (HTE)</th>
                  <th className="py-3 px-4 font-semibold">Cohort / Group</th>
                  <th className="py-3 px-4 font-semibold">Scheduled Window</th>
                  <th className="py-3 px-4 font-semibold">Rendered Hours</th>
                  <th className="py-3 px-4 font-semibold">Placement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No student deployments match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
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
                            <div className="font-bold text-slate-900 dark:text-white">{s.fullName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{s.buId}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.classBlock || 'BSCS 4-A'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#F26522] shrink-0" />
                          <span>{s.companyName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Mentor: {s.mentorName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {s.groupName || 'Individual Track'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {s.dutyStart} – {s.dutyEnd}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {s.renderedHours.toFixed(1)} / {s.targetHours}h
                        </div>
                        <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-md h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-[#F26522] h-1.5 rounded-md"
                            style={{ width: `${Math.min(100, (s.renderedHours / s.targetHours) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {s.enrollmentStatus === 'approved' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Approved & Active
                          </span>
                        ) : s.enrollmentStatus === 'declined' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 w-max">
                            Declined
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 w-max">
                            Pending Review
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Company & Branch Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#F26522]" />
                Company & Branch Practicum Placements ({companyBranchGroups.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Students are automatically categorized whenever they render duty at the same host company and branch location.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {students.filter(s => !s.isArchived).length} Total Enrolled Interns
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {companyBranchGroups.map((group, idx) => (
              <div
                key={`${group.companyName}-${group.branch}-${idx}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-[#F26522] shrink-0" />
                          {group.companyName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-500" />
                          {group.branch}
                        </span>
                      </div>
                      {group.sector && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {group.sector}
                        </div>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#FFF0E6] dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400 border border-[#FED7AA] dark:border-orange-800 shrink-0">
                      {group.students.length} {group.students.length === 1 ? 'Intern' : 'Interns'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Roster of Students at this Branch
                    </div>

                    {group.students.length === 0 ? (
                      <div className="py-4 text-center rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No students currently assigned to this branch location.
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          When students enroll with this company and branch, they will appear here automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {group.students.map((stu) => (
                          <div
                            key={stu.id}
                            className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-150 dark:border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{stu.fullName}</span>
                                <span className="font-mono text-[10px] text-slate-500">({stu.buId})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{stu.classBlock || 'BSCS 4-A'}</span>
                                <span>•</span>
                                <span className="font-mono">{stu.dutyStart} - {stu.dutyEnd}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                {stu.renderedHours.toFixed(1)} / {stu.targetHours}h
                              </div>
                              <div className="mt-0.5">
                                {stu.enrollmentStatus === 'approved' ? (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    Approved
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                                    Pending Review
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {group.mentorName && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Supervisor / Contact: <strong className="text-slate-700 dark:text-slate-300">{group.mentorName}</strong></span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">Total Hours: {group.totalHoursRendered.toFixed(1)}h</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Partner Company (HTE) Registration */}
      {activeTab === 'company' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#0B2545] dark:text-white mb-2 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#F26522]" />
              Register Host Training Establishment (Partner Company)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Coordinators register official partner establishments with verified Memoranda of Agreement (MOA).
            </p>

            <form onSubmit={handleCompanySubmit} className="space-y-4 text-xs text-slate-800 dark:text-slate-200 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    placeholder="e.g. DOST Region V"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Industry Sector *</label>
                  <input
                    type="text"
                    required
                    value={compSector}
                    onChange={(e) => setCompSector(e.target.value)}
                    placeholder="e.g. Government Science & ICT"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Office Address</label>
                  <input
                    type="text"
                    value={compAddress}
                    onChange={(e) => setCompAddress(e.target.value)}
                    placeholder="Regional Center Site, Rawis, Legazpi City"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch / Office Location *</label>
                  <input
                    type="text"
                    required
                    value={compBranch}
                    onChange={(e) => setCompBranch(e.target.value)}
                    placeholder="e.g. Rawis Regional Office or Legazpi Capitol Branch"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Liaison Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={compLiaison}
                    onChange={(e) => setCompLiaison(e.target.value)}
                    placeholder="e.g. Engr. Rommel Serrano"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={compEmail}
                    onChange={(e) => setCompEmail(e.target.value)}
                    placeholder="contact@company.gov.ph"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg transition-all active:scale-95 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                {isSubmitting ? 'Registering...' : 'Register Partner Company (HTE)'}
              </button>
            </form>
          </div>

          {/* Active Companies / MOA List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-3">
            <h3 className="font-bold text-[#0B2545] dark:text-white text-sm">Verified Partner HTEs ({companies.length})</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Establishments with active Bicol University practicum partnerships.
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-2 space-y-2.5">
              {companies.map((c) => (
                <div key={c.id} className="pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{c.name}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                      MOA Active
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{c.sector}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {c.address} • {c.contactPerson}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
