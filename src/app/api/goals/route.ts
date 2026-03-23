import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { goalSchema } from '@/lib/validations/goal'
import { getGoal, upsertGoal } from '@/lib/services/goal'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goal = await getGoal(session.user.id)
  return NextResponse.json({ data: goal })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = goalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const goal = await upsertGoal(session.user.id, parsed.data)
    return NextResponse.json({ data: goal })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
