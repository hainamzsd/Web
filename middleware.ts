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

  // Add timeout to getUser to prevent hanging
  const getUserPromise = supabase.auth.getUser()
  const timeoutPromise = new Promise<{ data: { user: null }; error: null }>((resolve) => {
    setTimeout(() => {
      // console.warn('Supabase getUser timed out in middleware')
      resolve({ data: { user: null }, error: null })
    }, 2000)
  })

  let user = null
  try {
    const {
      data: { user: fetchedUser },
    } = (await Promise.race([getUserPromise, timeoutPromise])) as {
      data: { user: any }
      error: any
    }
    user = fetchedUser
  } catch (err) {
    // console.error('Middleware auth error:', err)
    // If auth fails (e.g. invalid refresh token), treat as logged out
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

    // Copy cookies from the response object (which might have updated session)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return redirectResponse
  }

  // Redirect to dashboard if accessing login while authenticated
  if (request.nextUrl.pathname === '/login' && user) {
    // Fetch user role to redirect to appropriate dashboard
    // Add timeout to prevent hanging if DB is slow
    try {
      const fetchWebUserPromise = supabase
        .from('web_users')
        .select('role')
        .eq('profile_id', user.id)
        .single()

      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 3000)
      })

      const { data: webUser, error } = await Promise.race([fetchWebUserPromise, timeoutPromise]) as any

      if (error) {
        console.error('[Middleware] Error fetching web_user:', error)
      }

      if (webUser?.role) {
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
      } else {
        // No web_user found - redirect to commune dashboard as default
        const targetUrl = new URL('/commune/dashboard', request.url)
        const redirectResponse = NextResponse.redirect(targetUrl)
        response.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirectResponse
      }
    } catch (err) {
      console.error('[Middleware] Exception fetching web_user:', err)
      // On error, redirect to commune dashboard as fallback
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
