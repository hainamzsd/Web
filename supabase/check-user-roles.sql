-- DIAGNOSTIC QUERY: Check if users have roles
-- Run this to see which users have roles and which don't

-- Check all auth users and their roles
SELECT
  au.id as auth_user_id,
  au.email,
  au.created_at as user_created,
  p.full_name,
  p.police_id,
  p.unit,
  wu.role,
  wu.commune_code,
  wu.district_code,
  wu.province_code,
  wu.is_active,
  CASE
    WHEN wu.id IS NULL THEN '❌ NO ROLE ASSIGNED'
    WHEN wu.is_active = false THEN '⚠️  INACTIVE'
    ELSE '✓ OK'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN web_users wu ON wu.profile_id = p.id
WHERE au.email NOT LIKE '%@supabase%'  -- Exclude system users
ORDER BY au.created_at DESC;

-- Show users without roles
SELECT
  au.id,
  au.email,
  au.created_at,
  'This user needs a role assigned in web_users table' as issue
FROM auth.users au
LEFT JOIN web_users wu ON wu.profile_id = au.id
WHERE wu.id IS NULL
  AND au.email NOT LIKE '%@supabase%';

-- Count users by role
SELECT
  role,
  COUNT(*) as user_count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM web_users
GROUP BY role
ORDER BY role;
