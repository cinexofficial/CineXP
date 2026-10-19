"use client";

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { sanitizeMeasurement } from '@/lib/measurement-url';

export default function ExperienceAnalytics() {
  return <><Analytics beforeSend={sanitizeMeasurement} /><SpeedInsights beforeSend={sanitizeMeasurement} /></>;
}
