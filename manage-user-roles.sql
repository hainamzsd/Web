-- ============================================
-- USER ROLE MANAGEMENT HELPER SCRIPT
-- Use this to add/update/check user roles
-- ============================================

-- ============================================
-- 1. CHECK CURRENT USERS AND THEIR ROLES
-- ============================================

-- List all users with their roles and status
SELECT
  u.email,
  u.created_at as registered_at,
  p.full_name,
  p.phone,
  wu.role,
  wu.commune_code,
  wu.district_code,
  wu.province_code,
  wu.is_active,
  wu.last_login
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN web_users wu ON wu.profile_id = p.id
ORDER BY u.created_at DESC;

-- ============================================
-- 2. FIND USERS WITHOUT WEB_USER RECORDS
-- ============================================

SELECT
  'Users Missing web_user Record' as issue,
  u.email,
  u.id as user_id,
  p.full_name
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN web_users wu ON wu.profile_id = p.id
WHERE wu.id IS NULL;

-- ============================================
-- 3. ADD WEB_USER RECORD TO EXISTING USER
-- ============================================

-- Example: Add commune_officer role
-- REPLACE the values below with actual data!

/*
INSERT INTO web_users (profile_id, role, commune_code, district_code, province_code, is_active)
VALUES (
  'user-uuid-from-auth-users',  -- Get this from auth.users table
  'commune_officer',              -- Role: commune_officer, commune_supervisor, central_admin, system_admin
  '01001',                        -- Commune code (ward_code)
  '01',                           -- District code
  '01',                           -- Province code
  true                            -- Is active
);
*/

-- ============================================
-- 4. UPDATE EXISTING USER'S ROLE
-- ============================================

-- Example: Change user's role
-- REPLACE the values below with actual data!

/*
UPDATE web_users
SET
  role = 'central_admin',
  commune_code = NULL,  -- Central admins don't need commune_code
  district_code = NULL,
  province_code = NULL,
  is_active = true,
  updated_at = NOW()
WHERE profile_id = 'user-uuid-here';
*/

-- ============================================
-- 5. ACTIVATE/DEACTIVATE USER
-- ============================================

-- Deactivate a user
/*
UPDATE web_users
SET is_active = false, updated_at = NOW()
WHERE profile_id = 'user-uuid-here';
*/

-- Reactivate a user
/*
UPDATE web_users
SET is_active = true, updated_at = NOW()
WHERE profile_id = 'user-uuid-here';
*/

-- ============================================
-- 6. CREATE COMPLETE USER (Profile + Web_User)
-- ============================================

-- This creates both profile and web_user records for an existing auth.users
-- REPLACE values below!

/*
-- First, get the user ID from email
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'newuser@example.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: newuser@example.com';
  END IF;

  -- Insert profile if not exists
  INSERT INTO profiles (id, full_name, phone, police_id, unit)
  VALUES (
    v_user_id,
    'Full Name Here',
    '+84123456789',
    'POLICE123',
    'Unit Name'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    police_id = EXCLUDED.police_id,
    unit = EXCLUDED.unit,
    updated_at = NOW();

  -- Insert web_user if not exists
  INSERT INTO web_users (profile_id, role, commune_code, district_code, province_code, is_active)
  VALUES (
    v_user_id,
    'commune_officer',
    '01001',
    '01',
    '01',
    true
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    commune_code = EXCLUDED.commune_code,
    district_code = EXCLUDED.district_code,
    province_code = EXCLUDED.province_code,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  RAISE NOTICE 'User setup complete for: %', v_user_id;
END $$;
*/

-- ============================================
-- 7. QUICK ROLE TEMPLATES
-- ============================================

-- Template for Commune Officer
/*
INSERT INTO web_users (profile_id, role, commune_code, district_code, province_code, is_active)
VALUES ('USER_UUID', 'commune_officer', 'COMMUNE_CODE', 'DISTRICT_CODE', 'PROVINCE_CODE', true);
*/

-- Template for Commune Supervisor
/*
INSERT INTO web_users (profile_id, role, commune_code, district_code, province_code, is_active)
VALUES ('USER_UUID', 'commune_supervisor', 'COMMUNE_CODE', 'DISTRICT_CODE', 'PROVINCE_CODE', true);
*/

-- Template for Central Admin (no location codes needed)
/*
INSERT INTO web_users (profile_id, role, is_active)
VALUES ('USER_UUID', 'central_admin', true);
*/

-- Template for System Admin (no location codes needed)
/*
INSERT INTO web_users (profile_id, role, is_active)
VALUES ('USER_UUID', 'system_admin', true);
*/

-- ============================================
-- 8. FIND USER BY EMAIL AND GET THEIR UUID
-- ============================================

-- Use this to get the UUID you need for the above commands
/*
SELECT
  email,
  id as user_uuid,
  created_at
FROM auth.users
WHERE email ILIKE '%search-term%'
ORDER BY created_at DESC;
*/

-- ============================================
-- 9. BATCH CREATE TEST USERS
-- ============================================

-- Creates web_user records for all auth.users that don't have one
-- WARNING: This sets ALL missing users as commune_officers!
-- Only use this for testing/development!

/*
INSERT INTO web_users (profile_id, role, commune_code, is_active)
SELECT
  u.id,
  'commune_officer',  -- Default role
  '01001',            -- Default commune
  true
FROM auth.users u
LEFT JOIN web_users wu ON wu.profile_id = u.id
WHERE wu.id IS NULL;
*/

-- ============================================
-- 10. VERIFY SPECIFIC USER CAN LOG IN
-- ============================================

-- Check everything for a specific user
/*
SELECT
  'Auth User' as record_type,
  u.email,
  u.id,
  u.confirmed_at,
  u.email_confirmed_at
FROM auth.users u
WHERE u.email = 'user@example.com'

UNION ALL

SELECT
  'Profile' as record_type,
  p.full_name,
  p.id,
  p.created_at::text,
  p.updated_at::text
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'user@example.com'

UNION ALL

SELECT
  'Web User' as record_type,
  wu.role::text,
  wu.id,
  wu.commune_code,
  wu.is_active::text
FROM web_users wu
JOIN auth.users u ON u.id = wu.profile_id
WHERE u.email = 'user@example.com';
*/

-- ============================================
-- 11. CLEAR LAST_LOGIN FOR TESTING
-- ============================================

-- Sometimes useful to reset login tracking
/*
UPDATE web_users SET last_login = NULL;
*/

-- ============================================
-- 12. COUNT USERS BY STATUS
-- ============================================

SELECT
  role,
  is_active,
  COUNT(*) as count
FROM web_users
GROUP BY role, is_active
ORDER BY role, is_active;
