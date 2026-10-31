"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "./utils";

export interface ArrowLeftRightIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ArrowLeftRightIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const TOP_ARROW_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: { x: [0, 3, 0] },
};

const BOTTOM_ARROW_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: { x: [0, -3, 0] },
};

const ArrowLeftRightIcon = forwardRef<ArrowLeftRightIconHandle, ArrowLeftRightIconProps>(
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
          <motion.path
            d="m8 3 4 8 5-5 5 15H2L8 3z"
            style={{ display: "none" }}
          />
          <motion.g
            animate={controls}
            variants={TOP_ARROW_VARIANTS}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <path d="M8 7h12m0 0l-3.5-3.5M20 7l-3.5 3.5" />
          </motion.g>
          <motion.g
            animate={controls}
            variants={BOTTOM_ARROW_VARIANTS}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <path d="M16 17H4m0 0l3.5 3.5M4 17l3.5-3.5" />
          </motion.g>
        </svg>
      </div>
    );
  }
);

ArrowLeftRightIcon.displayName = "ArrowLeftRightIcon";

export { ArrowLeftRightIcon };
