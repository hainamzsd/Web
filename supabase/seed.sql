-- SIMPLE SEED FILE
-- This creates profiles and roles for auth users that already exist
--
-- STEP 1: First create these 4 users manually in Supabase Dashboard:
--   Authentication > Users > Add User (email + auto-generate password)
--
--   1. officer@hoabinh.vn
--   2. supervisor@hoabinh.vn
--   3. central@admin.vn
--   4. system@admin.vn
--
-- STEP 2: After creating users, run this SQL file to add their profiles and roles

DO $$
DECLARE
  v_officer_id UUID;
  v_supervisor_id UUID;
  v_central_id UUID;
  v_system_id UUID;
BEGIN
  -- Get the auth user IDs from their emails
  SELECT id INTO v_officer_id FROM auth.users WHERE email = 'officer@hoabinh.vn';
  SELECT id INTO v_supervisor_id FROM auth.users WHERE email = 'supervisor@hoabinh.vn';
  SELECT id INTO v_central_id FROM auth.users WHERE email = 'central@admin.vn';
  SELECT id INTO v_system_id FROM auth.users WHERE email = 'system@admin.vn';

  -- Check if users exist
  IF v_officer_id IS NULL THEN
    RAISE EXCEPTION 'User officer@hoabinh.vn not found. Please create users in Auth Dashboard first!';
  END IF;

  IF v_supervisor_id IS NULL THEN
    RAISE EXCEPTION 'User supervisor@hoabinh.vn not found. Please create users in Auth Dashboard first!';
  END IF;

  IF v_central_id IS NULL THEN
    RAISE EXCEPTION 'User central@admin.vn not found. Please create users in Auth Dashboard first!';
  END IF;

  IF v_system_id IS NULL THEN
    RAISE EXCEPTION 'User system@admin.vn not found. Please create users in Auth Dashboard first!';
  END IF;

  -- Create profiles
  INSERT INTO profiles (id, full_name, phone, police_id, unit)
  VALUES
    (v_officer_id, 'Nguyễn Văn An', '0901234567', 'CA001', 'Công an xã Hòa Bình'),
    (v_supervisor_id, 'Trần Thị Bình', '0901234568', 'CA002', 'Công an xã Hòa Bình'),
    (v_central_id, 'Lê Văn Cường', '0901234569', 'CA003', 'Công an Bộ - Cục C06'),
    (v_system_id, 'Phạm Thị Dung', '0901234570', 'CA004', 'Quản trị hệ thống')
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        police_id = EXCLUDED.police_id,
        unit = EXCLUDED.unit;

  -- Create web_users with roles
  INSERT INTO web_users (profile_id, role, commune_code, district_code, province_code, permissions)
  VALUES
    -- Commune Officer
    (
      v_officer_id,
      'commune_officer',
      '001',
      '001',
      '01',
      '{"can_create_survey": true, "can_edit_own_survey": true, "can_submit_for_review": true}'
    ),
    -- Commune Supervisor
    (
      v_supervisor_id,
      'commune_supervisor',
      '001',
      '001',
      '01',
      '{"can_review_survey": true, "can_approve_commune": true, "can_reject_survey": true}'
    ),
    -- Central Admin
    (
      v_central_id,
      'central_admin',
      NULL,
      NULL,
      NULL,
      '{"can_approve_final": true, "can_assign_location_id": true, "can_publish_data": true, "can_view_all": true}'
    ),
    -- System Admin
    (
      v_system_id,
      'system_admin',
      NULL,
      NULL,
      NULL,
      '{"full_access": true, "can_manage_users": true, "can_manage_system_config": true}'
    )
  ON CONFLICT (profile_id) DO UPDATE
    SET role = EXCLUDED.role,
        commune_code = EXCLUDED.commune_code,
        district_code = EXCLUDED.district_code,
        province_code = EXCLUDED.province_code,
        permissions = EXCLUDED.permissions,
        is_active = true;

  -- Insert sample land parcels
  INSERT INTO land_parcels (
    parcel_code,
    province_code,
    district_code,
    ward_code,
    owner_name,
    owner_id_number,
    owner_phone,
    land_use_certificate_number,
    parcel_area_m2,
    land_use_type_code
  ) VALUES
    ('01-001-001-T001-001', '01', '001', '001', 'Nguyễn Văn Xuân', '001234567890', '0912345678', 'GCN-001', 150.5, 'residential'),
    ('01-001-001-T002-002', '01', '001', '001', 'Trần Thị Yến', '001234567891', '0912345679', 'GCN-002', 200.0, 'residential'),
    ('01-001-001-T003-003', '01', '001', '001', 'Lê Văn Zung', '001234567892', '0912345680', 'GCN-003', 500.0, 'commercial'),
    ('01-001-001-T004-004', '01', '001', '001', 'Hoàng Thị Mai', '001234567893', '0912345681', 'GCN-004', 300.0, 'agricultural')
  ON CONFLICT (parcel_code) DO NOTHING;

  -- Insert sample survey locations
  INSERT INTO survey_locations (
    surveyor_id,
    location_name,
    address,
    house_number,
    street,
    hamlet,
    ward_code,
    district_code,
    province_code,
    latitude,
    longitude,
    accuracy,
    object_type,
    land_use_type,
    owner_name,
    owner_id_number,
    owner_phone,
    parcel_code,
    land_area_m2,
    status,
    notes
  ) VALUES
    (
      v_officer_id,
      'Nhà ông Nguyễn Văn Xuân',
      'Thôn 1, Xã Hòa Bình',
      '123',
      'Đường Lê Lợi',
      'Thôn 1',
      '001',
      '001',
      '01',
      21.028511,
      105.804817,
      5.0,
      'house',
      'residential',
      'Nguyễn Văn Xuân',
      '001234567890',
      '0912345678',
      '01-001-001-T001-001',
      150.5,
      'pending',
      'Survey khảo sát ban đầu'
    ),
    (
      v_officer_id,
      'Nhà bà Trần Thị Yến',
      'Thôn 2, Xã Hòa Bình',
      '456',
      'Đường Trần Hưng Đạo',
      'Thôn 2',
      '001',
      '001',
      '01',
      21.029511,
      105.805817,
      5.0,
      'house',
      'residential',
      'Trần Thị Yến',
      '001234567891',
      '0912345679',
      '01-001-001-T002-002',
      200.0,
      'reviewed',
      'Đã qua xem xét cấp xã'
    ),
    (
      v_officer_id,
      'Cửa hàng ông Lê Văn Zung',
      'Thôn 3, Xã Hòa Bình',
      '789',
      'Đường Hùng Vương',
      'Thôn 3',
      '001',
      '001',
      '01',
      21.030511,
      105.806817,
      5.0,
      'commercial_building',
      'commercial',
      'Lê Văn Zung',
      '001234567892',
      '0912345680',
      '01-001-001-T003-003',
      500.0,
      'approved',
      'Đã được phê duyệt'
    )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Seed completed successfully!';
  RAISE NOTICE 'Created profiles and roles for:';
  RAISE NOTICE '  • officer@hoabinh.vn (Commune Officer)';
  RAISE NOTICE '  • supervisor@hoabinh.vn (Commune Supervisor)';
  RAISE NOTICE '  • central@admin.vn (Central Admin)';
  RAISE NOTICE '  • system@admin.vn (System Admin)';
  RAISE NOTICE '';
  RAISE NOTICE 'Sample data: 4 land parcels, 3 survey locations';

END $$;
