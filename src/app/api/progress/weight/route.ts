import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getWeightTrend } from '@/lib/services/progress'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = Math.min(Number(searchParams.get('days') ?? 30), 365)

  const data = await getWeightTrend(session.user.id, days)
  return NextResponse.json({ data })
}
