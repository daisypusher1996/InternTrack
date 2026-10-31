import React from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  UserPlus,
  Clock,
  FileText,
  Brain,
  Database,
  Award,
  Bell,
  Archive,
  User as UserIcon,
  LogIn,
  LogOut,
  Shield,
} from './icons';
import { User } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingAlertsCount: number;
  currentUser: User | null;
  onOpenAlerts: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingAlertsCount,
  currentUser,
  onOpenAlerts,
  onOpenAuth,
  onLogout,
}) => {
  const isCoordinator = currentUser?.role === 'coordinator';

  // Dynamic nav items based on user role
  const navItems = isCoordinator
    ? [
        { id: 'dashboard', label: 'Coordinator Dashboard', icon: LayoutDashboard },
        { id: 'enrollment', label: 'Enrollment & Deployment', icon: UserPlus },
        { id: 'archive', label: 'Record Archive & Batches', icon: Archive, badge: 'New' },
        { id: 'attendance', label: 'Time & Attendance', icon: Clock },
        { id: 'accomplishments', label: 'Daily Accomplishments', icon: FileText },
        { id: 'ai-analytics', label: 'AI Analytics & Alerts', icon: Brain, badge: 'AI' },
        { id: 'schema', label: 'PostgreSQL Schema', icon: Database },
        { id: 'iso25010', label: 'ISO 25010 Quality', icon: Award },
      ]
    : [
        { id: 'student-portal', label: 'My Student Portal & DTR', icon: GraduationCap },
        { id: 'accomplishments', label: 'Daily Accomplishments', icon: FileText },
        { id: 'iso25010', label: 'ISO 25010 Quality', icon: Award },
      ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Academic Sub-bar with Bicol University branding */}
      <div className="bg-[#0B2545] text-white px-4 lg:px-8 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-[#06182C]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F26522] text-white font-bold text-[11px] uppercase tracking-wider">
            Bicol University
          </span>
          <span className="text-slate-200 hidden sm:inline">
            College of Science • Department of Computer Science
          </span>
          <span className="text-slate-400 hidden md:inline">|</span>
          <span className="text-slate-300 hidden md:inline">
            RDE Agenda 5: Inclusive Education & Lifelong Learning (IELL)
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-300">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="bg-[#F26522]/20 text-[#FED7AA] px-1.5 py-0.5 rounded font-medium border border-[#F26522]/40">SDG 4</span>
            <span className="bg-[#1D4ED8]/30 text-blue-200 px-1.5 py-0.5 rounded font-medium border border-blue-400/30">SDG 8</span>
            <span className="bg-emerald-500/20 text-emerald-200 px-1.5 py-0.5 rounded font-medium border border-emerald-400/30">SDG 9</span>
          </div>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300 text-[11px] font-medium hidden sm:inline">
            Academic Year 2026–2027
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & System Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setActiveTab(isCoordinator ? 'dashboard' : 'student-portal')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#134074] p-0.5 shadow-md flex items-center justify-center border-2 border-[#F26522]">
              <div className="w-full h-full bg-[#0B2545] rounded-[9px] flex items-center justify-center text-[#F26522] font-black text-xl">
                BU
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-[#0B2545] tracking-tight">
                  Intern<span className="text-[#F26522]">Track</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#FFF0E6] text-[#D94B0A] border border-[#FED7AA]">
                  v2.5 Full-Stack
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-none">
                AI Practicum Monitoring & Progress Analytics
              </p>
            </div>
          </div>

          {/* Account Mode & User Bar */}
          <div className="flex items-center gap-3">
            {/* Logged In User Chip */}
            {currentUser ? (
              <div
                onClick={onOpenAuth}
                className="flex items-center gap-2.5 p-1.5 pr-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                title="Click to switch account or sign out"
              >
                {currentUser.avatarUrl && currentUser.avatarUrl.trim() !== '' ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-[#FED7AA]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#0B2545] text-white flex items-center justify-center font-bold text-xs">
                    {currentUser.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-slate-900 text-xs leading-none">
                    {currentUser.fullName.split(' ')[0]} {currentUser.fullName.split(' ').slice(-1)[0]}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                        currentUser.role === 'coordinator'
                          ? 'bg-[#0B2545] text-white'
                          : 'bg-[#F26522] text-white'
                      }`}
                    >
                      {currentUser.role}
                    </span>
                    {currentUser.classBlock && (
                      <span className="text-[10px] text-slate-500 font-semibold font-mono">
                        {currentUser.classBlock}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-2 rounded-xl bg-[#0B2545] text-white font-bold text-xs flex items-center gap-1.5 hover:bg-[#134074] transition"
              >
                <LogIn className="w-3.5 h-3.5 text-[#F26522]" />
                Sign In / Switch Mode
              </button>
            )}

            {/* Notification Bell */}
            <button
              onClick={onOpenAlerts}
              className="relative p-2 text-slate-600 hover:text-[#F26522] hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="View Attendance Anomaly Alerts"
            >
              <Bell className="w-5 h-5" />
              {pendingAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F26522] text-[10px] font-bold text-white shadow">
                  {pendingAlertsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Links Bar */}
        <div className="flex space-x-1 overflow-x-auto no-scrollbar border-t border-slate-100 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#FFF0E6] text-[#D94B0A] shadow-sm font-bold'
                    : 'text-slate-600 hover:text-[#0B2545] hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#F26522]' : 'text-slate-400'}`} />
                {item.label}
                {item.badge && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#F26522] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

