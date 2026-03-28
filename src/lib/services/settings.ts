import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function deleteAccount(userId: string): Promise<void> {
  // All child records cascade-delete via Prisma schema relations
  await db.user.delete({ where: { id: userId } })
}

export async function getProfile(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, timezone: true, createdAt: true },
  })
}

export async function updateProfile(userId: string, data: { name?: string; timezone?: string }) {
  return db.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, timezone: true },
  })
}

export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return { success: false, error: 'User not found' }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) return { success: false, error: 'Current password is incorrect' }

  const hashed = await bcrypt.hash(newPassword, 12)
  await db.user.update({ where: { id: userId }, data: { password: hashed } })
  return { success: true }
}
