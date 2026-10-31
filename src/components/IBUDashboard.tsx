import React, { useState } from 'react';
import ShinyText from './ShinyText';
import {
  GraduationCap,
  ChevronRight,
  Search,
  ChevronDown,
  Layers,
  User as UserIcon,
  HelpCircle,
  ShieldCheck,
  Globe,
  MessageSquare,
  LifeBuoy,
  ExternalLink,
  Clock,
  FileText,
  Building2,
  Calendar,
  Archive,
  Brain,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  X,
  Send,
} from 'lucide-react';
import { User, Student, AttendanceLog, AccomplishmentReport, AttendanceAlert } from '../types';

interface IBUDashboardProps {
  currentUser: User;
  student?: Student | null;
  attendanceLogs?: AttendanceLog[];
  accomplishmentReports?: AccomplishmentReport[];
  alerts?: AttendanceAlert[];
  onNavigateToTab: (tab: string) => void;
  onOpenProfileSettings: () => void;
  onTimeIn?: () => void;
  onTimeOut?: () => void;
}

export const IBUDashboard: React.FC<IBUDashboardProps> = ({
  currentUser,
  student,
  attendanceLogs = [],
  accomplishmentReports = [],
  alerts = [],
  onNavigateToTab,
  onOpenProfileSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All categories');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Extract first name for exact "Welcome back, [FirstName]" greeting
  const firstName = currentUser.fullName.split(' ')[0] || 'Joshua';
  const isCoordinator = currentUser.role === 'coordinator';

  // Available service cards for practicum / iBU ecosystem
  const allServices = [
    {
      id: 'dtr-attendance',
      title: 'Time & Attendance DTR',
      category: 'Practicum & Internship',
      description: 'Record duty Time-In/Out punches, biometric workstation IP validation, and grace period monitoring.',
      icon: Clock,
      tab: 'attendance',
      badge: 'Active Service',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'daily-accomplishments',
      title: 'Daily Accomplishment Logger',
      category: 'Practicum & Internship',
      description: 'Submit technical task narratives, hours spent, and milestone reflections for weekly AI synthesis digests.',
      icon: FileText,
      tab: 'accomplishments',
      badge: 'Required Weekly',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'hte-enrollment',
      title: 'HTE Enrollment & Placement',
      category: 'Administrative',
      description: 'Accredited Host Training Establishment partner matching, duty windows, and coordinator endorsements.',
      icon: Building2,
      tab: 'enrollment',
      badge: 'Official MOA',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'calendar-visual',
      title: 'Interactive Attendance Calendar',
      category: 'Academic Records',
      description: 'Visual month timeline with daily status inspection, duty hours breakdown, and excuse filing.',
      icon: Calendar,
      tab: isCoordinator ? 'dashboard' : 'student-portal',
      badge: 'Calendar Visual',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'record-archive',
      title: 'Record Archive & Batch Clearance',
      category: 'Academic Records',
      description: 'Historical archives classified by School Year, Course & Block section, and DTR clearance registries.',
      icon: Archive,
      tab: 'archive',
      badge: 'Permanent File',
      badgeColor: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
    },
    {
      id: 'ai-analytics',
      title: 'AI Anomaly Detector & Digest',
      category: 'Practicum & Internship',
      description: 'Isolation forest attendance anomaly detector and automated weekly executive synthesis.',
      icon: Brain,
      tab: 'ai-analytics',
      badge: 'Decision Support',
      badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    },
  ];

  const categories = [
    'All categories',
    'Practicum & Internship',
    'Academic Records',
    'Administrative',
  ];

  const filteredServices = allServices.filter((svc) => {
    const matchesSearch =
      svc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      svc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All categories' || svc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto py-2">
      {/* 1. HERO GREETING (Exact replication of top greeting) */}
      <div className="border-b border-[#141d2e] pb-6 space-y-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center flex-wrap gap-2.5">
          <ShinyText
            text="Welcome back,"
            color="#b5b5b5"
            shineColor="#ffffff"
            speed={2}
            shineWidth={40}
            softness={0.8}
            trigger="loop"
          />
          <ShinyText
            text={firstName}
            color="#3B82F6"
            shineColor="#ffffff"
            speed={2}
            shineWidth={40}
            softness={0.8}
            trigger="loop"
          />
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Access your assigned university services and account tools in one place.
        </p>
      </div>

      {/* 2. TWO-COLUMN MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= LEFT / CENTER COLUMN (~68% width) ================= */}
        <div className="lg:col-span-8 space-y-8">
          {/* A. Your main service */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-bold text-white">Your main service</h2>
              <p className="text-xs text-slate-400">
                Your highlighted module is available for faster access.
              </p>
            </div>

            {/* Main Featured Highlighted Card (Exact match to screenshot) */}
            <div
              onClick={() => onNavigateToTab(isCoordinator ? 'dashboard' : 'student-portal')}
              className="bg-[#0c1421] border border-[#1e293b] rounded-2xl p-6 hover:border-slate-700 transition-all duration-200 cursor-pointer group shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-5 sm:gap-6 min-w-0">
                  {/* Large Icon Squircle on the Left */}
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-[#111c2e] border border-cyan-500/20 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 group-hover:border-cyan-400/40 transition-all">
                    <GraduationCap className="w-10 h-10 sm:w-11 sm:h-11 text-[#00c2cb] stroke-[1.5]" />
                  </div>

                  {/* Highlight Details */}
                  <div className="space-y-1.5 min-w-0">
                    {/* Green dot badge: ● STUDENT SERVICES */}
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-md bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider">
                        {isCoordinator ? 'COORDINATOR DIRECTORATE' : 'STUDENT SERVICES'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                      {isCoordinator ? 'Coordinator Dashboard' : 'Student Portal'}
                    </h3>

                    {/* Subtitle / Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {isCoordinator
                        ? 'Monitor active course/blocks, verify time-ins/outs, approve enrollments, and archive finished interns.'
                        : 'View your payments, records, and evaluate faculties • Monitor duty DTR, daily logs, and remaining hours.'}
                    </p>

                    {/* Action Link with blue hover */}
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#38bdf8] group-hover:text-cyan-300 group-hover:underline">
                        <span>Go to {isCoordinator ? 'Coordinator Dashboard' : 'Student Portal'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Arrow Icon */}
                <div className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 hidden sm:block">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* B. All services */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">All services</h2>
              <p className="text-xs text-slate-400">
                Access all services available to your account.
              </p>
            </div>

            {/* Search Services & Category Dropdown Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input with magnifying glass */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services..."
                  className="w-full bg-[#0c1421] border border-[#1e293b] text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full sm:w-48 bg-[#0c1421] border border-[#1e293b] text-white rounded-lg px-4 py-2.5 text-xs flex items-center justify-between gap-2 hover:border-slate-700 transition cursor-pointer"
                >
                  <span className="truncate">{selectedCategory}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-[#0c1421] border border-[#1e293b] rounded-lg shadow-2xl p-1.5 z-30 text-xs text-slate-300 space-y-0.5 animate-in fade-in zoom-in-95">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Services Listing or Empty State Dashed Card */}
            {filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredServices.map((svc) => {
                  const Icon = svc.icon;
                  return (
                    <div
                      key={svc.id}
                      onClick={() => onNavigateToTab(svc.tab)}
                      className="bg-[#0c1421] border border-[#1e293b] rounded-2xl p-4 hover:border-slate-700 hover:bg-[#0f1929] transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="p-2 rounded-lg bg-[#111c2e] text-cyan-400 border border-slate-800">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${svc.badgeColor}`}
                          >
                            {svc.badge}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
                          {svc.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {svc.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                        <span>{svc.category}</span>
                        <span className="text-cyan-400 font-semibold group-hover:underline flex items-center gap-1">
                          Open <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Dashed "No other services available" container exactly as in screenshot */
              <div className="border border-dashed border-[#1e293b] bg-[#0c1421]/40 rounded-2xl p-10 text-center space-y-2">
                <div className="text-sm font-bold text-white">No other services available</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Additional services will appear here once they are assigned to your account.
                </p>
              </div>
            )}

            {/* More features coming soon Card (Exact match to screenshot) */}
            <div className="border border-dashed border-[#1e293b] bg-[#0c1421]/60 rounded-2xl p-5 max-w-sm space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#131d2e] border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white leading-snug">
                    More features coming soon
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Additional services and shortcuts will appear here as more tools become available in iBU.
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">Coming soon</div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (~32% width) ================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Quick actions */}
          <div className="bg-[#0c1421] border border-[#1e293b] rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Quick actions</h3>
              <p className="text-xs text-slate-400">Common account links and support tools.</p>
            </div>

            <div className="space-y-3">
              {/* Item 1: Update Profile */}
              <div
                onClick={onOpenProfileSettings}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-md bg-[#132238] text-cyan-400 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                    Update Profile
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Keep your account and contact details current.
                  </p>
                </div>
              </div>

              {/* Item 2: FAQ's */}
              <div
                onClick={() => setShowFaqModal(true)}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-md bg-[#132238] text-cyan-400 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                    FAQ's
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Review common questions and helpful guides about the system.
                  </p>
                </div>
              </div>

              {/* Item 3: University Accounts */}
              <div
                onClick={() => setShowAccountsModal(true)}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-md bg-[#132238] text-cyan-400 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                    University Accounts
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Manage your official university email, Eduroam access, and library QR.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Announcements */}
          <div className="bg-[#0c1421] border border-[#1e293b] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Announcements</h3>

            <div className="space-y-3.5 text-xs">
              {/* Item 1: WEBSITE Bicol University */}
              <a
                href="https://bicol-u.edu.ph"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-md bg-[#132238] text-cyan-400 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
                    WEBSITE
                  </span>
                  <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Bicol University
                  </span>
                </div>
              </a>

              {/* Item 2: FACEBOOK Bicol University */}
              <a
                href="https://facebook.com/BicolUniversity"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-md bg-[#132238] text-cyan-400 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
                    FACEBOOK
                  </span>
                  <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Bicol University
                  </span>
                </div>
              </a>

              {/* Item 3: FACEBOOK The Bicol Universitarian */}
              <a
                href="https://facebook.com/TheBicolUniversitarian"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-md bg-[#132238] text-cyan-400 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
                    FACEBOOK
                  </span>
                  <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                    The Bicol Universitarian
                  </span>
                </div>
              </a>

              {/* Item 4: FACEBOOK Bicol University ICTO */}
              <a
                href="https://facebook.com/BUICTO"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-md bg-[#132238] text-cyan-400 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
                    FACEBOOK
                  </span>
                  <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Bicol University ICTO
                  </span>
                </div>
              </a>
            </div>
          </div>

          {/* Card 3: Need help? */}
          <div className="bg-[#0c1421] border border-[#1e293b] rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#132238] text-cyan-400 flex items-center justify-center shrink-0">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Need help?</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Contact support if a service does not appear as expected.
            </p>

            <button
              onClick={() => setShowSupportModal(true)}
              className="w-full bg-transparent hover:bg-white/5 border border-[#1e293b] text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open support</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: FAQ'S MODAL */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#0c1421] border border-[#1e293b] rounded-2xl max-w-lg w-full p-6 text-white space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-base">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <span>Frequently Asked Questions (FAQ)</span>
              </div>
              <button
                onClick={() => setShowFaqModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-[#111c2e] rounded-lg border border-slate-800 space-y-1">
                <strong className="text-white block font-bold">
                  What is the iBU Integrated Information System?
                </strong>
                <p className="text-slate-400 leading-relaxed">
                  iBU is Bicol University's unified portal providing single sign-on access to academic records, practicum/internship tracking, DTR duty consoles, and health clearances.
                </p>
              </div>

              <div className="p-3 bg-[#111c2e] rounded-lg border border-slate-800 space-y-1">
                <strong className="text-white block font-bold">
                  Why does my Student Portal show "Enrollment Pending Approval"?
                </strong>
                <p className="text-slate-400 leading-relaxed">
                  In compliance with Bicol University Student Internship Program regulations, freshly created student accounts must submit their Host Training Establishment (HTE) parameters for Practicum Coordinator endorsement before duty time-in punches unlock.
                </p>
              </div>

              <div className="p-3 bg-[#111c2e] rounded-lg border border-slate-800 space-y-1">
                <strong className="text-white block font-bold">
                  How does the 15-minute attendance grace period work?
                </strong>
                <p className="text-slate-400 leading-relaxed">
                  Students may clock in up to 15 minutes past their scheduled shift start without triggering an attendance anomaly alert. Beyond 15 minutes, an automated excuse slip filing is required.
                </p>
              </div>

              <div className="p-3 bg-[#111c2e] rounded-lg border border-slate-800 space-y-1">
                <strong className="text-white block font-bold">
                  When are Accomplishment Reports due?
                </strong>
                <p className="text-slate-400 leading-relaxed">
                  Students file daily task narratives which are compiled into weekly practicum synthesis digests for coordinator grading and clearance.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowFaqModal(false)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-[#070d18] font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Close FAQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UNIVERSITY ACCOUNTS MODAL */}
      {showAccountsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#0c1421] border border-[#1e293b] rounded-2xl max-w-md w-full p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>University Accounts</span>
              </div>
              <button
                onClick={() => setShowAccountsModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-[#111c2e] rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Institutional Google Workspace</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    Active
                  </span>
                </div>
                <div className="text-[11px] font-mono text-cyan-300">{currentUser.email}</div>
                <p className="text-[11px] text-slate-400">
                  Used for iBU login, Google Drive submissions, and practicum correspondence.
                </p>
              </div>

              <div className="p-3 bg-[#111c2e] rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Eduroam Campus WiFi</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                    Configured
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-300">{currentUser.buId}@bicol-u.edu.ph</div>
                <p className="text-[11px] text-slate-400">
                  High-speed academic roaming across all Bicol University campuses.
                </p>
              </div>

              <div className="p-3 bg-[#111c2e] rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Digital Library Pass (RFID/QR)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                    Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Barcode: {currentUser.buId} • Valid for College of Science Library.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAccountsModal(false)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-[#070d18] font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NEED HELP / SUPPORT MODAL */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#0c1421] border border-[#1e293b] rounded-2xl max-w-md w-full p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-base">
                <LifeBuoy className="w-5 h-5 text-cyan-400" />
                <span>Bicol University Help & Support</span>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="text-slate-400">
                Need assistance with your Student Internship endorsement, account credentials, or attendance logs? Reach out to the authorized university offices:
              </p>

              <div className="p-3 bg-[#111c2e] rounded-lg border border-slate-800 space-y-1">
                <strong className="text-white block font-bold">BU ICTO Helpdesk</strong>
                <div className="text-[11px] text-cyan-300 font-mono">icto-support@bicol-u.edu.ph</div>
                <div className="text-[10px] text-slate-400">For portal login and system technical concerns</div>
              </div>

              <div className="p-3 bg-[#111c2e] rounded-lg border border-slate-800 space-y-1">
                <strong className="text-white block font-bold">CS Practicum Directorate</strong>
                <div className="text-[11px] text-cyan-300 font-mono">practicum@bicol-u.edu.ph</div>
                <div className="text-[10px] text-slate-400">Department of Computer Science • College of Science</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  window.open('mailto:practicum@bicol-u.edu.ph?subject=iBU Practicum Assistance Inquiry');
                  setShowSupportModal(false);
                }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-[#070d18] font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Contact Coordinator</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
