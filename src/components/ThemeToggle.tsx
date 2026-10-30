import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('bu_intern_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bu_intern_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bu_intern_theme', 'light');
    }
  }, [isDark]);

  if (showLabel) {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 transition-colors ${className}`}
        role="group"
        aria-label="Color Theme Selection"
      >
        <button
          type="button"
          onClick={() => setIsDark(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            !isDark
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Light Mode (Active)"
        >
          <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDark(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Dark Mode (Active)"
        >
          <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-sky-400' : 'text-slate-400'}`} />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  // Compact header segmented pill toggle
  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-white/10 dark:bg-slate-900/80 border border-white/15 dark:border-slate-800 transition-colors select-none ${className}`}
      title={isDark ? 'Currently Dark Mode (Click Sun for Light)' : 'Currently Light Mode (Click Moon for Dark)'}
    >
      <button
        type="button"
        onClick={() => setIsDark(false)}
        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
          !isDark
            ? 'bg-white text-amber-500 shadow-sm scale-105'
            : 'text-slate-400 hover:text-white dark:hover:text-slate-200 opacity-60 hover:opacity-100'
        }`}
        aria-label="Switch to Light Mode"
        title="Light Mode"
      >
        <Sun className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => setIsDark(true)}
        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
          isDark
            ? 'bg-slate-800 text-sky-400 shadow-sm ring-1 ring-slate-700 scale-105'
            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-60 hover:opacity-100'
        }`}
        aria-label="Switch to Dark Mode"
        title="Dark Mode"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
};
