import React, { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Shield,
  GraduationCap,
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { User, Company, Student, BU_COURSES } from '../types';
import { signInWithGoogle, extractStudentIdFromEmail } from '../lib/supabase';
import FoldText from './FoldText';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  companies: Company[];
  students: Student[];
  onLogin: (credentials: {
    email?: string;
    password?: string;
    role?: 'coordinator' | 'student';
    fullName?: string;
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
  }) => Promise<void>;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  companies,
  students,
  onLogin,
  onRegister,
  onLogout,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [roleMode, setRoleMode] = useState<'coordinator' | 'student'>('coordinator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register Fields
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBuId, setRegBuId] = useState('');
  const [regDepartment, setRegDepartment] = useState('Department of Computer Science');
  const [regCourse, setRegCourse] = useState('');
  const [regClassBlock, setRegClassBlock] = useState('');
  const [isCustomBlock, setIsCustomBlock] = useState(false);
  const [customBlockInput, setCustomBlockInput] = useState('');
  const [regCompanyId, setRegCompanyId] = useState(companies[0]?.id || '');
  const [regDutyStart, setRegDutyStart] = useState('08:00');
  const [regDutyEnd, setRegDutyEnd] = useState('17:00');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await onLogin({ email: email.trim(), password, role: roleMode });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    if (roleMode === 'student' && !cleanEmail.endsWith('@bicol-u.edu.ph')) {
      setErrorMsg('Student accounts must use an official Bicol University email ending with @bicol-u.edu.ph. Other domains are rejected.');
      setIsLoading(false);
      return;
    }

    const assumedStudentId = roleMode === 'student'
      ? (regBuId.trim() || extractStudentIdFromEmail(cleanEmail))
      : (regBuId.trim() || 'FAC-2026-CS-004');

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

    try {
      await onRegister({
        fullName: regFullName,
        email: cleanEmail,
        password,
        role: roleMode,
        buId: assumedStudentId,
        department: regDepartment,
        classBlock: roleMode === 'student' ? effectiveBlock : undefined,
        companyId: roleMode === 'student' ? regCompanyId : undefined,
        dutyStart: regDutyStart,
        dutyEnd: regDutyEnd,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);

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
        onClose();
        return;
      } catch {
        try {
          await onRegister({
            fullName,
            email: enteredEmail,
            role: roleMode,
            buId: assumedId,
            department: regDepartment || 'Department of Computer Science',
            classBlock: roleMode === 'student' ? regClassBlock : undefined,
          });
          onClose();
          return;
        } catch (regErr: any) {
          setErrorMsg(regErr.message || 'Authentication failed');
          setIsLoading(false);
          return;
        }
      }
    }

    try {
      const res = await signInWithGoogle();
      if (res?.providerNotConfigured) {
        const cleanEmail = (email.trim() || regEmail.trim()).toLowerCase();
        if (!cleanEmail) {
          setErrorMsg('Please enter your institutional email to proceed.');
          setIsLoading(false);
          return;
        }
        const targetBuId = roleMode === 'coordinator' ? `FAC-2026-${Math.floor(100 + Math.random() * 900)}` : extractStudentIdFromEmail(cleanEmail);
        const resolvedName = regFullName.trim() || cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || (roleMode === 'coordinator' ? 'Practicum Coordinator' : 'Student Intern');
        await onRegister({
          fullName: resolvedName,
          email: cleanEmail,
          role: roleMode,
          buId: targetBuId,
          department: regDepartment.trim() || 'Department of Computer Science',
          classBlock: roleMode === 'student' ? regClassBlock : undefined,
        });
        onClose();
        return;
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google OAuth failed to initialize');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#020617] w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-200">
        {/* Header */}
        <div className="bg-[#020617] text-white p-5 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center">
            <FoldText
              text="InternTrack"
              foldStyle="paper"
              splitBy="char"
              hinge="top"
              trigger="mount"
              foldAngle={92}
              duration={0.65}
              stagger={0.045}
              staggerFrom="start"
              ease="power3.out"
              loopDelay={1.4}
              hoverRefold={true}
              refoldRadius={100}
              refoldAngle={45}
              perspective={700}
              creaseShading={0.55}
              fontSize="1.25rem"
              fontWeight={800}
            />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Role Mode Switcher */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          {/* Main Action Tabs */}
          <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => {
                setTab('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'login'
                  ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-[#F26522]" />
              Sign In
            </button>
            <button
              onClick={() => {
                setTab('register');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'register'
                  ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-[#F26522]" />
              New Registration
            </button>
          </div>

          {/* Account Mode: Coordinator vs Student */}
          <div className="space-y-1.5 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">
              Specify Account Mode ({tab === 'register' ? 'New Registration' : 'Sign In'}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRoleMode('student')}
                className={`p-2.5 rounded-lg font-bold transition-all active:scale-95 cursor-pointer text-left border flex items-start gap-2.5 ${
                  roleMode === 'student'
                    ? 'bg-[#FFF0E6] dark:bg-orange-950/40 text-[#D94B0A] dark:text-orange-300 border-[#F26522] shadow-2xs ring-1 ring-[#F26522]'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${roleMode === 'student' ? 'bg-[#F26522] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs">Student Intern</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 leading-snug">
                    Enrolling in Practicum & logging daily duty hours.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRoleMode('coordinator')}
                className={`p-2.5 rounded-lg font-bold transition-all active:scale-95 cursor-pointer text-left border flex items-start gap-2.5 ${
                  roleMode === 'coordinator'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0B2545] dark:text-blue-300 border-[#0B2545] dark:border-blue-500 shadow-2xs ring-1 ring-[#0B2545]'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${roleMode === 'coordinator' ? 'bg-[#0B2545] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs">Practicum Coordinator</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 leading-snug">
                    Supervises cohorts, approves enrollments & archives.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}


          {/* TAB 1: LOGIN */}
          {tab === 'login' && (
            <div className="space-y-3.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-2xs flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Or with credentials
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter you BU email"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full p-2.5 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-[#F26522]"
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
                className={`w-full py-3 rounded-lg font-bold text-white transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-2 ${
                  roleMode === 'coordinator'
                    ? 'bg-[#0B2545] hover:bg-[#134074]'
                    : 'bg-[#F26522] hover:bg-[#D94B0A]'
                }`}
              >
                <LogIn className="w-4 h-4" />
                {isLoading ? 'Signing in...' : `Sign In as ${roleMode === 'coordinator' ? 'Coordinator' : 'Student Intern'}`}
              </button>
            </form>
          </div>
          )}

          {/* TAB 2: REGISTER */}
          {tab === 'register' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-2xs flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Or register credentials
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Maria Clara B. Santos"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#F26522]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#F26522]"
                  />
                  {roleMode === 'student' && regEmail && !regEmail.toLowerCase().endsWith('@bicol-u.edu.ph') && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold">
                      * Must end with @bicol-u.edu.ph
                    </p>
                  )}
                </div>

                {roleMode === 'student' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assumed Student ID
                    </label>
                    <div className="p-2.5 bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900 dark:text-orange-200">
                        {extractStudentIdFromEmail(regEmail) || 'Pending @bicol-u.edu.ph email'}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Auto-assumed</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Faculty ID Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={regBuId}
                      onChange={(e) => setRegBuId(e.target.value)}
                      placeholder="FAC-2026-088"
                      className="w-full p-2.5 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#F26522]"
                    />
                  </div>
                )}
              </div>

              {roleMode === 'student' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-[#F26522] text-slate-900 dark:text-white font-medium"
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
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-[#F26522] text-slate-900 dark:text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
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
                  </div>

                  {(isCustomBlock || regCourse === 'OTHER') && (
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Specify Custom Block / Section *
                      </label>
                      <input
                        type="text"
                        required
                        value={customBlockInput}
                        onChange={(e) => setCustomBlockInput(e.target.value)}
                        placeholder="e.g. BSCS 4-Midyear or BSIT 4-Special"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-[#F26522]"
                      />
                    </div>
                  )}
                </div>
              )}

              {roleMode === 'coordinator' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Academic Department</label>
                  <input
                    type="text"
                    disabled
                    value="Department of Computer Science"
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set account password"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-lg font-bold text-white transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-2 ${
                  roleMode === 'coordinator'
                    ? 'bg-[#0B2545] hover:bg-[#134074]'
                    : 'bg-[#F26522] hover:bg-[#D94B0A]'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                {isLoading ? 'Registering...' : `Create ${roleMode === 'coordinator' ? 'Coordinator' : 'Student Intern'} Account`}
              </button>
            </form>
          </div>
          )}

          {currentUser && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Currently logged in as:</span>
                <div className="font-bold text-slate-900 dark:text-white">{currentUser.fullName} ({currentUser.role})</div>
              </div>
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold transition-all active:scale-95 cursor-pointer border border-red-200 dark:border-red-800 text-xs"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
