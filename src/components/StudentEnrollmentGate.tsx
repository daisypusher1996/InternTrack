import React, { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Calendar,
  ShieldCheck,
  UserCheck,
  FileText,
  MapPin,
  ArrowRight,
  RefreshCw,
  LogOut,
  ChevronRight,
  Info,
  Plus,
  Trash2,
  Users,
  UserPlus,
  X,
  Mail,
  Check,
  Loader2,
} from 'lucide-react';
import { Student, Company, User, CoordinatorInfo, Group, GroupMemberInvitation } from '../types';
import { BUMascotWelcome } from './BUMascotWelcome';

interface PeerInput {
  id: string;
  email: string;
  student?: {
    id: string;
    fullName: string;
    email: string;
    buId: string;
    classBlock?: string;
  };
  error?: string;
  isValidating?: boolean;
}

interface StudentEnrollmentGateProps {
  currentUser: User;
  student: Student;
  companies: Company[];
  allStudents?: Student[];
  groups?: Group[];
  onSubmitEnrollment: (data: {
    companyId: string;
    companyBranch?: string;
    mentorName?: string;
    coordinatorId?: string;
    coordinatorName?: string;
    targetHours?: number;
    scheduledDeploymentDate?: string;
    notes?: string;
    enrollmentType?: 'individual' | 'group';
    groupName?: string;
    peerEmails?: string[];
  }) => Promise<void>;
  onCancelEnrollment?: (studentId: string) => Promise<void>;
  onRegisterCompany?: (companyData: any) => Promise<any>;
  onRespondGroupInvitation?: (groupId: string, accept: boolean) => Promise<void>;
  onRefreshData?: () => Promise<void>;
  onLogout: () => void;
}

