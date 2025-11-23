# RLS Policy Reset Guide

## Problem
Authentication is failing and users can't log in or access features due to problematic Row Level Security (RLS) policies.

## Solution
This reset script creates fresh, non-recursive RLS policies using helper functions.

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `reset-rls-policies.sql`
5. Paste and click **Run**
6. Wait for all statements to complete (you should see green checkmarks)

### Option 2: Via Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db reset --db-url "your-database-url"

# Or run the migration directly
psql "your-database-url" < reset-rls-policies.sql
```

## Verification

After applying the reset, run the verification script:

1. Open `verify-rls-and-auth.sql` in Supabase SQL Editor
2. Run it
3. Check the results for any issues

Expected results:
- ✅ 3 helper functions should exist
- ✅ Multiple RLS policies per table
- ✅ All tables should have `rls_enabled = true`
- ✅ All user roles should show up in the count

## Key Changes

### 1. Helper Functions (Fixes Recursion Issues)
The old policies had recursive checks that blocked authentication. Now we use:

- `get_user_role()` - Returns the current user's role
- `get_user_commune_code()` - Returns the current user's commune
- `is_user_active()` - Checks if the user is active

These use `SECURITY DEFINER` to bypass RLS when checking user permissions.

### 2. Simplified Policy Structure

**Old (Problematic):**
```sql
-- This creates recursion!
EXISTS (
  SELECT 1 FROM web_users wu
  WHERE wu.profile_id = auth.uid()
  AND wu.role = 'system_admin'
)
```

**New (Works):**
```sql
-- Uses helper function, no recursion
get_user_role() = 'system_admin'
```

### 3. Critical Authentication Fix

The most important policy:
```sql
CREATE POLICY "web_users_select_own"
ON web_users FOR SELECT
TO authenticated
USING (profile_id = auth.uid());
```

This ensures **every authenticated user can read their own web_user record**, which is required for the auth context to work.

## User Roles

The system supports 4 roles:

1. **commune_officer** - Can manage surveys in their commune
2. **commune_supervisor** - Can review and approve surveys in their commune
3. **central_admin** - Can view and manage all data nationwide
4. **system_admin** - Full system access including user management

## Permission Matrix

| Table | Commune Officer | Commune Supervisor | Central Admin | System Admin |
|-------|----------------|-------------------|---------------|--------------|
| profiles | Own only | Own only | Own only | Own only |
| web_users | Own only | Own only | View all | Full access |
| survey_locations | Commune only (C/U) | Commune only (R/U) | All (R/U) | All (CRUD) |
| approval_history | Commune only (R/C) | Commune only (R/C) | All (R/C) | All (R/C) |
| location_identifiers | Commune only (R) | Commune only (R) | All (CRUD) | All (CRUD) |
| land_parcels | Commune only (R) | Commune only (R) | All (CRUD) | All (CRUD) |

*C=Create, R=Read, U=Update, D=Delete*

## Troubleshooting

### Still can't log in after reset?

1. **Check if the user exists:**
```sql
SELECT u.email, p.id, wu.role, wu.is_active
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN web_users wu ON wu.profile_id = p.id
WHERE u.email = 'your-email@example.com';
```

2. **Check if helper functions work:**
```sql
-- This should return your role
SELECT get_user_role();
```

3. **Verify RLS is enabled:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'web_users', 'survey_locations');
```

### User exists but has NULL role?

You need to create a web_user record:
```sql
-- Replace values with actual user info
INSERT INTO web_users (profile_id, role, commune_code, is_active)
VALUES (
  'user-uuid-here',
  'commune_officer',  -- or other role
  '01001',  -- commune code
  true
);
```

### Can't access features even though logged in?

Check the browser console for errors. Common issues:
- User is marked as inactive (`is_active = false`)
- User's commune_code doesn't match the data they're trying to access
- Missing permissions in the `permissions` JSONB field

## Testing After Reset

1. **Test login with each role:**
   - Log in as commune_officer
   - Log in as commune_supervisor
   - Log in as central_admin
   - Log in as system_admin

2. **Test data access:**
   - Verify commune users only see their commune data
   - Verify central admins see all data
   - Try updating records (should respect role permissions)

3. **Check the browser console:**
   - Should see: `✅ Web user loaded successfully`
   - Should NOT see: `❌ Error fetching web_user`

## Need More Help?

If authentication still fails after this reset, check:
1. Supabase project settings (is RLS enforced?)
2. API keys (are you using the correct anon/service key?)
3. Network issues (can the frontend reach Supabase?)
4. Auth tokens (try clearing localStorage and logging in again)
