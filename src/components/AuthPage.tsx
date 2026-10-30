import React, { useState, useEffect } from 'react';
import {
  LogIn,
  UserPlus,
  Shield,
  GraduationCap,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Check,
  Copy,
  ArrowRight,
} from 'lucide-react';
import { Company, Student, BU_COURSES } from '../types';
import { ThemeToggle } from './ThemeToggle';
import {
  signInWithGoogle,
  checkGoogleOAuthStatus,
  signUpWithEmail,
  isSupabaseConfigured,
  supabase,
  extractStudentIdFromEmail,
  isStudentEmailValid,
} from '../lib/supabase';

interface AuthPageProps {
  companies: Company[];
  students: Student[];
  onLogin: (credentials: {
    email?: string;
    password?: string;
    role?: 'coordinator' | 'student';
    fullName?: string;
    avatarUrl?: string;
  }) => Promise<void>;
  onRegister: (data: {
    fullName: string;
    email: string;
    password?: string;
    role: 'coordinator' | 'student';
    buId: string;
    department: string;
    classBlock?: string;
    batchId?: string;
    companyId?: string;
    dutyStart?: string;
    dutyEnd?: string;
    avatarUrl?: string;
  }) => Promise<void>;
  initialMode?: 'login' | 'register' | 'google-onboarding';
  onboardingUser?: GooglePendingProfile;
  errorMessage?: string;
}

