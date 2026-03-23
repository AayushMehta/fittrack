import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dailyLogSchema } from '@/lib/validations/daily-log'
import { createLog, getLogs } from '@/lib/services/daily-log'
import { recomputeMetrics } from '@/lib/services/computed'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined
  const page = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 30)

  const result = await getLogs(session.user.id, { from, to, page, pageSize })
  return NextResponse.json({
    data: result.logs,
    meta: { total: result.total, page: result.page, pageSize: result.pageSize },
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = dailyLogSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const log = await createLog(session.user.id, parsed.data)
    // Fire-and-forget metric computation
    recomputeMetrics(session.user.id, parsed.data.date).catch(console.error)

    return NextResponse.json({ data: log }, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'A log for this date already exists. Use PUT to create a correction.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
