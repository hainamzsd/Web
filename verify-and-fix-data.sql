-- This script checks and fixes your data
-- Run this in Supabase SQL Editor

-- STEP 1: Check what auth users exist
SELECT
  'Auth users:' as check_type,
  email,
  id,
  confirmed_at IS NOT NULL as is_confirmed
FROM auth.users
WHERE email IN (
  'officer@hoabinh.vn',
  'supervisor@hoabinh.vn',
  'central@admin.vn',
  'system@admin.vn'
);

-- STEP 2: Check if web_users exist
SELECT
  'Web users:' as check_type,
  au.email,
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

-- STEP 3: If web_users are missing, create them
-- Uncomment and run this section if the above query shows NULL roles
/*
DO $$
DECLARE
  v_officer_id UUID;
  v_supervisor_id UUID;
  v_central_id UUID;
  v_system_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO v_officer_id FROM auth.users WHERE email = 'officer@hoabinh.vn';
  SELECT id INTO v_supervisor_id FROM auth.users WHERE email = 'supervisor@hoabinh.vn';
  SELECT id INTO v_central_id FROM auth.users WHERE email = 'central@admin.vn';
  SELECT id INTO v_system_id FROM auth.users WHERE email = 'system@admin.vn';

  -- Create profiles if they don't exist
  INSERT INTO profiles (id, full_name, phone, police_id, unit)
  VALUES
    (v_officer_id, 'Nguyễn Văn An', '0901234567', 'CA001', 'Công an xã Hòa Bình'),
    (v_supervisor_id, 'Trần Thị Bình', '0901234568', 'CA002', 'Công an xã Hòa Bình'),
    (v_central_id, 'Lê Văn Cường', '0901234569', 'CA003', 'Công an Bộ - Cục C06'),
    (v_system_id, 'Phạm Thị Dung', '0901234570', 'CA004', 'Quản trị hệ thống')
  ON CONFLICT (id) DO NOTHING;

  -- Create web_users if they don't exist
  INSERT INTO web_users (profile_id, role, commune_code, district_code, province_code, permissions, is_active)
  VALUES
    (v_officer_id, 'commune_officer', '001', '001', '01', '{"can_create_survey": true}', true),
    (v_supervisor_id, 'commune_supervisor', '001', '001', '01', '{"can_review_survey": true}', true),
    (v_central_id, 'central_admin', NULL, NULL, NULL, '{"can_approve_final": true}', true),
    (v_system_id, 'system_admin', NULL, NULL, NULL, '{"full_access": true}', true)
  ON CONFLICT (profile_id) DO UPDATE
    SET is_active = true;

  RAISE NOTICE 'Data fixed successfully!';
END $$;
*/
