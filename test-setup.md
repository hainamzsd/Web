# Testing Checklist for Auth Setup

## 1. Check Environment Variables

Make sure `.env.local` has these values:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Test command:
```bash
npm run dev
```

Then check browser console - you should NOT see any errors about missing env variables.

## 2. Check Database Setup

Run this in **Supabase SQL Editor**:

```sql
-- Check if users exist in auth.users
SELECT email, id FROM auth.users
WHERE email IN (
  'officer@hoabinh.vn',
  'supervisor@hoabinh.vn',
  'central@admin.vn',
  'system@admin.vn'
);

-- Check if web_users records exist
SELECT
  au.email,
  wu.role,
  wu.is_active,
  wu.profile_id
FROM auth.users au
LEFT JOIN web_users wu ON wu.profile_id = au.id
WHERE au.email IN (
  'officer@hoabinh.vn',
  'supervisor@hoabinh.vn',
  'central@admin.vn',
  'system@admin.vn'
);
```

**Expected result**: All 4 users should show with their roles (not NULL).

## 3. Check RLS Policies

### Option A: Disable RLS temporarily (for testing only)
```sql
ALTER TABLE web_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Option B: Use function-based RLS (recommended)
Run the `function-based-rls.sql` file from the project root.

## 4. Test Login Flow

1. **Restart your dev server**:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Open browser** to http://localhost:3000/login

3. **Open DevTools Console** (F12)

4. **Login** with one of the test accounts

5. **Check console output** - you should see:
   ```
   🔧 AuthProvider: Initializing...
   📋 Initial session: User logged in
   👤 User email: officer@hoabinh.vn
   🔍 Fetching web_user for user ID: <uuid>
   ✅ Web user loaded successfully: { role: 'commune_officer', ... }
   ```

## 5. Common Issues & Solutions

### Issue: "Invalid login credentials"
**Solution**: User doesn't exist in auth.users table. Create them in Supabase Dashboard.

### Issue: Infinite loading spinner
**Solution**:
- Check browser console for errors
- webUser is likely NULL - check if web_users records exist
- Check RLS policies are not blocking the query

### Issue: "Bạn không có quyền truy cập"
**Solution**:
- webUser is NULL or role doesn't match
- Check RLS policies
- Run `function-based-rls.sql` to fix policies

### Issue: Console shows "Error fetching web_user"
**Solution**:
- Check the error code in console
- If error code is related to RLS, run `function-based-rls.sql`
- If error is "row not found", run `verify-and-fix-data.sql`

## 6. Success Criteria

✅ Login redirects to dashboard
✅ Console shows "✅ Web user loaded successfully"
✅ Dashboard loads without infinite spinner
✅ No errors in browser console
✅ User can navigate between pages
