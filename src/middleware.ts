import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Check admin routes
    if (req.nextUrl.pathname.startsWith('/admin')) {
      const userRole = req.nextauth.token?.role
      if (!userRole || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Check admin API routes
    if (req.nextUrl.pathname.startsWith('/api/admin')) {
      const userRole = req.nextauth.token?.role
      if (!userRole || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        if (req.nextUrl.pathname.startsWith('/auth') || 
            req.nextUrl.pathname === '/' ||
            req.nextUrl.pathname.startsWith('/api/auth') ||
            req.nextUrl.pathname === '/api/projects/generate' ||
            req.nextUrl.pathname.startsWith('/api/ai/prompts')) {
          return true
        }
        
        // Require authentication for protected routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/admin/:path*',
    '/api/projects/:path*',
    '/api/admin/:path*',
  ]
}
