'use client'

// This component handles any additional custom sections added via admin panel.
// The core 4 sections (continue_watching, top10, trending, recommended) are 
// rendered server-side in page.tsx. This only renders custom admin sections.

import { type TMDBMediaItem } from '@/lib/tmdb'

interface Section {
  key: string
  title: string
  type: string
  visible: boolean
  items: TMDBMediaItem[]
}

export default function HomeSections({ sections, trending }: { sections: Section[], trending: TMDBMediaItem[] }) {
  // Only render sections that are NOT one of the 4 core types
  const coreTypes = ['continue_watching', 'top10', 'trending', 'recommended']
  const customSections = sections.filter(s => !coreTypes.includes(s.type) && s.visible)

  if (customSections.length === 0) return null

  // Custom sections will be rendered here in the future
  // For now just return null since there are no custom sections yet
  return null
}
