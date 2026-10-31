import React from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  UserPlus,
  Clock,
  FileText,
  Brain,
  Archive,
  Bell,
  X,
} from './icons';
import { User } from '../types';
import { ThemeToggle } from './ThemeToggle';
import FoldText from './FoldText';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingAlertsCount: number;
  currentUser: User | null;
  onOpenAlerts: () => void;
  onOpenAuth: () => void;
  onOpenProfileSettings?: () => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingAlertsCount,
  currentUser,
  onOpenAlerts,
  onOpenAuth,
  onOpenProfileSettings,
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const isCoordinator = currentUser?.role === 'coordinator';

  // Navigation Items
  const navItems = isCoordinator
    ? [
        { id: 'archive', label: 'Record Archive', icon: Archive, badge: 'Batches' },
        { id: 'enrollment', label: 'Enrollment & Deployment', icon: UserPlus },
        { id: 'attendance', label: 'Time & Attendance DTR', icon: Clock },
        { id: 'accomplishments', label: 'Daily Accomplishments', icon: FileText },
        { id: 'ai-analytics', label: 'AI Analytics & Alerts', icon: Brain, badge: 'AI' },
      ]
    : [
        { id: 'student-portal', label: 'My Student Portal & DTR', icon: GraduationCap },
        { id: 'accomplishments', label: 'Daily Accomplishments', icon: FileText },
      ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Drawer Backdrop when side menu is opened */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 backdrop-blur-xs transition-opacity duration-200"
        />
      )}

      {/* Slide-out Sidebar Drawer (shown when not displayed fully, and in mobile mode) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#020617] text-white flex flex-col justify-between border-r border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Top Brand Header without BU Logo */}
          <div className="p-5 border-b border-slate-800 bg-[#01040f]/90 flex items-center justify-between">
            <button
              type="button"
              className="cursor-pointer select-none text-left bg-transparent border-none p-0 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#F26522] rounded-md"
              onClick={() => handleNavClick(isCoordinator ? 'dashboard' : 'student-portal')}
              aria-label="InternTrack - Return to Dashboard"
              title="Return to Dashboard"
            >
              <FoldText
                text="InternTrack"
                foldStyle="paper"
                splitBy="char"
                hinge="top"
                trigger="scroll"
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
            </button>

            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
              aria-label="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 space-y-1 text-xs">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Navigation Modules
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all duration-150 text-left active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-[#F26522] text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-[#020617] text-white'
                          : 'bg-[#F26522] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer with Theme Toggle & Researchers */}
        <div className="p-4 border-t border-slate-800 bg-[#01040f]/90 text-[10px] text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold">Appearance:</span>
            <ThemeToggle showLabel={true} />
          </div>
          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
            <div><strong>Researchers:</strong> H. Camacho • J. Ecat • J. Narito (BSCS)</div>
          </div>
        </div>
      </aside>
    </>
  );
};
