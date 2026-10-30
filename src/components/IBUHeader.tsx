import React, { useState } from 'react';
import {
  ChevronDown,
  Moon,
  Sun,
  LayoutGrid,
  User as UserIcon,
  LogOut,
  Building2,
  ExternalLink,
  Shield,
  HelpCircle,
  Calendar,
  HeartPulse,
  GraduationCap,
  Clock,
  FileText,
  Archive,
  Brain,
  Check,
} from 'lucide-react';
import { User } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface IBUHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onOpenProfileSettings: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenFaq?: () => void;
  onOpenSupport?: () => void;
}

export const IBUHeader: React.FC<IBUHeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenProfileSettings,
  onOpenAuth,
  onLogout,
  onOpenFaq,
  onOpenSupport,
}) => {
  const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);

  const isCoordinator = currentUser?.role === 'coordinator';

  return (
    <header className="sticky top-0 z-40 bg-[#070d18] border-b border-[#141d2e] select-none">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: iBU Logo & University Nav Items */}
          <div className="flex items-center gap-6 lg:gap-8">
            {/* iBU Logo */}
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-0.5 group cursor-pointer active:scale-95 transition-transform"
              title="iBU Integrated Information System"
            >
              {/* Stylized 'i' with cyan sparkle */}
              <div className="relative flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#00c2cb] tracking-tight font-sans">
                  i
                </span>
                {/* Sparkle icon at top right of 'i' */}
                <span className="absolute -top-1 -right-1 text-[#00c2cb] text-[10px] animate-pulse">
                  ✦
                </span>
              </div>
              {/* Bold 'BU' in pure white */}
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
                BU
              </span>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 text-xs font-semibold">
              {/* Home */}
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'home'
                    ? 'bg-[#162032] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Home
              </button>

              {/* Events */}
              <button
                onClick={() => setActiveTab('events')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'events'
                    ? 'bg-[#162032] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Events
              </button>

              {/* Admission dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsAdmissionOpen(!isAdmissionOpen);
                    setIsHealthOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Admission</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {isAdmissionOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-[#0c1421] border border-[#1e293b] rounded-xl shadow-2xl p-2 z-50 text-xs text-slate-300 space-y-1 animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Admissions & Enrollment
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('enrollment');
                        setIsAdmissionOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      <span>Practicum HTE Placement</span>
                    </button>
                    <a
                      href="https://bicol-u.edu.ph"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-slate-300 flex items-center justify-between"
                    >
                      <span>University Admissions</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  </div>
                )}
              </div>

              {/* Health Services dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsHealthOpen(!isHealthOpen);
                    setIsAdmissionOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Health Services</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {isHealthOpen && (
                  <div className="absolute top-full left-0 mt-2 w-60 bg-[#0c1421] border border-[#1e293b] rounded-xl shadow-2xl p-2 z-50 text-xs text-slate-300 space-y-1 animate-in fade-in zoom-in-95">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      University Medical & Student Internship Clearance
                    </div>
                    <div className="p-2.5 bg-[#121c2c] rounded-lg border border-slate-800 text-[11px] space-y-1">
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Fit-To-Work Student Internship Medical</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">
                        Medical & psychological clearances are verified before HTE deployment.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Student Portal / Practicum Portal */}
              <button
                onClick={() => setActiveTab(isCoordinator ? 'dashboard' : 'student-portal')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'student-portal' || activeTab === 'dashboard'
                    ? 'bg-[#162032] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{isCoordinator ? 'Coordinator Directorate' : 'Student Portal'}</span>
              </button>

              {/* FAQ */}
              <button
                onClick={() => {
                  if (onOpenFaq) onOpenFaq();
                  else setActiveTab('faq');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'faq'
                    ? 'bg-[#162032] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                FAQ
              </button>
            </nav>
          </div>

          {/* Right: Theme Toggle, App Launcher, User Avatar with Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Moon Toggle */}
            <ThemeToggle showLabel={false} />

            {/* App Grid Launcher (Fast access to all sub-services) */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsAppLauncherOpen(!isAppLauncherOpen);
                  setIsUserMenuOpen(false);
                }}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all active:scale-90 cursor-pointer"
                title="iBU Integrated Services"
                aria-label="App Launcher"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              {isAppLauncherOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#0c1421] border border-[#1e293b] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>iBU University Services</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Bicol University</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => {
                        setActiveTab('home');
                        setIsAppLauncherOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-[#111c2e] hover:bg-[#16243b] text-left transition text-white border border-slate-800/80 cursor-pointer"
                    >
                      <div className="font-bold text-xs">iBU Hub Home</div>
                      <div className="text-[10px] text-slate-400">Overview & actions</div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab(isCoordinator ? 'dashboard' : 'student-portal');
                        setIsAppLauncherOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-[#111c2e] hover:bg-[#16243b] text-left transition text-white border border-slate-800/80 cursor-pointer"
                    >
                      <div className="font-bold text-xs">
                        {isCoordinator ? 'Coordinator Hub' : 'Student Portal'}
                      </div>
                      <div className="text-[10px] text-slate-400">DTR & Practicum</div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('attendance');
                        setIsAppLauncherOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-[#111c2e] hover:bg-[#16243b] text-left transition text-white border border-slate-800/80 cursor-pointer"
                    >
                      <div className="font-bold text-xs">Attendance DTR</div>
                      <div className="text-[10px] text-slate-400">Time-In/Out Console</div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('accomplishments');
                        setIsAppLauncherOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-[#111c2e] hover:bg-[#16243b] text-left transition text-white border border-slate-800/80 cursor-pointer"
                    >
                      <div className="font-bold text-xs">Accomplishments</div>
                      <div className="text-[10px] text-slate-400">Daily duty reports</div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('archive');
                        setIsAppLauncherOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-[#111c2e] hover:bg-[#16243b] text-left transition text-white border border-slate-800/80 cursor-pointer"
                    >
                      <div className="font-bold text-xs">Record Archive</div>
                      <div className="text-[10px] text-slate-400">Batches & clearance</div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('ai-analytics');
                        setIsAppLauncherOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-[#111c2e] hover:bg-[#16243b] text-left transition text-white border border-slate-800/80 cursor-pointer"
                    >
                      <div className="font-bold text-xs">AI Anomaly AI</div>
                      <div className="text-[10px] text-slate-400">Decision support</div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar with downward chevron exactly as in screenshot */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                  setIsAppLauncherOpen(false);
                }}
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-white/5 active:scale-95 transition-all cursor-pointer group"
                aria-label="User Account Menu"
              >
                {/* Rounded avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-slate-700 group-hover:ring-cyan-400 transition-all shadow-xs">
                  {currentUser?.avatarUrl && currentUser.avatarUrl.trim() !== '' ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1e293b] flex items-center justify-center text-xs font-bold text-white">
                      {currentUser?.fullName ? currentUser.fullName.slice(0, 1) : 'U'}
                    </div>
                  )}
                </div>
                {/* Small chevron */}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#0c1421] border border-[#1e293b] rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-800 mb-2">
                    <div className="font-bold text-white truncate text-sm">
                      {currentUser ? currentUser.fullName : 'Guest Session'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {currentUser?.email || 'Not logged in'}
                    </div>
                    <div className="mt-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {currentUser?.role === 'coordinator' ? 'Coordinator' : 'Student Intern'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        onOpenProfileSettings();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-slate-200 hover:bg-white/10 hover:text-white flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-cyan-400" />
                      <span>Update Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenAuth();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-slate-200 hover:bg-white/10 hover:text-white flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span>Switch Account Mode</span>
                    </button>

                    <button
                      onClick={() => {
                        onLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
