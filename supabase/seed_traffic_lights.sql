-- =====================================================
-- SEED FILE: Traffic Light Demo Data
-- =====================================================
-- This creates surveys with status 'approved_central'
-- that have location_identifiers assigned.
-- Traffic lights ONLY display for these surveys.
-- =====================================================

-- Use a single transaction for all operations
BEGIN;

-- =====================================================
-- STEP 0: CLEANUP - Remove existing traffic light demo data
-- =====================================================

-- Delete location_identifiers for demo surveys
DELETE FROM location_identifiers
WHERE survey_location_id IN (
  SELECT id FROM survey_locations
  WHERE location_name LIKE 'TL-DEMO-%'
);

-- Delete approval_history for demo surveys
DELETE FROM approval_history
WHERE survey_location_id IN (
  SELECT id FROM survey_locations
  WHERE location_name LIKE 'TL-DEMO-%'
);

-- Delete entry points for demo surveys
DELETE FROM survey_entry_points
WHERE survey_location_id IN (
  SELECT id FROM survey_locations
  WHERE location_name LIKE 'TL-DEMO-%'
);

-- Delete the demo surveys themselves
DELETE FROM survey_locations WHERE location_name LIKE 'TL-DEMO-%';

-- =====================================================
-- STEP 1: Create approved_central surveys with location identifiers
-- These are the ONLY surveys that should show as traffic lights
-- =====================================================

-- We need a valid surveyor_id. Get one from existing profiles or create temp variable
DO $$
DECLARE
  v_surveyor_id UUID;
  v_central_admin_id UUID;
  v_survey_id_1 UUID;
  v_survey_id_2 UUID;
  v_survey_id_3 UUID;
  v_survey_id_4 UUID;
  v_survey_id_5 UUID;
  v_survey_id_6 UUID;
  v_survey_id_7 UUID;
  v_survey_id_8 UUID;
