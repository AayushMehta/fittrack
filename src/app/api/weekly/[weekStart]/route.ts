import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { weeklySchema } from '@/lib/validations/weekly'
import { getWeeklyMetric, upsertWeeklyMetric } from '@/lib/services/weekly'
import { recomputeMetrics } from '@/lib/services/computed'
import { toISODate } from '@/lib/utils'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ weekStart: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekStart } = await params
  const metric = await getWeeklyMetric(session.user.id, weekStart)
  if (!metric) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: metric })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ weekStart: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { weekStart } = await params
    const body = await request.json()
    const parsed = weeklySchema.safeParse({ ...body, weekStartDate: weekStart })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const metric = await upsertWeeklyMetric(session.user.id, parsed.data)
    recomputeMetrics(session.user.id, toISODate(new Date())).catch(console.error)
    return NextResponse.json({ data: metric })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
