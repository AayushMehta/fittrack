import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { weeklySchema } from '@/lib/validations/weekly'
import { upsertWeeklyMetric, listWeeklyMetrics } from '@/lib/services/weekly'
import { recomputeMetrics } from '@/lib/services/computed'
import { toISODate } from '@/lib/utils'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? 12)

  const metrics = await listWeeklyMetrics(session.user.id, { limit })
  return NextResponse.json({ data: metrics })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = weeklySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const metric = await upsertWeeklyMetric(session.user.id, parsed.data)
    recomputeMetrics(session.user.id, toISODate(new Date())).catch(console.error)
    return NextResponse.json({ data: metric }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
