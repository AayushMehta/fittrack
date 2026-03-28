import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { deleteAccount } from '@/lib/services/settings'

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await deleteAccount(session.user.id)
  return NextResponse.json({ data: { deleted: true } })
}
