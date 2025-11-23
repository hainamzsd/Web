-- QUICK SCRIPT: Add role to an existing user
-- Use this to quickly assign a role to a user who already exists in auth.users

-- ============================================
-- INSTRUCTIONS:
-- 1. Replace the email and user details below
-- 2. Choose the appropriate role
-- 3. Run this script
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT := 'user@example.com';  -- REPLACE THIS
  v_full_name TEXT := 'Full Name';          -- REPLACE THIS
  v_phone TEXT := '0901234567';             -- REPLACE THIS
  v_police_id TEXT := 'CA001';              -- REPLACE THIS
  v_unit TEXT := 'Công an xã ABC';          -- REPLACE THIS
  v_role TEXT := 'commune_officer';         -- CHANGE THIS: commune_officer, commune_supervisor, central_admin, system_admin
  v_commune_code TEXT := '001';             -- CHANGE THIS (or NULL for admins)
  v_district_code TEXT := '001';            -- CHANGE THIS (or NULL for admins)
  v_province_code TEXT := '01';             -- CHANGE THIS (or NULL for admins)
BEGIN

  -- Find the user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users!', v_user_email;
  END IF;

  RAISE NOTICE 'Found user: % (ID: %)', v_user_email, v_user_id;

  -- Create or update profile
  INSERT INTO profiles (id, full_name, phone, police_id, unit)
  VALUES (v_user_id, v_full_name, v_phone, v_police_id, v_unit)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        police_id = EXCLUDED.police_id,
        unit = EXCLUDED.unit,
        updated_at = NOW();

  RAISE NOTICE '✓ Profile created/updated';

  -- Assign role
  INSERT INTO web_users (profile_id, role, commune_code, district_code, province_code, is_active)
  VALUES (v_user_id, v_role, v_commune_code, v_district_code, v_province_code, true)
  ON CONFLICT (profile_id) DO UPDATE
    SET role = EXCLUDED.role,
        commune_code = EXCLUDED.commune_code,
        district_code = EXCLUDED.district_code,
        province_code = EXCLUDED.province_code,
        is_active = true,
        updated_at = NOW();

  RAISE NOTICE '✓ Role assigned: %', v_role;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUCCESS! User now has role: %', v_role;
  RAISE NOTICE 'Email: %', v_user_email;
  RAISE NOTICE 'Location: Province %, District %, Commune %', v_province_code, v_district_code, v_commune_code;
  RAISE NOTICE '========================================';

END $$;
