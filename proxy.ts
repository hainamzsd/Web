import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
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

  // Get user with timeout to prevent hanging
  let user = null
  try {
    const userPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) => {
      setTimeout(() => resolve({ data: { user: null } }), 5000)
    })
    const { data } = await Promise.race([userPromise, timeoutPromise])
    user = data.user
  } catch {
    user = null
  }

  // Protected routes
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/commune') ||
    request.nextUrl.pathname.startsWith('/supervisor') ||
    request.nextUrl.pathname.startsWith('/central')

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return redirectResponse
  }

  // Redirect to dashboard if accessing login while authenticated
  if (request.nextUrl.pathname === '/login' && user) {
    try {
      const { data: webUser } = await supabase
        .from('web_users')
        .select('role')
        .eq('profile_id', user.id)
        .single()

      const roleRoutes: Record<string, string> = {
        commune_officer: '/commune/dashboard',
        commune_supervisor: '/supervisor/dashboard',
        central_admin: '/central/dashboard',
        system_admin: '/central/dashboard',
      }

      const targetUrl = new URL(
        webUser?.role ? roleRoutes[webUser.role] || '/commune/dashboard' : '/commune/dashboard',
        request.url
      )
      const redirectResponse = NextResponse.redirect(targetUrl)

      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })

      return redirectResponse
    } catch {
      const targetUrl = new URL('/commune/dashboard', request.url)
      return NextResponse.redirect(targetUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
