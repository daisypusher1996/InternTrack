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
  RefreshCw,
  ExternalLink,
  Check,
  Copy,
  Clock,
  FileText,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Company, Student, BU_COURSES } from '../types';
import { ThemeToggle } from './ThemeToggle';
import {
  signInWithGoogle,
  checkGoogleOAuthStatus,
  isSupabaseConfigured,
  supabase,
  extractStudentIdFromEmail,
} from '../lib/supabase';

interface GooglePendingProfile {
  email: string;
  fullName: string;
  avatarUrl?: string;
}

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
  const [roleMode, setRoleMode] = useState<'coordinator' | 'student'>('student');
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

  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration form states
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

  // Google OAuth Onboarding state
  const [googleBuId, setGoogleBuId] = useState('');
  const [googleDepartment, setGoogleDepartment] = useState('Department of Computer Science');
  const [googleCourse, setGoogleCourse] = useState('');
  const [googleClassBlock, setGoogleClassBlock] = useState('');
  const [googleCustomBlock, setGoogleCustomBlock] = useState(false);
  const [googleCustomBlockInput, setGoogleCustomBlockInput] = useState('');
  const [googleRoleMode, setGoogleRoleMode] = useState<'coordinator' | 'student'>('student');

  // Popup listener to close waiting banner
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'SUPABASE_AUTH_SUCCESS' || e.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsWaitingForPopupAuth(false);
        setPopupAuthUrl(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle Standard Sign-In
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await onLogin({ email, password, role: roleMode });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify your institutional credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Standard Registration
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

    if (roleMode === 'student' && !isBuEmail) {
      setErrorMsg(
        'Student accounts must use an official Bicol University email ending with @bicol-u.edu.ph. Non-institutional domains are rejected.'
      );
      setIsLoading(false);
      return;
    }

    const assumedStudentId =
      roleMode === 'student'
        ? regBuId.trim() || extractStudentIdFromEmail(cleanEmail)
        : regBuId.trim() || `FAC-2026-${Math.floor(100 + Math.random() * 900)}`;

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

    try {
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
        setIsLoading(false);
        return;
      }

      if (result.isPopup) {
        if (result.url) {
          setPopupAuthUrl(result.url);
        }
        if (result.popupOpened) {
          setIsWaitingForPopupAuth(true);
          setSuccessMsg('Google Sign-In opened in a secure window. Please complete sign-in to proceed.');
        } else {
          setErrorMsg('Popup was blocked by your browser. Please click the button below to open Google Sign-In.');
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google OAuth failed to initialize');
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
    setSuccessMsg(null);

    const emailToUse = googleUser.email.trim().toLowerCase();
    const isBuEmail = emailToUse.endsWith('@bicol-u.edu.ph');

    if (googleRoleMode === 'student' && !isBuEmail) {
      setErrorMsg(
        `Student accounts must use an official Bicol University email ending with @bicol-u.edu.ph. "${emailToUse}" is not an institutional student address.`
      );
      setIsLoading(false);
      return;
    }

    const effectiveId =
      googleRoleMode === 'student'
        ? googleBuId.trim() || extractStudentIdFromEmail(emailToUse)
        : googleBuId.trim() || 'FAC-2026-CS-004';

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
      setSuccessMsg('Profile completed successfully! Entering your dashboard...');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete institutional profile.');
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 transition-colors duration-200 selection:bg-[#F26522] selection:text-white">
      {/* =========================================================================
          LEFT COLUMN: Institutional Bicol University Showcase (Desktop Split)
          Modeled after https://ibu.bicol-u.edu.ph/sign-in
         ========================================================================= */}
      <div className="hidden lg:flex lg:w-7/12 xl:w-3/5 bg-gradient-to-br from-[#06142e] via-[#0b2545] to-[#040d1a] relative overflow-hidden flex-col justify-between p-12 xl:p-16 text-white border-r border-slate-800">
        {/* Decorative background glow accents */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#F26522]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold tracking-wide text-slate-200">
            <span className="w-2 h-2 rounded-full bg-[#F26522] animate-pulse" />
            <span className="uppercase text-[11px] font-bold tracking-wider text-orange-200">
              Bicol University Practicum System
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl xl:text-4xl font-black tracking-tight font-sans">
              <span className="text-[#3b82f6]">I</span>
              <span className="text-white">ntern</span>
              <span className="text-[#F26522]">Track</span>
            </span>
          </div>
        </div>

        {/* Middle: Value Proposition & Feature Showcase */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-xl">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Empowering BU Scholars in Professional Industry Immersion.
            </h2>
            <p className="text-sm xl:text-base text-slate-300 leading-relaxed font-normal">
              An institutional platform designed for Bicol University students, faculty coordinators, and accredited Host Training Establishments (HTEs) for verified DTR monitoring and practicum governance.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1.5 hover:border-[#F26522]/40 transition-colors">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Clock className="w-4 h-4 text-[#F26522]" />
                <span>Automated DTR Logging</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Real-time time-in and time-out logging with shift tracking and anomaly verification.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1.5 hover:border-[#F26522]/40 transition-colors">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Accomplishment Reports</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Structured weekly accomplishment logging and mentor sign-off endorsements.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1.5 hover:border-[#F26522]/40 transition-colors">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Strict Role Isolation</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Strict separation between Student Interns and Practicum Coordinators.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1.5 hover:border-[#F26522]/40 transition-colors">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Accredited HTE Directory</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Centralized registry of verified corporate partners and host training institutions.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Institutional Seal & Motto */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <p className="font-semibold text-slate-200">Bicol University • A University for Humanity</p>
            <p className="text-[11px] text-slate-400">Character • Scholarship • Service</p>
          </div>
          <div className="text-[11px] text-slate-400 text-left sm:text-right">
            Practicum Directorate &bull; College of Science
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: Spacious Sign-In / Sign-Up / Google Onboarding Card
         ========================================================================= */}
      <div className="w-full lg:w-5/12 xl:w-2/5 flex flex-col justify-between min-h-screen p-6 sm:p-10 lg:p-12 xl:p-14 bg-white dark:bg-[#030712] overflow-y-auto">
        {/* Top Bar inside the form pane */}
        <div className="flex items-center justify-between pb-6 sm:pb-8">
          <div className="flex items-center lg:hidden">
            <span className="text-2xl font-black tracking-tight font-sans">
              <span className="text-[#3b82f6]">I</span>
              <span className="text-slate-900 dark:text-white">ntern</span>
              <span className="text-[#F26522]">Track</span>
            </span>
          </div>
          <div className="hidden lg:block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Institutional Access
            </span>
          </div>

          <ThemeToggle showLabel={false} />
        </div>

        {/* Center Container */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          {/* Header Title */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-[#F26522] border border-orange-200 dark:border-orange-900/60 text-[10px] font-bold uppercase">
              <Shield className="w-3 h-3 text-[#F26522]" />
              <span>
                {viewMode === 'google-onboarding'
                  ? 'First-Time Setup'
                  : roleMode === 'coordinator'
                  ? 'Coordinator Portal'
                  : 'Student Intern Portal'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {viewMode === 'google-onboarding'
                ? 'Complete Your Profile'
                : viewMode === 'login'
                ? 'Sign in to InternTrack'
                : 'Create an Account'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {viewMode === 'google-onboarding'
                ? 'Finalize your Bicol University credentials to unlock your portal.'
                : viewMode === 'login'
                ? 'Welcome back! Choose your role and enter your institutional credentials.'
                : 'Register your official university credentials to begin.'}
            </p>
          </div>

          {/* Tabs: Sign In vs Create Account (Hidden during Google Onboarding) */}
          {(viewMode === 'login' || viewMode === 'register') && (
            <div className="space-y-4">
              {/* View Switcher Tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2.5 rounded-lg font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                    viewMode === 'login'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                  className={`py-2.5 rounded-lg font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                    viewMode === 'register'
                      ? 'bg-white dark:bg-slate-800 text-[#F26522] dark:text-orange-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* Role Selection Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRoleMode('student')}
                  className={`p-3.5 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
                    roleMode === 'student'
                      ? 'border-[#F26522] bg-orange-50/70 dark:bg-orange-950/30 text-orange-950 dark:text-orange-200 ring-2 ring-[#F26522]/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-xs text-[#F26522]">
                    <GraduationCap className="w-4 h-4" />
                    <span>Student Intern</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    DTR clock & reports
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRoleMode('coordinator')}
                  className={`p-3.5 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
                    roleMode === 'coordinator'
                      ? 'border-[#0B2545] dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-xs text-[#0B2545] dark:text-blue-400">
                    <Shield className="w-4 h-4" />
                    <span>Coordinator</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Supervision & approval
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Alert Messages */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMsg}</div>
            </div>
          )}

          {isWaitingForPopupAuth && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                <span>Google Sign-In window active...</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Complete your prompt in the opened window. Once signed in, you will be advanced automatically!
              </p>
              {popupAuthUrl && (
                <a
                  href={popupAuthUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition"
                >
                  <span>Re-open Google Window</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* =================================================================
              VIEW 1: SIGN IN FORM
             ================================================================= */}
          {viewMode === 'login' && (
            <div className="space-y-4">
              {/* Continue with Google Button */}
              <button
                type="button"
                onClick={handleContinueWithGoogle}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-3"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Or enter credentials
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jdoe@bicol-u.edu.ph"
                    className="w-full py-3 px-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522] transition-all"
                  />
                  {roleMode === 'student' && email && !email.toLowerCase().endsWith('@bicol-u.edu.ph') && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 font-semibold">
                      * Student accounts require @bicol-u.edu.ph institutional email
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Password *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full py-3 px-3.5 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 rounded-xl font-bold text-white text-xs transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                    roleMode === 'coordinator'
                      ? 'bg-[#0B2545] hover:bg-[#134074]'
                      : 'bg-[#F26522] hover:bg-[#D94B0A]'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {isLoading
                      ? 'Authenticating...'
                      : `Sign In as ${roleMode === 'coordinator' ? 'Coordinator' : 'Student Intern'}`}
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* =================================================================
              VIEW 2: CREATE ACCOUNT FORM
             ================================================================= */}
          {viewMode === 'register' && (
            <div className="space-y-4">
              {/* Continue with Google Button */}
              <button
                type="button"
                onClick={handleContinueWithGoogle}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-3"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Or register credentials
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
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
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
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
                      placeholder="name@bicol-u.edu.ph"
                      className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
                    />
                  </div>

                  {roleMode === 'student' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Assumed Student ID
                      </label>
                      <div className="py-2.5 px-3 bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900 dark:text-orange-200 truncate">
                          {extractStudentIdFromEmail(regEmail) || 'Pending email'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                          <Check className="w-3 h-3" />
                          <span>Assumed</span>
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
                        className="w-full py-2.5 px-3 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
                      />
                    </div>
                  )}
                </div>

                {roleMode === 'student' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white font-medium focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
                        >
                          <option value="" disabled>-- Select Degree Course --</option>
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
                          className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white font-medium focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="" disabled>
                            {regCourse ? '-- Select Block Section --' : '-- Select Course First --'}
                          </option>
                          {BU_COURSES.find((c) => c.code === regCourse)?.blocks.map((blk) => (
                            <option key={blk} value={blk}>
                              {blk}
                            </option>
                          ))}
                          <option value="CUSTOM">Custom Section...</option>
                        </select>
                      </div>
                    </div>

                    {(isCustomBlock || regCourse === 'OTHER') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Specify Custom Section *
                        </label>
                        <input
                          type="text"
                          required
                          value={customBlockInput}
                          onChange={(e) => setCustomBlockInput(e.target.value)}
                          placeholder="e.g. BSCS 4-Midyear or BSIT 4-Special"
                          className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white font-mono focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {roleMode === 'coordinator' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Academic Department / College *
                    </label>
                    <input
                      type="text"
                      required
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      placeholder="e.g. Department of Computer Science"
                      className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Enter safe password"
                      className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
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
                      className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 rounded-xl font-bold text-white text-xs transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
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

          {/* =================================================================
              VIEW 3: GOOGLE FIRST-TIME ONBOARDING FORM
             ================================================================= */}
          {viewMode === 'google-onboarding' && googleUser && (
            <form onSubmit={handleGoogleOnboardingSubmit} className="space-y-4">
              {/* Google Verified Identity Card */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 flex items-center gap-3.5">
                {googleUser.avatarUrl && googleUser.avatarUrl.trim() !== '' ? (
                  <img
                    src={googleUser.avatarUrl}
                    alt={googleUser.fullName}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-500"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                    {googleUser.fullName.charAt(0)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {googleUser.fullName}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shrink-0">
                      <GoogleIcon />
                      <span>Verified</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                    {googleUser.email}
                  </div>
                </div>
              </div>

              {/* Role Selection Cards */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Institutional Role *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGoogleRoleMode('student')}
                    className={`p-3 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
                      googleRoleMode === 'student'
                        ? 'border-[#F26522] bg-orange-50/70 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 ring-2 ring-[#F26522]/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs text-[#F26522]">
                      <GraduationCap className="w-4 h-4" />
                      <span>Student Intern</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      OJT candidate
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGoogleRoleMode('coordinator')}
                    className={`p-3 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
                      googleRoleMode === 'coordinator'
                        ? 'border-[#0B2545] dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs text-[#0B2545] dark:text-blue-300">
                      <Shield className="w-4 h-4" />
                      <span>Coordinator</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Faculty supervisor
                    </p>
                  </button>
                </div>
              </div>

              {/* ID & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {googleRoleMode === 'student' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assumed Student ID
                    </label>
                    <div className="py-2.5 px-3 bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900 dark:text-orange-200 truncate">
                        {extractStudentIdFromEmail(googleUser.email)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                        <Check className="w-3 h-3" />
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
                      value={googleBuId}
                      onChange={(e) => setGoogleBuId(e.target.value)}
                      placeholder="FAC-2026-088"
                      className="w-full py-2.5 px-3 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
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
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
                  />
                </div>
              </div>

              {/* Student Degree & Block Section */}
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
                        className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white font-medium focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
                      >
                        <option value="" disabled>-- Select Degree Course --</option>
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
                        className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white font-medium focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="" disabled>
                          {googleCourse ? '-- Select Block Section --' : '-- Select Course First --'}
                        </option>
                        {BU_COURSES.find((c) => c.code === googleCourse)?.blocks.map((blk) => (
                          <option key={blk} value={blk}>
                            {blk}
                          </option>
                        ))}
                        <option value="CUSTOM">Custom Section...</option>
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
                        className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-white font-mono focus:ring-2 focus:ring-[#F26522]/50 focus:border-[#F26522]"
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
                  className="px-6 py-3.5 bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isLoading ? 'Completing Profile...' : 'Complete Profile & Proceed'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Credit in the Right Column */}
        <div className="pt-8 text-center text-[11px] text-slate-400 dark:text-slate-500">
          <p>
            <strong>Researchers:</strong> Humpry Andrei L. Camacho &bull; Joshua A. Ecat &bull; Jhercy N. Narito (BSCS)
          </p>
          <p className="mt-0.5">Bicol University College of Science &bull; Practicum Monitoring System</p>
        </div>
      </div>

      {/* =========================================================================
          Google Cloud OAuth Diagnostic Modal (if missing redirect URI)
         ========================================================================= */}
      {showGoogleProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
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
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Google Cloud Connection Verified!</p>
                  <p className="text-[11px]">Redirecting to Google Sign-In consent screen...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Google Error: redirect_uri_mismatch (Code 400)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                    Your Google Cloud Client ID is <strong>connected</strong> to Supabase!
                    Google Cloud requires the <strong>Authorized redirect URI</strong> to be registered in your Google Cloud Console.
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
              </>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleRecheckGoogleOAuth}
                disabled={isCheckingGoogleStatus}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGoogleStatus ? 'animate-spin text-[#F26522]' : ''}`} />
                <span>{isCheckingGoogleStatus ? 'Checking Status...' : 'Re-Test Connection Status'}</span>
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
    </div>
  );
};
