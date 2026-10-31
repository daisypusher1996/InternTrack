import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  GraduationCap,
  Save,
  Check,
  Building2,
  Mail,
  Fingerprint,
  Award,
} from './icons';
import { User } from '../types';
import gamerIcon from '../public/gamer.png';
import womanIcon from '../public/woman.png';
import dogIcon from '../public/dog.png';
import catIcon from '../public/cat.png';

const PRESET_AVATARS = [
  { id: 'gamer', label: 'Gamer', src: gamerIcon, path: '/gamer.png' },
  { id: 'woman', label: 'Woman', src: womanIcon, path: '/woman.png' },
  { id: 'dog', label: 'Dog', src: dogIcon, path: '/dog.png' },
  { id: 'cat', label: 'Cat', src: catIcon, path: '/cat.png' },
];

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateProfile: (updatedData: {
    fullName: string;
    avatarUrl: string;
    newPassword?: string;
  }) => Promise<void>;
}



// Lightweight web audio synthesizer for satisfying tactile click & celebration chimes
const playFeedbackSound = (type: 'pop' | 'success' | 'tab' | 'toggle') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'tab') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'toggle') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.05);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'success') {
      // Pleasant triad chord
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.12, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.25);
      });
    }
  } catch {
    // Graceful fallback if audio context blocked by browser
  }
};

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Form states
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [avatarUrl, setAvatarUrl] = useState(() => {
    const cleanEmail = currentUser.email?.toLowerCase().trim();
    const stored = (cleanEmail && localStorage.getItem(`interntrack_avatar_${cleanEmail}`)) ||
      (currentUser.id && localStorage.getItem(`interntrack_avatar_${currentUser.id}`));
    return currentUser.avatarUrl || stored || '';
  });
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Interaction feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [avatarAnimationKey, setAvatarAnimationKey] = useState(0);

  // Sync state whenever currentUser changes
  useEffect(() => {
    setFullName(currentUser.fullName);
    const cleanEmail = currentUser.email?.toLowerCase().trim();
    const stored = (cleanEmail && localStorage.getItem(`interntrack_avatar_${cleanEmail}`)) ||
      (currentUser.id && localStorage.getItem(`interntrack_avatar_${currentUser.id}`));
    setAvatarUrl(currentUser.avatarUrl || stored || '');
  }, [currentUser]);

  const handleSelectPreset = (presetPath: string) => {
    playFeedbackSound('pop');
    setAvatarUrl(presetPath);
    setAvatarAnimationKey((prev) => prev + 1);
  };

  const handleResetToBlank = () => {
    playFeedbackSound('pop');
    setAvatarUrl('');
    setCustomUrlInput('');
    setShowUrlField(false);
  };

  // Password strength calculator
  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200 dark:bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong & Secure', color: 'bg-emerald-500' };
  };

  const passwordStrength = calculateStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorFeedback(null);
    setSuccessFeedback(null);

    if (!fullName.trim()) {
      setErrorFeedback('Display name cannot be empty');
      return;
    }

    if (activeTab === 'password') {
      if (newPassword.length > 0 && newPassword.length < 6) {
        setErrorFeedback('New password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorFeedback('New password and confirmation do not match');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const cleanEmail = currentUser.email?.toLowerCase().trim();
      if (avatarUrl && avatarUrl.trim()) {
        if (cleanEmail) localStorage.setItem(`interntrack_avatar_${cleanEmail}`, avatarUrl.trim());
        if (currentUser.id) localStorage.setItem(`interntrack_avatar_${currentUser.id}`, avatarUrl.trim());
      } else {
        if (cleanEmail) localStorage.removeItem(`interntrack_avatar_${cleanEmail}`);
        if (currentUser.id) localStorage.removeItem(`interntrack_avatar_${currentUser.id}`);
      }

      await onUpdateProfile({
        fullName: fullName.trim(),
        avatarUrl,
        newPassword: newPassword ? newPassword : undefined,
      });

      playFeedbackSound('success');
      setSuccessFeedback('Profile & security credentials updated successfully!');
      setTimeout(() => {
        setSuccessFeedback(null);
        if (activeTab === 'password') {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
      }, 3000);
    } catch (err: any) {
      setErrorFeedback(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Dialog Card */}
      <div className="bg-white dark:bg-[#020617] w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-all duration-300 scale-100">
        {/* Modal Top Header with Dark Blue-Black Background */}
        <div className="bg-[#020617] text-white p-5 px-6 flex items-center justify-between border-b border-slate-800/80 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 bg-[radial-gradient(#F26522_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F26522] to-amber-600 flex items-center justify-center shadow-md ring-2 ring-white/10 active:scale-90 transition-transform duration-150">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight text-white">
                  User Profile & Account Settings
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    currentUser.role === 'coordinator'
                      ? 'bg-[#F26522] text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                  }`}
                >
                  {currentUser.role === 'coordinator' ? 'Coordinator' : 'Student Intern'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>{currentUser.buId}</span>
                <span>•</span>
                <span>{currentUser.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playFeedbackSound('pop');
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90 active:rotate-12 relative z-10 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Animated Sub-Tabs with Tactile Micro-Interactions */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-[#030914] border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-2xl w-full sm:w-auto border border-slate-300/50 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                playFeedbackSound('tab');
                setActiveTab('profile');
                setErrorFeedback(null);
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-[#020617] text-[#020617] dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 text-[#F26522]" />
              <span>Identity & Avatar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playFeedbackSound('tab');
                setActiveTab('password');
                setErrorFeedback(null);
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                activeTab === 'password'
                  ? 'bg-white dark:bg-[#020617] text-[#F26522] dark:text-orange-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-[#F26522]" />
              <span>Password & Security</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Encrypted Direct Sync</span>
          </div>
        </div>

        {/* Feedback Alerts */}
        <div className="px-6 pt-3 empty:hidden">
          {successFeedback && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 shadow-xs animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce" />
              <span>{successFeedback}</span>
            </div>
          )}

          {errorFeedback && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-2xl text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2.5 shadow-xs animate-in zoom-in-95 duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorFeedback}</span>
            </div>
          )}
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* TAB 1: General Info & Profile Image */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Profile Image & Avatar Section */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#030914] rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Live Avatar Preview with Ring Animation & Blank Silhouette Default */}
                  <div className="relative group shrink-0 mx-auto sm:mx-0">
                    <div
                      key={avatarAnimationKey}
                      onClick={() => {
                        playFeedbackSound('pop');
                        setAvatarAnimationKey((k) => k + 1);
                      }}
                      title="Click avatar to bounce preview"
                      className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-[#F26522]/40 p-0.5 bg-gradient-to-tr from-[#F26522] to-amber-400 shadow-md animate-in zoom-in-90 duration-200 cursor-pointer active:scale-90 active:rotate-6 transition-all"
                    >
                      {avatarUrl && avatarUrl.trim() !== '' ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover rounded-[14px]"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-200 dark:bg-slate-800 rounded-[14px] flex items-center justify-center">
                          <UserIcon className="w-10 h-10 text-slate-500 dark:text-slate-400 stroke-[1.5]" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-center sm:text-left flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h4 className="font-black text-slate-900 dark:text-white text-sm">
                        Profile Image & Portrait
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold border border-slate-300 dark:border-slate-700">
                        {avatarUrl ? 'Avatar Icon Active' : 'Blank Genderless Icon'}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                      Choose an avatar icon from the presets below to personalize your account profile. Your selected avatar will be retained across your entire session.
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          playFeedbackSound('toggle');
                          setShowUrlField(!showUrlField);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 transition-all duration-150 active:scale-95 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-[#F26522]" />
                        <span>{showUrlField ? 'Hide URL Input' : 'Use Web URL'}</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleResetToBlank}
                          className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 font-bold border border-red-200 dark:border-red-800/60 transition-all duration-150 active:scale-95 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <X className="w-3 h-3 text-red-500" />
                          <span>Reset to Blank Icon</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Choosable Preset Avatar Icons */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Choose Preset Avatar Icon:
                    </label>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Select an icon below and click Save Changes to apply
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5 max-w-sm sm:max-w-md">
                    {PRESET_AVATARS.map((preset) => {
                      const isSelected =
                        avatarUrl === preset.path ||
                        avatarUrl === preset.src ||
                        avatarUrl.toLowerCase().includes(preset.id);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          title={preset.label}
                          onClick={() => handleSelectPreset(preset.path)}
                          className={`group relative p-2 rounded-2xl border-2 transition-all duration-150 flex items-center justify-center cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'border-[#F26522] bg-orange-50/60 dark:bg-orange-950/30 shadow-md ring-2 ring-[#F26522]/30'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-1">
                            <img
                              src={preset.src}
                              alt="Avatar"
                              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                            />
                          </div>
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F26522] text-white rounded-full flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Custom URL Input */}
                {showUrlField && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 animate-in fade-in duration-150">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      Custom Photo Web URL:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://example.com/my-photo.jpg"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        className="flex-1 p-2.5 bg-white dark:bg-[#020617] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono dark:text-white focus:ring-1 focus:ring-[#F26522]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customUrlInput) {
                            playFeedbackSound('pop');
                            setAvatarUrl(customUrlInput);
                            setAvatarAnimationKey((prev) => prev + 1);
                          }
                        }}
                        className="px-3.5 py-2.5 bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold rounded-xl active:scale-90 active:rotate-2 transition-transform duration-150 shadow-xs cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Display Name Input */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Display Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Juan P. Dela Cruz"
                    className="w-full p-3 bg-slate-50 dark:bg-[#030914] border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-[#F26522] focus:border-[#F26522] transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                    Official Name
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Reflected on your DTR punches, accomplishment logs, and coordinator evaluation summaries.
                </p>
              </div>

              {/* Institutional Read-Only Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-[#030914] rounded-2xl border border-slate-200 dark:border-slate-800/80">
                <div className="space-y-0.5">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-extrabold flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#F26522]" /> Institutional Email:
                  </span>
                  <strong className="text-slate-900 dark:text-white font-mono text-xs">
                    {currentUser.email}
                  </strong>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-extrabold flex items-center gap-1">
                    <Fingerprint className="w-3 h-3 text-[#F26522]" />{' '}
                    {currentUser.role === 'coordinator' ? 'Faculty ID Number:' : 'Student ID Number:'}
                  </span>
                  <strong className="text-slate-900 dark:text-white font-mono text-xs">
                    {currentUser.buId}
                  </strong>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-extrabold flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#F26522]" /> Academic Department:
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                    {currentUser.department}
                  </span>
                </div>

                {currentUser.classBlock && (
                  <div className="space-y-0.5">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-extrabold flex items-center gap-1">
                      <Award className="w-3 h-3 text-[#F26522]" /> Class Block Section:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono font-semibold text-xs">
                      {currentUser.classBlock}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Password & Security */}
          {activeTab === 'password' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 font-bold text-[#020617] dark:text-blue-300">
                  <ShieldCheck className="w-4 h-4 text-[#F26522]" />
                  <span>University Credential Security Protocol</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Update your institutional password. Use at least 6 characters including a blend of letters, numbers, and symbols to ensure robust data security.
                </p>
              </div>

              {/* Current Password Field */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password for verification"
                    className="w-full p-3 bg-slate-50 dark:bg-[#030914] border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playFeedbackSound('toggle');
                      setShowCurrentPass(!showCurrentPass);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-75 active:rotate-12 transition-all p-1 cursor-pointer"
                    title={showCurrentPass ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (minimum 6 characters)"
                    className="w-full p-3 bg-slate-50 dark:bg-[#030914] border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playFeedbackSound('toggle');
                      setShowNewPass(!showNewPass);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-75 active:rotate-12 transition-all p-1 cursor-pointer"
                    title={showNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="pt-2 space-y-1 animate-in fade-in">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-500 dark:text-slate-400">Security Strength:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-mono">
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full p-3 bg-slate-50 dark:bg-[#030914] border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playFeedbackSound('toggle');
                      setShowConfirmPass(!showConfirmPass);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-75 active:rotate-12 transition-all p-1 cursor-pointer"
                    title={showConfirmPass ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Bottom Actions with Animated Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                playFeedbackSound('pop');
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 active:scale-95 active:rotate-[-1deg] cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#F26522] hover:bg-[#D94B0A] text-white font-black transition-all duration-150 active:scale-90 active:rotate-1 shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
