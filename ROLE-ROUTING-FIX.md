# Role-Based Routing Fix

## Problem

Central admin and system admin users could not login. After successful authentication, they received the error message:
```
"Bạn không có quyền truy cập trang này"
(You don't have permission to access this page)
```

## Root Cause

The login form was **hardcoded** to redirect ALL users to `/commune/dashboard` after login:

```tsx
// ❌ WRONG - Old code in login-form.tsx
router.push('/commune/dashboard')  // Hardcoded for all roles!
```

However, the commune layout (`app/commune/layout.tsx`) has a role check that only allows:
- `commune_officer`
- `commune_supervisor`

So when a `central_admin` or `system_admin` logged in:
1. Login successful ✅
2. Redirected to `/commune/dashboard`
3. Commune layout checks role ❌
4. Shows error: "Bạn không có quyền truy cập trang này"

## Solution

### 1. Updated Auth Context

Modified `lib/auth/auth-context.tsx` to return the `webUser` object from the `signIn` function:

**Before:**
```tsx
signIn: (email: string, password: string) => Promise<{ error: Error | null }>
```

**After:**
```tsx
signIn: (email: string, password: string) => Promise<{
  webUser: WebUser | null;
  error: Error | null
}>
```

The `signIn` function now:
1. Authenticates with Supabase
2. Fetches the `web_users` record
3. Returns both the webUser and any error

### 2. Updated Login Form

Modified `components/auth/login-form.tsx` to use role-based routing:

**Before:**
```tsx
// ❌ Hardcoded - doesn't check role
const { error } = await signIn(email, password)
if (!error) {
  router.push('/commune/dashboard')  // Always goes here!
}
```

**After:**
```tsx
// ✅ Dynamic - routes based on role
const { webUser, error } = await signIn(email, password)

if (!error && webUser) {
  const roleRoutes: Record<string, string> = {
    commune_officer: '/commune/dashboard',
    commune_supervisor: '/supervisor/dashboard',
    central_admin: '/central/dashboard',    // ✅ Now works!
    system_admin: '/central/dashboard',     // ✅ Now works!
  }

  const targetRoute = roleRoutes[webUser.role] || '/commune/dashboard'
  router.push(targetRoute)
}
```

## Role Routing Map

| Role                 | Redirect After Login          |
|---------------------|-------------------------------|
| `commune_officer`   | `/commune/dashboard`          |
| `commune_supervisor`| `/supervisor/dashboard`       |
| `central_admin`     | `/central/dashboard`          |
| `system_admin`      | `/central/dashboard`          |

## Layout Protection

Each layout has role-based access control:

### Commune Layout (`app/commune/layout.tsx`)
```tsx
if (!webUser || (webUser.role !== 'commune_officer' && webUser.role !== 'commune_supervisor')) {
  return <p className="text-red-600">Bạn không có quyền truy cập trang này.</p>
}
```

### Central Layout (`app/central/layout.tsx`)
```tsx
if (!webUser || (webUser.role !== 'central_admin' && webUser.role !== 'system_admin')) {
  return <p className="text-red-600">Bạn không có quyền truy cập trang này.</p>
}
```

### Supervisor Layout (`app/supervisor/layout.tsx`)
```tsx
if (!webUser || webUser.role !== 'commune_supervisor') {
  return <p className="text-red-600">Bạn không có quyền truy cập trang này.</p>
}
```

## Middleware Enhancement

The middleware (`middleware.ts`) already handles role-based redirects for authenticated users accessing `/login`:

```tsx
if (request.nextUrl.pathname === '/login' && user) {
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
    return NextResponse.redirect(targetUrl)
  }
}
```

This provides double protection - both client-side and server-side routing.

## Testing

To test the fix:

### 1. Test Central Admin Login
```
Email: admin@example.com (central_admin role)
Expected: Redirects to /central/dashboard
Status: ✅ Fixed
```

### 2. Test System Admin Login
```
Email: system@example.com (system_admin role)
Expected: Redirects to /central/dashboard
Status: ✅ Fixed
```

### 3. Test Commune Officer Login
```
Email: officer@example.com (commune_officer role)
Expected: Redirects to /commune/dashboard
Status: ✅ Working
```

### 4. Test Commune Supervisor Login
```
Email: supervisor@example.com (commune_supervisor role)
Expected: Redirects to /supervisor/dashboard
Status: ✅ Working
```

## Files Changed

1. ✅ `lib/auth/auth-context.tsx`
   - Updated `AuthContextType` interface
   - Modified `signIn()` to fetch and return `webUser`

2. ✅ `components/auth/login-form.tsx`
   - Updated to use `webUser` from `signIn()`
   - Implemented role-based routing logic
   - Removed hardcoded `/commune/dashboard` redirect

## Build Status

✅ Build successful - no errors
✅ TypeScript types validated
✅ All routes compiled successfully

## Summary

**Problem:** Central and system admins couldn't login (access denied error)

**Root Cause:** Login form hardcoded redirect to `/commune/dashboard`

**Solution:** Implement role-based routing in login form

**Result:** All user roles can now login and access their appropriate dashboards

**Status:** ✅ FIXED
