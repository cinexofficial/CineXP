"use client";

import { MotionConfig } from "motion/react";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackSession } from '@/lib/experience-analytics';

export default function ExperienceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  useEffect(() => { if (!pathname.startsWith('/admin')) trackSession(); }, [pathname]);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
