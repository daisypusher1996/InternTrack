import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { EnrollmentModule } from './components/EnrollmentModule';
import { AttendancePortal } from './components/AttendancePortal';
import { AccomplishmentLogger } from './components/AccomplishmentLogger';
import { AIAnalyticsView } from './components/AIAnalyticsView';
import { RecordArchiveView } from './components/RecordArchiveView';
import { StudentPortalView } from './components/StudentPortalView';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import { StudentEnrollmentGate } from './components/StudentEnrollmentGate';
import { StartupSplash } from './components/StartupSplash';
import { ThemeToggle } from './components/ThemeToggle';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import {
  Menu,
  Bell,
  UserCog,
  ArrowLeftRight,
  LogOut,
  LayoutDashboard,
  Archive,
  UserPlus,
  Clock,
  FileText,
  Brain,
  GraduationCap,
  User as UserIcon,
} from 'lucide-react';
import {
  Student,
  Group,
  Company,
  AttendanceLog,
  AccomplishmentReport,
  AttendanceAlert,
  AISummary,
  SystemStats,
  ClassBatch,
  User,
} from './types';
import {
  supabase,
  extractStudentIdFromEmail,
  isStudentEmailValid,
  syncProfileToSupabase,
  syncStudentToSupabase,
  syncCompanyToSupabase,
  syncAttendanceToSupabase,
  syncAccomplishmentToSupabase,
  subscribeToRealtimeData,
} from './lib/supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAlertsDropdownOpen, setIsAlertsDropdownOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Authentication & Current User State (Persisted in localStorage so reloads preserve login and progress)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('interntrack_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Keep localStorage synchronized whenever currentUser updates
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('interntrack_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('interntrack_current_user');
    }
  }, [currentUser]);

  // Core Data States
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [accomplishmentReports, setAccomplishmentReports] = useState<AccomplishmentReport[]>([]);
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [batches, setBatches] = useState<ClassBatch[]>([]);

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningDetection, setIsRunningDetection] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);

  // Refresh data from full-stack Express API
  const refreshData = async () => {
    const safeFetch = async (url: string, fallback: any = []) => {
      try {
        const r = await fetch(url);
        if (!r.ok) return fallback;
        const text = await r.text();
        return JSON.parse(text);
      } catch {
        return fallback;
      }
    };

    try {
      const [
        statsRes,
        studentsRes,
        groupsRes,
        companiesRes,
        attendanceRes,
        reportsRes,
        alertsRes,
        summariesRes,
        batchesRes,
      ] = await Promise.all([
        safeFetch('/api/stats', {}),
        safeFetch('/api/students', []),
        safeFetch('/api/groups', []),
        safeFetch('/api/companies', []),
        safeFetch('/api/attendance', []),
        safeFetch('/api/accomplishments', []),
        safeFetch('/api/alerts', []),
        safeFetch('/api/ai/summaries', []),
        safeFetch('/api/batches', []),
      ]);

      setStats(statsRes);
      setStudents(studentsRes);
      setGroups(groupsRes);
      setCompanies(companiesRes);
      setAttendanceLogs(attendanceRes);
      setAccomplishmentReports(reportsRes);
      setAlerts(alertsRes);
      setSummaries(summariesRes);
      setBatches(batchesRes);

      // Keep logged in student's profile synchronized with latest server/Supabase state
      if (currentUser?.role === 'student' && studentsRes && Array.isArray(studentsRes)) {
        const freshStudent = studentsRes.find(
          (s: Student) =>
            s.email.toLowerCase() === currentUser.email.toLowerCase() ||
            s.buId === currentUser.buId ||
            (currentUser.studentIdNumber && s.studentIdNumber === currentUser.studentIdNumber)
        );
        if (freshStudent) {
          setCurrentUser((prev) => (prev ? { ...prev, studentProfile: freshStudent } : prev));
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      await refreshData();
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            const email = session.user.email.toLowerCase().trim();
            const res = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
                setCurrentUser(data.user);
                if (data.user.role === 'student') {
                  setActiveTab('student-portal');
                } else {
                  setActiveTab('dashboard');
                }
              }
            } else {
              // Strict Account Verification on Login: No database record found -> prompt onboarding / registration
              setCurrentUser(null);
              setIsAuthModalOpen(true);
            }
          }
        } catch (err) {
          console.warn('Session verification note:', err);
        }
      }
    };
    initApp();
  }, []);

  // Supabase Realtime Subscription Listener for Instant Cross-Client Updates
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeData((payload) => {
      console.log('[REALTIME UPDATE DETECTED] Refreshing state for instant coordinator visibility...', payload);
      refreshData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#header-profile-menu-container')) {
        setIsProfileDropdownOpen(false);
      }
      if (!target.closest('#header-notifications-container')) {
        setIsAlertsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Listen to Supabase session changes and OAuth redirects
  useEffect(() => {
    // If running in a popup window returning from Google OAuth, notify opener with tokens and close
    if (window.opener && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code && supabase) {
          supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
            if (data?.session) {
              window.opener.postMessage({
                type: 'SUPABASE_AUTH_SUCCESS',
                session: data.session,
                hash: window.location.hash,
                search: window.location.search,
              }, '*');
              setTimeout(() => window.close(), 300);
            } else {
              window.opener.postMessage({
                type: 'SUPABASE_AUTH_SUCCESS',
                code,
                hash: window.location.hash,
                search: window.location.search,
              }, '*');
              setTimeout(() => window.close(), 300);
            }
          }).catch(() => {
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_SUCCESS',
              code,
              hash: window.location.hash,
              search: window.location.search,
            }, '*');
            setTimeout(() => window.close(), 300);
          });
        } else {
          window.opener.postMessage({
            type: 'SUPABASE_AUTH_SUCCESS',
            hash: window.location.hash,
            search: window.location.search,
          }, '*');
          setTimeout(() => window.close(), 500);
        }
      } catch (e) {
        console.warn('Popup postMessage error:', e);
      }
    }

    if (supabase) {
      const processUserSession = async (session: any) => {
        if (!session?.user) return;
        const email = (session.user.email || '').trim().toLowerCase();
        if (!email) return;

        const isBuEmail = email.endsWith('@bicol-u.edu.ph');
        const userMeta = session.user.user_metadata || {};
        const targetRole: 'coordinator' | 'student' =
          userMeta.role === 'coordinator' ? 'coordinator' : (isBuEmail ? 'student' : (userMeta.role || 'student'));

        // Reject student accounts created without @bicol-u.edu.ph
        if (targetRole === 'student' && !isBuEmail) {
          console.warn('Rejected student sign-in: email does not end with @bicol-u.edu.ph:', email);
          return;
        }

        const assumedStudentId = targetRole === 'student'
          ? (userMeta.bu_id || extractStudentIdFromEmail(email))
          : (userMeta.bu_id || 'FAC-2026-CS-004');
        const fullName = userMeta.full_name || userMeta.name || email.split('@')[0];

        // Single persistent check for user registration before redirecting to the student portal
        let loggedInSuccessfully = false;
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role: targetRole, fullName, avatarUrl: userMeta.avatar_url }),
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data.user);
            loggedInSuccessfully = true;
          }
        } catch {}

        if (!loggedInSuccessfully) {
          try {
            const res = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName,
                email,
                role: targetRole,
                buId: assumedStudentId,
                department: userMeta.department || 'Department of Computer Science',
                classBlock: userMeta.class_block || 'BSCS 4-A',
                avatarUrl: userMeta.avatar_url,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              setCurrentUser(data.user);
            }
          } catch (err) {
            console.error('Session sign-up registration error:', err);
          }
        }

        // Single persistent check: refresh data to ensure student profile is loaded in state before portal render
        await refreshData();

        if (targetRole === 'student') {
          setActiveTab('student-portal');
        } else {
          setActiveTab('dashboard');
        }
      };

      // Check URL search params for direct browser redirect with code (PKCE)
      if (!window.opener && window.location.search.includes('code=')) {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
            if (data?.session?.user && !currentUser) {
              processUserSession(data.session).catch(console.error);
            }
          }).catch(console.warn);
        }
      }

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && !currentUser) {
          processUserSession(session).catch(console.error);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && !currentUser) {
            processUserSession(session).catch(console.error);
          }
        }
      );

      // Listen for message from OAuth popup
      const handlePopupMessage = async (e: MessageEvent) => {
        if (e.data?.type === 'SUPABASE_AUTH_SUCCESS' || e.data?.type === 'OAUTH_AUTH_SUCCESS') {
          if (e.data?.session && supabase) {
            try {
              await supabase.auth.setSession({
                access_token: e.data.session.access_token,
                refresh_token: e.data.session.refresh_token,
              });
            } catch (err) {
              console.warn('Error setting session object:', err);
            }
          }
          if (e.data?.code && supabase) {
            try {
              await supabase.auth.exchangeCodeForSession(e.data.code);
            } catch (err) {
              console.warn('Error exchanging code from popup:', err);
            }
          } else if (e.data?.search && supabase) {
            const searchParams = new URLSearchParams(e.data.search);
            const code = searchParams.get('code');
            if (code) {
              try {
                await supabase.auth.exchangeCodeForSession(code);
              } catch (err) {
                console.warn('Error exchanging code from search params:', err);
              }
            }
          }
          if (e.data?.hash && supabase) {
            try {
              const params = new URLSearchParams(e.data.hash.replace(/^#/, ''));
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              if (accessToken && refreshToken) {
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
              }
            } catch (err) {
              console.warn('Error setting session from popup hash:', err);
            }
          }
          if (supabase) {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user && !currentUser) {
              processUserSession(data.session).catch(console.error);
            }
          }
        }
      };
      window.addEventListener('message', handlePopupMessage);

      return () => {
        authListener.subscription.unsubscribe();
        window.removeEventListener('message', handlePopupMessage);
      };
    }
  }, [currentUser]);

  // Authentication Handlers
  const handleLogin = async (credentials: {
    email?: string;
    password?: string;
    role?: 'coordinator' | 'student';
    fullName?: string;
    avatarUrl?: string;
  }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text || 'Authentication failed (invalid response from server)');
    }
    if (!res.ok) throw new Error(data.error || 'Authentication failed');

    setCurrentUser(data.user);
    if (data.user.role === 'student') {
      setActiveTab('student-portal');
    } else {
      setActiveTab('dashboard');
    }
    await refreshData();
  };

  const handleRegister = async (regData: any) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regData),
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text || 'Registration failed (invalid response from server)');
    }
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    const createdUserId = data.user?.id;

    // Sync account profile to Supabase directly with the verified Auth User UUID
    await syncProfileToSupabase({
      id: createdUserId,
      email: regData.email,
      fullName: regData.fullName,
      role: regData.role,
      buId: regData.buId,
      department: regData.department,
      classBlock: regData.classBlock,
      avatarUrl: regData.avatarUrl,
      studentIdNumber: createdUserId,
      coordinatorIdNumber: createdUserId,
    }).catch((err) => console.error('Supabase profile sync failed:', err));

    if (regData.role === 'student') {
      await syncStudentToSupabase({
        id: createdUserId,
        studentIdNumber: regData.buId,
        buId: regData.buId,
        fullName: regData.fullName,
        email: regData.email,
        classBlock: regData.classBlock,
      }).catch((err) => console.error('Supabase student sync failed:', err));
    }

    setCurrentUser(data.user);
    if (data.user.role === 'student') {
      setActiveTab('student-portal');
    } else {
      setActiveTab('dashboard');
    }
    await refreshData();
  };

  const handleLogout = () => {
    localStorage.removeItem('interntrack_current_user');
    setCurrentUser(null);
    setIsAuthModalOpen(false);
  };

  // Profile Settings Update Handler
  const handleUpdateProfile = async (updatedData: {
    fullName: string;
    avatarUrl: string;
    newPassword?: string;
  }) => {
    if (!currentUser) return;
    const res = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        fullName: updatedData.fullName,
        avatarUrl: updatedData.avatarUrl,
        newPassword: updatedData.newPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');

    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            fullName: updatedData.fullName,
            avatarUrl: updatedData.avatarUrl,
          }
        : null
    );
    await refreshData();
  };

  // Batch Management Handlers
  const handleCreateBatch = async (batchData: any) => {
    const res = await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchData),
    });
    if (!res.ok) throw new Error('Failed to create batch');
    await refreshData();
  };

  const handleToggleArchiveBatch = async (batchId: string) => {
    const res = await fetch(`/api/batches/${batchId}/archive`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to update archive status');
    await refreshData();
  };

  // Student Excuse Form Submission Handler
  const handleSubmitExcuse = async (alertId: string, excuseNotes: string) => {
    const res = await fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'excuse',
        resolutionNotes: `Official Student Excuse: ${excuseNotes}`,
      }),
    });
    if (!res.ok) throw new Error('Failed to submit excuse slip');
    await refreshData();
  };

  // Student Enrollment Submission Handler (When freshly created student submits HTE details)
  const handleStudentSubmitEnrollment = async (enrollmentData: any) => {
    if (!loggedInStudent) return;
    const res = await fetch(`/api/students/${loggedInStudent.id}/submit-enrollment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrollmentData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit enrollment application');

    // Direct browser Supabase sync
    await syncStudentToSupabase({
      buId: loggedInStudent.buId,
      fullName: loggedInStudent.fullName,
      email: loggedInStudent.email,
      companyId: enrollmentData.companyId,
      companyName: enrollmentData.companyName,
      companyBranch: enrollmentData.companyBranch || enrollmentData.selectedBranch,
      mentorName: enrollmentData.mentorName,
      coordinatorId: enrollmentData.coordinatorId,
      coordinatorName: enrollmentData.coordinatorName,
      dutyStart: enrollmentData.dutyStart,
      dutyEnd: enrollmentData.dutyEnd,
      targetHours: Number(enrollmentData.targetHours) || 240,
      scheduledDeploymentDate: enrollmentData.scheduledDeploymentDate,
      enrollmentStatus: data.student?.enrollmentStatus || (enrollmentData.enrollmentType === 'group' ? 'pending_peer_approval' : 'pending_approval'),
    }).catch((err) => console.error('Supabase enrollment sync failed:', err));

    await refreshData();
  };

  // Peer Student approves or declines a group cohort sign-on invitation
  const handleRespondGroupInvitation = async (groupId: string, accept: boolean) => {
    if (!currentUser) return;
    const studentId = loggedInStudent?.id || currentUser.id;
    const res = await fetch(`/api/groups/${groupId}/respond-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, accept }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to respond to group cohort invitation');
    await refreshData();
  };

  // Student Completion & Archival Handlers (Coordinator Directorate)
  const handleApproveCompletion = async (studentId: string) => {
    const res = await fetch(`/api/students/${studentId}/approve-completion`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to approve completion');
    await refreshData();
  };

  const handleArchiveStudent = async (studentId: string) => {
    const res = await fetch(`/api/students/${studentId}/archive`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to archive student record');
    await refreshData();
  };

  const handleUnarchiveStudent = async (studentId: string) => {
    const res = await fetch(`/api/students/${studentId}/unarchive`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to restore student record');
    await refreshData();
  };

  const handleCreditHours = async (studentId: string, hours: number) => {
    const res = await fetch(`/api/students/${studentId}/credit-hours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours }),
    });
    if (!res.ok) throw new Error('Failed to credit hours');
    await refreshData();
  };

  const handleApproveEnrollment = async (studentId: string) => {
    const res = await fetch(`/api/students/${studentId}/approve-enrollment`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to approve enrollment');

    const s = students.find((st) => st.id === studentId);
    if (s) {
      await syncStudentToSupabase({
        id: s.id,
        buId: s.buId,
        fullName: s.fullName,
        email: s.email,
        companyId: s.companyId,
        companyName: s.companyName,
        companyBranch: s.companyBranch,
        mentorName: s.mentorName,
        coordinatorId: s.coordinatorId,
        coordinatorName: s.coordinatorName,
        enrollmentStatus: 'approved',
        deploymentApproved: true,
      }).catch((err) => console.error('Supabase approve enrollment sync failed:', err));
    }

    await refreshData();
  };

  const handleDeclineEnrollment = async (studentId: string, reason?: string) => {
    const res = await fetch(`/api/students/${studentId}/decline-enrollment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to decline enrollment');

    const s = students.find((st) => st.id === studentId);
    if (s) {
      await syncStudentToSupabase({
        id: s.id,
        buId: s.buId,
        fullName: s.fullName,
        email: s.email,
        companyId: s.companyId,
        companyName: s.companyName,
        companyBranch: s.companyBranch,
        mentorName: s.mentorName,
        coordinatorId: s.coordinatorId,
        coordinatorName: s.coordinatorName,
        enrollmentStatus: 'declined',
        deploymentApproved: false,
      }).catch((err) => console.error('Supabase decline enrollment sync failed:', err));
    }

    await refreshData();
  };

  const handleArchiveCourseBlock = async (blockSection: string, academicYear: string) => {
    const res = await fetch('/api/batches/archive-course-block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockSection, academicYear }),
    });
    if (!res.ok) throw new Error('Failed to archive course block');
    await refreshData();
  };

  // Operational Handlers
  const handleEnrollStudent = async (studentData: any) => {
    const res = await fetch('/api/students/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    });
    if (!res.ok) throw new Error('Enrollment failed');
    await refreshData();
  };

  const handleCreateGroup = async (groupData: any) => {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupData),
    });
    if (!res.ok) throw new Error('Group creation failed');
    await refreshData();
  };

  const handleRegisterCompany = async (companyData: any) => {
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companyData),
    });
    if (!res.ok) throw new Error('Company registration failed');
    const newComp = await res.json();

    // Direct browser Supabase sync
    syncCompanyToSupabase({
      name: companyData.name,
      sector: companyData.sector,
      address: companyData.address,
      branch: companyData.branch || companyData.address,
      contactPerson: companyData.contactPerson,
      contactEmail: companyData.contactEmail,
      contactPhone: companyData.contactPhone,
    }).catch(console.warn);

    await refreshData();
    return newComp;
  };

  const handleCancelEnrollment = async (studentId: string) => {
    try {
      const targetId = studentId || loggedInStudent?.id || currentUser?.id;
      if (!targetId) return;

      const res = await fetch(`/api/students/${targetId}/cancel-enrollment`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel enrollment');

      const s = students.find(
        (st) => st.id === targetId || st.email.toLowerCase() === currentUser?.email.toLowerCase()
      );
      if (s) {
        await syncStudentToSupabase({
          id: s.id,
          buId: s.buId,
          fullName: s.fullName,
          email: s.email,
          companyId: '',
          companyName: 'Not Yet Enrolled (Pending Application)',
          companyBranch: '',
          mentorName: 'Unassigned',
          coordinatorId: undefined,
          coordinatorName: undefined,
          coordinatorEmail: undefined,
          enrollmentStatus: 'not_enrolled',
          deploymentApproved: false,
        }).catch((err) => console.error('Supabase cancel enrollment sync failed:', err));
      }

      // Synchronize logged-in user state and localStorage immediately
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const updatedStudent = {
          ...(prev.studentProfile || {}),
          companyId: '',
          companyName: 'Not Yet Enrolled (Pending Application)',
          companyBranch: '',
          mentorName: 'Unassigned',
          coordinatorId: undefined,
          coordinatorName: undefined,
          coordinatorEmail: undefined,
          groupId: undefined,
          groupName: undefined,
          pendingGroupInvitation: undefined,
          enrollmentStatus: 'not_enrolled' as const,
          deploymentApproved: false,
        };
        const updatedUser = {
          ...prev,
          studentProfile: updatedStudent as any,
        };
        localStorage.setItem('interntrack_current_user', JSON.stringify(updatedUser));
        return updatedUser;
      });

      await refreshData();
    } catch (err: any) {
      console.error('Cancel enrollment error:', err);
      alert(err.message || 'Could not cancel enrollment. Please try again.');
    }
  };

  const handleTimeIn = async (studentId: string, remarks?: string, dtrImageLink?: string, shiftNumber?: 1 | 2) => {
    const res = await fetch('/api/attendance/time-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, remarks, dtrImageLink, shiftNumber: shiftNumber || 1 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record time-in');

    const targetStudent = students.find((s) => s.id === studentId) || loggedInStudent;
    if (targetStudent) {
      await syncAttendanceToSupabase({
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        companyId: targetStudent.companyId,
        companyName: targetStudent.companyName,
        date: new Date().toISOString().split('T')[0],
        actualTimeIn: new Date().toLocaleTimeString('en-GB'),
        status: 'present',
        remarks: remarks || `Student Portal Live Attendance Punch (Shift ${shiftNumber || 1})`,
        dtrImageLink,
      }).catch((err) => console.error('Supabase attendance sync failed:', err));
    }

    await refreshData();
  };

  const handleTimeOut = async (studentId: string, remarks?: string, dtrImageLink?: string, shiftNumber?: 1 | 2) => {
    const res = await fetch('/api/attendance/time-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, remarks, dtrImageLink, shiftNumber }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record time-out');

    const targetStudent = students.find((s) => s.id === studentId) || loggedInStudent;
    if (targetStudent) {
      await syncAttendanceToSupabase({
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        companyId: targetStudent.companyId,
        companyName: targetStudent.companyName,
        date: new Date().toISOString().split('T')[0],
        actualTimeOut: new Date().toLocaleTimeString('en-GB'),
        status: 'present',
        remarks: remarks || 'Student Portal Live Attendance Punch-Out',
        dtrImageLink,
      }).catch((err) => console.error('Supabase attendance sync failed:', err));
    }

    await refreshData();
  };

  const handleSubmitReport = async (reportData: any) => {
    const res = await fetch('/api/accomplishments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });
    if (!res.ok) throw new Error('Failed to submit report');

    await syncAccomplishmentToSupabase({
      studentId: reportData.studentId,
      studentName: reportData.studentName || (loggedInStudent?.fullName || 'Student'),
      companyId: reportData.companyId,
      companyName: reportData.companyName,
      date: reportData.date || new Date().toISOString().split('T')[0],
      weekNumber: reportData.weekNumber || 1,
      workCategory: reportData.workCategory,
      taskTitle: reportData.taskTitle,
      taskDescription: reportData.taskDescription,
      supervisorAssignedDuty: reportData.supervisorAssignedDuty,
      hoursSpent: Number(reportData.hoursSpent) || 0,
      taskStatus: reportData.taskStatus || 'completed',
      obstaclesFaced: reportData.obstaclesFaced,
    }).catch((err) => console.error('Supabase accomplishment sync failed:', err));

    await refreshData();
  };

  const handleRunAnomalyDetection = async (studentId?: string) => {
    setIsRunningDetection(true);
    try {
      const res = await fetch('/api/ai/run-anomaly-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId || 'stu-4', checkTime: '09:45:00' }),
      });
      const data = await res.json();
      if (data.alerts) {
        setAlerts(data.alerts);
      }
      await refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunningDetection(false);
    }
  };

  const handleTriggerGroupSummary = async (groupId: string) => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/ai/summarize-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, weekNumber: 6 }),
      });
      const data = await res.json();
      setSummaries([data, ...summaries.filter((s) => s.id !== data.id)]);
      await refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleResolveAlert = async (
    id: string,
    action: 'acknowledge' | 'excuse' | 'sanction'
  ) => {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolutionNotes: 'Processed via Practicum Directorate' }),
      });
      const updated = await res.json();
      setAlerts(alerts.map((a) => (a.id === id ? updated : a)));
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const pendingAlerts = alerts.filter((a) => a.status === 'pending_review');

  // If user is not authenticated on load, direct them to Startup Splash and then the Sign In / Sign Up page
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-[#F26522] selection:text-white">
        {showSplash && <StartupSplash onDismiss={() => setShowSplash(false)} />}
        <AuthPage
          companies={companies}
          students={students}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      </div>
    );
  }

  // Student corresponding to logged-in user - strictly ensure legal full name reflects
  const matchedStudent =
    currentUser.role === 'student'
      ? students.find(
          (s) =>
            s.email.toLowerCase() === currentUser.email.toLowerCase() ||
            (currentUser.buId && s.buId === currentUser.buId)
        ) ||
        currentUser.studentProfile ||
        students.find((s) => s.id === (currentUser as any).studentId) ||
        null
      : null;

  const loggedInStudent = matchedStudent
    ? {
        ...matchedStudent,
        // Guarantee the student's legal name registered in database always reflects
        fullName: currentUser.fullName || matchedStudent.fullName,
      }
    : currentUser.role === 'student'
    ? {
        id: `stu-${currentUser.id || 'curr'}`,
        buId: currentUser.buId || '2026-0001',
        fullName: currentUser.fullName,
        email: currentUser.email,
        degree: 'BS Computer Science',
        college: 'College of Science',
        classBlock: currentUser.classBlock || 'BSCS 4-A',
        batchId: currentUser.batchId || 'batch-1',
        enrollmentType: 'individual' as const,
        companyId: '',
        companyName: 'Not Yet Enrolled (Pending Application)',
        mentorName: 'Unassigned',
        dutyStart: '',
        dutyEnd: '',
        dutyDays: 'Mon,Tue,Wed,Thu,Fri',
        targetHours: 240,
        renderedHours: 0,
        attendanceRate: 100,
        status: 'active' as const,
        enrollmentStatus: 'not_enrolled' as const,
        deploymentApproved: false,
        avatarUrl: currentUser.avatarUrl || '',
      }
    : null;

  const isStudentEnrollmentApproved = loggedInStudent?.enrollmentStatus === 'approved';
  const isCoordinator = currentUser.role === 'coordinator';

  const headerNavItems = isCoordinator
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'archive', label: 'Record Archive', icon: Archive },
        { id: 'enrollment', label: 'Enrollment & Deployment', icon: UserPlus },
        { id: 'attendance', label: 'DTR Attendance', icon: Clock },
        { id: 'accomplishments', label: 'Daily Accomplishments', icon: FileText },
        { id: 'ai-analytics', label: 'AI Analytics & Alerts', icon: Brain },
      ]
    : [
        { id: 'student-portal', label: 'My Portal & DTR', icon: GraduationCap },
        { id: 'accomplishments', label: 'Daily Accomplishments', icon: FileText },
      ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans selection:bg-[#F26522] selection:text-white flex flex-col transition-colors duration-200">
      {/* Side Menu Drawer - Shown only when not displayed fully (tablet / narrower viewports) and on mobile */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingAlertsCount={pendingAlerts.length}
        currentUser={currentUser}
        onOpenAlerts={() => setIsAlertsDropdownOpen((prev) => !prev)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfileSettings={() => setActiveTab('profile-settings')}
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Top Header - Full screen displays navigation items in between */}
      <header className="sticky top-0 z-40 bg-[#020617] text-white border-b border-slate-800 shadow-md w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Hamburger (shown when website is not displayed fully < xl) + InternTrack Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="xl:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => setActiveTab(isCoordinator ? 'dashboard' : 'student-portal')}
              className="flex items-center cursor-pointer select-none active:scale-95 transition-transform"
            >
              <span className="text-xl sm:text-2xl font-black tracking-tight font-sans">
                <span className="text-[#3b82f6]">I</span>
                <span className="text-white">ntern</span>
                <span className="text-[#F26522]">Track</span>
              </span>
            </div>
          </div>

          {/* Center: Navigation Modules (displayed between in header on web version full screen) */}
          <nav className="hidden xl:flex items-center gap-1.5 flex-1 justify-center max-w-3xl overflow-x-auto py-1">
            {headerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#F26522] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Light/Dark Mode Logo, Notification Logo, Profile Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Light / Dark Mode Logo */}
            <ThemeToggle />

            {/* Notification Alerts Popover Dropdown - Anchored directly below the Bell icon */}
            {isCoordinator && (
              <div className="relative" id="header-notifications-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAlertsDropdownOpen(!isAlertsDropdownOpen);
                  }}
                  className="relative p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg active:scale-95 transition-all cursor-pointer"
                  title="Attendance Anomaly Alerts"
                  aria-label="Attendance Alerts"
                  aria-expanded={isAlertsDropdownOpen}
                >
                  <Bell className="w-5 h-5" />
                  {pendingAlerts.length > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-md bg-[#F26522] text-[10px] font-black text-white shadow">
                      {pendingAlerts.length}
                    </span>
                  )}
                </button>

                {isAlertsDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl overflow-hidden z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#F26522] rounded-lg text-white">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs">Attendance & Schedule Alerts</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Coordinator Action Queue</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#F26522]/10 text-[#F26522] font-bold text-[10px]">
                        {pendingAlerts.length} Pending
                      </span>
                    </div>

                    <div className="p-3 max-h-80 overflow-y-auto space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/80">
                      {pendingAlerts.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs">
                          No pending attendance alerts detected.
                        </div>
                      ) : (
                        pendingAlerts.map((alert) => (
                          <div key={alert.id} className="pt-2.5 first:pt-0 space-y-2">
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-bold">
                                  {alert.anomalyType}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">{alert.studentName}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">Score: {alert.anomalyScore}</span>
                            </div>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/40 text-[11px] text-slate-700 dark:text-amber-200 leading-snug">
                              "{alert.message}"
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-0.5">
                              <button
                                onClick={() => handleResolveAlert(alert.id, 'acknowledge')}
                                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                Acknowledge
                              </button>
                              <button
                                onClick={() => handleResolveAlert(alert.id, 'excuse')}
                                className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors shadow-xs cursor-pointer"
                              >
                                Accept Excuse
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Button with Dropdown Menu */}
            {currentUser && (
              <div className="relative" id="header-profile-menu-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProfileDropdownOpen(!isProfileDropdownOpen);
                  }}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title="User Profile Menu"
                  aria-expanded={isProfileDropdownOpen}
                >
                  {currentUser.avatarUrl && currentUser.avatarUrl.trim() !== '' ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      className="w-7 h-7 rounded-lg object-cover ring-1 ring-[#F26522]"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
                      <UserIcon className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                  <span className="hidden md:inline-block text-xs font-bold text-slate-200 max-w-[110px] truncate">
                    {currentUser.fullName}
                  </span>
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#020617] border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80 mb-2">
                      <div className="font-bold text-slate-100 truncate">{currentUser.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{currentUser.buId || currentUser.email}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          currentUser.role === 'coordinator' ? 'bg-[#F26522] text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {currentUser.role === 'coordinator' ? 'Coordinator' : 'Student Intern'}
                        </span>
                        {currentUser.classBlock && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-slate-300">
                            {currentUser.classBlock}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {/* Profile Settings */}
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setActiveTab('profile-settings');
                        }}
                        className="w-full px-3 py-2 rounded-lg text-slate-200 hover:bg-white/10 flex items-center gap-2.5 font-bold transition-all active:scale-95 cursor-pointer text-left"
                      >
                        <UserCog className="w-4 h-4 text-[#F26522]" />
                        <span>Profile Settings</span>
                      </button>

                      {/* Switch Account */}
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setIsAuthModalOpen(true);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-slate-200 hover:bg-white/10 flex items-center gap-2.5 font-bold transition-all active:scale-95 cursor-pointer text-left"
                      >
                        <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                        <span>Switch Account</span>
                      </button>

                      <div className="my-1 border-t border-slate-800" />

                      {/* Sign Out */}
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 font-bold transition-all active:scale-95 cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 text-red-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Area - Full Width */}
      <div className="flex-1 flex flex-col min-h-screen w-full">

        {/* Main Viewport Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[50vh] text-slate-500 text-xs">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-3 border-[#F26522] border-t-transparent rounded-md animate-spin mx-auto" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Connecting to Bicol University InternTrack System...
                </p>
              </div>
            </div>
          ) : activeTab === 'profile-settings' && currentUser ? (
            /* Dedicated Profile Settings Page View */
            <ProfileSettingsView
              currentUser={currentUser}
              loggedInStudent={loggedInStudent}
              onUpdateProfile={handleUpdateProfile}
              onCancelEnrollment={handleCancelEnrollment}
              onBack={() => setActiveTab(isCoordinator ? 'dashboard' : 'student-portal')}
            />
          ) : currentUser.role === 'student' && !isStudentEnrollmentApproved && loggedInStudent ? (
            /* Student Enrollment Gate: If student account is freshly created or pending coordinator approval, gate them here before accessing dashboard */
            <StudentEnrollmentGate
              currentUser={currentUser}
              student={loggedInStudent}
              companies={companies}
              allStudents={students}
              groups={groups}
              onSubmitEnrollment={handleStudentSubmitEnrollment}
              onCancelEnrollment={handleCancelEnrollment}
              onRegisterCompany={handleRegisterCompany}
              onRespondGroupInvitation={handleRespondGroupInvitation}
              onRefreshData={refreshData}
              onLogout={handleLogout}
            />
          ) : (
            <>
              {/* Student-Specific Dedicated Portal View (Unlocked once approved) */}
              {((activeTab === 'student-portal' || (!isCoordinator && activeTab === 'dashboard')) && loggedInStudent && currentUser) && (
                <StudentPortalView
                  currentUser={currentUser}
                  student={loggedInStudent}
                  attendanceLogs={attendanceLogs}
                  accomplishmentReports={accomplishmentReports}
                  alerts={alerts}
                  onTimeIn={handleTimeIn}
                  onTimeOut={handleTimeOut}
                  onNavigateToTab={setActiveTab}
                  onSubmitExcuse={handleSubmitExcuse}
                  onSubmitReport={handleSubmitReport}
                  onCancelEnrollment={handleCancelEnrollment}
                  coordinatorName={currentUser?.role === 'coordinator' ? currentUser.fullName : undefined}
                />
              )}

              {/* Coordinator Dashboard with Unfinished Interns & Archival Endorsement */}
              {activeTab === 'dashboard' && isCoordinator && (
                <CoordinatorDashboard
                  currentUser={currentUser}
                  stats={stats}
                  groups={groups}
                  students={students}
                  companies={companies}
                  alerts={alerts}
                  recentReports={accomplishmentReports}
                  attendanceLogs={attendanceLogs}
                  latestSummary={summaries[0] || null}
                  onResolveAlert={handleResolveAlert}
                  onTriggerGroupSummary={handleTriggerGroupSummary}
                  onNavigateToTab={setActiveTab}
                  onApproveCompletion={handleApproveCompletion}
                  onArchiveStudent={handleArchiveStudent}
                  onCreditHours={handleCreditHours}
                  onApproveEnrollment={handleApproveEnrollment}
                  onDeclineEnrollment={handleDeclineEnrollment}
                  onArchiveCourseBlock={handleArchiveCourseBlock}
                  isSummarizing={isSummarizing}
                />
              )}

              {/* Record Archive with School Year, College Program & Block Repository - Coordinator Only */}
              {activeTab === 'archive' && isCoordinator && (
                <RecordArchiveView
                  batches={batches}
                  students={students}
                  companies={companies}
                  groups={groups}
                  isCoordinator={true}
                  onCreateBatch={handleCreateBatch}
                  onToggleArchive={handleToggleArchiveBatch}
                  onUnarchiveStudent={handleUnarchiveStudent}
                />
              )}

              {/* Enrollment Module */}
              {activeTab === 'enrollment' && (
                <EnrollmentModule
                  students={students}
                  groups={groups}
                  companies={companies}
                  onEnrollStudent={handleEnrollStudent}
                  onCreateGroup={handleCreateGroup}
                  onRegisterCompany={handleRegisterCompany}
                  isCoordinator={isCoordinator}
                />
              )}

              {/* Time & Attendance Logging */}
              {activeTab === 'attendance' && (
                <AttendancePortal
                  students={students}
                  attendanceLogs={attendanceLogs}
                  onTimeIn={handleTimeIn}
                  onTimeOut={handleTimeOut}
                  isCoordinator={isCoordinator}
                />
              )}

              {/* Accomplishment Logger */}
              {activeTab === 'accomplishments' && (
                <AccomplishmentLogger
                  students={students}
                  groups={groups}
                  accomplishmentReports={accomplishmentReports}
                  onSubmitReport={handleSubmitReport}
                  onTriggerGroupSummary={handleTriggerGroupSummary}
                  isCoordinator={isCoordinator}
                  attendanceLogs={attendanceLogs}
                />
              )}

              {/* AI Analytics & Anomaly Detection Center */}
              {activeTab === 'ai-analytics' && (
                <AIAnalyticsView
                  groups={groups}
                  students={students}
                  alerts={alerts}
                  summaries={summaries}
                  onRunAnomalyDetection={handleRunAnomalyDetection}
                  onTriggerGroupSummary={handleTriggerGroupSummary}
                  onResolveAlert={handleResolveAlert}
                  isRunningDetection={isRunningDetection}
                  isSummarizing={isSummarizing}
                />
              )}
            </>
          )}
        </main>

        {/* Researchers Footer */}
        <footer className="bg-white dark:bg-[#020617] border-t border-slate-200 dark:border-slate-800 mt-12 py-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight text-slate-800 dark:text-slate-200">
                <span className="text-[#3b82f6]">I</span>
                <span className="text-slate-900 dark:text-white">ntern</span>
                <span className="text-[#F26522]">Track</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 dark:text-slate-400">Practicum Monitoring System</span>
            </div>

            <div className="text-center md:text-right text-[11px] space-y-0.5">
              <div>
                <strong>Researchers:</strong> Humpry Andrei L. Camacho • Joshua A. Ecat • Jhercy N. Narito (BSCS)
              </div>
            </div>
          </div>
        </footer>
      </div>


      {/* Authentication & Role Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        companies={companies}
        students={students}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
      />

      {/* Startup Screen with Bicol University Emblem & Animated Progress */}
      {showSplash && <StartupSplash onDismiss={() => setShowSplash(false)} />}
    </div>
  );
}
