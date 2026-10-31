"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "./utils";

export interface TableIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface TableIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const LINE_VARIANTS: Variants = {
  normal: { opacity: 1, scaleX: 1 },
  animate: { opacity: [1, 0.4, 1], scaleX: [1, 0.95, 1], transition: { duration: 0.35, ease: "easeInOut" } },
};

const TableIcon = forwardRef<TableIconHandle, TableIconProps>(
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
          <path d="M12 3v18" />
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <motion.path
            d="M3 9h18"
            animate={controls}
            variants={LINE_VARIANTS}
          />
          <motion.path
            d="M3 15h18"
            animate={controls}
            variants={LINE_VARIANTS}
            transition={{ delay: 0.1 }}
          />
        </svg>
      </div>
    );
  }
);

TableIcon.displayName = "TableIcon";

export { TableIcon };
