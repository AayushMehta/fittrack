import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-compatible auth config.
 * No Node.js-only imports (no bcryptjs, no Prisma).
 * Used by middleware.ts which runs in the Edge runtime.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const protectedPrefixes = ['/dashboard', '/log', '/progress', '/insights', '/settings', '/goals']
      const authPrefixes = ['/login', '/register']

      const isProtected = protectedPrefixes.some((p) => nextUrl.pathname.startsWith(p))
      const isAuthRoute = authPrefixes.some((p) => nextUrl.pathname.startsWith(p))

      if (isProtected) return isLoggedIn
      if (isAuthRoute && isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl))
      return true
    },
  },
  providers: [], // populated in auth.ts — NOT here (bcryptjs isn't edge-safe)
  session: { strategy: 'jwt' },
} satisfies NextAuthConfig
