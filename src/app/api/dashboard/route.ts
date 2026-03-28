import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDashboardData } from '@/lib/services/dashboard'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const rawDays = parseInt(searchParams.get('days') ?? '30', 10)
  const days = [7, 14, 30].includes(rawDays) ? rawDays : 30

  const data = await getDashboardData(session.user.id, days)
  return NextResponse.json({ data })
}
