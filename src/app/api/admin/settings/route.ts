import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/guard'
import { AD_SETTING_KEYS, getAdSettings } from '@/lib/settings'
import { z } from 'zod'
import { AD_PLACEMENTS, placementSettingKey, type AdPlacement } from '@/lib/ad-policy'

// Fetch all AppSettings
export async function GET(request: Request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const settings = await prisma.appSettings.findMany()
    const config = settings.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, {})
    

    return NextResponse.json({ config, ads: await getAdSettings(), services: { database: true, catalogConfigured: !!process.env.TMDB_API_KEY } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      const supplied = new URL(origin)
      const target = new URL(request.url)
      if (supplied.origin !== origin || supplied.protocol !== target.protocol || supplied.host !== (request.headers.get('host') || target.host))
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    } catch { return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 }) }
  }
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, value } = body

    switch (action) {
      case 'update_ads': {
        const ids = Object.keys(AD_PLACEMENTS) as [AdPlacement, ...AdPlacement[]]
        const parsed = z.object({ displayEnabled: z.boolean(), downloadEnabled: z.boolean(), placements: z.record(z.enum(ids), z.boolean()).optional() }).strict().safeParse(value)
        if (!parsed.success) return NextResponse.json({ error: 'Ad settings require boolean values' }, { status: 400 })
        await prisma.$transaction([
          prisma.appSettings.upsert({ where: { key: AD_SETTING_KEYS.display }, create: { key: AD_SETTING_KEYS.display, value: String(parsed.data.displayEnabled) }, update: { value: String(parsed.data.displayEnabled) } }),
          prisma.appSettings.upsert({ where: { key: AD_SETTING_KEYS.download }, create: { key: AD_SETTING_KEYS.download, value: String(parsed.data.downloadEnabled) }, update: { value: String(parsed.data.downloadEnabled) } }),
          ...Object.entries(parsed.data.placements || {}).map(([id, enabled]) => {
            const key = placementSettingKey(id as AdPlacement)
            return prisma.appSettings.upsert({ where: { key }, create: { key, value: String(enabled) }, update: { value: String(enabled) } })
          }),
        ])
        revalidatePath('/', 'layout')
        return NextResponse.json({ success: true, message: 'Display ad settings saved.', ads: await getAdSettings() }, { headers: { 'Cache-Control': 'no-store' } })
      }


      case 'bust_browser_cache': {
        // Get current version or default to "0"
        const current = await prisma.appSettings.findUnique({
          where: { key: 'CACHE_BUST_VERSION' },
        })
        const nextVersion = String((parseInt(current?.value || '0', 10) || 0) + 1)
        await prisma.appSettings.upsert({
          where: { key: 'CACHE_BUST_VERSION' },
          update: { value: nextVersion },
          create: { key: 'CACHE_BUST_VERSION', value: nextVersion },
        })
        return NextResponse.json({
          success: true,
          message: `Application cache refresh v${nextVersion} scheduled. Saved titles and viewing progress are preserved.`,
        })
      }

      case 'revalidate_home':
        revalidatePath('/')
        return NextResponse.json({ success: true, message: 'Home page cache cleared' })

      case 'revalidate_all':
        revalidatePath('/', 'layout')
        return NextResponse.json({ success: true, message: 'All page caches cleared' })

      case 'reset_home_layout':
        await prisma.homeSectionItem.deleteMany({})
        await prisma.homeSection.deleteMany({})
        return NextResponse.json({ success: true, message: 'Home layout reset' })

      case 'delete_all_downloads':
        await prisma.downloadLink.deleteMany({})
        return NextResponse.json({ success: true, message: 'All download links deleted' })

      case 'db_stats': {
        const [mediaCount, downloadCount, sectionCount, itemCount] = await Promise.all([
          prisma.mediaPost.count(),
          prisma.downloadLink.count(),
          prisma.homeSection.count(),
          prisma.homeSectionItem.count(),
        ])
        return NextResponse.json({
          success: true,
          stats: { mediaCount, downloadCount, sectionCount, itemCount }
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Settings action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
