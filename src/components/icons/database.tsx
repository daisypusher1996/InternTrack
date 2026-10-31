"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "./utils";

export interface DatabaseIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface DatabaseIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const TOP_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, -2, 0], transition: { duration: 0.35, ease: "easeInOut" } },
};

const MID_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, -1, 0], transition: { duration: 0.35, delay: 0.1, ease: "easeInOut" } },
};

const BOT_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, 1, 0], transition: { duration: 0.35, delay: 0.15, ease: "easeInOut" } },
};

const DatabaseIcon = forwardRef<DatabaseIconHandle, DatabaseIconProps>(
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
          <motion.ellipse
            cx="12"
            cy="5"
            rx="9"
            ry="3"
            animate={controls}
            variants={TOP_VARIANTS}
          />
          <motion.path
            d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"
            animate={controls}
            variants={BOT_VARIANTS}
          />
          <motion.path
            d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"
            animate={controls}
            variants={MID_VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

DatabaseIcon.displayName = "DatabaseIcon";

export { DatabaseIcon };
