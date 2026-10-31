"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "./utils";

export interface FilterIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface FilterIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const FILTER_VARIANTS: Variants = {
  normal: { scale: 1, y: 0 },
  animate: {
    scale: [1, 1.15, 0.95, 1],
    y: [0, -1, 1, 0],
    transition: { duration: 0.5, ease: "easeInOut" },
  },
};

const FilterIcon = forwardRef<FilterIconHandle, FilterIconProps>(
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
          className="w-full h-full"
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.polygon
            animate={controls}
            initial="normal"
            points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
            variants={FILTER_VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

FilterIcon.displayName = "FilterIcon";

export { FilterIcon };
