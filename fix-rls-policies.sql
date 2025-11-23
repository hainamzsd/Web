-- Comprehensive RLS Fix Script
-- This script diagnoses and fixes RLS issues

-- ============================================
-- STEP 1: DIAGNOSTIC QUERIES (Run these first)
-- ============================================

-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('profiles', 'web_users', 'survey_locations')
  AND schemaname = 'public';

-- Check current policies on web_users
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'web_users';

-- Test if you can query your own web_user (replace with your actual user email)
-- Run this while logged in as a user
SELECT
  auth.uid() as my_user_id,
  wu.*
FROM web_users wu
WHERE wu.profile_id = auth.uid();

-- Check if profile_id matches auth user id
SELECT
  au.email,
  au.id as auth_user_id,
  wu.profile_id as web_user_profile_id,
  (au.id = wu.profile_id) as ids_match,
  wu.role,
  wu.is_active
FROM auth.users au
LEFT JOIN web_users wu ON wu.profile_id = au.id
WHERE au.email IN (
  'officer@hoabinh.vn',
  'supervisor@hoabinh.vn',
  'central@admin.vn',
  'system@admin.vn'
);

-- ============================================
-- STEP 2: FIX - DROP AND RECREATE POLICIES
-- ============================================

-- Drop all existing policies on web_users
DROP POLICY IF EXISTS "Users can view own web_user" ON web_users;
DROP POLICY IF EXISTS "System admins can view all web users" ON web_users;
DROP POLICY IF EXISTS "Central admins can view all web users" ON web_users;
DROP POLICY IF EXISTS "System admins can manage web users" ON web_users;

-- Create a single, simple policy for SELECT that covers all cases
CREATE POLICY "web_users_select_policy"
  ON web_users FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own record
    auth.uid() = profile_id
    OR
    -- System admins can see all (but avoid circular dependency)
    EXISTS (
      SELECT 1 FROM web_users wu_inner
      WHERE wu_inner.profile_id = auth.uid()
        AND wu_inner.role = 'system_admin'
        AND wu_inner.is_active = true
      LIMIT 1
    )
    OR
    -- Central admins can see all
    EXISTS (
      SELECT 1 FROM web_users wu_inner
      WHERE wu_inner.profile_id = auth.uid()
        AND wu_inner.role = 'central_admin'
        AND wu_inner.is_active = true
      LIMIT 1
    )
  );

-- System admins can manage (insert/update/delete) web users
CREATE POLICY "web_users_admin_manage_policy"
  ON web_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu_inner
      WHERE wu_inner.profile_id = auth.uid()
        AND wu_inner.role = 'system_admin'
        AND wu_inner.is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM web_users wu_inner
      WHERE wu_inner.profile_id = auth.uid()
        AND wu_inner.role = 'system_admin'
        AND wu_inner.is_active = true
      LIMIT 1
    )
  );

-- ============================================
-- STEP 3: VERIFY POLICIES WORK
-- ============================================

-- This should return your web_user record when logged in
SELECT
  'Test: Can I see my own web_user?' as test,
  wu.*
FROM web_users wu
WHERE wu.profile_id = auth.uid();

-- ============================================
-- OPTIONAL: Temporarily disable RLS for testing
-- ============================================
-- Uncomment these to disable RLS temporarily for debugging
-- ALTER TABLE web_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE survey_locations DISABLE ROW LEVEL SECURITY;

-- To re-enable:
-- ALTER TABLE web_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE survey_locations ENABLE ROW LEVEL SECURITY;
