import React, { useState, useEffect, useRef } from 'react';
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
import { ThemeToggle } from './components/ThemeToggle';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { User as UserIcon } from './components/icons';
import {
  BauhausBell,
  BauhausMenu,
  BauhausUserCog,
  BauhausArrowLeftRight,
  BauhausLogOut,
  BauhausArchive,
  BauhausUserPlus,
  BauhausClock,
  BauhausFileText,
  BauhausBrain,
  BauhausGraduationCap,
} from './components/BauhausIcon';
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
  deleteAccomplishmentFromSupabase,
  subscribeToRealtimeData,
  checkRoleIsolation,
  isSupabaseConfigured,
  findRoleRecords,
  mapDbStudentRecord,
  getTodayDateString,
} from './lib/supabase';

export type AuthState =
  | { status: 'LOADING' }
  | { status: 'UNAUTHENTICATED' }
  | { status: 'ONBOARDING'; authUser: any; error?: string }
  | { status: 'COORDINATOR'; user: User; coordinator: any }
  | { status: 'STUDENT'; user: User; student: Student };

// True when this window was opened as the Google OAuth popup (embedded/iframe preview flow)
const isOAuthPopupWindow =
  typeof window !== 'undefined' &&
  !!window.opener &&
  window.opener !== window &&
  window.name === 'google_oauth_popup';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAlertsDropdownOpen, setIsAlertsDropdownOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Strict Role-Checking State Machine State (Directive 3)
  const [authState, setAuthState] = useState<AuthState>({ status: 'LOADING' });
  const [userState, setUserState] = useState<User | null>(null);
  const currentUser = userState || (authState.status === 'COORDINATOR' || authState.status === 'STUDENT' ? authState.user : null);
  const setCurrentUser = setUserState;

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
        const cacheBuster = `_t=${Date.now()}`;
        const fetchUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
        const r = await fetch(fetchUrl, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
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
          if (!freshStudent.pendingGroupInvitation && Array.isArray(groupsRes)) {
            for (const g of groupsRes) {
              const inv = g.invitations?.find(
                (i: any) =>
                  i.status === 'pending' &&
                  (i.studentEmail.toLowerCase() === freshStudent.email.toLowerCase() || i.studentId === freshStudent.id)
              );
              if (inv) {
                freshStudent.pendingGroupInvitation = {
                  groupId: g.id,
                  groupName: g.name,
                  companyId: g.companyId,
                  companyName: g.companyName,
                  companyBranch: g.companyBranch || '',
                  leaderName: g.leaderName,
                  leaderEmail: g.invitations?.find((i: any) => i.status === 'creator')?.studentEmail || '',
                  scheduledDeploymentDate: g.scheduledDeploymentDate,
                  coordinatorName: g.coordinatorName,
                  mentorName: g.mentorName,
                  invitedAt: inv.respondedAt || new Date().toISOString(),
                };
                break;
              }
            }
          }
          const cleanEmail = currentUser.email.toLowerCase().trim();
          const storedAvatar = currentUser.avatarUrl || localStorage.getItem(`interntrack_avatar_${cleanEmail}`) || (currentUser.id ? localStorage.getItem(`interntrack_avatar_${currentUser.id}`) : '') || '';
          if (!freshStudent.avatarUrl && storedAvatar) {
            freshStudent.avatarUrl = storedAvatar;
          }
          setCurrentUser((prev) => (prev ? {
            ...prev,
            avatarUrl: prev.avatarUrl || freshStudent.avatarUrl || storedAvatar,
            studentProfile: {
              ...freshStudent,
              avatarUrl: freshStudent.avatarUrl || prev.avatarUrl || storedAvatar,
            },
          } : prev));
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Guards against stale/overlapping verification runs and auth events fired mid-registration
  const verifySeqRef = useRef(0);
  const isProvisioningRef = useRef(false);

  // Rigid Role-Checking State Machine (Directive 3)
  const syncAndVerifyRole = async (): Promise<AuthState['status']> => {
    const seq = ++verifySeqRef.current;
    const apply = (next: AuthState, user: User | null): AuthState['status'] => {
      // Only the most recent verification run is allowed to change the UI
      if (seq === verifySeqRef.current) {
        setCurrentUser(user);
        setAuthState(next);
      }
      return next.status;
    };

    try {
      if (!isSupabaseConfigured || !supabase) {
        return apply({ status: 'UNAUTHENTICATED' }, null);
      }

      // a) Await the Supabase auth session
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session?.user) {
        return apply({ status: 'UNAUTHENTICATED' }, null);
      }

      const authUser = sessionData.session.user;
      const authUserId = authUser.id;
      const cleanEmail = (authUser.email || '').toLowerCase().trim();

      // b) Concurrently query both students and coordinators tables (column-safe lookups)
      const { coordinator: coordRecord, student: studentRow, studentProfile } = await findRoleRecords(
        authUserId,
        cleanEmail
      );
      const hasStudent = Boolean(studentRow || studentProfile);

      // Strict Role Isolation Enforcement: A single user CANNOT exist in both tables
      if (coordRecord && hasStudent) {
        console.error('[CRITICAL] Cross-signup conflict! User exists in both tables:', { authUserId, cleanEmail });
        return apply(
          {
            status: 'ONBOARDING',
            authUser,
            error:
              'Cross-signup conflict: This account is registered in both Coordinator and Student tables. Please contact the administrator.',
          },
          null
        );
      }

      // c) Record found ONLY in students -> lock into Student dashboard
      if (hasStudent) {
        const studentRecord: Student = mapDbStudentRecord(studentRow, studentProfile, cleanEmail, authUser.user_metadata);
        const studentUser: User = {
          id: studentRecord.id || authUserId,
          email: cleanEmail,
          fullName: studentRecord.fullName || authUser.user_metadata?.full_name || cleanEmail.split('@')[0],
          role: 'student',
          buId: studentRecord.buId || extractStudentIdFromEmail(cleanEmail),
          department: studentProfile?.department || authUser.user_metadata?.department || '',
          classBlock: studentRecord.classBlock || '',
          avatarUrl: studentRecord.avatarUrl || authUser.user_metadata?.avatar_url || localStorage.getItem(`interntrack_avatar_${cleanEmail}`) || (authUserId ? localStorage.getItem(`interntrack_avatar_${authUserId}`) : null) || '',
          studentProfile: studentRecord,
        };
        setActiveTab((prev) => (prev && prev !== 'dashboard' && prev !== 'student-portal' ? prev : 'student-portal'));
        return apply({ status: 'STUDENT', user: studentUser, student: studentRecord }, studentUser);
      }

      // d) Record found ONLY in coordinators -> lock into Coordinator dashboard
      if (coordRecord) {
        const coordUser: User = {
          id: coordRecord.id || authUserId,
          email: cleanEmail,
          fullName: coordRecord.full_name || authUser.user_metadata?.full_name || cleanEmail.split('@')[0],
          role: 'coordinator',
          buId: coordRecord.bu_id || authUser.user_metadata?.bu_id || '',
          department: coordRecord.department || '',
          classBlock: '',
          avatarUrl: coordRecord.avatar_url || authUser.user_metadata?.avatar_url || localStorage.getItem(`interntrack_avatar_${cleanEmail}`) || (authUserId ? localStorage.getItem(`interntrack_avatar_${authUserId}`) : null) || '',
        };
        setActiveTab((prev) => (prev && prev !== 'dashboard' && prev !== 'student-portal' ? prev : 'dashboard'));
        return apply({ status: 'COORDINATOR', user: coordUser, coordinator: coordRecord }, coordUser);
      }

      // e) Neither found -> explicit Onboarding/Registration view
      return apply({ status: 'ONBOARDING', authUser }, null);
    } catch (err: any) {
      console.error('Role verification error:', err);
      return apply({ status: 'UNAUTHENTICATED' }, null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // If this window is the Google OAuth popup, hand the session back to the opener and close.
    if (isOAuthPopupWindow) {
      (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session && window.opener) {
            window.opener.postMessage(
              {
                type: 'SUPABASE_AUTH_SUCCESS',
                session: {
                  access_token: data.session.access_token,
                  refresh_token: data.session.refresh_token,
                },
              },
              window.location.origin
            );
          }
        } catch (err) {
          console.warn('OAuth popup handoff note:', err);
        } finally {
          window.close();
        }
      })();
      return () => {
        isMounted = false;
      };
    }

    const init = async () => {
      // Role verification first (gates the UI), data load in parallel
      await Promise.all([syncAndVerifyRole(), refreshData()]);
    };
    init();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (!isMounted) return;
        if (event === 'SIGNED_OUT') {
          verifySeqRef.current++;
          setCurrentUser(null);
          setAuthState({ status: 'UNAUTHENTICATED' });
          return;
        }
        // While a registration/login handler is provisioning rows, it runs verification itself
        if (isProvisioningRef.current) return;
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          // Defer out of the auth callback to avoid supabase-js lock re-entrancy
          setTimeout(() => {
            if (isMounted && !isProvisioningRef.current) syncAndVerifyRole();
          }, 0);
        }
      });

      // Handle OAuth popup window messages (iframe / embedded preview flow)
      const handlePopupMessage = async (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type === 'SUPABASE_AUTH_SUCCESS' || e.data?.type === 'OAUTH_AUTH_SUCCESS') {
          if (e.data?.session?.access_token && e.data?.session?.refresh_token) {
            try {
              await supabase.auth.setSession({
                access_token: e.data.session.access_token,
                refresh_token: e.data.session.refresh_token,
              });
            } catch (err) {
              console.warn('Set session note:', err);
            }
          }
          await syncAndVerifyRole();
        }
      };
      window.addEventListener('message', handlePopupMessage);

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
        window.removeEventListener('message', handlePopupMessage);
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Supabase Realtime Subscription Listener for Instant Cross-Client Updates
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeData((payload) => {
      console.log('[REALTIME UPDATE DETECTED] Refreshing state for instant coordinator visibility...', payload);
      refreshData();
    });

    // Window focus & interval auto-polling (every 15s) to guarantee persistent real-time parity across tabs/devices
    const onFocus = () => refreshData();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    }, 15000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
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

  // Authentication Handlers
  const handleLogin = async (credentials: {
    email?: string;
    password?: string;
    role?: 'coordinator' | 'student';
    fullName?: string;
    avatarUrl?: string;
  }) => {
    if (!credentials.email) throw new Error('Institutional email is required.');
    if (!credentials.password) throw new Error('Password is required.');
    const cleanEmail = credentials.email.trim().toLowerCase();

    isProvisioningRef.current = true;
    try {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: credentials.password,
        });
        if (error) {
          throw new Error(error.message);
        }
      }

      // Sync server memory session (non-blocking)
      try {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            role: credentials.role,
            fullName: credentials.fullName,
            avatarUrl: credentials.avatarUrl,
          }),
        });
      } catch (e) {
        console.warn('Server login note:', e);
      }

      // Run strict role verification state machine to lock into confirmed role
      await syncAndVerifyRole();
      refreshData();
    } finally {
      isProvisioningRef.current = false;
    }
  };

  const handleRegister = async (regData: any) => {
    if (!regData.email) throw new Error('Institutional email is required.');
    if (regData.password && String(regData.password).trim().length < 6) {
      throw new Error('Password must be at least 6 characters in length.');
    }
    const cleanEmail = regData.email.trim().toLowerCase();
    const targetRole: 'coordinator' | 'student' = regData.role === 'coordinator' ? 'coordinator' : 'student';

    isProvisioningRef.current = true;
    try {
      // Is there already an authenticated Supabase session (e.g. Google OAuth onboarding)?
      const { data: existingSession } = await supabase.auth.getSession();
      let authUserId: string | undefined = existingSession?.session?.user?.id;

      // Strict Role Isolation Pre-check
      const isolation = await checkRoleIsolation(cleanEmail, targetRole, authUserId);
      if (!isolation.allowed) {
        throw new Error(isolation.message);
      }

      // Server provisions the auth.users entry (email/password flow) and mirrors server-side
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...regData, authUserId }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || 'Registration failed (invalid response from server)');
      }
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      if (data.authUserId && !authUserId) {
        authUserId = data.authUserId;
      }

      // Email/password registration: establish a real Supabase session before writing rows
      if (regData.password && supabase) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: regData.password,
        });
        if (signInErr) {
          throw new Error(`Account created, but sign-in failed: ${signInErr.message}`);
        }
        if (signInData?.user?.id) {
          authUserId = signInData.user.id;
        }
      }

      const effectiveAuthUid = authUserId || data.authUserId || data.user?.id;

      // Direct write to the respective Supabase table, awaited (throws on failure)
      await syncProfileToSupabase({
        authUserId: effectiveAuthUid,
        id: effectiveAuthUid,
        email: cleanEmail,
        fullName: regData.fullName,
        role: targetRole,
        buId: regData.buId,
        department: regData.department,
        classBlock: regData.classBlock,
        avatarUrl: regData.avatarUrl,
        studentIdNumber: regData.buId,
        coordinatorIdNumber: regData.buId,
      });

      if (targetRole === 'student') {
        await syncStudentToSupabase({
          authUserId: effectiveAuthUid,
          id: effectiveAuthUid,
          buId: regData.buId,
          studentIdNumber: regData.buId,
          fullName: regData.fullName,
          email: cleanEmail,
          degree: regData.department,
          classBlock: regData.classBlock,
          companyId: regData.companyId,
          avatarUrl: regData.avatarUrl,
          targetHours: 240,
          renderedHours: 0,
          enrollmentStatus: 'not_enrolled',
          status: 'active',
        });
      }

      // Run state machine: confirms rows exist and permanently locks into respective role
      const status = await syncAndVerifyRole();
      if (status !== 'STUDENT' && status !== 'COORDINATOR') {
        throw new Error(
          'Your profile was submitted but could not be confirmed in Supabase. Please check your connection and try again.'
        );
      }
      refreshData();
    } finally {
      isProvisioningRef.current = false;
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('interntrack_current_user');
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out note:', e);
      }
    }
    setCurrentUser(null);
    setAuthState({ status: 'UNAUTHENTICATED' });
    setIsAuthModalOpen(false);
  };

  // Profile Settings Update Handler
  const handleUpdateProfile = async (updatedData: {
    fullName: string;
    avatarUrl: string;
    newPassword?: string;
  }) => {
    if (!currentUser) return;
    const cleanEmail = currentUser.email.toLowerCase().trim();

    // 1. Immediately cache in localStorage for instant retention across reloads & sessions
    if (updatedData.avatarUrl !== undefined) {
      if (updatedData.avatarUrl.trim()) {
        localStorage.setItem(`interntrack_avatar_${cleanEmail}`, updatedData.avatarUrl.trim());
        if (currentUser.id) localStorage.setItem(`interntrack_avatar_${currentUser.id}`, updatedData.avatarUrl.trim());
      } else {
        localStorage.removeItem(`interntrack_avatar_${cleanEmail}`);
        if (currentUser.id) localStorage.removeItem(`interntrack_avatar_${currentUser.id}`);
      }
    }

    // 2. Direct client-side Supabase Auth update
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: updatedData.fullName,
            avatar_url: updatedData.avatarUrl,
          },
          ...(updatedData.newPassword && updatedData.newPassword.trim()
            ? { password: updatedData.newPassword.trim() }
            : {}),
        });
      } catch (authErr) {
        console.warn('Supabase auth.updateUser note:', authErr);
      }

      // Also persist to Supabase tables directly
      try {
        if (currentUser.role === 'student') {
          await supabase
            .from('student_profiles')
            .upsert({
              id: currentUser.id,
              email: cleanEmail,
              full_name: updatedData.fullName,
              avatar_url: updatedData.avatarUrl,
            }, { onConflict: 'email' });

          await supabase
            .from('students')
            .update({
              full_name: updatedData.fullName,
            })
            .or(`id.eq.${currentUser.id},auth_user_id.eq.${currentUser.id}`);
        } else if (currentUser.role === 'coordinator') {
          await supabase
            .from('coordinator_profiles')
            .upsert({
              id: currentUser.id,
              email: cleanEmail,
              full_name: updatedData.fullName,
              avatar_url: updatedData.avatarUrl,
            }, { onConflict: 'email' });

          await supabase
            .from('coordinators')
            .update({
              full_name: updatedData.fullName,
            })
            .or(`id.eq.${currentUser.id},auth_user_id.eq.${currentUser.id}`);
        }
      } catch (dbErr) {
        console.warn('Direct Supabase profile db update note:', dbErr);
      }
    }
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

    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        fullName: updatedData.fullName,
        avatarUrl: updatedData.avatarUrl,
      };
      if (updated.studentProfile) {
        updated.studentProfile = {
          ...updated.studentProfile,
          fullName: updatedData.fullName,
          avatarUrl: updatedData.avatarUrl,
        };
      }
      return updated;
    });

    setStudents((prev) =>
      prev.map((s) =>
        s.id === currentUser.id || s.email.toLowerCase() === cleanEmail
          ? { ...s, fullName: updatedData.fullName, avatarUrl: updatedData.avatarUrl }
          : s
      )
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

    // Merge group into state if created
    if (data.group) {
      setGroups((prev) => [data.group, ...prev.filter((g) => g.id !== data.group.id)]);
    }

    if (data.student) {
      setStudents((prev) => prev.map((s) => (s.id === loggedInStudent.id ? { ...s, ...data.student } : s)));
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          studentProfile: {
            ...(prev.studentProfile || {}),
            ...data.student,
          },
        };
        localStorage.setItem('interntrack_current_user', JSON.stringify(updated));
        return updated;
      });
    }

    // Direct browser Supabase sync
    await syncStudentToSupabase({
      id: loggedInStudent.id,
      authUserId: loggedInStudent.id,
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
      groupId: data.group?.id || data.student?.groupId,
      groupName: data.group?.name || data.student?.groupName,
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

    if (data.group) {
      setGroups((prev) => [data.group, ...prev.filter((g) => g.id !== data.group.id)]);
    }

    if (data.student) {
      setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, ...data.student } : s)));
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          studentProfile: {
            ...(prev.studentProfile || {}),
            ...data.student,
          },
        };
        localStorage.setItem('interntrack_current_user', JSON.stringify(updated));
        return updated;
      });

      if (accept) {
        await syncStudentToSupabase({
          id: studentId,
          authUserId: studentId,
          buId: data.student.buId,
          fullName: data.student.fullName,
          email: data.student.email,
          companyId: data.student.companyId,
          companyName: data.student.companyName,
          companyBranch: data.student.companyBranch,
          mentorName: data.student.mentorName,
          coordinatorId: data.student.coordinatorId,
          coordinatorName: data.student.coordinatorName,
          dutyStart: data.student.dutyStart,
          dutyEnd: data.student.dutyEnd,
          targetHours: Number(data.student.targetHours) || 240,
          scheduledDeploymentDate: data.student.scheduledDeploymentDate,
          enrollmentStatus: data.student.enrollmentStatus,
          groupId: data.group?.id || data.student.groupId,
          groupName: data.group?.name || data.student.groupName,
        }).catch((err) => console.error('Supabase respond invitation sync failed:', err));
      }
    }

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
      body: JSON.stringify({ studentId, remarks, dtrImageLink, shiftNumber: shiftNumber || 1, skipSupabaseSync: true }),
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
        date: getTodayDateString(),
        actualTimeIn: new Date().toISOString(),
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
      body: JSON.stringify({ studentId, remarks, dtrImageLink, shiftNumber, skipSupabaseSync: true }),
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
        date: getTodayDateString(),
        actualTimeOut: new Date().toISOString(),
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

  const handleDeleteReport = async (reportId: string) => {
    const target = accomplishmentReports.find((r) => r.id === reportId);
    setAccomplishmentReports((prev) => prev.filter((r) => r.id !== reportId));

    try {
      await deleteAccomplishmentFromSupabase(
        reportId,
        target?.studentId,
        target?.date
      );
    } catch (err) {
      console.error('Failed to unsubmit report from Supabase:', err);
    }

    await refreshData();
  };

  const handleRunAnomalyDetection = async (studentId?: string) => {
    setIsRunningDetection(true);
    try {
      const res = await fetch('/api/ai/run-anomaly-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId || 'all' }),
      });
      const data = await res.json();
      if (data.alerts) {
        setAlerts(data.alerts);
      }
      return data;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setIsRunningDetection(false);
    }
  };

  const handleTriggerGroupSummary = async (groupId: string, studentId?: string) => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/ai/summarize-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, studentId, weekNumber: 6 }),
      });
      const data = await res.json();
      setSummaries((prev) => [data, ...prev.filter((s) => s.id !== data.id)]);
      return data;
    } catch (err) {
      console.error(err);
      return null;
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

  // Rigid Role State Machine Render Gate (Directive 3)
  // a) While role verification is underway, do not allow main UI or dashboards to render.
  if (authState.status === 'LOADING') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#F26522] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // b) If unauthenticated or requires onboarding, render AuthPage cleanly without UI flicker
  if (authState.status === 'UNAUTHENTICATED' || authState.status === 'ONBOARDING') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-[#F26522] selection:text-white">
        <AuthPage
          companies={companies}
          students={students}
          onLogin={handleLogin}
          onRegister={handleRegister}
          initialMode={authState.status === 'ONBOARDING' ? 'google-onboarding' : 'login'}
          onboardingUser={
            authState.status === 'ONBOARDING' && authState.authUser
              ? {
                  email: authState.authUser.email || '',
                  fullName:
                    authState.authUser.user_metadata?.full_name ||
                    authState.authUser.email?.split('@')[0] ||
                    '',
                  avatarUrl: authState.authUser.user_metadata?.avatar_url || '',
                }
              : undefined
          }
          errorMessage={authState.status === 'ONBOARDING' ? authState.error : undefined}
        />
      </div>
    );
  }

  // At this point, authState is strictly 'COORDINATOR' or 'STUDENT'
  const isCoordinator = authState.status === 'COORDINATOR';
  const activeUser: User | null = currentUser || authState.user;
  if (!activeUser) return null;

  // Real student matching - ZERO MOCK DATA
  const matchedStudent: Student | null =
    authState.status === 'STUDENT'
      ? students.find(
          (s) =>
            s.email.toLowerCase() === activeUser.email.toLowerCase() ||
            (activeUser.buId && s.buId === activeUser.buId) ||
            s.id === activeUser.id
        ) ||
        activeUser.studentProfile ||
        authState.student ||
        null
      : null;

  const loggedInStudent: Student | null = matchedStudent
    ? {
        ...matchedStudent,
        fullName: activeUser.fullName || matchedStudent.fullName,
      }
    : null;

  const isStudentEnrollmentApproved = loggedInStudent?.enrollmentStatus === 'approved';

  const headerNavItems = isCoordinator
    ? [
        { id: 'archive', label: 'Record Archive', icon: BauhausArchive },
        { id: 'enrollment', label: 'Enrollment & Deployment', icon: BauhausUserPlus },
        { id: 'attendance', label: 'DTR Attendance', icon: BauhausClock },
        { id: 'accomplishments', label: 'Daily Accomplishments', icon: BauhausFileText },
        { id: 'ai-analytics', label: 'AI Analytics & Alerts', icon: BauhausBrain },
      ]
    : [
        { id: 'student-portal', label: 'My Portal & DTR', icon: BauhausGraduationCap },
        { id: 'accomplishments', label: 'Daily Accomplishments', icon: BauhausFileText },
      ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans selection:bg-[#F26522] selection:text-white flex flex-col transition-colors duration-200">
      {/* Side Menu Drawer - Shown only when not displayed fully (tablet / narrower viewports) and on mobile */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingAlertsCount={pendingAlerts.length}
        currentUser={activeUser}
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
              <BauhausMenu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(isCoordinator ? 'dashboard' : 'student-portal')}
              className="flex items-center cursor-pointer select-none active:scale-95 transition-transform bg-transparent border-none p-0 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#F26522] rounded-md text-left"
              aria-label="InternTrack - Return to Dashboard"
              title="Return to Dashboard"
            >
              <span className="text-xl sm:text-2xl font-black tracking-tight font-sans">
                <span className="text-[#3b82f6]">I</span>
                <span className="text-white">ntern</span>
                <span className="text-[#F26522]">Track</span>
              </span>
            </button>
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2 active:scale-95 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#F26522] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
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
                  <BauhausBell className="w-5 h-5" />
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
                          <BauhausBell className="w-4 h-4" />
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
            {activeUser && (
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
                  {activeUser.avatarUrl && activeUser.avatarUrl.trim() !== '' ? (
                    <img
                      src={activeUser.avatarUrl}
                      alt={activeUser.fullName}
                      className="w-7 h-7 rounded-lg object-cover ring-1 ring-[#F26522]"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
                      <UserIcon className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                  <span className="hidden md:inline-block text-xs font-bold text-slate-200 max-w-[110px] truncate">
                    {activeUser.fullName}
                  </span>
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#020617] border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80 mb-2">
                      <div className="font-bold text-slate-100 truncate">{activeUser.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{activeUser.buId || activeUser.email}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          activeUser.role === 'coordinator' ? 'bg-[#F26522] text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {activeUser.role === 'coordinator' ? 'Coordinator' : 'Student Intern'}
                        </span>
                        {activeUser.classBlock && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-slate-300">
                            {activeUser.classBlock}
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
                        <BauhausUserCog className="w-4 h-4 text-[#F26522]" />
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
                        <BauhausArrowLeftRight className="w-4 h-4 text-blue-400" />
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
                        <BauhausLogOut className="w-4 h-4 text-red-400" />
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
          ) : activeTab === 'profile-settings' && activeUser ? (
            /* Dedicated Profile Settings Page View */
            <ProfileSettingsView
              currentUser={activeUser}
              loggedInStudent={loggedInStudent}
              onUpdateProfile={handleUpdateProfile}
              onCancelEnrollment={handleCancelEnrollment}
              onBack={() => setActiveTab(isCoordinator ? 'dashboard' : 'student-portal')}
            />
          ) : activeUser.role === 'student' && !isStudentEnrollmentApproved && loggedInStudent ? (
            /* Student Enrollment Gate: If student account is freshly created or pending coordinator approval, gate them here before accessing dashboard */
            <StudentEnrollmentGate
              currentUser={activeUser}
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
              {((activeTab === 'student-portal' || (!isCoordinator && activeTab === 'dashboard')) && loggedInStudent && activeUser) && (
                <StudentPortalView
                  currentUser={activeUser}
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
                  coordinatorName={activeUser.role === 'coordinator' ? activeUser.fullName : undefined}
                  onRefreshData={refreshData}
                />
              )}

              {/* Coordinator Dashboard with Unfinished Interns & Archival Endorsement */}
              {activeTab === 'dashboard' && isCoordinator && (
                <CoordinatorDashboard
                  currentUser={activeUser}
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
                  onDeleteReport={handleDeleteReport}
                  currentUser={activeUser}
                  currentStudent={loggedInStudent || undefined}
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
        currentUser={activeUser}
        companies={companies}
        students={students}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
      />
    </div>
  );
}
