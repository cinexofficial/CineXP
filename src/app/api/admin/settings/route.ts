import { NextResponse } from 'next/server'
import { prisma } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/guard'

// Fetch all AppSettings
export async function GET(request: Request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const settings = await prisma.appSettings.findMany()
    const config = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value
      return acc
    }, {})
    

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, value } = body

    switch (action) {


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
          message: `Browser cache bust v${nextVersion} deployed. All users' local data will be cleared on next visit.`,
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
