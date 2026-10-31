"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "./utils";

export interface AwardIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface AwardIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CIRCLE_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: { scale: [1, 1.15, 1], transition: { duration: 0.4, ease: "easeOut" } },
};

const RIBBON_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: { rotate: [0, -8, 8, -4, 0], transition: { duration: 0.6, ease: "easeInOut" } },
};

const AwardIcon = forwardRef<AwardIconHandle, AwardIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn("inline-flex items-center justify-center shrink-0", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <motion.circle
            cx="12"
            cy="8"
            r="6"
            animate={controls}
            variants={CIRCLE_VARIANTS}
          />
          <motion.path
            d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.2 0l-3.58 2.687a.5.5 0 0 1-.81-.47l1.515-8.526"
            animate={controls}
            variants={RIBBON_VARIANTS}
            style={{ transformOrigin: "12px 13px" }}
          />
        </svg>
      </div>
    );
  }
);

AwardIcon.displayName = "AwardIcon";

export { AwardIcon };
