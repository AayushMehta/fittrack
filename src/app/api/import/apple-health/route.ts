import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { appleHealthAdapter } from '@/lib/devices/apple-health'
import { createLog } from '@/lib/services/daily-log'
import { recomputeMetrics } from '@/lib/services/computed'
import { toISODate } from '@/lib/utils'

/**
 * POST /api/import/apple-health
 *
 * Body: JSON array of health records matching the Apple Health export format.
 * Each record must have at least { date: "YYYY-MM-DD", weight: number }.
 *
 * Response: { data: { imported: number, skipped: number } }
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const records = appleHealthAdapter.parse(body)
  if (records.length === 0) {
    return NextResponse.json({ data: { imported: 0, skipped: 0 } })
  }

  let imported = 0
  let skipped = 0
  let latestDate: string | null = null

  for (const record of records) {
    try {
      await createLog(session.user.id, record)
      imported++
      if (!latestDate || record.date > latestDate) latestDate = record.date
    } catch (err: unknown) {
      // P2002 = unique constraint violation (duplicate date) — skip silently
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        skipped++
      } else {
        skipped++
      }
    }
  }

  // Recompute metrics for the most recent imported date
  if (latestDate) {
    recomputeMetrics(session.user.id, latestDate).catch(console.error)
  }

  return NextResponse.json({ data: { imported, skipped } })
}
