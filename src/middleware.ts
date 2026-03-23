import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

// Uses only edge-compatible config (no Prisma, no bcryptjs)
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
