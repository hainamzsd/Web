-- Debug script to check authentication setup
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if auth users exist
SELECT
  id,
  email,
  created_at,
  confirmed_at
FROM auth.users
WHERE email IN (
  'officer@hoabinh.vn',
  'supervisor@hoabinh.vn',
  'central@admin.vn',
  'system@admin.vn'
)
ORDER BY email;

-- 2. Check if profiles exist
SELECT
  p.id,
  p.full_name,
  p.police_id,
  p.unit,
  au.email
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE au.email IN (
  'officer@hoabinh.vn',
  'supervisor@hoabinh.vn',
  'central@admin.vn',
  'system@admin.vn'
)
ORDER BY au.email;

-- 3. Check if web_users records exist
SELECT
  wu.profile_id,
  wu.role,
  wu.is_active,
  wu.commune_code,
  wu.district_code,
  wu.province_code,
  au.email
FROM web_users wu
LEFT JOIN auth.users au ON au.id = wu.profile_id
WHERE au.email IN (
  'officer@hoabinh.vn',
  'supervisor@hoabinh.vn',
  'central@admin.vn',
  'system@admin.vn'
)
ORDER BY au.email;

-- 4. Check RLS policies on web_users table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'web_users';
