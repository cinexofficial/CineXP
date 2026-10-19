"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "motion/react";

interface ScrollRevealProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  blur?: number;
  yOffset?: number;
  duration?: number;
  stagger?: number;
  once?: boolean;
}

/**
 * ScrollReveal: A premium transition that blurs and floats elements 
 * as they enter the viewport.
 */
const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  blur = 12,
  yOffset = 30,
  duration = 0.6,
  stagger = 0,
  once = true,
  ...props
}) => {
  return (
    <motion.div
      initial={{ 
        opacity: 0.1, 
        y: yOffset, 
        filter: `blur(${blur}px)`,
        scale: 0.94 
      }}
      whileInView={{ 
        opacity: 1, 
        y: 0, 
        filter: "blur(0px)",
        scale: 1 
      }}
      viewport={{ 
        once, 
        amount: "some",
      }}
      transition={{
        duration,
        ease: [0.21, 0.47, 0.32, 0.98], // Custom premium ease
        delay: stagger,
      }}
      style={{ willChange: "transform, opacity, filter" }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
