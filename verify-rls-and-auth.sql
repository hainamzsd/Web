-- ============================================
-- RLS AND AUTHENTICATION VERIFICATION SCRIPT
-- Run this after applying reset-rls-policies.sql
-- ============================================

-- 1. Check if helper functions exist
SELECT
  'Helper Functions Check' as test_name,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_role', 'get_user_commune_code', 'is_user_active')
ORDER BY routine_name;

-- 2. List all active RLS policies
SELECT
  'Active RLS Policies' as test_name,
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN roles = '{authenticated}' THEN 'authenticated'
    WHEN roles = '{service_role}' THEN 'service_role'
    ELSE array_to_string(roles, ', ')
  END as applies_to
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check RLS status on all tables
SELECT
  'RLS Status' as test_name,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Count users by role
SELECT
  'User Count by Role' as test_name,
  role,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_users,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_users
FROM web_users
GROUP BY role
ORDER BY role;

-- 5. Check for users without profiles
SELECT
  'Users Without Profiles' as test_name,
  wu.id,
  wu.profile_id,
  wu.role
FROM web_users wu
LEFT JOIN profiles p ON p.id = wu.profile_id
WHERE p.id IS NULL;

-- 6. Check for profiles without web_users
SELECT
  'Profiles Without Web Users' as test_name,
  p.id,
  p.full_name,
  p.phone
FROM profiles p
LEFT JOIN web_users wu ON wu.profile_id = p.id
WHERE wu.id IS NULL;

-- 7. Verify sample user can be queried (replace with actual user email)
-- Uncomment and replace 'user@example.com' with a real user email
/*
SELECT
  'Sample User Verification' as test_name,
  p.id,
  p.full_name,
  wu.role,
  wu.commune_code,
  wu.is_active
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN web_users wu ON wu.profile_id = p.id
WHERE u.email = 'user@example.com';
*/

-- 8. Test helper functions work correctly
-- This should return your role if you're logged in
SELECT
  'Current User Info' as test_name,
  auth.uid() as user_id,
  get_user_role() as role,
  get_user_commune_code() as commune_code,
  is_user_active() as is_active;

-- 9. Count survey locations by status
SELECT
  'Survey Locations by Status' as test_name,
  status,
  COUNT(*) as count
FROM survey_locations
GROUP BY status
ORDER BY status;

-- 10. Check for any policy conflicts or issues
SELECT
  'Potential Policy Issues' as test_name,
  tablename,
  COUNT(*) as policy_count,
  array_agg(DISTINCT cmd) as operations_covered
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) < 2  -- Tables with very few policies might have issues
ORDER BY policy_count;
