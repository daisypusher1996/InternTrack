import React, { useState, useEffect } from 'react';
import { User as UserIcon, Save, Fingerprint } from 'lucide-react';
import {
  BauhausLock,
  BauhausCheckCircle,
  BauhausAlertCircle,
  BauhausEye,
  BauhausEyeOff,
  BauhausRotateCw,
  BauhausArrowLeft,
  BauhausMail,
  BauhausBuilding2,
  BauhausAward,
  BauhausShield,
  BauhausGraduationCap,
  BauhausCheck,
} from './BauhausIcon';
import { User, Student } from '../types';
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

interface ProfileSettingsViewProps {
  currentUser: User;
  loggedInStudent?: Student | null;
  onUpdateProfile: (updatedData: {
    fullName: string;
    avatarUrl: string;
    newPassword?: string;
  }) => Promise<void>;
  onCancelEnrollment?: (studentId: string) => Promise<void>;
  onBack: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  currentUser,
  loggedInStudent,
  onUpdateProfile,
  onCancelEnrollment,
  onBack,
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

  // Sync state whenever currentUser changes
  useEffect(() => {
    setFullName(currentUser.fullName);
    const cleanEmail = currentUser.email?.toLowerCase().trim();
    const stored = (cleanEmail && localStorage.getItem(`interntrack_avatar_${cleanEmail}`)) ||
      (currentUser.id && localStorage.getItem(`interntrack_avatar_${currentUser.id}`));
    setAvatarUrl(currentUser.avatarUrl || stored || '');
  }, [currentUser]);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const handleSelectPreset = (presetPath: string) => {
    setAvatarUrl(presetPath);
  };

  const handleResetToBlank = () => {
    setAvatarUrl('');
    setCustomUrlInput('');
    setShowUrlField(false);
  };

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

      setSuccessFeedback('Profile & credentials updated successfully!');
      setTimeout(() => {
        setSuccessFeedback(null);
        if (activeTab === 'password') {
          setNewPassword('');
          setConfirmPassword('');
        }
      }, 3500);
    } catch (err: any) {
      setErrorFeedback(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Top Navigation Breadcrumb / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer"
            title="Return to previous view"
          >
            <BauhausArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#D94B0A] dark:text-orange-400">
                Account Directorate
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {currentUser.buId || currentUser.email}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Profile & Account Settings
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
              currentUser.role === 'coordinator'
                ? 'bg-[#F26522] text-white shadow-xs'
                : 'bg-emerald-600 text-white shadow-xs'
            }`}
          >
            {currentUser.role === 'coordinator' ? 'Coordinator' : 'Student Intern'}
          </span>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                setErrorFeedback(null);
              }}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2 ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-[#020617] text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4 text-[#F26522]" />
              <span>Identity & Avatar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setErrorFeedback(null);
              }}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2 ${
                activeTab === 'password'
                  ? 'bg-white dark:bg-[#020617] text-[#F26522] dark:text-orange-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BauhausLock className="w-4 h-4 text-[#F26522]" />
              <span>Password & Security</span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {successFeedback && (
          <div className="m-6 mb-0 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
            <BauhausCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successFeedback}</span>
          </div>
        )}

        {errorFeedback && (
          <div className="m-6 mb-0 p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-2xl text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2.5">
            <BauhausAlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorFeedback}</span>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Avatar Section: Blank Genderless Icon Default */}
              <div className="p-5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  {/* Avatar Icon Box */}
                  <div className="relative shrink-0 mx-auto sm:mx-0">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 flex items-center justify-center shadow-md">
                      {avatarUrl && avatarUrl.trim() !== '' ? (
                        <img
                          src={avatarUrl}
                          alt="User Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-12 h-12 text-slate-500 dark:text-slate-400 stroke-[1.5]" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        User Profile Avatar
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {avatarUrl ? 'Avatar Icon Active' : 'Blank Genderless Icon'}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs max-w-lg leading-relaxed">
                      Choose an avatar icon from the presets below to personalize your account profile. Your selected avatar will be retained across your entire session.
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowUrlField(!showUrlField)}
                        className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <BauhausRotateCw className="w-3.5 h-3.5 text-[#F26522]" />
                        <span>{showUrlField ? 'Close URL Box' : 'Use Web URL'}</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleResetToBlank}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer text-xs"
                        >
                          <span>Reset to Blank Icon</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Choosable Preset Avatar Icons */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Choose Preset Avatar Icon:
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select an icon below and click Save Changes to apply
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 max-w-sm sm:max-w-md">
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
                          className={`group relative p-2.5 rounded-2xl border-2 transition-all duration-150 flex items-center justify-center cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'border-[#F26522] bg-orange-50/60 dark:bg-orange-950/30 shadow-md ring-2 ring-[#F26522]/30'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center p-1.5">
                            <img
                              src={preset.src}
                              alt="Avatar"
                              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                            />
                          </div>
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F26522] text-white rounded-full flex items-center justify-center shadow-xs">
                              <BauhausCheck className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Web URL Box */}
                {showUrlField && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 animate-in fade-in duration-150">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      External Image URL:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        className="flex-1 p-2.5 bg-white dark:bg-[#020617] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono dark:text-white focus:ring-1 focus:ring-[#F26522]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customUrlInput) {
                            setAvatarUrl(customUrlInput);
                            setShowUrlField(false);
                          }
                        }}
                        className="px-4 py-2.5 bg-[#F26522] hover:bg-[#D94B0A] text-white font-bold rounded-xl active:scale-95 transition cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>



              {/* Display Full Name */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Display Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maria Clara B. Santos"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-[#F26522]"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Reflected on your DTR logs, accomplishment submissions, and coordinator reviews.
                </p>
              </div>

              {/* Read-Only Institutional Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                    <BauhausMail className="w-3.5 h-3.5 text-[#F26522]" /> Institutional Email:
                  </span>
                  <div className="text-slate-900 dark:text-white font-mono font-bold text-xs">
                    {currentUser.email}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                    <Fingerprint className="w-3.5 h-3.5 text-[#F26522]" /> Institutional ID:
                  </span>
                  <div className="text-slate-900 dark:text-white font-mono font-bold text-xs">
                    {currentUser.buId}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                    <BauhausBuilding2 className="w-3.5 h-3.5 text-[#F26522]" /> Academic Department:
                  </span>
                  <div className="text-slate-800 dark:text-slate-200 font-semibold text-xs">
                    {currentUser.department || 'Department of Computer Science'}
                  </div>
                </div>

                {currentUser.classBlock && (
                  <div className="space-y-1">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                      <BauhausAward className="w-3.5 h-3.5 text-[#F26522]" /> Class Block Section:
                    </span>
                    <div className="text-slate-800 dark:text-slate-200 font-mono font-bold text-xs">
                      {currentUser.classBlock}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-5 max-w-xl">
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-xs text-blue-900 dark:text-blue-200">
                Update your account password. Passwords should be at least 6 characters and include a mixture of letters and digits.
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full p-3 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showNewPass ? <BauhausEyeOff className="w-4 h-4" /> : <BauhausEye className="w-4 h-4" />}
                  </button>
                </div>

                {newPassword && (
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Password Strength:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
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

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full p-3 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:ring-1 focus:ring-[#F26522]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showConfirmPass ? <BauhausEyeOff className="w-4 h-4" /> : <BauhausEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
            >
              Back to Overview
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#F26522] hover:bg-[#D94B0A] text-white font-black transition-all active:scale-95 shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
