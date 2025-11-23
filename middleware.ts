import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/commune') ||
    request.nextUrl.pathname.startsWith('/supervisor') ||
    request.nextUrl.pathname.startsWith('/central')

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)

    // Copy cookies from the response object (which might have updated session)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return redirectResponse
  }

  // Redirect to dashboard if accessing login while authenticated
  if (request.nextUrl.pathname === '/login' && user) {
    // Fetch user role to redirect to appropriate dashboard
    const { data: webUser } = await supabase
      .from('web_users')
      .select('role')
      .eq('profile_id', user.id)
      .single()

    if (webUser) {
      const roleRoutes: Record<string, string> = {
        commune_officer: '/commune/dashboard',
        commune_supervisor: '/supervisor/dashboard',
        central_admin: '/central/dashboard',
        system_admin: '/central/dashboard',
      }
      const targetUrl = new URL(roleRoutes[webUser.role] || '/commune/dashboard', request.url)
      const redirectResponse = NextResponse.redirect(targetUrl)

      // Copy cookies from the response object
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })

      return redirectResponse
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
