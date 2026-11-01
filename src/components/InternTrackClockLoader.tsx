import React from 'react';

export interface InternTrackClockLoaderProps {
  /** Size of the loader in pixels (width and height). Default: 64 */
  size?: number | string;
  /** Additional CSS class names */
  className?: string;
  /** Speed of the full 360-degree rotation. Default: 'normal' (1.8s) */
  speed?: 'fast' | 'normal' | 'slow';
  /** Animation style: 'ticking' (mechanical clock snap), 'stepped' (classic discrete tick), or 'smooth' */
  mode?: 'ticking' | 'stepped' | 'smooth';
  /** Accessible label for screen readers */
  label?: string;
}

export const InternTrackClockLoader: React.FC<InternTrackClockLoaderProps> = ({
  size = 64,
  className = '',
  speed = 'normal',
  mode = 'ticking',
  label = 'Loading...',
}) => {
  const durationMap = {
    fast: '1.2s',
    normal: '1.8s',
    slow: '2.6s',
  };

  const duration = durationMap[speed] || '1.8s';

  // Animation timing according to mode
  const handAnimationClass =
    mode === 'stepped'
      ? 'animate-clock-hand-stepped'
      : mode === 'smooth'
      ? 'animate-clock-hand-smooth'
      : 'animate-clock-hand-ticking';

  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 1024 1024"
        width="100%"
        height="100%"
        className="overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            @keyframes itClockTick {
              0% { transform: rotate(0deg); }
              5% { transform: rotate(30deg); }
              8.33% { transform: rotate(30deg); }
              13.33% { transform: rotate(60deg); }
              16.66% { transform: rotate(60deg); }
              21.66% { transform: rotate(90deg); }
              25% { transform: rotate(90deg); }
              30% { transform: rotate(120deg); }
              33.33% { transform: rotate(120deg); }
              38.33% { transform: rotate(150deg); }
              41.66% { transform: rotate(150deg); }
              46.66% { transform: rotate(180deg); }
              50% { transform: rotate(180deg); }
              55% { transform: rotate(210deg); }
              58.33% { transform: rotate(210deg); }
              63.33% { transform: rotate(240deg); }
              66.66% { transform: rotate(240deg); }
              71.66% { transform: rotate(270deg); }
              75% { transform: rotate(270deg); }
              80% { transform: rotate(300deg); }
              83.33% { transform: rotate(300deg); }
              88.33% { transform: rotate(330deg); }
              91.66% { transform: rotate(330deg); }
              96.66% { transform: rotate(360deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes itClockStepped {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes itClockSmooth {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes itDialBreathe {
              0%, 100% {
                opacity: 1;
                filter: drop-shadow(0 2px 4px rgba(245, 130, 32, 0.15));
              }
              50% {
                opacity: 0.88;
                filter: drop-shadow(0 4px 14px rgba(245, 130, 32, 0.35));
              }
            }
            .it-hand-ticking {
              animation: itClockTick ${duration} cubic-bezier(0.25, 1.25, 0.5, 1) infinite;
              transform-origin: 0px 0px;
              will-change: transform;
            }
            .it-hand-stepped {
              animation: itClockStepped ${duration} steps(12, end) infinite;
              transform-origin: 0px 0px;
              will-change: transform;
            }
            .it-hand-smooth {
              animation: itClockSmooth ${duration} linear infinite;
              transform-origin: 0px 0px;
              will-change: transform;
            }
            .it-dial-pulse {
              animation: itDialBreathe 3s ease-in-out infinite;
            }
          `}</style>
          {/* Subtle drop shadow filter for depth */}
          <filter id="itLoaderBlueGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2F6DB5" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Outer Circular Track (Orange Arc, 3/4 circle clock dial from 12 o'clock to 9 o'clock) */}
        <path
          d="M 512 154 A 358 358 0 1 1 154 512"
          fill="none"
          stroke="#F58220"
          strokeWidth="76"
          strokeLinecap="round"
          className="it-dial-pulse"
        />

        {/* Inner Clock Hand (Blue Checkmark), pivoting smoothly & ticking around clock center (512, 512) */}
        <g transform="translate(512, 512)">
          <g
            className={
              mode === 'stepped'
                ? 'it-hand-stepped'
                : mode === 'smooth'
                ? 'it-hand-smooth'
                : 'it-hand-ticking'
            }
          >
            <path
              transform="translate(-512, -512)"
              d="M 338 520 L 456 638 L 702 392"
              fill="none"
              stroke="#2F6DB5"
              strokeWidth="76"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#itLoaderBlueGlow)"
            />
          </g>
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
};