export const StudentEnrollmentGate: React.FC<StudentEnrollmentGateProps> = ({
  currentUser,
  student,
  companies,
  allStudents = [],
  groups = [],
  onSubmitEnrollment,
  onCancelEnrollment,
  onRegisterCompany,
  onRespondGroupInvitation,
  onRefreshData,
  onLogout,
}) => {
  const isPendingPeerApproval = student.enrollmentStatus === 'pending_peer_approval';
  const isPendingCoordinatorApproval = student.enrollmentStatus === 'pending_approval';
  const isDeclined = student.enrollmentStatus === 'declined';
  const isNotEnrolled = !student.enrollmentStatus || student.enrollmentStatus === 'not_enrolled';

  // Find associated group if student is part of one
  const activeGroup = groups.find(
    (g) =>
      (student.groupId && g.id === student.groupId) ||
      (student.pendingGroupInvitation?.groupId && g.id === student.pendingGroupInvitation.groupId) ||
      g.leaderId === student.id ||
      g.invitations?.some(
        (i) =>
          i.studentId === student.id ||
          (student.email && i.studentEmail?.toLowerCase() === student.email.toLowerCase())
      )
  );

  // Fallback peer members from allStudents if activeGroup.invitations is not yet populated
  const cohortPeersFromStudents = (allStudents || []).filter(
    (s) =>
      s.id !== student.id &&
      ((student.groupId && s.groupId === student.groupId) ||
        (student.groupId && s.pendingGroupInvitation?.groupId === student.groupId))
  );

  const displayInvitations: GroupMemberInvitation[] =
    activeGroup?.invitations && activeGroup.invitations.length > 0
      ? activeGroup.invitations
      : [
          {
            studentId: student.id,
            studentEmail: student.email,
            studentName: student.fullName,
            studentBuId: student.buId,
            classBlock: student.classBlock,
            status: 'creator' as const,
          },
          ...cohortPeersFromStudents.map((p) => ({
            studentId: p.id,
            studentEmail: p.email,
            studentName: p.fullName,
            studentBuId: p.buId,
            classBlock: p.classBlock,
            status: (p.pendingGroupInvitation ? 'pending' : 'accepted') as any,
          })),
        ];

  // Enrollment Mode: Individual vs Group Cohort
  const [enrollmentMode, setEnrollmentMode] = useState<'individual' | 'group'>('individual');
  const [groupName, setGroupName] = useState<string>('');

  // Peer members for group cohort (Max 4 peers since submitter is 1 = total 5 max per block/company)
  const [peers, setPeers] = useState<PeerInput[]>([
    { id: 'peer-1', email: '' },
  ]);

  // Form State for Fresh Enrollment
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    student.companyId && companies.some((c) => c.id === student.companyId)
      ? student.companyId
      : companies[0]?.id || ''
  );
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];

  const [selectedBranch, setSelectedBranch] = useState<string>(
    student.companyBranch ||
      selectedCompany?.branch ||
      selectedCompany?.address ||
      'Regional Center Site, Rawis, Legazpi City'
  );
  const [mentorName, setMentorName] = useState<string>(
    student.mentorName && student.mentorName !== 'Unassigned' ? student.mentorName : ''
  );
  const [scheduledDeploymentDate, setScheduledDeploymentDate] = useState<string>(
    student.scheduledDeploymentDate || new Date().toISOString().split('T')[0]
  );

  // Internship Coordinator Selection State
  const [coordinatorList, setCoordinatorList] = useState<CoordinatorInfo[]>([]);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string>(
    student.coordinatorId || ''
  );
  const [selectedCoordinatorName, setSelectedCoordinatorName] = useState<string>(
    student.coordinatorName || ''
  );

  // Invitation response state
  const [isRespondingInvitation, setIsRespondingInvitation] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/coordinators')
      .then((res) => res.json())
      .then((data) => {
        const list: CoordinatorInfo[] = Array.isArray(data) ? data : (data?.coordinators || []);
        if (list.length > 0) {
          setCoordinatorList(list);
          if (!student.coordinatorId || !list.some((c) => c.id === student.coordinatorId)) {
            setSelectedCoordinatorId(list[0].id);
            setSelectedCoordinatorName(list[0].fullName);
          }
        } else {
          setCoordinatorList([]);
          setSelectedCoordinatorId('');
          setSelectedCoordinatorName('');
        }
      })
      .catch((err) => console.warn('Could not load coordinators:', err));
  }, [student.coordinatorId]);

  // Auto-suggest group name based on company and class block
  useEffect(() => {
    if (selectedCompany) {
      const blockStr = student.classBlock || currentUser.classBlock || 'BSCS';
      setGroupName(`${selectedCompany.name} (${blockStr}) Practicum Cohort`);
    }
  }, [selectedCompanyId, selectedCompany, student.classBlock, currentUser.classBlock]);

  const [targetHours, setTargetHours] = useState<string>('240');
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New HTE Addition State
  const [isAddingNewHte, setIsAddingNewHte] = useState(false);
  const [newHteName, setNewHteName] = useState('');
  const [newHteSector, setNewHteSector] = useState('ICT & Software Development');
  const [newHteAddress, setNewHteAddress] = useState('');
  const [newHteBranch, setNewHteBranch] = useState('');
  const [newHtePerson, setNewHtePerson] = useState('');
  const [newHteEmail, setNewHteEmail] = useState('');
  const [newHtePhone, setNewHtePhone] = useState('');
  const [isSubmittingHte, setIsSubmittingHte] = useState(false);

  // Peer input management
  const handleAddPeer = () => {
    if (peers.length >= 4) return; // Strict maximum 4 peers (total 5 cohort members)
    setPeers((prev) => [
      ...prev,
      { id: `peer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, email: '' },
    ]);
  };

  const handleRemovePeer = (id: string) => {
    setPeers((prev) => prev.filter((p) => p.id !== id));
  };

  // Validate a peer email against registered accounts
  const validatePeerEmail = async (id: string, email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setPeers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, email: '', student: undefined, error: undefined, isValidating: false } : p))
      );
      return;
    }

    // Check self-invitation
    if (cleanEmail === currentUser.email.toLowerCase() || cleanEmail === student.email.toLowerCase()) {
      setPeers((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                email: cleanEmail,
                student: undefined,
                error: 'You cannot add yourself as a peer (you are the cohort creator).',
                isValidating: false,
              }
            : p
        )
      );
      return;
    }

    // Check duplicates in list
    const otherPeers = peers.filter((p) => p.id !== id && p.email.trim().toLowerCase() === cleanEmail);
    if (otherPeers.length > 0) {
      setPeers((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                email: cleanEmail,
                student: undefined,
                error: 'This student has already been added to the cohort list.',
                isValidating: false,
              }
            : p
        )
      );
      return;
    }

    // Mark as validating
    setPeers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, email: cleanEmail, isValidating: true, error: undefined } : p))
    );

    try {
      const res = await fetch(
        `/api/students/validate-peer?email=${encodeURIComponent(cleanEmail)}&currentEmail=${encodeURIComponent(
          currentUser.email
        )}&currentStudentId=${encodeURIComponent(student.id)}`
      );
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setPeers((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  email: cleanEmail,
                  student: undefined,
                  error:
                    data.error ||
                    'Invalid: No student account found with this email. The student must create their InternTrack account first.',
                  isValidating: false,
                }
              : p
          )
        );
      } else {
        setPeers((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  email: cleanEmail,
                  student: data.student,
                  error: undefined,
                  isValidating: false,
                }
              : p
          )
        );
      }
    } catch {
      // Fallback check against cached allStudents if server offline
      const localMatch = allStudents.find((s) => s.email.toLowerCase() === cleanEmail);
      if (localMatch) {
        setPeers((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  email: cleanEmail,
                  student: {
                    id: localMatch.id,
                    fullName: localMatch.fullName,
                    email: localMatch.email,
                    buId: localMatch.buId,
                    classBlock: localMatch.classBlock,
                  },
                  error: undefined,
                  isValidating: false,
                }
              : p
          )
        );
      } else {
        setPeers((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  email: cleanEmail,
                  student: undefined,
                  error: 'Invalid: No student account found with this email. The student must create their account first.',
                  isValidating: false,
                }
              : p
          )
        );
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Group Cohort Validations
    if (enrollmentMode === 'group') {
      const activePeers = peers.filter((p) => p.email.trim());
      if (activePeers.length === 0) {
        setErrorMsg('Please specify at least 1 peer student account to enroll as a group cohort.');
        setIsSubmitting(false);
        return;
      }
      if (activePeers.length > 4) {
        setErrorMsg('Maximum 4 peer students allowed (maximum 5 total members per company per block).');
        setIsSubmitting(false);
        return;
      }

      // Check self-invitation
      const selfPeer = activePeers.find(
        (p) =>
          p.email.trim().toLowerCase() === currentUser.email.toLowerCase() ||
          p.email.trim().toLowerCase() === student.email.toLowerCase()
      );
      if (selfPeer) {
        setErrorMsg('You cannot add yourself as a peer (you are the cohort creator).');
        setIsSubmitting(false);
        return;
      }

      // Auto-validate any peer that hasn't completed validation yet
      for (const p of activePeers) {
        if (!p.student || p.error) {
          const cleanEmail = p.email.trim().toLowerCase();
          try {
            const res = await fetch(
              `/api/students/validate-peer?email=${encodeURIComponent(cleanEmail)}&currentEmail=${encodeURIComponent(
                currentUser.email
              )}&currentStudentId=${encodeURIComponent(student.id)}`
            );
            const data = await res.json();
            if (data.valid && data.student) {
              p.student = data.student;
              p.error = undefined;
            } else if (!cleanEmail.includes('@')) {
              setErrorMsg(data.error || `Please enter a valid email for ${p.email}`);
              setIsSubmitting(false);
              return;
            }
          } catch {}
        }
      }
    }

    try {
      await onSubmitEnrollment({
        companyId: selectedCompanyId,
        companyBranch: selectedBranch || selectedCompany?.branch || selectedCompany?.address,
        mentorName: mentorName || selectedCompany?.contactPerson,
        coordinatorId: selectedCoordinatorId,
        coordinatorName: selectedCoordinatorName,
        targetHours: Number(targetHours) || 240,
        scheduledDeploymentDate,
        notes: studentNotes,
        enrollmentType: enrollmentMode,
        groupName: enrollmentMode === 'group' ? groupName : undefined,
        peerEmails:
          enrollmentMode === 'group'
            ? peers.filter((p) => p.email.trim()).map((p) => p.email.trim().toLowerCase())
            : undefined,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit enrollment application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHteName.trim()) return;
    setIsSubmittingHte(true);
    try {
      if (onRegisterCompany) {
        const created = await onRegisterCompany({
          name: newHteName.trim(),
          sector: newHteSector,
          address: newHteAddress || 'Legazpi City, Albay',
          branch: newHteBranch || newHteAddress || 'Main Branch',
          contactPerson: newHtePerson || 'Authorized Liaison',
          contactEmail: newHteEmail || 'liaison@company.ph',
          contactPhone: newHtePhone || '+63 900 000 0000',
        });
        if (created && (created.id || created._id)) {
          const compId = created.id || created._id;
          setSelectedCompanyId(compId);
          setSelectedBranch(created.branch || created.address || 'Main Branch');
          if (created.contactPerson) setMentorName(created.contactPerson);
        }
      }
      setIsAddingNewHte(false);
      setNewHteName('');
      setNewHteAddress('');
      setNewHteBranch('');
      setNewHtePerson('');
      setNewHteEmail('');
      setNewHtePhone('');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register new company');
    } finally {
      setIsSubmittingHte(false);
    }
  };

  // Peer student responds to group cohort invitation
  const handleRespondInvitation = async (accept: boolean) => {
    if (!student.pendingGroupInvitation || !onRespondGroupInvitation) return;
    setIsRespondingInvitation(true);
    setErrorMsg(null);
    try {
      await onRespondGroupInvitation(student.pendingGroupInvitation.groupId, accept);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to respond to group invitation');
    } finally {
      setIsRespondingInvitation(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* 1. Real-time Welcome Greeting with Mascot */}
      <BUMascotWelcome
        userName={currentUser.fullName}
        role="student"
        classBlock={student.classBlock || currentUser.classBlock || 'Unassigned Block'}
        isEnrolled={false}
        enrollmentStatus={student.enrollmentStatus}
      />

      {/* 2. INCOMING GROUP COHORT INVITATION BANNER (For Invited Peer Student) */}
      {student.pendingGroupInvitation && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border-2 border-blue-400 text-white rounded-2xl p-5 shadow-lg space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-blue-600 rounded-xl text-white shadow-md shrink-0">
                <Users className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[10px] font-extrabold uppercase tracking-wide">
                  <span>Group Cohort Sign-On Invitation</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-ping" />
                </div>
                <h3 className="text-lg font-black text-white">
                  Join & Sign-On to {student.pendingGroupInvitation.groupName}
                </h3>
                <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
                  <strong>{student.pendingGroupInvitation.leaderName}</strong> (
                  <span className="font-mono text-blue-200">{student.pendingGroupInvitation.leaderEmail}</span>
                  ) has included you in a joint Practicum Group Cohort application at{' '}
                  <strong className="text-amber-300">{student.pendingGroupInvitation.companyName}</strong> (
                  {student.pendingGroupInvitation.companyBranch}).
                </p>
              </div>
            </div>
          </div>

          {/* Invitation Details Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10">
            <div>
              <span className="text-blue-200 block text-[11px]">Host Training Establishment:</span>
              <strong className="text-white block mt-0.5">{student.pendingGroupInvitation.companyName}</strong>
              <span className="text-[10px] text-blue-300 block">{student.pendingGroupInvitation.companyBranch}</span>
            </div>
            <div>
              <span className="text-blue-200 block text-[11px]">Scheduled Deployment Date:</span>
              <strong className="text-amber-300 block mt-0.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{student.pendingGroupInvitation.scheduledDeploymentDate || 'Scheduled by Cohort'}</span>
              </strong>
            </div>
            <div>
              <span className="text-blue-200 block text-[11px]">Practicum Coordinator:</span>
              <strong className="text-white block mt-0.5">
                {student.pendingGroupInvitation.coordinatorName || 'Designated Coordinator'}
              </strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-blue-800/60 text-xs">
            <span className="text-blue-200 text-[11px]">
              * Approving this verifies your agreement to train at the same company and branch.
            </span>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                disabled={isRespondingInvitation}
                onClick={() => handleRespondInvitation(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-white/10 hover:bg-red-500/20 text-red-200 hover:text-red-100 border border-white/20 text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                Decline Invitation
              </button>
              <button
                type="button"
                disabled={isRespondingInvitation}
                onClick={() => handleRespondInvitation(true)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRespondingInvitation ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Approve & Sign-On to Cohort</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Status Stepper Guide */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          Internship Deployment Onboarding Pipeline
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Step 1: Account Created */}
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                1. Account Created
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                Student verified
              </div>
            </div>
          </div>

          {/* Step 2: HTE Enrollment / Peer Verification */}
          <div
            className={`p-3 rounded-lg border flex items-center gap-3 ${
              isNotEnrolled
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-300 ring-2 ring-amber-400/30'
                : isPendingPeerApproval
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-300 ring-2 ring-blue-400/30'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                isNotEnrolled
                  ? 'bg-[#F26522] text-white animate-pulse'
                  : isPendingPeerApproval
                  ? 'bg-blue-600 text-white animate-pulse'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isNotEnrolled ? '2' : isPendingPeerApproval ? <Users className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div>
              <div
                className={`text-[11px] font-bold ${
                  isNotEnrolled
                    ? 'text-amber-950 dark:text-amber-200'
                    : isPendingPeerApproval
                    ? 'text-blue-950 dark:text-blue-200'
                    : 'text-emerald-900 dark:text-emerald-300'
                }`}
              >
                {isPendingPeerApproval ? '2. Peer Sign-On' : '2. HTE Enrollment'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {isNotEnrolled ? 'Current Step' : isPendingPeerApproval ? 'Awaiting Peers' : 'Submitted'}
              </div>
            </div>
          </div>

          {/* Step 3: Coordinator Endorsement */}
          <div
            className={`p-3 rounded-lg border flex items-center gap-3 ${
              isPendingCoordinatorApproval
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-300 ring-2 ring-amber-400/30'
                : isDeclined
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-950 dark:text-red-300'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                isPendingCoordinatorApproval
                  ? 'bg-amber-500 text-white animate-pulse'
                  : isDeclined
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              3
            </div>
            <div>
              <div
                className={`text-[11px] font-bold ${
                  isPendingCoordinatorApproval
                    ? 'text-amber-950 dark:text-amber-200'
                    : isDeclined
                    ? 'text-red-900 dark:text-red-300'
                    : 'text-slate-700 dark:text-slate-400'
                }`}
              >
                3. Coordinator Review
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {isPendingCoordinatorApproval
                  ? 'Under Evaluation'
                  : isDeclined
                  ? 'Declined'
                  : isPendingPeerApproval
                  ? 'Unlocks after peers'
                  : 'Pending Step 2'}
              </div>
            </div>
          </div>

          {/* Step 4: Dashboard & DTR Unlocked */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-slate-400">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
              4
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                4. Dashboard Access
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Unlocks on Approval
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SCENARIO A1: PENDING PEER VERIFICATION NOTICE (Group Cohort Gate) */}
      {isPendingPeerApproval && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-400 dark:border-blue-700/80 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-blue-600 text-white rounded-xl shadow-sm shrink-0">
                <Users className="w-7 h-7 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-200 dark:bg-blue-900/60 text-blue-950 dark:text-blue-200 text-[10px] font-extrabold uppercase">
                  <span>Group Cohort Application Submitted</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                </div>
                <h3 className="text-lg font-black text-blue-950 dark:text-blue-100">
                  Pending Peer Student Sign-On & Verification
                </h3>
                <p className="text-xs text-blue-900/90 dark:text-blue-200/90 max-w-2xl leading-relaxed">
                  Your Group Cohort application for <strong>{student.groupName || student.companyName}</strong> has been received! Before your Practicum Coordinator reviews this dossier, all invited peer students must sign in to their own accounts and verify their sign-on to confirm they agreed to be enrolled together.
                </p>
              </div>
            </div>
          </div>

          {/* Group Cohort Member Verification Tracker */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#F26522]" />
                <span>Cohort Member Verification Status</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-semibold">
                Company: {student.companyName} ({student.companyBranch})
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Creator row */}
              <div className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950 text-[#F26522] font-black text-[11px] flex items-center justify-center">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {student.fullName} (You)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {student.email} • {student.buId} • {student.classBlock}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Confirmed (Organizer)</span>
                </span>
              </div>

              {/* Invited peers */}
              {displayInvitations
                .filter((inv) => inv.status !== 'creator')
                .map((inv, idx) => {
                  const isAccepted = inv.status === 'accepted';
                  const isDeclinedPeer = inv.status === 'declined';
                  return (
                    <div key={inv.studentId || idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[11px] flex items-center justify-center">
                          {idx + 2}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {inv.studentName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {inv.studentEmail} • {inv.studentBuId || 'Student ID'} • {inv.classBlock || 'Class Block'}
                          </span>
                        </div>
                      </div>
                      <div>
                        {isAccepted ? (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Signed On & Verified</span>
                          </span>
                        ) : isDeclinedPeer ? (
                          <span className="px-2.5 py-1 rounded-md bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-bold text-[10px] flex items-center gap-1">
                            <X className="w-3 h-3" />
                            <span>Declined</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>Waiting for student sign-on</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-blue-200 dark:border-blue-800/60 text-xs">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 text-[11px]">
              <Info className="w-4 h-4 shrink-0 text-blue-600" />
              <span>
                Once all invited students sign in and approve, this cohort automatically routes to Practicum Coordinator{' '}
                <strong>{student.coordinatorName || 'your coordinator'}</strong>.
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onRefreshData && (
                <button
                  type="button"
                  onClick={onRefreshData}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold border border-blue-300 dark:border-slate-700 transition flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Verification Status</span>
                </button>
              )}
              {onCancelEnrollment && (
                <button
                  type="button"
                  onClick={() => onCancelEnrollment(student.id)}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg font-bold border border-red-200 dark:border-red-800 transition flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
                  title="Cancel this group application to revise members or re-apply"
                >
                  <span>Cancel Group Application</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. SCENARIO A2: Awaiting Coordinator Review Screen */}
      {isPendingCoordinatorApproval && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/80 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
                <AlertCircle className="w-7 h-7 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 text-[10px] font-extrabold uppercase">
                  <span>Awaiting Endorsement</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                </div>
                <h3 className="text-lg font-black text-amber-950 dark:text-amber-100">
                  Internship Enrollment Submitted & Pending Coordinator Approval
                </h3>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 max-w-2xl leading-relaxed">
                  Your internship deployment dossier has been submitted. In accordance with Practicum Guidelines, your Practicum Coordinator must approve your Host Training Establishment assignment before your Daily Time Record (DTR) and student dashboard are unlocked.
                </p>
              </div>
            </div>
          </div>

          {/* Dossier Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                Host Training Establishment & Branch:
              </span>
              <strong className="text-slate-900 dark:text-white block mt-0.5 font-bold">
                {student.companyName || selectedCompany?.name}
              </strong>
              <span className="text-[10px] text-[#0875e1] font-semibold block mt-0.5">
                Branch: {student.companyBranch || selectedBranch}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                Assigned Class Block:
              </span>
              <strong className="text-slate-900 dark:text-white block mt-0.5 font-mono">
                {student.classBlock || currentUser.classBlock || 'Unassigned Block'}
              </strong>
              {student.enrollmentType === 'group' && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-0.5">
                  Group Cohort Verified
                </span>
              )}
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                Required Target Hours:
              </span>
              <strong className="text-emerald-700 dark:text-emerald-400 block mt-0.5 font-black">
                {student.targetHours || 240} Hours Standard
              </strong>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                Scheduled Deployment Date:
              </span>
              <strong className="text-[#F26522] block mt-0.5 font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{student.scheduledDeploymentDate || scheduledDeploymentDate || 'Pending Schedule'}</span>
              </strong>
            </div>
          </div>

          {/* Practical Coordinator Info & Next Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-amber-200 dark:border-amber-800/60 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Coordinator Directorate:{' '}
                <strong>
                  {student.coordinatorName
                    ? `${student.coordinatorName} (${student.coordinatorEmail || 'coordinator@bicol-u.edu.ph'})`
                    : 'coordinator@bicol-u.edu.ph'}
                </strong>{' '}
                (Dept. of Computer Science)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onRefreshData && (
                <button
                  type="button"
                  onClick={onRefreshData}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold border border-amber-300 dark:border-slate-700 transition flex items-center gap-1.5 text-xs shadow-xs cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Approval Status</span>
                </button>
              )}
              {onCancelEnrollment && (
                <button
                  type="button"
                  onClick={() => onCancelEnrollment(student.id)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold border border-red-700 transition flex items-center gap-1.5 text-xs shadow-xs cursor-pointer active:scale-95"
                  title="Cancel enrollment application to re-select HTE"
                >
                  <span>Cancel Enrollment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. SCENARIO B: Declined Enrollment Alert */}
      {isDeclined && (
        <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-700/80 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3.5">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-red-600 text-white rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <h3 className="font-black text-red-950 dark:text-red-100 text-sm">
                  Enrollment Application Declined by Practicum Coordinator
                </h3>
                <p className="text-red-900 dark:text-red-300 leading-relaxed">
                  {student.enrollmentDeclinedReason ||
                    'Your Host Training Establishment assignment was not approved. Please revise your application below and resubmit.'}
                </p>
              </div>
            </div>

            {onCancelEnrollment && (
              <button
                type="button"
                onClick={() => onCancelEnrollment(student.id)}
                className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
              >
                Cancel & Re-select HTE
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7. SCENARIO C: Fresh Account Enrollment Application Form (Individual or Group Cohort) */}
      {(isNotEnrolled || isDeclined) && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden transition-colors duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#020617] via-[#0B2545] to-[#134074] text-white p-5 sm:p-6 border-b border-[#06182C] dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-amber-300 border border-white/20 text-[10px] font-bold uppercase mb-2">
                  <FileText className="w-3 h-3 text-[#F26522]" />
                  <span>Official Practicum Enrollment Form</span>
                </div>
                <h2 className="text-xl font-black tracking-tight text-white">
                  Internship Enrollment & Partner Company (HTE) Deployment
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Select your accredited Host Training Establishment and choose whether you are enrolling individually or submitting as a verified Group Cohort (maximum 5 students per company per block).
                </p>
              </div>

              <div className="px-3 py-2 bg-white/10 backdrop-blur-xs rounded-lg border border-white/20 text-right shrink-0">
                <span className="text-[10px] text-slate-300 block">Class Block:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {student.classBlock || currentUser.classBlock || 'Unassigned Block'}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {errorMsg && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Student Recap Info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Intern Full Name:</span>
                <strong className="text-slate-900 dark:text-white">{currentUser.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">BU Student ID:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{currentUser.buId}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">BU Institutional Email:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{currentUser.email}</strong>
              </div>
            </div>

            {/* ENROLLMENT TYPE SELECTOR: Individual vs Group Cohort */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Enrollment Format *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Individual Option */}
                <button
                  type="button"
                  onClick={() => setEnrollmentMode('individual')}
                  className={`p-3.5 rounded-lg border text-left transition cursor-pointer flex items-start gap-3 ${
                    enrollmentMode === 'individual'
                      ? 'border-[#F26522] bg-orange-50/70 dark:bg-orange-950/30 ring-2 ring-[#F26522]/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      enrollmentMode === 'individual'
                        ? 'bg-[#F26522] text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white">
                      <span>Individual Enrollment</span>
                      {enrollmentMode === 'individual' && (
                        <span className="w-2 h-2 rounded-full bg-[#F26522]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Apply as an individual intern. You manage your own schedule and deployment dossier.
                    </p>
                  </div>
                </button>

                {/* Group Cohort Option */}
                <button
                  type="button"
                  onClick={() => setEnrollmentMode('group')}
                  className={`p-3.5 rounded-lg border text-left transition cursor-pointer flex items-start gap-3 ${
                    enrollmentMode === 'group'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-500/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      enrollmentMode === 'group'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white">
                      <span>Group Cohort (Max 5 per Block)</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                        Max 5 total
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Enroll together with your peers at the same company. Requires existing student accounts and peer verification.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* GROUP COHORT DETAILS & PEER INPUTS (Shown when Group Cohort is active) */}
            {enrollmentMode === 'group' && (
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900/60 rounded-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200 dark:border-blue-900/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Group Cohort Setup & Peer Student Accounts
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[11px] font-bold font-mono">
                    Total Cohort: {1 + peers.length} / 5 Students (1 Submitter + {peers.length} Peers)
                  </span>
                </div>

                {/* Cohort Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Group Cohort Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Albay ICT Practicum Cohort (BSCS 4-A)"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white font-medium focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Assigned label visible to your coordinator and cohort members.
                  </span>
                </div>

                {/* Submitter (Organizer) Card */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#0B2545] text-white flex items-center justify-center font-bold text-[11px]">
                      1
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {currentUser.fullName} <span className="text-[#F26522] font-semibold">(Cohort Creator / Submitter)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {currentUser.email} • {currentUser.buId} • {student.classBlock || currentUser.classBlock || 'BSCS'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Organizer</span>
                  </span>
                </div>

                {/* Dynamic Peer Inputs List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Add Peer Student Accounts (Must already have an existing InternTrack account) *
                    </label>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Maximum 4 peers (5 per block limit per company)
                    </span>
                  </div>

                  {peers.map((peer, idx) => (
                    <div
                      key={peer.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 transition shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-black text-[10px] flex items-center justify-center">
                            {idx + 2}
                          </span>
                          <span>Peer Account #{idx + 1} of 4</span>
                        </span>
                        {peers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePeer(peer.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-md transition cursor-pointer"
                            title="Remove this peer from cohort"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={peer.email}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPeers((prev) =>
                              prev.map((p) => (p.id === peer.id ? { ...p, email: val, student: undefined, error: undefined } : p))
                            );
                          }}
                          onBlur={(e) => validatePeerEmail(peer.id, e.target.value)}
                          placeholder="e.g. student.lastname@bicol-u.edu.ph"
                          className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono dark:text-white focus:ring-1 focus:ring-blue-500"
                        />
                        {peer.isValidating && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 absolute right-3 top-3" />
                        )}
                      </div>

                      {/* Verification Status Badges */}
                      {peer.student && (
                        <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {peer.student.fullName} ({peer.student.buId})
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                            {peer.student.classBlock || 'Enrolled'}
                          </span>
                        </div>
                      )}

                      {peer.error && (
                        <div className="p-2 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-700 dark:text-red-300 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span>{peer.error}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Plus button below the input, capped at 4 */}
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={peers.length >= 4}
                      onClick={handleAddPeer}
                      className={`w-full py-2.5 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold transition ${
                        peers.length >= 4
                          ? 'border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-900 cursor-not-allowed opacity-60'
                          : 'border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/50 cursor-pointer active:scale-98'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {peers.length >= 4
                          ? 'Cohort Member Limit Reached (Max 4 Peers + 1 Submitter = 5 Total)'
                          : `+ Add Another Peer Account (${peers.length} of 4 peers added)`}
                      </span>
                    </button>
                    {peers.length >= 4 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block text-center mt-1">
                        * In accordance with Bicol University practicum policy, only up to 5 students per class block are permitted at the same company and branch.
                      </span>
                    )}
                  </div>
                </div>

                {/* Important Notice regarding peer verification */}
                <div className="p-3 bg-blue-100/60 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs space-y-1 text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Peer Sign-On & Verification Requirement</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Once submitted, a pending notice will appear. All invited peer students must log in to their respective accounts and approve the group cohort invitation to verify they agreed to be enrolled together before the application is forwarded to your coordinator.
                  </p>
                </div>
              </div>
            )}

            {/* HTE Partner Company Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Accredited Host Training Establishment (HTE) Partner *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewHte(!isAddingNewHte)}
                  className="text-xs font-bold text-[#F26522] hover:text-[#D94B0A] flex items-center gap-1 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingNewHte ? 'Cancel Addition' : 'Company not listed? + Add New HTE'}</span>
                </button>
              </div>

              {/* Inline Form to Add New Company / HTE */}
              {isAddingNewHte && (
                <div className="p-4 bg-orange-50/60 dark:bg-orange-950/30 border-2 border-dashed border-[#F26522]/40 rounded-xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-orange-950 dark:text-orange-200">
                      <Building2 className="w-4 h-4 text-[#F26522]" />
                      <span>Add Unlisted Host Training Establishment (HTE)</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Will be linked to your enrollment</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Company / Establishment Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newHteName}
                        onChange={(e) => setNewHteName(e.target.value)}
                        placeholder="e.g. Albay Provincial ICT Center"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Industry Sector / Field *
                      </label>
                      <input
                        type="text"
                        value={newHteSector}
                        onChange={(e) => setNewHteSector(e.target.value)}
                        placeholder="e.g. Software & Web Solutions"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Company Office Address *
                      </label>
                      <input
                        type="text"
                        value={newHteAddress}
                        onChange={(e) => setNewHteAddress(e.target.value)}
                        placeholder="e.g. Rawis, Legazpi City, Albay"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Company Branch / Station Site *
                      </label>
                      <input
                        type="text"
                        value={newHteBranch}
                        onChange={(e) => setNewHteBranch(e.target.value)}
                        placeholder="e.g. Legazpi City Branch"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Designated Liaison / Mentor Name *
                      </label>
                      <input
                        type="text"
                        value={newHtePerson}
                        onChange={(e) => setNewHtePerson(e.target.value)}
                        placeholder="e.g. Engr. Allan Bautista"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={newHteEmail}
                        onChange={(e) => setNewHteEmail(e.target.value)}
                        placeholder="hr@company.com.ph"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        value={newHtePhone}
                        onChange={(e) => setNewHtePhone(e.target.value)}
                        placeholder="+63 912 345 6789"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingNewHte(false)}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingHte}
                      onClick={handleAddNewCompanySubmit}
                      className="px-4 py-2 rounded-lg bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold text-xs shadow-xs active:scale-95 cursor-pointer"
                    >
                      {isSubmittingHte ? 'Saving...' : 'Register & Select Company'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companies.map((comp) => {
                  const isSelected = selectedCompanyId === comp.id;
                  const availableSlots = Math.max(0, comp.maxInterns - comp.currentInterns);
                  return (
                    <div
                      key={comp.id}
                      onClick={() => {
                        setSelectedCompanyId(comp.id);
                        setSelectedBranch(comp.branch || comp.address || 'Main Branch');
                        if (!mentorName) setMentorName(comp.contactPerson);
                      }}
                      className={`p-4 rounded-lg border cursor-pointer transition relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#F26522] bg-orange-50/60 dark:bg-orange-950/30 ring-2 ring-[#F26522]/30 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-[#0B2545] text-white">
                              <Building2 className="w-4 h-4 text-[#F26522]" />
                            </div>
                            <h4 className="font-black text-xs text-slate-900 dark:text-white line-clamp-1">
                              {comp.name}
                            </h4>
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-[#F26522] text-white flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-1.5">
                          {comp.sector} • {comp.address}
                        </p>

                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-[#0875e1] border border-blue-200 dark:border-blue-900/60 text-[10px] font-semibold mb-2">
                          <MapPin className="w-3 h-3 text-[#F26522]" />
                          <span>Branch: {comp.branch || comp.address}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400 font-mono">
                          Liaison: {comp.contactPerson}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold ${
                            availableSlots > 0
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {availableSlots} slots open
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Company Branch Confirmation Field */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Specific Company Branch / Office Site *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#F26522] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    placeholder="e.g. Regional Center Site, Rawis, Legazpi City"
                    className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white font-medium focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Interns assigned to the same company and branch are grouped together for monitoring.
                </span>
              </div>
            </div>

            {/* Assigned Internship Coordinator Dropdown */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Assigned Student Internship Coordinator *
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-[#F26522] absolute left-3 top-3 pointer-events-none" />
                <select
                  required
                  value={selectedCoordinatorId}
                  onChange={(e) => {
                    const coordId = e.target.value;
                    setSelectedCoordinatorId(coordId);
                    const found = coordinatorList.find((c) => c.id === coordId);
                    if (found) setSelectedCoordinatorName(found.fullName);
                  }}
                  disabled={coordinatorList.length === 0}
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white font-medium focus:ring-1 focus:ring-[#F26522] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {coordinatorList.length === 0 ? (
                    <option value="" disabled>
                      No coordinator accounts registered yet
                    </option>
                  ) : (
                    coordinatorList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} — {c.department}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {coordinatorList.length === 0 ? (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                  * Coordinators will appear here once an internship coordinator account is registered.
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Choose the faculty coordinator overseeing your practicum cohort. Only your designated coordinator will review and verify your internship submissions.
                </span>
              )}
            </div>

            {/* Target Hours, Deployment Date & Supervisor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Required Target Practicum Hours *
                </label>
                <input
                  type="number"
                  required
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Standard Practicum: 240 Hours
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Schedule Deployment Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#F26522] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={scheduledDeploymentDate}
                    onChange={(e) => setScheduledDeploymentDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white font-medium focus:ring-1 focus:ring-[#F26522]"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Target start date of deployment at HTE
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  HTE Mentor / Immediate Supervisor
                </label>
                <input
                  type="text"
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                  placeholder={selectedCompany ? selectedCompany.contactPerson : 'Supervisor Full Name'}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Supervisor endorsing daily logs
                </span>
              </div>
            </div>

            {/* Statement of Commitment */}
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs space-y-1 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-[#0B2545] dark:text-blue-300">
                <ShieldCheck className="w-4 h-4 text-[#F26522]" />
                <span>Student Internship Program (SIP) Memorandum of Agreement (MOA) Acknowledgment</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                By submitting this enrollment dossier, I confirm that I am an enrolled student about to start my internship duty. I agree to abide by the Bicol University College of Science Practicum Guidelines and submit required Daily Accomplishment Reports.
              </p>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Account</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-auto px-7 py-3 text-white font-black text-xs rounded-lg shadow-md transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                  enrollmentMode === 'group'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-[#F26522] hover:bg-[#D94B0A]'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Submitting Application...'
                    : enrollmentMode === 'group'
                    ? `Submit Group Cohort (${1 + peers.filter((p) => p.email.trim()).length} Members) for Verification`
                    : 'Submit Enrollment Application for Approval'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
