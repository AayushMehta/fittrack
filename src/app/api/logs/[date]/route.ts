import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getLogByDate, createLog } from '@/lib/services/daily-log'
import { dailyLogSchema } from '@/lib/validations/daily-log'
import { recomputeMetrics } from '@/lib/services/computed'

export async function GET(request: Request, { params }: { params: Promise<{ date: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date } = await params
  const log = await getLogByDate(session.user.id, date)
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: log })
}

// PUT creates a correction entry (new row, same date — immutability pattern)
export async function PUT(request: Request, { params }: { params: Promise<{ date: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date } = await params
  try {
    const body = await request.json()
    const parsed = dailyLogSchema.safeParse({ ...body, date })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const log = await createLog(session.user.id, parsed.data)
    recomputeMetrics(session.user.id, date).catch(console.error)

    return NextResponse.json({ data: log }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
