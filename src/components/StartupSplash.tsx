import React, { useState, useEffect } from 'react';

interface StartupSplashProps {
  onDismiss: () => void;
  displayDurationMs?: number;
}

export const StartupSplash: React.FC<StartupSplashProps> = ({
  onDismiss,
  displayDurationMs = 1500,
}) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Hold logo display, then trigger smooth fade-out
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, displayDurationMs);

    // Call onDismiss once fade-out completes
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, displayDurationMs + 700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [displayDurationMs, onDismiss]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#071328] transition-opacity duration-700 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Only just the logo centered on top of a dark blue background */}
      <div className="select-none transform transition-transform duration-700 scale-100">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight font-sans">
          <span className="text-[#3b82f6]">I</span>
          <span className="text-white">ntern</span>
          <span className="text-[#F26522]">Track</span>
        </h1>
      </div>
    </div>
  );
};
