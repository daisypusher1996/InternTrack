"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "./utils";

export interface SaveIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SaveIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const DISK_VARIANTS: Variants = {
  normal: { scale: 1 },
  animate: { scale: [1, 0.92, 1.05, 1], transition: { duration: 0.4, ease: "easeInOut" } },
};

const SHUTTER_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, 2, 0], transition: { duration: 0.35, ease: "easeInOut" } },
};

const SaveIcon = forwardRef<SaveIconHandle, SaveIconProps>(
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
        <motion.svg
          animate={controls}
          variants={DISK_VARIANTS}
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
          <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <motion.path
            d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"
            variants={SHUTTER_VARIANTS}
          />
          <path d="M7 3v4a1 1 0 0 0 1 1h7" />
        </motion.svg>
      </div>
    );
  }
);

SaveIcon.displayName = "SaveIcon";

export { SaveIcon };