interface GooglePendingProfile {
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  companies,
  students,
  onLogin,
  onRegister,
  initialMode,
  onboardingUser,
  errorMessage,
}) => {
  // Navigation / View modes: 'login' | 'register' | 'google-onboarding'
  const [viewMode, setViewMode] = useState<'login' | 'register' | 'google-onboarding'>(
    initialMode || (onboardingUser ? 'google-onboarding' : 'login')
  );
  const [roleMode, setRoleMode] = useState<'coordinator' | 'student'>('coordinator');
  const [errorMsg, setErrorMsg] = useState<string | null>(errorMessage || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Google pending profile
  const [googleUser, setGoogleUser] = useState<GooglePendingProfile | null>(onboardingUser || null);

  useEffect(() => {
    if (initialMode) {
      setViewMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (errorMessage) {
      setErrorMsg(errorMessage);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (onboardingUser) {
      setGoogleUser(onboardingUser);
      setViewMode('google-onboarding');
      if (onboardingUser.email.endsWith('@bicol-u.edu.ph')) {
        setGoogleRoleMode('student');
        setRegEmail(onboardingUser.email);
        setRegFullName(onboardingUser.fullName);
      }
    }
  }, [onboardingUser]);
  
  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration form
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regBuId, setRegBuId] = useState('');
  const [regDepartment, setRegDepartment] = useState('Department of Computer Science');
  const [regCourse, setRegCourse] = useState('');
  const [regClassBlock, setRegClassBlock] = useState('');
  const [isCustomBlock, setIsCustomBlock] = useState(false);
  const [customBlockInput, setCustomBlockInput] = useState('');
  const [regCompanyId, setRegCompanyId] = useState(companies[0]?.id || '');

  // Google OAuth Diag state
  const [showGoogleProviderModal, setShowGoogleProviderModal] = useState(false);
  const [googleOAuthDiag, setGoogleOAuthDiag] = useState<{
    errorType?: string;
    clientId?: string;
    redirectUri?: string;
    message?: string;
  } | null>(null);
  const [isCheckingGoogleStatus, setIsCheckingGoogleStatus] = useState(false);
  const [googleCheckSuccess, setGoogleCheckSuccess] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [popupAuthUrl, setPopupAuthUrl] = useState<string | null>(null);
  const [isWaitingForPopupAuth, setIsWaitingForPopupAuth] = useState(false);
  const [pendingRegistrationPayload, setPendingRegistrationPayload] = useState<any | null>(null);

  // Google OAuth Onboarding state (for first-time Google sign-in missing institutional details)
  const [googleBuId, setGoogleBuId] = useState('');
  const [googleDepartment, setGoogleDepartment] = useState('Department of Computer Science');
  const [googleCourse, setGoogleCourse] = useState('');
  const [googleClassBlock, setGoogleClassBlock] = useState('');
  const [googleCustomBlock, setGoogleCustomBlock] = useState(false);
  const [googleCustomBlockInput, setGoogleCustomBlockInput] = useState('');
  const [googleRoleMode, setGoogleRoleMode] = useState<'coordinator' | 'student'>('student');

  // Check Supabase session on mount and listen to OAuth session changes / popups
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const handleSession = async (session: any) => {
        if (session?.user) {
          setIsWaitingForPopupAuth(false);
          setPopupAuthUrl(null);
          const rawEmail = session.user.email || '';
          const cleanEmail = rawEmail.trim().toLowerCase();
          const isBuEmail = cleanEmail.endsWith('@bicol-u.edu.ph');
          const userMeta = session.user.user_metadata || {};
          const targetRole: 'coordinator' | 'student' =
            userMeta.role === 'coordinator' ? 'coordinator' : (isBuEmail ? 'student' : (roleMode === 'coordinator' ? 'coordinator' : 'student'));

          // Reject student accounts created or logged in with non-@bicol-u.edu.ph emails
          if (targetRole === 'student' && !isBuEmail) {
            setErrorMsg(
              `Student accounts must use an official Bicol University email ending with @bicol-u.edu.ph. "${cleanEmail}" is not an accepted institutional email.`
            );
            return;
          }

          // Auto-assume student ID between first few letters and @bicol-u.edu.ph
          const assumedStudentId = targetRole === 'student'
            ? (userMeta.bu_id || extractStudentIdFromEmail(cleanEmail))
            : (userMeta.bu_id || 'FAC-2026-CS-004');
          const fullName = userMeta.full_name || userMeta.name || cleanEmail.split('@')[0];

          try {
            await onLogin({ email: cleanEmail, role: targetRole });
          } catch {
            await onRegister({
              fullName,
              email: cleanEmail,
              role: targetRole,
              buId: assumedStudentId,
              department: userMeta.department || 'Department of Computer Science',
              classBlock: userMeta.class_block || 'BSCS 4-A',
              avatarUrl: userMeta.avatar_url,
            });
          }
        }
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          handleSession(session).catch(console.error);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session?.user) {
            handleSession(session).catch(console.error);
          }
        }
      );

      const handlePopupMessage = async (e: MessageEvent) => {
        if (e.data?.type === 'SUPABASE_AUTH_SUCCESS' || e.data?.type === 'OAUTH_AUTH_SUCCESS') {
          if (e.data?.session && supabase) {
            try {
              await supabase.auth.setSession({
                access_token: e.data.session.access_token,
                refresh_token: e.data.session.refresh_token,
              });
            } catch (err) {
              console.warn('Error setting session object in AuthPage:', err);
            }
          }
          if (e.data?.code && supabase) {
            try {
              await supabase.auth.exchangeCodeForSession(e.data.code);
            } catch (err) {
              console.warn('Error exchanging code from popup in AuthPage:', err);
            }
          } else if (e.data?.search && supabase) {
            const searchParams = new URLSearchParams(e.data.search);
            const code = searchParams.get('code');
            if (code) {
              try {
                await supabase.auth.exchangeCodeForSession(code);
              } catch (err) {
                console.warn('Error exchanging code from search params in AuthPage:', err);
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
              console.warn('Error applying session in AuthPage:', err);
            }
          }
          if (supabase) {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user) {
              await handleSession(data.session);
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
  }, [roleMode]);

  // Handle Standard Sign-In
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await onLogin({ email, password, role: roleMode });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify institutional credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Standard Registration with Email Confirmation / 6-digit OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (regPassword !== regPasswordConfirm) {
      setErrorMsg('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!regEmail.trim() || !regFullName.trim()) {
      setErrorMsg('Full name and institutional email are required.');
      setIsLoading(false);
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    const isBuEmail = cleanEmail.endsWith('@bicol-u.edu.ph');

    // Reject student account registration if email does not end with @bicol-u.edu.ph
    if (roleMode === 'student' && !isBuEmail) {
      setErrorMsg('Student accounts must use an official Bicol University email ending with @bicol-u.edu.ph. Non-institutional domains are rejected.');
      setIsLoading(false);
      return;
    }

    // Automatically assume student number between first few letters and @bicol-u.edu.ph
    const assumedStudentId = roleMode === 'student'
      ? (regBuId.trim() || extractStudentIdFromEmail(cleanEmail))
      : (regBuId.trim() || `FAC-2026-${Math.floor(100 + Math.random() * 900)}`);

    let effectiveBlock: string | undefined = undefined;
    if (roleMode === 'student') {
      const chosenBlock = isCustomBlock ? customBlockInput.trim() : regClassBlock.trim();
      if (!regCourse) {
        setErrorMsg('Please select your Degree Course / Academic Program.');
        setIsLoading(false);
        return;
      }
      if (!chosenBlock) {
        setErrorMsg('Please select or specify your Class Block Section.');
        setIsLoading(false);
        return;
      }
      effectiveBlock = chosenBlock;
    }

    const payload = {
      fullName: regFullName.trim(),
      email: cleanEmail,
      password: regPassword,
      role: roleMode,
      buId: assumedStudentId,
      department: regDepartment.trim(),
      classBlock: roleMode === 'student' ? effectiveBlock : undefined,
      companyId: roleMode === 'student' ? regCompanyId : undefined,
    };

    setPendingRegistrationPayload(payload);

    try {
      // Direct registration & immediate activation - sets credentials & syncs directly to Supabase
      await onRegister(payload);
      setSuccessMsg('Account created successfully! Welcome to InternTrack.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google OAuth Sign-In or Sign-Up
  const handleContinueWithGoogle = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPopupAuthUrl(null);

    const enteredEmail = (email.trim() || regEmail.trim()).toLowerCase();
    if (enteredEmail) {
      const isBu = enteredEmail.endsWith('@bicol-u.edu.ph');
      if (roleMode === 'student' && !isBu) {
        setErrorMsg(`Student accounts must use an official Bicol University email ending with @bicol-u.edu.ph. "${enteredEmail}" was rejected.`);
        setIsLoading(false);
        return;
      }

      const assumedId = roleMode === 'student'
        ? extractStudentIdFromEmail(enteredEmail)
        : (regBuId.trim() || `FAC-2026-${Math.floor(100 + Math.random() * 900)}`);
      const fullName = regFullName.trim() || enteredEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || (roleMode === 'coordinator' ? 'Practicum Coordinator' : 'Student Intern');

      try {
        await onLogin({ email: enteredEmail, role: roleMode, fullName });
        return;
      } catch {
        try {
          await onRegister({
            fullName,
            email: enteredEmail,
            role: roleMode,
            buId: assumedId,
            department: regDepartment.trim() || 'Department of Computer Science',
            classBlock: roleMode === 'student' ? regClassBlock : undefined,
          });
          return;
        } catch (regErr: any) {
          setErrorMsg(regErr.message || 'Authentication could not proceed.');
          setIsLoading(false);
          return;
        }
      }
    }

    try {
      const result = await signInWithGoogle();
      if (result.error) {
        throw result.error;
      }

      if (result.providerNotConfigured) {
        setGoogleOAuthDiag({
          errorType: result.errorType,
          clientId: result.clientId,
          redirectUri: result.redirectUri,
          message: result.message,
        });
        setShowGoogleProviderModal(true);
        return;
      }

      if (result.isPopup) {
        if (result.url) {
          setPopupAuthUrl(result.url);
        }
        if (result.popupOpened) {
          setIsWaitingForPopupAuth(true);
          setSuccessMsg('Google Sign-In opened in a secure window. Complete your sign-in to proceed.');

          const interval = setInterval(async () => {
            if (supabase) {
              const { data } = await supabase.auth.getSession();
              if (data?.session?.user) {
                clearInterval(interval);
                setIsWaitingForPopupAuth(false);
                setPopupAuthUrl(null);
                const rawEmail = data.session.user.email || '';
                const cleanUserEmail = rawEmail.trim().toLowerCase();
                const isBuUserEmail = cleanUserEmail.endsWith('@bicol-u.edu.ph');
                const userMeta = data.session.user.user_metadata || {};
                const targetRole: 'coordinator' | 'student' =
                  userMeta.role === 'coordinator' ? 'coordinator' : (isBuUserEmail ? 'student' : (roleMode === 'coordinator' ? 'coordinator' : 'student'));

                if (targetRole === 'student' && !isBuUserEmail) {
                  setErrorMsg(`Student accounts must use an official Bicol University email ending with @bicol-u.edu.ph. "${cleanUserEmail}" is not accepted.`);
                  return;
                }

                const assumedStudentId = targetRole === 'student'
                  ? (userMeta.bu_id || extractStudentIdFromEmail(cleanUserEmail))
                  : (userMeta.bu_id || 'FAC-2026-CS-004');
                const fullName = userMeta.full_name || userMeta.name || cleanUserEmail.split('@')[0];

                try {
                  await onLogin({ email: cleanUserEmail, role: targetRole });
                } catch {
                  await onRegister({
                    fullName,
                    email: cleanUserEmail,
                    role: targetRole,
                    buId: assumedStudentId,
                    department: userMeta.department || 'Department of Computer Science',
                    classBlock: userMeta.class_block || 'BSCS 4-A',
                    avatarUrl: userMeta.avatar_url,
                  });
                }
              }
            }
          }, 1200);

          setTimeout(() => {
            clearInterval(interval);
            setIsWaitingForPopupAuth(false);
          }, 90000);
        } else {
          setErrorMsg('Popup was blocked by your browser. Please click the button below to open Google Sign-In.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google OAuth failed to initialize');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecheckGoogleOAuth = async () => {
    setIsCheckingGoogleStatus(true);
    setErrorMsg(null);
    try {
      const status = await checkGoogleOAuthStatus();
      if (status.configured) {
        setGoogleCheckSuccess(true);
        setTimeout(() => {
          setShowGoogleProviderModal(false);
          handleContinueWithGoogle();
        }, 800);
      } else {
        setGoogleOAuthDiag({
          errorType: status.error,
          clientId: status.clientId,
          redirectUri: status.redirectUri,
          message: status.message,
        });
      }
    } catch (e: any) {
      console.warn('Google check failed:', e);
    } finally {
      setIsCheckingGoogleStatus(false);
    }
  };

  const handleCopyRedirectUri = (uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedRedirectUri(true);
    setTimeout(() => setCopiedRedirectUri(false), 3000);
  };

  // Complete Google First-Time Onboarding
  const handleGoogleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser) return;
    setIsLoading(true);
    setErrorMsg(null);

    const email = googleUser.email.trim().toLowerCase();
    const isBuEmail = email.endsWith('@bicol-u.edu.ph');

    // Reject student accounts if email does not end with @bicol-u.edu.ph
    if (googleRoleMode === 'student' && !isBuEmail) {
      setErrorMsg(
        `Student accounts must use an official Bicol University email ending with @bicol-u.edu.ph. "${email}" is not an institutional student address.`
      );
      setIsLoading(false);
      return;
    }

    const effectiveId = googleRoleMode === 'student'
      ? (googleBuId.trim() || extractStudentIdFromEmail(email))
      : (googleBuId.trim() || 'FAC-2026-CS-004');

    if (!effectiveId) {
      setErrorMsg('Institutional Student or Faculty ID Number is required.');
      setIsLoading(false);
      return;
    }

    let googleEffectiveBlock: string | undefined = undefined;
    if (googleRoleMode === 'student') {
      const chosenBlock = googleCustomBlock ? googleCustomBlockInput.trim() : googleClassBlock.trim();
      if (!googleCourse) {
        setErrorMsg('Please select your Degree Course / Academic Program.');
        setIsLoading(false);
        return;
      }
      if (!chosenBlock) {
        setErrorMsg('Please select or specify your Class Block Section.');
        setIsLoading(false);
        return;
      }
      googleEffectiveBlock = chosenBlock;
    }

    try {
      await onRegister({
        fullName: googleUser.fullName,
        email: googleUser.email,
        role: googleRoleMode,
        buId: effectiveId,
        department: googleDepartment.trim(),
        classBlock: googleRoleMode === 'student' ? googleEffectiveBlock : undefined,
        avatarUrl: googleUser.avatarUrl,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete institutional profile.');
    } finally {
      setIsLoading(false);
    }
  };

  // Official Google G Logo SVG Component
  const GoogleIcon = () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Top Header */}
      <header className="w-full bg-[#020617] border-b border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center">
          <span className="text-2xl font-black tracking-tight select-none">
            <span className="text-[#3b82f6]">I</span>
            <span className="text-white">ntern</span>
            <span className="text-[#F26522]">Track</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle showLabel={true} />
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-200">
          
          {/* Card Top Banner */}
          <div className="bg-gradient-to-r from-[#020617] via-[#091528] to-[#020617] text-white p-6 relative overflow-hidden border-b border-slate-800">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-[#FED7AA] border border-white/20 text-[10px] font-bold uppercase mb-2">
                  <Shield className="w-3 h-3 text-[#F26522]" />
                  <span>Portal Authentication</span>
                </div>
                
                <h1 className="text-2xl font-black tracking-tight text-white">
                  {viewMode === 'google-onboarding'
                    ? 'Complete Institutional Profile'
                    : viewMode === 'login'
                    ? 'Sign In to InternTrack'
                    : 'Create Intern or Coordinator Account'}
                </h1>
                
                <p className="text-xs text-slate-300 mt-1">
                  {viewMode === 'google-onboarding'
                    ? 'Provide your missing university details to complete Google authentication.'
                    : viewMode === 'login'
                    ? 'Sign in with your Google account or institutional email.'
                    : 'Register your university credentials to begin.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Tabs & Account Category (Shown only on Login & Register views) */}
          {(viewMode === 'login' || viewMode === 'register') && (
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-900/60">
              {/* Tab Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 rounded-lg font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                    viewMode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 rounded-lg font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                    viewMode === 'register'
                      ? 'bg-white dark:bg-slate-900 text-[#F26522] dark:text-orange-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* Account Mode Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Account Category:</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Select your role
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoleMode('student')}
                    className={`p-3 rounded-lg border text-left transition-all active:scale-95 cursor-pointer ${
                      roleMode === 'student'
                        ? 'border-[#F26522] bg-orange-50/80 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 ring-2 ring-[#F26522]/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs text-[#F26522]">
                      <GraduationCap className="w-4 h-4" />
                      <span>Student Intern</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      Enrolls in HTE & logs duty hours.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoleMode('coordinator')}
                    className={`p-3 rounded-lg border text-left transition-all active:scale-95 cursor-pointer ${
                      roleMode === 'coordinator'
                        ? 'border-[#0B2545] dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-2 ring-[#0B2545]/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs text-[#0B2545] dark:text-blue-300">
                      <Shield className="w-4 h-4" />
                      <span>Practicum Coordinator</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      Supervises cohorts, approves enrollments & archives.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="p-6">
            {/* Status Messages */}
            {errorMsg && (
              <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* VIEW 1: SIGN IN FORM */}
            {viewMode === 'login' && (
              <div className="space-y-4">
                {isWaitingForPopupAuth && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                      <span>Google Sign-In opened in a secure window...</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Complete your sign-in prompt in the opened window. Once signed in, this screen will advance automatically!
                    </p>
                    {popupAuthUrl && (
                      <a
                        href={popupAuthUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition"
                      >
                        <span>Re-open Google Sign-In Window</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Continue with Google Button */}
                <button
                  type="button"
                  onClick={handleContinueWithGoogle}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-3"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200 dark:border-slate-800" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Or with institutional email
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:border-slate-800" />
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Institutional Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter you BU email"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522] focus:border-[#F26522]"
                    />
                    {roleMode === 'student' && email && !email.toLowerCase().endsWith('@bicol-u.edu.ph') && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                        * Student accounts require @bicol-u.edu.ph institutional email
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Password *
                      </label>
                      <span className="text-[10px] text-slate-400">Secure entry</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your account password"
                        className="w-full p-3 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522] focus:border-[#F26522]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-lg font-black text-white text-xs transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                      roleMode === 'coordinator'
                        ? 'bg-[#0B2545] hover:bg-[#134074]'
                        : 'bg-[#F26522] hover:bg-[#D94B0A]'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {isLoading
                        ? 'Signing in...'
                        : `Sign In as ${roleMode === 'coordinator' ? 'Coordinator' : 'Student Intern'}`}
                    </span>
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 2: CREATE ACCOUNT FORM */}
            {viewMode === 'register' && (
              <div className="space-y-4">
                {isWaitingForPopupAuth && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                      <span>Google Sign-In opened in a secure window...</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Complete your sign-in prompt in the opened window. Once signed in, this screen will advance automatically!
                    </p>
                    {popupAuthUrl && (
                      <a
                        href={popupAuthUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition"
                      >
                        <span>Re-open Google Sign-In Window</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Continue with Google Button */}
                <button
                  type="button"
                  onClick={handleContinueWithGoogle}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-3"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200 dark:border-slate-800" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Or register institutional credentials
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:border-slate-800" />
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Maria Clara B. Santos"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Institutional Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRegEmail(val);
                          if (roleMode === 'student') {
                            const assumed = extractStudentIdFromEmail(val);
                            if (assumed) setRegBuId(assumed);
                          }
                        }}
                        placeholder="Enter you BU email"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                      />
                      {roleMode === 'student' && regEmail && !regEmail.toLowerCase().endsWith('@bicol-u.edu.ph') && (
                        <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold">
                          * Must end with @bicol-u.edu.ph (other domains rejected)
                        </p>
                      )}
                    </div>

                    {roleMode === 'student' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Assumed Student ID
                        </label>
                        <div className="p-2.5 bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-900 dark:text-orange-200">
                            {extractStudentIdFromEmail(regEmail) || 'Pending @bicol-u.edu.ph email'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Auto-assumed</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Faculty ID Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={regBuId}
                          onChange={(e) => setRegBuId(e.target.value)}
                          placeholder="FAC-2026-088"
                          className="w-full p-2.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roleMode === 'student' ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Degree Course / Program *
                          </label>
                          <select
                            required
                            value={regCourse}
                            onChange={(e) => {
                              const selected = e.target.value;
                              setRegCourse(selected);
                              setRegClassBlock('');
                              setIsCustomBlock(false);
                              setCustomBlockInput('');
                              const found = BU_COURSES.find((c) => c.code === selected);
                              if (found) {
                                setRegDepartment(found.department);
                              } else if (selected === 'OTHER') {
                                setRegDepartment('College of Science');
                              }
                            }}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white font-medium focus:ring-1 focus:ring-[#F26522]"
                          >
                            <option value="" disabled>-- Select Degree / Course --</option>
                            {BU_COURSES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name} ({c.code})
                              </option>
                            ))}
                            <option value="OTHER">Other Academic Program (Custom)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Class Block Section *
                          </label>
                          <select
                            required
                            disabled={!regCourse}
                            value={isCustomBlock ? 'CUSTOM' : regClassBlock}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'CUSTOM') {
                                setIsCustomBlock(true);
                                setRegClassBlock('');
                              } else {
                                setIsCustomBlock(false);
                                setRegClassBlock(val);
                              }
                            }}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white font-medium focus:ring-1 focus:ring-[#F26522] disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <option value="" disabled>
                              {regCourse ? '-- Select Class Block Section --' : '-- First Select Course Above --'}
                            </option>
                            {BU_COURSES.find((c) => c.code === regCourse)?.blocks.map((blk) => (
                              <option key={blk} value={blk}>
                                {blk}
                              </option>
                            ))}
                            <option value="CUSTOM">Custom Section / Non-Listed Block...</option>
                          </select>
                        </div>

                        {(isCustomBlock || regCourse === 'OTHER') && (
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Specify Custom Block / Section *
                            </label>
                            <input
                              type="text"
                              required
                              value={customBlockInput}
                              onChange={(e) => setCustomBlockInput(e.target.value)}
                              placeholder="e.g. BSCS 4-Midyear or BSIT 4-Special"
                              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white font-mono focus:ring-1 focus:ring-[#F26522]"
                            />
                          </div>
                        )}

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Academic Department
                          </label>
                          <input
                            type="text"
                            value={regDepartment}
                            onChange={(e) => setRegDepartment(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Department / Unit
                          </label>
                          <input
                            type="text"
                            value={regDepartment}
                            onChange={(e) => setRegDepartment(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Coordinator Role
                          </label>
                          <input
                            type="text"
                            disabled
                            value="Practicum Head / Course Supervisor"
                            className="w-full p-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Portal Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Enter safe password"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-lg font-black text-white text-xs transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                      roleMode === 'coordinator'
                        ? 'bg-[#0B2545] hover:bg-[#134074]'
                        : 'bg-[#F26522] hover:bg-[#D94B0A]'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      {isLoading
                        ? 'Creating Account...'
                        : `Create ${roleMode === 'coordinator' ? 'Coordinator' : 'Student'} Account`}
                    </span>
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 4: GOOGLE FIRST-TIME SIGN-IN MISSING DETAILS ONBOARDING */}
            {viewMode === 'google-onboarding' && googleUser && (
              <form onSubmit={handleGoogleOnboardingSubmit} className="space-y-4">
                {/* Google Identity Header Card */}
                <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 flex items-center gap-3.5">
                  {googleUser.avatarUrl && googleUser.avatarUrl.trim() !== '' ? (
                    <img
                      src={googleUser.avatarUrl}
                      alt={googleUser.fullName}
                      className="w-12 h-12 rounded-lg object-cover ring-2 ring-blue-500"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                      {googleUser.fullName.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {googleUser.fullName}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        <GoogleIcon />
                        <span>Google Verified</span>
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                      {googleUser.email}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                  Welcome to InternTrack! Because this is your first time signing in with Google, please complete your official institutional registration details before proceeding to the portal.
                </div>

                {/* Role Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Institutional Role *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGoogleRoleMode('student')}
                      className={`p-3 rounded-lg border text-left transition-all active:scale-95 cursor-pointer ${
                        googleRoleMode === 'student'
                          ? 'border-[#F26522] bg-orange-50 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 ring-2 ring-[#F26522]/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-xs text-[#F26522]">
                        <GraduationCap className="w-4 h-4" />
                        <span>Student Intern</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Practicum candidate
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGoogleRoleMode('coordinator')}
                      className={`p-3 rounded-lg border text-left transition-all active:scale-95 cursor-pointer ${
                        googleRoleMode === 'coordinator'
                          ? 'border-[#0B2545] dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-2 ring-[#0B2545]/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-xs text-[#0B2545] dark:text-blue-300">
                        <Shield className="w-4 h-4" />
                        <span>Practicum Coordinator</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Course supervisor
                      </p>
                    </button>
                  </div>
                </div>

                {/* ID Number & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {googleRoleMode === 'student' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Assumed Student Number
                      </label>
                      <div className="p-2.5 bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900 dark:text-orange-200">
                          {extractStudentIdFromEmail(googleUser.email)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Auto-assumed</span>
                        </span>
                      </div>
                      {!googleUser.email.toLowerCase().endsWith('@bicol-u.edu.ph') && (
                        <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-1">
                          ⚠️ Student accounts must end with @bicol-u.edu.ph
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Faculty ID Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={googleBuId}
                        onChange={(e) => setGoogleBuId(e.target.value)}
                        placeholder="FAC-2026-088"
                        className="w-full p-2.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Academic Department *
                    </label>
                    <input
                      type="text"
                      required
                      value={googleDepartment}
                      onChange={(e) => setGoogleDepartment(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white focus:ring-1 focus:ring-[#F26522]"
                    />
                  </div>
                </div>

                {/* If Student, Degree Course & Class Block Section */}
                {googleRoleMode === 'student' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Degree Course / Program *
                        </label>
                        <select
                          required
                          value={googleCourse}
                          onChange={(e) => {
                            const selected = e.target.value;
                            setGoogleCourse(selected);
                            setGoogleClassBlock('');
                            setGoogleCustomBlock(false);
                            setGoogleCustomBlockInput('');
                            const found = BU_COURSES.find((c) => c.code === selected);
                            if (found) {
                              setGoogleDepartment(found.department);
                            } else if (selected === 'OTHER') {
                              setGoogleDepartment('College of Science');
                            }
                          }}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white font-medium focus:ring-1 focus:ring-[#F26522]"
                        >
                          <option value="" disabled>-- Select Degree / Course --</option>
                          {BU_COURSES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                          <option value="OTHER">Other Academic Program (Custom)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Class Block Section *
                        </label>
                        <select
                          required
                          disabled={!googleCourse}
                          value={googleCustomBlock ? 'CUSTOM' : googleClassBlock}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'CUSTOM') {
                              setGoogleCustomBlock(true);
                              setGoogleClassBlock('');
                            } else {
                              setGoogleCustomBlock(false);
                              setGoogleClassBlock(val);
                            }
                          }}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white font-medium focus:ring-1 focus:ring-[#F26522] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="" disabled>
                            {googleCourse ? '-- Select Class Block Section --' : '-- First Select Course Above --'}
                          </option>
                          {BU_COURSES.find((c) => c.code === googleCourse)?.blocks.map((blk) => (
                            <option key={blk} value={blk}>
                              {blk}
                            </option>
                          ))}
                          <option value="CUSTOM">Custom Section / Non-Listed Block...</option>
                        </select>
                      </div>
                    </div>

                    {(googleCustomBlock || googleCourse === 'OTHER') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Specify Custom Block / Section *
                        </label>
                        <input
                          type="text"
                          required
                          value={googleCustomBlockInput}
                          onChange={(e) => setGoogleCustomBlockInput(e.target.value)}
                          placeholder="e.g. BSCS 4-Midyear or BSIT 4-Special"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs dark:text-white font-mono focus:ring-1 focus:ring-[#F26522]"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setGoogleUser(null);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-[#F26522] hover:bg-[#D94B0A] text-white font-black text-xs rounded-lg shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isLoading ? 'Completing Profile...' : 'Complete Profile & Proceed'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Google OAuth Provider Notice & Instant Testing Modal */}
        {showGoogleProviderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                    <GoogleIcon />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Google Cloud OAuth Setup</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        1 Step Remaining
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Supabase Project: <code className="font-mono text-[#F26522]">lgfgxdhxjnmuebjsefnc</code>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleProviderModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-lg leading-none"
                >
                  &times;
                </button>
              </div>

              {googleCheckSuccess ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Google Cloud Connection Verified!</p>
                    <p className="text-[11px]">Redirecting to Google Sign-In consent screen...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Google Error: redirect_uri_mismatch (Code 400)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                      Your Google Cloud Client ID (<code>56357888695-msaq...</code>) is <strong>successfully connected</strong> to Supabase!
                      However, Google Cloud blocks the login because the <strong>Authorized redirect URI</strong> has not yet been registered in your Google Cloud Console.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Authorized redirect URI to copy:</span>
                      {copiedRedirectUri && (
                        <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Copied!
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="https://lgfgxdhxjnmuebjsefnc.supabase.co/auth/v1/callback"
                        className="flex-1 p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-[11px] text-slate-800 dark:text-slate-200 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyRedirectUri('https://lgfgxdhxjnmuebjsefnc.supabase.co/auth/v1/callback')}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        {copiedRedirectUri ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedRedirectUri ? 'Copied' : 'Copy URI'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200">How to add in 30 seconds:</p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Go to <strong>Google Cloud Console &rarr; APIs & Services &rarr; Credentials</strong></li>
                      <li>Under <strong>OAuth 2.0 Client IDs</strong>, click your client: <code>Potato App</code></li>
                      <li>Under <strong>Authorized redirect URIs</strong>, click <strong>+ ADD URI</strong></li>
                      <li>Paste: <code className="text-[#F26522] font-semibold">https://lgfgxdhxjnmuebjsefnc.supabase.co/auth/v1/callback</code></li>
                      <li>Click <strong>SAVE</strong> at the bottom (takes 1–2 minutes for Google to update)</li>
                    </ol>
                  </div>
                </>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleRecheckGoogleOAuth}
                  disabled={isCheckingGoogleStatus}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGoogleStatus ? 'animate-spin text-[#F26522]' : ''}`} />
                  <span>{isCheckingGoogleStatus ? 'Checking Google Cloud Status...' : 'Re-Test Google Cloud Connection Status'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const emailToUse = (email.trim() || regEmail.trim()).toLowerCase();
                    if (!emailToUse) {
                      setErrorMsg('Please enter your institutional email address in the form before proceeding.');
                      setShowGoogleProviderModal(false);
                      return;
                    }

                    const isBuEmail = emailToUse.endsWith('@bicol-u.edu.ph');
                    if (roleMode === 'student' && !isBuEmail) {
                      setErrorMsg(`Student accounts must use an official Bicol University email ending with @bicol-u.edu.ph. "${emailToUse}" is rejected.`);
                      setShowGoogleProviderModal(false);
                      return;
                    }

                    setShowGoogleProviderModal(false);
                    setIsLoading(true);
                    setErrorMsg(null);

                    const assumedId = roleMode === 'student' ? extractStudentIdFromEmail(emailToUse) : `FAC-2026-${Math.floor(100 + Math.random() * 900)}`;
                    const targetName = (regFullName.trim() || emailToUse.split('@')[0].toUpperCase());

                    try {
                      await onLogin({ email: emailToUse, role: roleMode, fullName: targetName });
                    } catch {
                      try {
                        await onRegister({
                          fullName: targetName,
                          email: emailToUse,
                          role: roleMode,
                          buId: assumedId,
                          department: regDepartment.trim() || 'Department of Computer Science',
                          classBlock: roleMode === 'student' ? (isCustomBlock ? customBlockInput.trim() : regClassBlock) : undefined,
                          avatarUrl: '',
                        });
                      } catch (regErr: any) {
                        setErrorMsg(regErr.message || 'Authentication could not proceed.');
                      }
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="w-full py-3 bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  <ArrowRight className="w-4 h-4 text-white" />
                  <span>Proceed with Email ({email.trim() || regEmail.trim() || 'Enter in Form'})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGoogleProviderModal(false)}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium text-xs transition cursor-pointer"
                >
                  Close & Use Email / Password
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Researchers Footer (Thesis Adviser removed) */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>
            <strong>Researchers:</strong> Humpry Andrei L. Camacho • Joshua A. Ecat • Jhercy N. Narito (BSCS)
          </div>
          <div className="text-slate-400 dark:text-slate-400">
            Practicum Monitoring System
          </div>
        </div>
      </footer>
    </div>
  );
};
