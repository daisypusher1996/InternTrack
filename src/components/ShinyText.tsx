'use client';

import React, { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

export interface ShinyTextProps {
  text?: string;
  children?: ReactNode;
  color?: string;
  shineColor?: string;
  speed?: number;
  shineWidth?: number;
  softness?: number;
  trigger?: 'loop' | 'hover' | 'view';
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  children,
  color = '#b5b5b5',
  shineColor = '#ffffff',
  speed = 2,
  shineWidth = 40,
  softness = 0.8,
  trigger = 'loop',
  disabled = false,
  className = '',
  style = {},
}) => {
  const [isInView, setIsInView] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (trigger !== 'view' || !elementRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [trigger]);

  // Compute gradient stops based on shineWidth and softness
  const half = Math.min(48, Math.max(5, shineWidth / 2));
  const smoothFactor = Math.max(0.05, Math.min(1, softness));
  const p0 = Math.max(0, 50 - half);
  const p1 = Math.max(p0, 50 - half * (1 - smoothFactor * 0.7));
  const p2 = 50;
  const p3 = Math.min(100, 50 + half * (1 - smoothFactor * 0.7));
  const p4 = Math.min(100, 50 + half);

  const gradient = `linear-gradient(120deg, ${color} 0%, ${color} ${p0}%, ${color} ${p1}%, ${shineColor} ${p2}%, ${color} ${p3}%, ${color} ${p4}%, ${color} 100%)`;

  let animationPlayState: CSSProperties['animation'] = 'none';
  if (!disabled) {
    if (trigger === 'loop') {
      animationPlayState = `shiny-text-sweep ${speed}s linear infinite`;
    } else if (trigger === 'hover' && isHovered) {
      animationPlayState = `shiny-text-sweep ${speed}s ease-in-out`;
    } else if (trigger === 'view' && isInView) {
      animationPlayState = `shiny-text-sweep ${speed}s ease-out forwards`;
    }
  }

  const combinedStyle: CSSProperties = {
    backgroundImage: gradient,
    backgroundSize: '250% 100%',
    backgroundPosition: '100% 0',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    display: 'inline-block',
    animation: animationPlayState,
    ...style,
  };

  return (
    <>
      <style>{`
        @keyframes shiny-text-sweep {
          0% {
            background-position: 150% 0;
          }
          100% {
            background-position: -150% 0;
          }
        }
      `}</style>
      <span
        ref={elementRef}
        className={`inline-block ${className}`.trim()}
        style={combinedStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {text ?? children}
      </span>
    </>
  );
};

export default ShinyText;
