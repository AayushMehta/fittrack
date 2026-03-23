import { db } from '@/lib/db'
import type { GoalInput } from '@/lib/validations/goal'

export async function getGoal(userId: string) {
  return db.userGoal.findUnique({ where: { userId } })
}

export async function upsertGoal(userId: string, data: GoalInput) {
  return db.userGoal.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })
}