BEGIN
  -- Get an existing profile to use as surveyor (or use a default UUID if none exists)
  SELECT id INTO v_surveyor_id FROM profiles LIMIT 1;
  IF v_surveyor_id IS NULL THEN
    v_surveyor_id := '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;

  -- Get a central admin for assigning location identifiers
  SELECT p.id INTO v_central_admin_id
  FROM profiles p
  JOIN web_users wu ON wu.profile_id = p.id
  WHERE wu.role = 'central_admin'
  LIMIT 1;

  IF v_central_admin_id IS NULL THEN
    v_central_admin_id := v_surveyor_id;
  END IF;

  -- Generate UUIDs for surveys
  v_survey_id_1 := gen_random_uuid();
  v_survey_id_2 := gen_random_uuid();
  v_survey_id_3 := gen_random_uuid();
  v_survey_id_4 := gen_random_uuid();
  v_survey_id_5 := gen_random_uuid();
  v_survey_id_6 := gen_random_uuid();
  v_survey_id_7 := gen_random_uuid();
  v_survey_id_8 := gen_random_uuid();

  -- =====================================================
  -- Survey 1: Trụ sở UBND phường Ba Đình (approved_central, active)
  -- =====================================================
  INSERT INTO survey_locations (
    id, surveyor_id, location_name, address, house_number, street, hamlet,
    latitude, longitude, accuracy, object_type, land_use_type,
    representative_name, representative_id_number, representative_phone,
    status, province_id, ward_id, created_at, updated_at
  ) VALUES (
    v_survey_id_1, v_surveyor_id,
    'TL-DEMO-Trụ sở UBND phường Ba Đình',
    'Số 25, Phố Liễu Giai, Phường Ba Đình, Hà Nội',
    '25', 'Phố Liễu Giai', NULL,
    21.0358, 105.8200, 5.0,
    'Công trình công cộng', 'Đất cơ quan',
    'Nguyễn Văn An', '001234567890', '0912345678',
    'approved_central', 1, 4,
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'
  );

  INSERT INTO location_identifiers (
    id, survey_location_id, location_id, admin_code, sequence_number,
    assigned_by, assigned_at, is_active
  ) VALUES (
    gen_random_uuid(), v_survey_id_1,
    'HN-BD-2024-0001', '01-004', '0001',
    v_central_admin_id, NOW() - INTERVAL '2 days', TRUE
  );

  -- Update survey with final_location_id
  UPDATE survey_locations SET final_location_id = 'HN-BD-2024-0001', location_identifier = 'HN-BD-2024-0001' WHERE id = v_survey_id_1;

  -- =====================================================
  -- Survey 2: Chợ Đồng Xuân (approved_central, active)
  -- =====================================================
  INSERT INTO survey_locations (
    id, surveyor_id, location_name, address, house_number, street, hamlet,
    latitude, longitude, accuracy, object_type, land_use_type,
    representative_name, representative_id_number, representative_phone,
    status, province_id, ward_id, created_at, updated_at
  ) VALUES (
    v_survey_id_2, v_surveyor_id,
    'TL-DEMO-Chợ Đồng Xuân',
    'Phố Đồng Xuân, Phường Đồng Xuân, Quận Hoàn Kiếm, Hà Nội',
    NULL, 'Phố Đồng Xuân', NULL,
    21.0389, 105.8500, 4.5,
    'Chợ/Trung tâm thương mại', 'Đất thương mại',
    'Trần Thị Bình', '001987654321', '0923456789',
    'approved_central', 1, 70,
    NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days'
  );

  INSERT INTO location_identifiers (
    id, survey_location_id, location_id, admin_code, sequence_number,
    assigned_by, assigned_at, is_active
  ) VALUES (
    gen_random_uuid(), v_survey_id_2,
    'HN-HK-2024-0001', '01-070', '0001',
    v_central_admin_id, NOW() - INTERVAL '3 days', TRUE
  );

  UPDATE survey_locations SET final_location_id = 'HN-HK-2024-0001', location_identifier = 'HN-HK-2024-0001' WHERE id = v_survey_id_2;

  -- =====================================================
  -- Survey 3: Trường THPT Chu Văn An (approved_central, active)
  -- =====================================================
  INSERT INTO survey_locations (
    id, surveyor_id, location_name, address, house_number, street, hamlet,
    latitude, longitude, accuracy, object_type, land_use_type,
    representative_name, representative_id_number, representative_phone,
    status, province_id, ward_id, created_at, updated_at
  ) VALUES (
    v_survey_id_3, v_surveyor_id,
    'TL-DEMO-Trường THPT Chu Văn An',
    'Số 10, Phố Thụy Khuê, Quận Tây Hồ, Hà Nội',
    '10', 'Phố Thụy Khuê', NULL,
    21.0456, 105.8150, 3.8,
    'Trường học', 'Đất giáo dục',
    'Lê Văn Cường', '001122334455', '0934567890',
    'approved_central', 1, 4,
    NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days'
  );

  INSERT INTO location_identifiers (
    id, survey_location_id, location_id, admin_code, sequence_number,
    assigned_by, assigned_at, is_active
  ) VALUES (
    gen_random_uuid(), v_survey_id_3,
    'HN-BD-2024-0002', '01-004', '0002',
    v_central_admin_id, NOW() - INTERVAL '5 days', TRUE
  );

  UPDATE survey_locations SET final_location_id = 'HN-BD-2024-0002', location_identifier = 'HN-BD-2024-0002' WHERE id = v_survey_id_3;

  -- =====================================================
  -- Survey 4: Bệnh viện Bạch Mai (approved_central, active)
  -- =====================================================
  INSERT INTO survey_locations (
    id, surveyor_id, location_name, address, house_number, street, hamlet,
    latitude, longitude, accuracy, object_type, land_use_type,
    representative_name, representative_id_number, representative_phone,
    status, province_id, ward_id, created_at, updated_at
  ) VALUES (
    v_survey_id_4, v_surveyor_id,
    'TL-DEMO-Bệnh viện Bạch Mai',
    'Số 78, Đường Giải Phóng, Quận Hai Bà Trưng, Hà Nội',
    '78', 'Đường Giải Phóng', NULL,
    21.0010, 105.8430, 4.2,
    'Bệnh viện/Cơ sở y tế', 'Đất y tế',
    'Phạm Thị Dung', '001555666777', '0945678901',
    'approved_central', 1, 256,
    NOW() - INTERVAL '18 days', NOW() - INTERVAL '4 days'
  );

  INSERT INTO location_identifiers (
    id, survey_location_id, location_id, admin_code, sequence_number,
    assigned_by, assigned_at, is_active
  ) VALUES (
    gen_random_uuid(), v_survey_id_4,
    'HN-HBT-2024-0001', '01-256', '0001',
    v_central_admin_id, NOW() - INTERVAL '4 days', TRUE
  );

  UPDATE survey_locations SET final_location_id = 'HN-HBT-2024-0001', location_identifier = 'HN-HBT-2024-0001' WHERE id = v_survey_id_4;

  -- =====================================================
  -- Survey 5: Công viên Thống Nhất (approved_central, active)
  -- =====================================================
  INSERT INTO survey_locations (
    id, surveyor_id, location_name, address, house_number, street, hamlet,
    latitude, longitude, accuracy, object_type, land_use_type,
    representative_name, representative_id_number, representative_phone,
    status, province_id, ward_id, created_at, updated_at
  ) VALUES (
    v_survey_id_5, v_surveyor_id,
    'TL-DEMO-Công viên Thống Nhất',
    'Đường Trần Nhân Tông, Quận Hai Bà Trưng, Hà Nội',
    NULL, 'Đường Trần Nhân Tông', NULL,
    21.0115, 105.8490, 6.0,
    'Công viên/Khu vui chơi', 'Đất công viên',
    'Hoàng Văn Em', '001888999000', '0956789012',
    'approved_central', 1, 256,
    NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day'
  );

  INSERT INTO location_identifiers (
    id, survey_location_id, location_id, admin_code, sequence_number,
    assigned_by, assigned_at, is_active
  ) VALUES (
    gen_random_uuid(), v_survey_id_5,
    'HN-HBT-2024-0002', '01-256', '0002',
    v_central_admin_id, NOW() - INTERVAL '1 day', TRUE
  );

  UPDATE survey_locations SET final_location_id = 'HN-HBT-2024-0002', location_identifier = 'HN-HBT-2024-0002' WHERE id = v_survey_id_5;

  -- =====================================================
  -- Survey 6: Đại học Bách khoa Hà Nội (approved_central, active)
  -- =====================================================
  INSERT INTO survey_locations (
    id, surveyor_id, location_name, address, house_number, street, hamlet,
    latitude, longitude, accuracy, object_type, land_use_type,
    representative_name, representative_id_number, representative_phone,
    status, province_id, ward_id, created_at, updated_at
  ) VALUES (
    v_survey_id_6, v_surveyor_id,
    'TL-DEMO-Đại học Bách khoa Hà Nội',
    'Số 1, Đại Cồ Việt, Quận Hai Bà Trưng, Hà Nội',
    '1', 'Đại Cồ Việt', NULL,
    21.0045, 105.8468, 3.5,
    'Trường đại học', 'Đất giáo dục',
    'Vũ Thị Phương', '001777888999', '0967890123',
    'approved_central', 1, 256,
    NOW() - INTERVAL '12 days', NOW() - INTERVAL '6 hours'
  );

  INSERT INTO location_identifiers (
    id, survey_location_id, location_id, admin_code, sequence_number,
    assigned_by, assigned_at, is_active
  ) VALUES (
    gen_random_uuid(), v_survey_id_6,
    'HN-HBT-2024-0003', '01-256', '0003',
    v_central_admin_id, NOW() - INTERVAL '6 hours', TRUE
  );

  UPDATE survey_locations SET final_location_id = 'HN-HBT-2024-0003', location_identifier = 'HN-HBT-2024-0003' WHERE id = v_survey_id_6;

  -- =====================================================
  -- Survey 7: Nhà hát lớn Hà Nội (approved_central, DEACTIVATED location)
  -- This one has is_active = FALSE to test deactivated status (RED light)
  -- =====================================================
  INSERT INTO survey_locations (
    id, surveyor_id, location_name, address, house_number, street, hamlet,
    latitude, longitude, accuracy, object_type, land_use_type,
    representative_name, representative_id_number, representative_phone,
    status, province_id, ward_id, created_at, updated_at
  ) VALUES (
    v_survey_id_7, v_surveyor_id,
    'TL-DEMO-Nhà hát lớn Hà Nội',
    'Số 1, Tràng Tiền, Quận Hoàn Kiếm, Hà Nội',
    '1', 'Tràng Tiền', NULL,
    21.0245, 105.8575, 4.0,
    'Nhà hát/Trung tâm văn hóa', 'Đất văn hóa',
    'Ngô Văn Giang', '001444555666', '0978901234',
    'approved_central', 1, 70,
    NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days'
  );

  INSERT INTO location_identifiers (
    id, survey_location_id, location_id, admin_code, sequence_number,
    assigned_by, assigned_at, is_active,
    deactivated_at, deactivated_by, deactivation_reason
  ) VALUES (
    gen_random_uuid(), v_survey_id_7,
    'HN-HK-2024-0002', '01-070', '0002',
    v_central_admin_id, NOW() - INTERVAL '35 days', FALSE,
    NOW() - INTERVAL '10 days', v_central_admin_id, 'Thay đổi quy hoạch khu vực'
  );

  UPDATE survey_locations SET final_location_id = 'HN-HK-2024-0002', location_identifier = 'HN-HK-2024-0002' WHERE id = v_survey_id_7;

  -- =====================================================
  -- Survey 8: Ga Hà Nội (approved_central, DEACTIVATED location)
  -- Another deactivated one (RED light)
  -- =====================================================
  INSERT INTO survey_locations (
    id, surveyor_id, location_name, address, house_number, street, hamlet,
    latitude, longitude, accuracy, object_type, land_use_type,
    representative_name, representative_id_number, representative_phone,
    status, province_id, ward_id, created_at, updated_at
  ) VALUES (
    v_survey_id_8, v_surveyor_id,
    'TL-DEMO-Ga Hà Nội',
    'Số 120, Đường Lê Duẩn, Quận Đống Đa, Hà Nội',
    '120', 'Đường Lê Duẩn', NULL,
    21.0252, 105.8412, 5.5,
    'Ga tàu/Bến xe', 'Đất giao thông',
    'Đinh Thị Hương', '001333444555', '0989012345',
    'approved_central', 1, 167,
    NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days'
  );

  INSERT INTO location_identifiers (
    id, survey_location_id, location_id, admin_code, sequence_number,
    assigned_by, assigned_at, is_active,
    deactivated_at, deactivated_by, deactivation_reason
  ) VALUES (
    gen_random_uuid(), v_survey_id_8,
    'HN-CG-2024-0001', '01-167', '0001',
    v_central_admin_id, NOW() - INTERVAL '40 days', FALSE,
    NOW() - INTERVAL '15 days', v_central_admin_id, 'Sai sót trong quá trình khảo sát ban đầu'
  );

  UPDATE survey_locations SET final_location_id = 'HN-CG-2024-0001', location_identifier = 'HN-CG-2024-0001' WHERE id = v_survey_id_8;

  -- =====================================================
  -- Add approval history for all surveys
  -- =====================================================

  -- Survey 1 history
  INSERT INTO approval_history (survey_location_id, action, actor_id, actor_role, previous_status, new_status, notes, created_at)
  VALUES
    (v_survey_id_1, 'submitted', v_surveyor_id, 'surveyor', 'draft', 'pending', 'Đã nộp khảo sát', NOW() - INTERVAL '28 days'),
    (v_survey_id_1, 'approved', v_central_admin_id, 'commune_supervisor', 'pending', 'approved_commune', 'Đã xác minh thông tin', NOW() - INTERVAL '20 days'),
    (v_survey_id_1, 'approved', v_central_admin_id, 'central_admin', 'approved_commune', 'approved_central', 'Phê duyệt cấp trung ương và gán mã định danh', NOW() - INTERVAL '2 days');

  -- Survey 2 history
  INSERT INTO approval_history (survey_location_id, action, actor_id, actor_role, previous_status, new_status, notes, created_at)
  VALUES
    (v_survey_id_2, 'submitted', v_surveyor_id, 'surveyor', 'draft', 'pending', 'Đã nộp khảo sát', NOW() - INTERVAL '23 days'),
    (v_survey_id_2, 'approved', v_central_admin_id, 'commune_supervisor', 'pending', 'approved_commune', 'Đã xác minh thông tin', NOW() - INTERVAL '15 days'),
    (v_survey_id_2, 'approved', v_central_admin_id, 'central_admin', 'approved_commune', 'approved_central', 'Phê duyệt cấp trung ương và gán mã định danh', NOW() - INTERVAL '3 days');

  -- Survey 3 history
  INSERT INTO approval_history (survey_location_id, action, actor_id, actor_role, previous_status, new_status, notes, created_at)
  VALUES
    (v_survey_id_3, 'submitted', v_surveyor_id, 'surveyor', 'draft', 'pending', 'Đã nộp khảo sát', NOW() - INTERVAL '18 days'),
    (v_survey_id_3, 'approved', v_central_admin_id, 'commune_supervisor', 'pending', 'approved_commune', 'Đã xác minh thông tin', NOW() - INTERVAL '12 days'),
    (v_survey_id_3, 'approved', v_central_admin_id, 'central_admin', 'approved_commune', 'approved_central', 'Phê duyệt cấp trung ương và gán mã định danh', NOW() - INTERVAL '5 days');

  -- Survey 4 history
  INSERT INTO approval_history (survey_location_id, action, actor_id, actor_role, previous_status, new_status, notes, created_at)
  VALUES
    (v_survey_id_4, 'submitted', v_surveyor_id, 'surveyor', 'draft', 'pending', 'Đã nộp khảo sát', NOW() - INTERVAL '16 days'),
    (v_survey_id_4, 'approved', v_central_admin_id, 'commune_supervisor', 'pending', 'approved_commune', 'Đã xác minh thông tin', NOW() - INTERVAL '10 days'),
    (v_survey_id_4, 'approved', v_central_admin_id, 'central_admin', 'approved_commune', 'approved_central', 'Phê duyệt cấp trung ương và gán mã định danh', NOW() - INTERVAL '4 days');

  -- Survey 5 history
  INSERT INTO approval_history (survey_location_id, action, actor_id, actor_role, previous_status, new_status, notes, created_at)
  VALUES
    (v_survey_id_5, 'submitted', v_surveyor_id, 'surveyor', 'draft', 'pending', 'Đã nộp khảo sát', NOW() - INTERVAL '13 days'),
    (v_survey_id_5, 'approved', v_central_admin_id, 'commune_supervisor', 'pending', 'approved_commune', 'Đã xác minh thông tin', NOW() - INTERVAL '7 days'),
    (v_survey_id_5, 'approved', v_central_admin_id, 'central_admin', 'approved_commune', 'approved_central', 'Phê duyệt cấp trung ương và gán mã định danh', NOW() - INTERVAL '1 day');

  -- Survey 6 history
  INSERT INTO approval_history (survey_location_id, action, actor_id, actor_role, previous_status, new_status, notes, created_at)
  VALUES
    (v_survey_id_6, 'submitted', v_surveyor_id, 'surveyor', 'draft', 'pending', 'Đã nộp khảo sát', NOW() - INTERVAL '10 days'),
    (v_survey_id_6, 'approved', v_central_admin_id, 'commune_supervisor', 'pending', 'approved_commune', 'Đã xác minh thông tin', NOW() - INTERVAL '5 days'),
    (v_survey_id_6, 'approved', v_central_admin_id, 'central_admin', 'approved_commune', 'approved_central', 'Phê duyệt cấp trung ương và gán mã định danh', NOW() - INTERVAL '6 hours');

  -- Survey 7 history (deactivated - note: deactivation is tracked in location_identifiers table, not approval_history)
  INSERT INTO approval_history (survey_location_id, action, actor_id, actor_role, previous_status, new_status, notes, created_at)
  VALUES
    (v_survey_id_7, 'submitted', v_surveyor_id, 'surveyor', 'draft', 'pending', 'Đã nộp khảo sát', NOW() - INTERVAL '38 days'),
    (v_survey_id_7, 'approved', v_central_admin_id, 'commune_supervisor', 'pending', 'approved_commune', 'Đã xác minh thông tin', NOW() - INTERVAL '36 days'),
    (v_survey_id_7, 'approved', v_central_admin_id, 'central_admin', 'approved_commune', 'approved_central', 'Phê duyệt cấp trung ương và gán mã định danh', NOW() - INTERVAL '35 days');
  -- Note: Location identifier deactivation is recorded in location_identifiers.deactivated_at, not in approval_history

  -- Survey 8 history (deactivated - note: deactivation is tracked in location_identifiers table, not approval_history)
  INSERT INTO approval_history (survey_location_id, action, actor_id, actor_role, previous_status, new_status, notes, created_at)
  VALUES
    (v_survey_id_8, 'submitted', v_surveyor_id, 'surveyor', 'draft', 'pending', 'Đã nộp khảo sát', NOW() - INTERVAL '43 days'),
    (v_survey_id_8, 'approved', v_central_admin_id, 'commune_supervisor', 'pending', 'approved_commune', 'Đã xác minh thông tin', NOW() - INTERVAL '42 days'),
    (v_survey_id_8, 'approved', v_central_admin_id, 'central_admin', 'approved_commune', 'approved_central', 'Phê duyệt cấp trung ương và gán mã định danh', NOW() - INTERVAL '40 days');
  -- Note: Location identifier deactivation is recorded in location_identifiers.deactivated_at, not in approval_history

  RAISE NOTICE 'Traffic light demo data created successfully!';
  RAISE NOTICE 'Created 8 surveys with location identifiers:';
  RAISE NOTICE '- 6 ACTIVE (GREEN lights): HN-BD-2024-0001, HN-HK-2024-0001, HN-BD-2024-0002, HN-HBT-2024-0001, HN-HBT-2024-0002, HN-HBT-2024-0003';
  RAISE NOTICE '- 2 DEACTIVATED (RED lights): HN-HK-2024-0002, HN-CG-2024-0001';

END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERY
-- Run this to verify the data was created correctly
-- =====================================================
-- SELECT
--   sl.location_name,
--   sl.status,
--   sl.final_location_id,
--   li.location_id,
--   li.is_active,
--   CASE
--     WHEN li.is_active = TRUE THEN 'GREEN (Active)'
--     WHEN li.is_active = FALSE THEN 'RED (Deactivated)'
--     ELSE 'N/A'
--   END as traffic_light_status
-- FROM survey_locations sl
-- LEFT JOIN location_identifiers li ON li.survey_location_id = sl.id
-- WHERE sl.location_name LIKE 'TL-DEMO-%'
-- ORDER BY sl.created_at;
