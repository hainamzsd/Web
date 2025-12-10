-- ============================================
-- COMPREHENSIVE MOCK DATA SEEDING SCRIPT
-- For Land Survey Management System
-- ============================================
-- Run this script after all migrations have been applied
-- This creates realistic Vietnamese mock data for testing
-- NOTE: provinces and wards tables already have data - skipping those

-- ============================================
-- STEP 0: CLEANUP EXISTING MOCK DATA
-- ============================================
-- Delete in reverse order of dependencies to avoid FK violations

-- Delete sync_events for mock surveys
DELETE FROM sync_events WHERE payload::text LIKE '%d1000000-0000-0000-0000%' OR payload::text LIKE '%d2000000-0000-0000-0000%';

-- Delete audit_logs for mock surveys
DELETE FROM audit_logs WHERE resource_id IN (
  'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002',
  'd3000000-0000-0000-0000-000000000003', 'd4000000-0000-0000-0000-000000000004',
  'd5000000-0000-0000-0000-000000000005', 'd6000000-0000-0000-0000-000000000006',
  'd7000000-0000-0000-0000-000000000007', 'd8000000-0000-0000-0000-000000000008',
  'd9000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000010'
);

-- Delete location_identifiers for mock surveys
DELETE FROM location_identifiers WHERE survey_location_id IN (
  'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002',
  'd3000000-0000-0000-0000-000000000003', 'd4000000-0000-0000-0000-000000000004',
  'd5000000-0000-0000-0000-000000000005', 'd6000000-0000-0000-0000-000000000006',
  'd7000000-0000-0000-0000-000000000007', 'd8000000-0000-0000-0000-000000000008',
  'd9000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000010'
);

-- Delete approval_history for mock surveys
DELETE FROM approval_history WHERE survey_location_id IN (
  'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002',
  'd3000000-0000-0000-0000-000000000003', 'd4000000-0000-0000-0000-000000000004',
  'd5000000-0000-0000-0000-000000000005', 'd6000000-0000-0000-0000-000000000006',
  'd7000000-0000-0000-0000-000000000007', 'd8000000-0000-0000-0000-000000000008',
  'd9000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000010'
);

-- Delete survey_entry_points for mock surveys
DELETE FROM survey_entry_points WHERE survey_location_id IN (
  'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002',
  'd3000000-0000-0000-0000-000000000003', 'd4000000-0000-0000-0000-000000000004',
  'd5000000-0000-0000-0000-000000000005', 'd6000000-0000-0000-0000-000000000006',
  'd7000000-0000-0000-0000-000000000007', 'd8000000-0000-0000-0000-000000000008',
  'd9000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000010'
);

-- Delete mock survey_locations
DELETE FROM survey_locations WHERE id IN (
  'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002',
  'd3000000-0000-0000-0000-000000000003', 'd4000000-0000-0000-0000-000000000004',
  'd5000000-0000-0000-0000-000000000005', 'd6000000-0000-0000-0000-000000000006',
  'd7000000-0000-0000-0000-000000000007', 'd8000000-0000-0000-0000-000000000008',
  'd9000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000010'
);

-- Delete land_parcel_uses for mock parcels
DELETE FROM land_parcel_uses WHERE land_parcel_id IN (
  'b1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002',
  'b3000000-0000-0000-0000-000000000003', 'b4000000-0000-0000-0000-000000000004',
  'b5000000-0000-0000-0000-000000000005', 'b6000000-0000-0000-0000-000000000006',
  'b7000000-0000-0000-0000-000000000007', 'b8000000-0000-0000-0000-000000000008'
);

-- Delete land_parcel_owners for mock parcels
DELETE FROM land_parcel_owners WHERE land_parcel_id IN (
  'b1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002',
  'b3000000-0000-0000-0000-000000000003', 'b4000000-0000-0000-0000-000000000004',
  'b5000000-0000-0000-0000-000000000005', 'b6000000-0000-0000-0000-000000000006',
  'b7000000-0000-0000-0000-000000000007', 'b8000000-0000-0000-0000-000000000008'
);

-- Delete mock land_parcels
DELETE FROM land_parcels WHERE id IN (
  'b1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002',
  'b3000000-0000-0000-0000-000000000003', 'b4000000-0000-0000-0000-000000000004',
  'b5000000-0000-0000-0000-000000000005', 'b6000000-0000-0000-0000-000000000006',
  'b7000000-0000-0000-0000-000000000007', 'b8000000-0000-0000-0000-000000000008'
);

-- Delete mock land_certificates
DELETE FROM land_certificates WHERE id IN (
  'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002',
  'a3000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000004',
  'a5000000-0000-0000-0000-000000000005', 'a6000000-0000-0000-0000-000000000006',
  'a7000000-0000-0000-0000-000000000007', 'a8000000-0000-0000-0000-000000000008'
);

-- ============================================
-- USING EXISTING PROFILES AND WEB_USERS
-- ============================================
-- Existing profiles in database:
--   '829f9023-f4ac-4c88-b886-5e29f81a7539' - Lê Văn Cường (central_admin)
--   '9855c15e-636c-4439-8359-4cde9c6b098d' - Phạm Thị Dung (system_admin)
--   '4963a49e-b48f-432a-86a8-656ccdd4e5f5' - Nguyễn Văn A (commune_officer)
--   '5b81f6a7-9877-4918-8437-cb2cf485846a' - Nguyễn Văn An (commune_officer)
--   'e715550c-24b2-4e20-98f0-6c9ee028e640' - Trần Thị Bình (commune_supervisor)
--
-- Existing web_users:
--   '2fdb68e2-ee82-4fe3-9583-3b793cadd22d' - central_admin
--   '4703d154-f7a6-40f4-9bd5-7f5cf5141646' - system_admin
--   '94b16011-4d89-4571-866e-17e64f2c0348' - commune_officer
--   '0fd6c699-7f68-4691-b830-209c67cb8ffb' - commune_officer
--   '196d0f08-c2fb-4970-a779-3fa46a1285b7' - commune_supervisor
--
-- SKIPPING profiles and web_users creation - using existing ones

-- ============================================
-- STEP 1: LAND CERTIFICATES (Giấy chứng nhận QSDĐ)
-- ============================================
-- Using Hà Nội (province_code=1) with actual ward codes:
--   4 = Phường Ba Đình
--   70 = Phường Hoàn Kiếm
--   167 = Phường Cầu Giấy
--   256 = Phường Hai Bà Trưng
--   319 = Phường Hoàng Mai
--   9556 = Phường Hà Đông
INSERT INTO land_certificates (id, certificate_number, certificate_book_number, certificate_serial, issue_date, issuing_authority, province_id, ward_id, api_source, is_active)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'MOCK-HN-123456', 'CS 00123', 'HN 123456', '2020-05-15', 'Sở Tài nguyên và Môi trường Thành phố Hà Nội', 1, 4, 'mock', true),
  ('a2000000-0000-0000-0000-000000000002', 'MOCK-HN-234567', 'CS 00456', 'HN 234567', '2019-08-22', 'Sở Tài nguyên và Môi trường Thành phố Hà Nội', 1, 4, 'mock', true),
  ('a3000000-0000-0000-0000-000000000003', 'MOCK-HN-345678', 'CS 00789', 'HN 345678', '2021-03-10', 'Sở Tài nguyên và Môi trường Thành phố Hà Nội', 1, 70, 'mock', true),
  ('a4000000-0000-0000-0000-000000000004', 'MOCK-HN-456789', 'CS 01234', 'HN 456789', '2018-11-05', 'Sở Tài nguyên và Môi trường Thành phố Hà Nội', 1, 70, 'mock', true),
  ('a5000000-0000-0000-0000-000000000005', 'MOCK-HN-567890', 'CS 05678', 'HN 567890', '2022-07-18', 'Sở Tài nguyên và Môi trường Thành phố Hà Nội', 1, 167, 'mock', true),
  ('a6000000-0000-0000-0000-000000000006', 'MOCK-HN-678901', 'CS 06789', 'HN 678901', '2017-02-28', 'Sở Tài nguyên và Môi trường Thành phố Hà Nội', 1, 256, 'mock', true),
  ('a7000000-0000-0000-0000-000000000007', 'MOCK-HN-789012', 'CS 07890', 'HN 789012', '2023-01-15', 'Sở Tài nguyên và Môi trường Thành phố Hà Nội', 1, 319, 'mock', true),
  ('a8000000-0000-0000-0000-000000000008', 'MOCK-HN-890123', 'CS 08901', 'HN 890123', '2016-09-20', 'Sở Tài nguyên và Môi trường Thành phố Hà Nội', 1, 9556, 'mock', true)
ON CONFLICT (certificate_number) DO NOTHING;

-- ============================================
-- STEP 2: LAND PARCELS (Thửa đất)
-- ============================================
-- Using Hà Nội wards:
--   4 = Phường Ba Đình, 70 = Phường Hoàn Kiếm, 167 = Phường Cầu Giấy
--   256 = Phường Hai Bà Trưng, 319 = Phường Hoàng Mai, 9556 = Phường Hà Đông
INSERT INTO land_parcels (id, certificate_id, parcel_code, sheet_number, parcel_number, province_id, ward_id, address, total_area_m2, land_origin, legal_status)
VALUES
  -- Parcels for certificate 1 (Ba Đình)
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '01-004-001', '15', '123', 1, 4, '123 Đường Hoàng Diệu, Phường Ba Đình, Hà Nội', 250.5, 'Nhà nước giao đất có thu tiền sử dụng đất', 'active'),

  -- Parcels for certificate 2 (Ba Đình)
  ('b2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', '01-004-002', '15', '124', 1, 4, '125 Đường Hoàng Diệu, Phường Ba Đình, Hà Nội', 180.0, 'Nhận chuyển nhượng quyền sử dụng đất', 'active'),

  -- Parcels for certificate 3 (Hoàn Kiếm)
  ('b3000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000003', '01-070-001', '22', '456', 1, 70, '45 Phố Hàng Bài, Phường Hoàn Kiếm, Hà Nội', 320.0, 'Nhà nước giao đất không thu tiền sử dụng đất', 'active'),

  -- Parcels for certificate 4 (Hoàn Kiếm)
  ('b4000000-0000-0000-0000-000000000004', 'a4000000-0000-0000-0000-000000000004', '01-070-002', '22', '457', 1, 70, '47 Phố Hàng Bài, Phường Hoàn Kiếm, Hà Nội', 450.0, 'Được Nhà nước cho thuê đất trả tiền hàng năm', 'active'),

  -- Parcels for certificate 5 (Cầu Giấy)
  ('b5000000-0000-0000-0000-000000000005', 'a5000000-0000-0000-0000-000000000005', '01-167-001', '08', '789', 1, 167, '89 Đường Xuân Thủy, Phường Cầu Giấy, Hà Nội', 520.0, 'Nhận thừa kế quyền sử dụng đất', 'active'),

  -- Parcels for certificate 6 (Hai Bà Trưng)
  ('b6000000-0000-0000-0000-000000000006', 'a6000000-0000-0000-0000-000000000006', '01-256-001', '08', '790', 1, 256, '91 Phố Bà Triệu, Phường Hai Bà Trưng, Hà Nội', 380.0, 'Nhận tặng cho quyền sử dụng đất', 'active'),

  -- Parcels for certificate 7 (Hoàng Mai)
  ('b7000000-0000-0000-0000-000000000007', 'a7000000-0000-0000-0000-000000000007', '01-319-001', '12', '101', 1, 319, '15 Đường Giải Phóng, Phường Hoàng Mai, Hà Nội', 200.0, 'Nhà nước giao đất có thu tiền sử dụng đất', 'active'),

  -- Parcels for certificate 8 (Hà Đông)
  ('b8000000-0000-0000-0000-000000000008', 'a8000000-0000-0000-0000-000000000008', '01-9556-001', '18', '202', 1, 9556, '27 Đường Quang Trung, Phường Hà Đông, Hà Nội', 600.0, 'Được Nhà nước cho thuê đất trả tiền một lần', 'active')
ON CONFLICT (certificate_id, parcel_code) DO NOTHING;

-- ============================================
-- STEP 3: LAND PARCEL OWNERS (Chủ sở hữu thửa đất)
-- ============================================
INSERT INTO land_parcel_owners (land_parcel_id, owner_type, full_name, id_number, id_type, id_issue_date, id_issue_place, date_of_birth, gender, nationality, phone, email, permanent_address, ownership_share, ownership_type, is_primary_contact)
VALUES
  -- Parcel 1: Single owner (Ba Đình)
  ('b1000000-0000-0000-0000-000000000001', 'individual', 'Nguyễn Văn An', '001085001234', 'cccd', '2021-01-15', 'Cục CS QLHC về TTXH', '1975-03-20', 'male', 'Việt Nam', '0901234567', 'nguyenvanan@email.com', '123 Đường Hoàng Diệu, Phường Ba Đình, Hà Nội', 100.00, 'owner', true),

  -- Parcel 2: Couple (husband and wife) - Ba Đình
  ('b2000000-0000-0000-0000-000000000002', 'couple', 'Trần Văn Bình', '001080005678', 'cccd', '2020-06-10', 'Cục CS QLHC về TTXH', '1980-07-15', 'male', 'Việt Nam', '0912345678', 'tranvanbinh@email.com', '125 Đường Hoàng Diệu, Phường Ba Đình, Hà Nội', 50.00, 'owner', true),
  ('b2000000-0000-0000-0000-000000000002', 'couple', 'Lê Thị Cúc', '001082009876', 'cccd', '2020-06-10', 'Cục CS QLHC về TTXH', '1982-12-25', 'female', 'Việt Nam', '0923456789', 'lethicuc@email.com', '125 Đường Hoàng Diệu, Phường Ba Đình, Hà Nội', 50.00, 'co_owner', false),

  -- Parcel 3: Household with multiple members (Hoàn Kiếm)
  ('b3000000-0000-0000-0000-000000000003', 'household', 'Phạm Văn Dũng', '001075003456', 'cccd', '2019-09-20', 'Cục CS QLHC về TTXH', '1970-01-10', 'male', 'Việt Nam', '0934567890', 'phamvandung@email.com', '45 Phố Hàng Bài, Phường Hoàn Kiếm, Hà Nội', 40.00, 'owner', true),
  ('b3000000-0000-0000-0000-000000000003', 'household', 'Nguyễn Thị Em', '001078007890', 'cccd', '2019-09-20', 'Cục CS QLHC về TTXH', '1972-05-18', 'female', 'Việt Nam', '0945678901', 'nguyenthiem@email.com', '45 Phố Hàng Bài, Phường Hoàn Kiếm, Hà Nội', 30.00, 'co_owner', false),
  ('b3000000-0000-0000-0000-000000000003', 'household', 'Phạm Văn Phúc', '001095004567', 'cccd', '2021-03-15', 'Cục CS QLHC về TTXH', '1995-08-22', 'male', 'Việt Nam', '0956789012', 'phamvanphuc@email.com', '45 Phố Hàng Bài, Phường Hoàn Kiếm, Hà Nội', 30.00, 'co_owner', false),

  -- Parcel 4: Organization (Hoàn Kiếm)
  ('b4000000-0000-0000-0000-000000000004', 'organization', 'Công ty TNHH Đầu tư Xây dựng Hà Nội', '0100123456', 'tax_code', '2015-04-01', 'Sở KH&ĐT TP Hà Nội', NULL, NULL, 'Việt Nam', '02438123456', 'contact@hanoiconstruction.vn', '47 Phố Hàng Bài, Phường Hoàn Kiếm, Hà Nội', 100.00, 'owner', true),

  -- Parcel 5: Individual with representative (Cầu Giấy)
  ('b5000000-0000-0000-0000-000000000005', 'individual', 'Hoàng Thị Giang', '001065008901', 'cccd', '2018-11-20', 'Cục CS QLHC về TTXH', '1965-04-12', 'female', 'Việt Nam', '0967890123', 'hoangthigiang@email.com', '89 Đường Xuân Thủy, Phường Cầu Giấy, Hà Nội', 100.00, 'owner', false),
  ('b5000000-0000-0000-0000-000000000005', 'individual', 'Hoàng Văn Hải', '001090002345', 'cccd', '2020-02-28', 'Cục CS QLHC về TTXH', '1990-09-30', 'male', 'Việt Nam', '0978901234', 'hoangvanhai@email.com', '89 Đường Xuân Thủy, Phường Cầu Giấy, Hà Nội', 0.00, 'representative', true),

  -- Parcel 6: Single owner (Hai Bà Trưng)
  ('b6000000-0000-0000-0000-000000000006', 'individual', 'Đinh Văn Khánh', '001088006789', 'cccd', '2019-05-12', 'Cục CS QLHC về TTXH', '1988-11-30', 'male', 'Việt Nam', '0989012345', 'dinhvankhanh@email.com', '91 Phố Bà Triệu, Phường Hai Bà Trưng, Hà Nội', 100.00, 'owner', true),

  -- Parcel 7: Couple (Hoàng Mai)
  ('b7000000-0000-0000-0000-000000000007', 'couple', 'Lê Minh Tuấn', '001078001122', 'cccd', '2022-08-15', 'Cục CS QLHC về TTXH', '1978-06-25', 'male', 'Việt Nam', '0990123456', 'leminhtuan@email.com', '15 Đường Giải Phóng, Phường Hoàng Mai, Hà Nội', 50.00, 'owner', true),
  ('b7000000-0000-0000-0000-000000000007', 'couple', 'Trương Thị Lan', '001082003344', 'cccd', '2022-08-15', 'Cục CS QLHC về TTXH', '1982-02-14', 'female', 'Việt Nam', '0991234567', 'truongthilan@email.com', '15 Đường Giải Phóng, Phường Hoàng Mai, Hà Nội', 50.00, 'co_owner', false),

  -- Parcel 8: Organization (Hà Đông)
  ('b8000000-0000-0000-0000-000000000008', 'organization', 'Công ty Cổ phần Thương mại Hà Đông', '0100789012', 'tax_code', '2010-01-10', 'Sở KH&ĐT TP Hà Nội', NULL, NULL, 'Việt Nam', '02433789012', 'info@hadongtrade.vn', '27 Đường Quang Trung, Phường Hà Đông, Hà Nội', 100.00, 'owner', true);

-- ============================================
-- STEP 4: LAND PARCEL USES (Mục đích sử dụng đất)
-- ============================================
INSERT INTO land_parcel_uses (land_parcel_id, land_use_type_code, land_use_purpose, area_m2, use_term_type, use_start_date, use_end_date)
VALUES
  -- Parcel 1: Residential only
  ('b1000000-0000-0000-0000-000000000001', 'ODT', 'Đất ở tại đô thị', 250.5, 'stable', '2020-05-15', NULL),

  -- Parcel 2: Mixed use (residential + commercial)
  ('b2000000-0000-0000-0000-000000000002', 'ODT', 'Đất ở tại đô thị', 120.0, 'stable', '2019-08-22', NULL),
  ('b2000000-0000-0000-0000-000000000002', 'TMD', 'Đất thương mại, dịch vụ', 60.0, 'limited', '2019-08-22', '2069-08-22'),

  -- Parcel 3: Residential with garden
  ('b3000000-0000-0000-0000-000000000003', 'ODT', 'Đất ở tại đô thị', 200.0, 'stable', '2021-03-10', NULL),
  ('b3000000-0000-0000-0000-000000000003', 'CLN', 'Đất trồng cây lâu năm', 120.0, 'stable', '2021-03-10', NULL),

  -- Parcel 4: Commercial/Industrial
  ('b4000000-0000-0000-0000-000000000004', 'SKC', 'Đất khu công nghiệp', 300.0, 'limited', '2018-11-05', '2068-11-05'),
  ('b4000000-0000-0000-0000-000000000004', 'TMD', 'Đất thương mại, dịch vụ', 150.0, 'limited', '2018-11-05', '2068-11-05'),

  -- Parcel 5: Large residential with multiple uses
  ('b5000000-0000-0000-0000-000000000005', 'ODT', 'Đất ở tại đô thị', 300.0, 'stable', '2022-07-18', NULL),
  ('b5000000-0000-0000-0000-000000000005', 'BHK', 'Đất xây dựng trụ sở cơ quan', 100.0, 'limited', '2022-07-18', '2072-07-18'),
  ('b5000000-0000-0000-0000-000000000005', 'CLN', 'Đất trồng cây lâu năm', 120.0, 'stable', '2022-07-18', NULL),

  -- Parcel 6: Residential
  ('b6000000-0000-0000-0000-000000000006', 'ODT', 'Đất ở tại đô thị', 380.0, 'stable', '2017-02-28', NULL),

  -- Parcel 7: Residential with commercial
  ('b7000000-0000-0000-0000-000000000007', 'ODT', 'Đất ở tại đô thị', 150.0, 'stable', '2023-01-15', NULL),
  ('b7000000-0000-0000-0000-000000000007', 'TMD', 'Đất thương mại, dịch vụ', 50.0, 'limited', '2023-01-15', '2073-01-15'),

  -- Parcel 8: Tourism/Hospitality
  ('b8000000-0000-0000-0000-000000000008', 'DDL', 'Đất cơ sở lưu trú du lịch', 400.0, 'limited', '2016-09-20', '2066-09-20'),
  ('b8000000-0000-0000-0000-000000000008', 'TMD', 'Đất thương mại, dịch vụ', 200.0, 'limited', '2016-09-20', '2066-09-20');

-- ============================================
-- STEP 5: SURVEY LOCATIONS (Vị trí khảo sát)
-- ============================================
-- Using existing profile IDs as surveyor_id and parcel_verified_by:
--   '4963a49e-b48f-432a-86a8-656ccdd4e5f5' - Nguyễn Văn A (commune_officer) - as surveyor
--   '5b81f6a7-9877-4918-8437-cb2cf485846a' - Nguyễn Văn An (commune_officer) - as surveyor
--   'e715550c-24b2-4e20-98f0-6c9ee028e640' - Trần Thị Bình (commune_supervisor) - as verifier
-- Using Hà Nội coordinates (around 21.0285° N, 105.8542° E)
INSERT INTO survey_locations (
  id, surveyor_id, location_name, address, house_number, street, hamlet,
  latitude, longitude, accuracy, object_type, land_use_type,
  representative_name, representative_id_number, representative_phone,
  parcel_code, land_area_m2, photos, notes, status,
  location_identifier, province_id, ward_id,
  land_parcel_id, certificate_id, parcel_verified_at, parcel_verified_by
)
VALUES
  -- Survey 1: Pending (chưa xử lý) - Ba Đình - Surveyor: Nguyễn Văn A
  (
    'd1000000-0000-0000-0000-000000000001',
    '4963a49e-b48f-432a-86a8-656ccdd4e5f5',
    'Nhà ở hộ gia đình Nguyễn Văn An',
    '123 Đường Hoàng Diệu, Phường Ba Đình, Hà Nội',
    '123', 'Hoàng Diệu', NULL,
    21.033456, 105.840123, 5.5,
    'Nhà ở riêng lẻ', 'ODT',
    'Nguyễn Văn An', '001085001234', '0901234567',
    '01-004-001', 250.5,
    ARRAY['https://example.com/photos/survey1_1.jpg', 'https://example.com/photos/survey1_2.jpg'],
    'Hộ gia đình đang sinh sống ổn định, có đầy đủ giấy tờ',
    'pending',
    'MOCK-HN-BD-001', 1, 4,
    'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
    NOW(), 'e715550c-24b2-4e20-98f0-6c9ee028e640'
  ),

  -- Survey 2: Reviewed (đã xem xét, chờ duyệt) - Ba Đình - Surveyor: Nguyễn Văn An
  (
    'd2000000-0000-0000-0000-000000000002',
    '5b81f6a7-9877-4918-8437-cb2cf485846a',
    'Nhà ở và cửa hàng Trần Văn Bình',
    '125 Đường Hoàng Diệu, Phường Ba Đình, Hà Nội',
    '125', 'Hoàng Diệu', NULL,
    21.033512, 105.840234, 4.2,
    'Nhà ở kết hợp kinh doanh', 'ODT',
    'Trần Văn Bình', '001080005678', '0912345678',
    '01-004-002', 180.0,
    ARRAY['https://example.com/photos/survey2_1.jpg', 'https://example.com/photos/survey2_2.jpg', 'https://example.com/photos/survey2_3.jpg'],
    'Tầng 1 kinh doanh tạp hóa, tầng 2-3 ở. Vợ chồng đồng sở hữu',
    'reviewed',
    'MOCK-HN-BD-002', 1, 4,
    'b2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002',
    NOW() - INTERVAL '2 days', 'e715550c-24b2-4e20-98f0-6c9ee028e640'
  ),

  -- Survey 3: Approved by commune (đã duyệt cấp xã) - Hoàn Kiếm - Surveyor: Nguyễn Văn A
  (
    'd3000000-0000-0000-0000-000000000003',
    '4963a49e-b48f-432a-86a8-656ccdd4e5f5',
    'Hộ gia đình Phạm Văn Dũng',
    '45 Phố Hàng Bài, Phường Hoàn Kiếm, Hà Nội',
    '45', 'Hàng Bài', NULL,
    21.024567, 105.852345, 3.8,
    'Nhà ở riêng lẻ có vườn', 'ODT',
    'Phạm Văn Dũng', '001075003456', '0934567890',
    '01-070-001', 320.0,
    ARRAY['https://example.com/photos/survey3_1.jpg', 'https://example.com/photos/survey3_2.jpg'],
    'Hộ gia đình 3 người. Nhà phố cổ Hà Nội',
    'approved_commune',
    'MOCK-HN-HK-001', 1, 70,
    'b3000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000003',
    NOW() - INTERVAL '5 days', 'e715550c-24b2-4e20-98f0-6c9ee028e640'
  ),

  -- Survey 4: Approved by central (đã duyệt cấp TW) - Hoàn Kiếm - Surveyor: Nguyễn Văn A
  (
    'd4000000-0000-0000-0000-000000000004',
    '4963a49e-b48f-432a-86a8-656ccdd4e5f5',
    'Công ty TNHH Đầu tư Xây dựng Hà Nội',
    '47 Phố Hàng Bài, Phường Hoàn Kiếm, Hà Nội',
    '47', 'Hàng Bài', NULL,
    21.024678, 105.852456, 2.5,
    'Cơ sở sản xuất kinh doanh', 'SKC',
    'Trần Minh Quang', '001075009999', '02438123456',
    '01-070-002', 450.0,
    ARRAY['https://example.com/photos/survey4_1.jpg', 'https://example.com/photos/survey4_2.jpg', 'https://example.com/photos/survey4_3.jpg', 'https://example.com/photos/survey4_4.jpg'],
    'Văn phòng công ty. Đại diện: Giám đốc Trần Minh Quang',
    'approved_central',
    'MOCK-HN-HK-002', 1, 70,
    'b4000000-0000-0000-0000-000000000004', 'a4000000-0000-0000-0000-000000000004',
    NOW() - INTERVAL '10 days', 'e715550c-24b2-4e20-98f0-6c9ee028e640'
  ),

  -- Survey 5: Rejected (bị từ chối) - Cầu Giấy - Surveyor: Nguyễn Văn An
  (
    'd5000000-0000-0000-0000-000000000005',
    '5b81f6a7-9877-4918-8437-cb2cf485846a',
    'Bà Hoàng Thị Giang',
    '89 Đường Xuân Thủy, Phường Cầu Giấy, Hà Nội',
    '89', 'Xuân Thủy', NULL,
    21.037890, 105.782345, 8.2,
    'Nhà ở riêng lẻ', 'ODT',
    'Hoàng Văn Hải', '001090002345', '0978901234',
    '01-167-001', 520.0,
    ARRAY['https://example.com/photos/survey5_1.jpg'],
    'Người đại diện là con trai chủ sở hữu. Chủ sở hữu đang ở nước ngoài',
    'rejected',
    'MOCK-HN-CG-001', 1, 167,
    NULL, NULL, NULL, NULL
  ),

  -- Survey 6: Pending (chưa liên kết GCN) - Hai Bà Trưng - Surveyor: Nguyễn Văn An
  (
    'd6000000-0000-0000-0000-000000000006',
    '5b81f6a7-9877-4918-8437-cb2cf485846a',
    'Nhà ông Đinh Văn Khánh',
    '91 Phố Bà Triệu, Phường Hai Bà Trưng, Hà Nội',
    '91', 'Bà Triệu', NULL,
    21.018234, 105.849876, 4.5,
    'Nhà ở riêng lẻ', 'ODT',
    'Đinh Văn Khánh', '001088006789', '0989012345',
    NULL, NULL,
    ARRAY['https://example.com/photos/survey6_1.jpg', 'https://example.com/photos/survey6_2.jpg'],
    'Chủ hộ có mặt tại thời điểm khảo sát. Chưa tra cứu GCN',
    'pending',
    'MOCK-HN-HBT-001', 1, 256,
    NULL, NULL, NULL, NULL
  ),

  -- Survey 7: Pending - Hoàng Mai - Surveyor: Nguyễn Văn A
  (
    'd7000000-0000-0000-0000-000000000007',
    '4963a49e-b48f-432a-86a8-656ccdd4e5f5',
    'Nhà vợ chồng Lê Minh Tuấn',
    '15 Đường Giải Phóng, Phường Hoàng Mai, Hà Nội',
    '15', 'Giải Phóng', NULL,
    20.995678, 105.858901, 3.2,
    'Nhà ở kết hợp kinh doanh', 'ODT',
    'Lê Minh Tuấn', '001078001122', '0990123456',
    '01-319-001', 200.0,
    ARRAY['https://example.com/photos/survey7_1.jpg', 'https://example.com/photos/survey7_2.jpg', 'https://example.com/photos/survey7_3.jpg'],
    'Nhà 3 tầng, tầng trệt kinh doanh cafe',
    'pending',
    'MOCK-HN-HM-001', 1, 319,
    'b7000000-0000-0000-0000-000000000007', 'a7000000-0000-0000-0000-000000000007',
    NOW(), 'e715550c-24b2-4e20-98f0-6c9ee028e640'
  ),

  -- Survey 8: Reviewed - Hà Đông - Surveyor: Nguyễn Văn An
  (
    'd8000000-0000-0000-0000-000000000008',
    '5b81f6a7-9877-4918-8437-cb2cf485846a',
    'Công ty CP Thương mại Hà Đông',
    '27 Đường Quang Trung, Phường Hà Đông, Hà Nội',
    '27', 'Quang Trung', NULL,
    20.971234, 105.778901, 2.8,
    'Cơ sở kinh doanh', 'TMD',
    'Võ Thị Thu Hà', '001085007788', '02433789012',
    '01-9556-001', 600.0,
    ARRAY['https://example.com/photos/survey8_1.jpg', 'https://example.com/photos/survey8_2.jpg', 'https://example.com/photos/survey8_3.jpg', 'https://example.com/photos/survey8_4.jpg', 'https://example.com/photos/survey8_5.jpg'],
    'Trung tâm thương mại. Đại diện: Phó GĐ Võ Thị Thu Hà',
    'reviewed',
    'MOCK-HN-HD-001', 1, 9556,
    'b8000000-0000-0000-0000-000000000008', 'a8000000-0000-0000-0000-000000000008',
    NOW() - INTERVAL '1 day', 'e715550c-24b2-4e20-98f0-6c9ee028e640'
  ),

  -- Survey 9: Pending - no linked certificate - Nghĩa Đô - Surveyor: Nguyễn Văn A
  (
    'd9000000-0000-0000-0000-000000000009',
    '4963a49e-b48f-432a-86a8-656ccdd4e5f5',
    'Nhà bà Trần Thị Mai',
    '56 Đường Hoàng Quốc Việt, Phường Nghĩa Đô, Hà Nội',
    '56', 'Hoàng Quốc Việt', NULL,
    21.045678, 105.795432, 6.1,
    'Nhà ở riêng lẻ', 'ODT',
    'Trần Thị Mai', '001070005566', '0912345000',
    NULL, NULL,
    ARRAY['https://example.com/photos/survey9_1.jpg'],
    'Nhà cấp 4, đang sửa chữa. Chủ hộ là người cao tuổi',
    'pending',
    NULL, 1, 160,
    NULL, NULL, NULL, NULL
  ),

  -- Survey 10: Approved commune - Yên Hòa - Surveyor: Nguyễn Văn An
  (
    'd1000000-0000-0000-0000-000000000010',
    '5b81f6a7-9877-4918-8437-cb2cf485846a',
    'Cửa hàng vật liệu xây dựng',
    '78 Đường Trung Kính, Phường Yên Hòa, Hà Nội',
    '78', 'Trung Kính', NULL,
    21.012345, 105.802456, 4.0,
    'Cơ sở kinh doanh', 'TMD',
    'Nguyễn Văn Tài', '001072003344', '0923456000',
    NULL, 350.0,
    ARRAY['https://example.com/photos/survey10_1.jpg', 'https://example.com/photos/survey10_2.jpg'],
    'Cửa hàng kinh doanh vật liệu xây dựng, kho hàng phía sau',
    'approved_commune',
    'MOCK-HN-YH-001', 1, 175,
    NULL, NULL, NULL, NULL
  );

-- ============================================
-- STEP 6: SURVEY ENTRY POINTS (Lối vào khảo sát)
-- ============================================
-- Using Hà Nội coordinates
-- entry_type must be: main_gate, side_gate, service_entrance, emergency_exit, pedestrian, vehicle, other
-- facing_direction must be: N, NE, E, SE, S, SW, W, NW
INSERT INTO survey_entry_points (
  survey_location_id, sequence_number, latitude, longitude,
  house_number, street, address_full, entry_type, is_primary, facing_direction, notes
)
VALUES
  -- Entry points for Survey 1 (Ba Đình)
  ('d1000000-0000-0000-0000-000000000001', 1, 21.033456, 105.840123, '123', 'Hoàng Diệu', '123 Đường Hoàng Diệu, Ba Đình', 'main_gate', true, 'SE', 'Cổng chính mặt tiền'),
  ('d1000000-0000-0000-0000-000000000001', 2, 21.033420, 105.840150, NULL, 'Ngõ 123', 'Ngõ 123 Hoàng Diệu', 'side_gate', false, 'W', 'Lối đi phụ qua ngõ'),

  -- Entry points for Survey 2 (Ba Đình)
  ('d2000000-0000-0000-0000-000000000002', 1, 21.033512, 105.840234, '125', 'Hoàng Diệu', '125 Đường Hoàng Diệu, Ba Đình', 'main_gate', true, 'SE', 'Cửa hàng mặt tiền'),

  -- Entry points for Survey 3 (Hoàn Kiếm)
  ('d3000000-0000-0000-0000-000000000003', 1, 21.024567, 105.852345, '45', 'Hàng Bài', '45 Phố Hàng Bài, Hoàn Kiếm', 'main_gate', true, 'S', 'Cổng chính'),
  ('d3000000-0000-0000-0000-000000000003', 2, 21.024600, 105.852380, NULL, NULL, 'Sau nhà', 'side_gate', false, 'N', 'Lối vào phía sau'),

  -- Entry points for Survey 4 (Hoàn Kiếm)
  ('d4000000-0000-0000-0000-000000000004', 1, 21.024678, 105.852456, '47', 'Hàng Bài', '47 Phố Hàng Bài, Hoàn Kiếm', 'main_gate', true, 'S', 'Cổng văn phòng'),
  ('d4000000-0000-0000-0000-000000000004', 2, 21.024720, 105.852500, NULL, NULL, 'Cổng phụ', 'service_entrance', false, 'E', 'Cổng giao hàng'),
  ('d4000000-0000-0000-0000-000000000004', 3, 21.024640, 105.852420, NULL, NULL, 'Lối thoát hiểm', 'emergency_exit', false, 'W', 'Cửa thoát hiểm'),

  -- Entry points for Survey 7 (Hoàng Mai)
  ('d7000000-0000-0000-0000-000000000007', 1, 20.995678, 105.858901, '15', 'Giải Phóng', '15 Đường Giải Phóng, Hoàng Mai', 'main_gate', true, 'E', 'Cửa quán cafe'),

  -- Entry points for Survey 8 (Hà Đông)
  ('d8000000-0000-0000-0000-000000000008', 1, 20.971234, 105.778901, '27', 'Quang Trung', '27 Đường Quang Trung, Hà Đông', 'main_gate', true, 'S', 'Cổng chính trung tâm'),
  ('d8000000-0000-0000-0000-000000000008', 2, 20.971280, 105.778950, NULL, NULL, 'Bãi đỗ xe', 'vehicle', false, 'E', 'Lối vào bãi đỗ xe'),
  ('d8000000-0000-0000-0000-000000000008', 3, 20.971200, 105.778870, NULL, NULL, 'Cửa nhân viên', 'service_entrance', false, 'W', 'Lối vào cho nhân viên');

-- ============================================
-- STEP 7: APPROVAL HISTORY (Lịch sử phê duyệt)
-- ============================================
-- Using existing profile IDs:
--   '4963a49e-b48f-432a-86a8-656ccdd4e5f5' - Nguyễn Văn A (commune_officer)
--   '5b81f6a7-9877-4918-8437-cb2cf485846a' - Nguyễn Văn An (commune_officer)
--   'e715550c-24b2-4e20-98f0-6c9ee028e640' - Trần Thị Bình (commune_supervisor)
--   '829f9023-f4ac-4c88-b886-5e29f81a7539' - Lê Văn Cường (central_admin)
INSERT INTO approval_history (
  survey_location_id, action, actor_id, actor_role, previous_status, new_status, notes, metadata
)
VALUES
  -- History for Survey 2 (reviewed)
  ('d2000000-0000-0000-0000-000000000002', 'submitted', '5b81f6a7-9877-4918-8437-cb2cf485846a', 'commune_officer', 'pending', 'reviewed', 'Đã xem xét và gửi lên cấp trên', NULL),

  -- History for Survey 3 (approved_commune)
  ('d3000000-0000-0000-0000-000000000003', 'submitted', '4963a49e-b48f-432a-86a8-656ccdd4e5f5', 'commune_officer', 'pending', 'reviewed', 'Đã xem xét, đề nghị phê duyệt', NULL),
  ('d3000000-0000-0000-0000-000000000003', 'approved', 'e715550c-24b2-4e20-98f0-6c9ee028e640', 'commune_supervisor', 'reviewed', 'approved_commune', 'Đồng ý phê duyệt cấp xã', NULL),

  -- History for Survey 4 (approved_central)
  ('d4000000-0000-0000-0000-000000000004', 'submitted', '4963a49e-b48f-432a-86a8-656ccdd4e5f5', 'commune_officer', 'pending', 'reviewed', 'Đã xem xét, đề nghị phê duyệt', NULL),
  ('d4000000-0000-0000-0000-000000000004', 'approved', 'e715550c-24b2-4e20-98f0-6c9ee028e640', 'commune_supervisor', 'reviewed', 'approved_commune', 'Phê duyệt cấp xã', NULL),
  ('d4000000-0000-0000-0000-000000000004', 'approved', '829f9023-f4ac-4c88-b886-5e29f81a7539', 'central_admin', 'approved_commune', 'approved_central', 'Phê duyệt cấp trung ương. Hồ sơ đầy đủ, đúng quy định', NULL),

  -- History for Survey 5 (rejected)
  ('d5000000-0000-0000-0000-000000000005', 'submitted', '5b81f6a7-9877-4918-8437-cb2cf485846a', 'commune_officer', 'pending', 'reviewed', 'Đã xem xét, gửi lên cấp trên', NULL),
  ('d5000000-0000-0000-0000-000000000005', 'rejected', 'e715550c-24b2-4e20-98f0-6c9ee028e640', 'commune_supervisor', 'reviewed', 'rejected', '[Thiếu thông tin] Chưa liên kết được GCN, độ chính xác GPS quá thấp (8.2m)', '{"rejection_reason_id": "missing_info", "rejection_reason_label": "Thiếu thông tin"}'::jsonb),

  -- History for Survey 8 (reviewed)
  ('d8000000-0000-0000-0000-000000000008', 'submitted', '5b81f6a7-9877-4918-8437-cb2cf485846a', 'commune_officer', 'pending', 'reviewed', 'Đã xem xét, đầy đủ thông tin', NULL);

-- ============================================
-- STEP 8: LOCATION IDENTIFIERS
-- ============================================
-- Using Hà Nội location codes (HN = Hà Nội, BD = Ba Đình, HK = Hoàn Kiếm, etc.)
INSERT INTO location_identifiers (
  survey_location_id, location_id, admin_code, sequence_number, assigned_by, is_active
)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'MOCK-HN-BD-001', 'MOCK-HN-BD', '001', '4963a49e-b48f-432a-86a8-656ccdd4e5f5', true),
  ('d2000000-0000-0000-0000-000000000002', 'MOCK-HN-BD-002', 'MOCK-HN-BD', '002', '5b81f6a7-9877-4918-8437-cb2cf485846a', true),
  ('d3000000-0000-0000-0000-000000000003', 'MOCK-HN-HK-001', 'MOCK-HN-HK', '001', '4963a49e-b48f-432a-86a8-656ccdd4e5f5', true),
  ('d4000000-0000-0000-0000-000000000004', 'MOCK-HN-HK-002', 'MOCK-HN-HK', '002', '4963a49e-b48f-432a-86a8-656ccdd4e5f5', true),
  ('d5000000-0000-0000-0000-000000000005', 'MOCK-HN-CG-001', 'MOCK-HN-CG', '001', '5b81f6a7-9877-4918-8437-cb2cf485846a', true),
  ('d6000000-0000-0000-0000-000000000006', 'MOCK-HN-HBT-001', 'MOCK-HN-HBT', '001', '5b81f6a7-9877-4918-8437-cb2cf485846a', true),
  ('d7000000-0000-0000-0000-000000000007', 'MOCK-HN-HM-001', 'MOCK-HN-HM', '001', '4963a49e-b48f-432a-86a8-656ccdd4e5f5', true),
  ('d8000000-0000-0000-0000-000000000008', 'MOCK-HN-HD-001', 'MOCK-HN-HD', '001', '5b81f6a7-9877-4918-8437-cb2cf485846a', true),
  ('d1000000-0000-0000-0000-000000000010', 'MOCK-HN-YH-001', 'MOCK-HN-YH', '001', '5b81f6a7-9877-4918-8437-cb2cf485846a', true);

-- ============================================
-- STEP 9: AUDIT LOGS (Sample)
-- ============================================
-- Using existing profile IDs:
--   '829f9023-f4ac-4c88-b886-5e29f81a7539' - Lê Văn Cường (central_admin)
--   'e715550c-24b2-4e20-98f0-6c9ee028e640' - Trần Thị Bình (commune_supervisor)
--   '4963a49e-b48f-432a-86a8-656ccdd4e5f5' - Nguyễn Văn A (commune_officer)
--   '5b81f6a7-9877-4918-8437-cb2cf485846a' - Nguyễn Văn An (commune_officer)
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, changes)
VALUES
  ('829f9023-f4ac-4c88-b886-5e29f81a7539', 'login', 'session', NULL, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"event": "user_login"}'::jsonb),
  ('829f9023-f4ac-4c88-b886-5e29f81a7539', 'approve', 'survey_location', 'd4000000-0000-0000-0000-000000000004', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"old_status": "approved_commune", "new_status": "approved_central"}'::jsonb),
  ('e715550c-24b2-4e20-98f0-6c9ee028e640', 'approve', 'survey_location', 'd3000000-0000-0000-0000-000000000003', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"old_status": "reviewed", "new_status": "approved_commune"}'::jsonb),
  ('e715550c-24b2-4e20-98f0-6c9ee028e640', 'reject', 'survey_location', 'd5000000-0000-0000-0000-000000000005', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"old_status": "reviewed", "new_status": "rejected", "reason": "Thiếu thông tin"}'::jsonb),
  ('5b81f6a7-9877-4918-8437-cb2cf485846a', 'submit', 'survey_location', 'd2000000-0000-0000-0000-000000000002', '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"old_status": "pending", "new_status": "reviewed"}'::jsonb);

-- ============================================
-- STEP 10: SYSTEM CONFIG
-- ============================================
-- Using existing profile ID for updated_by:
--   '9855c15e-636c-4439-8359-4cde9c6b098d' - Phạm Thị Dung (system_admin)
INSERT INTO system_config (key, value, description, updated_by)
VALUES
  ('app_name', '"Hệ thống Quản lý Khảo sát Đất đai"'::jsonb, 'Tên ứng dụng', '9855c15e-636c-4439-8359-4cde9c6b098d'),
  ('app_version', '"1.0.0"'::jsonb, 'Phiên bản ứng dụng', '9855c15e-636c-4439-8359-4cde9c6b098d'),
  ('gps_accuracy_threshold', '10'::jsonb, 'Ngưỡng độ chính xác GPS tối đa cho phép (mét)', '9855c15e-636c-4439-8359-4cde9c6b098d'),
  ('min_photos_required', '2'::jsonb, 'Số ảnh tối thiểu yêu cầu cho mỗi khảo sát', '9855c15e-636c-4439-8359-4cde9c6b098d'),
  ('auto_approve_threshold', '{"quality_score": 90, "gps_accuracy": 5}'::jsonb, 'Ngưỡng tự động phê duyệt', '9855c15e-636c-4439-8359-4cde9c6b098d'),
  ('notification_settings', '{"email_enabled": true, "sms_enabled": false, "push_enabled": true}'::jsonb, 'Cài đặt thông báo', '9855c15e-636c-4439-8359-4cde9c6b098d'),
  ('supported_provinces', '[77, 79, 74, 75]'::jsonb, 'Danh sách mã tỉnh được hỗ trợ', '9855c15e-636c-4439-8359-4cde9c6b098d')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

-- ============================================
-- STEP 11: SYNC EVENTS (Sample mobile sync events)
-- ============================================
-- Using existing profile IDs:
--   '4963a49e-b48f-432a-86a8-656ccdd4e5f5' - Nguyễn Văn A (commune_officer) - surveyor for surveys 1, 3, 4, 7, 9
--   '5b81f6a7-9877-4918-8437-cb2cf485846a' - Nguyễn Văn An (commune_officer) - surveyor for surveys 2, 5, 6, 8, 10
INSERT INTO sync_events (profile_id, device_id, event_type, payload)
VALUES
  ('4963a49e-b48f-432a-86a8-656ccdd4e5f5', 'device-001-android', 'survey_upload', '{"survey_id": "d1000000-0000-0000-0000-000000000001", "photos_count": 2, "sync_duration_ms": 1500}'::jsonb),
  ('5b81f6a7-9877-4918-8437-cb2cf485846a', 'device-002-ios', 'survey_upload', '{"survey_id": "d2000000-0000-0000-0000-000000000002", "photos_count": 3, "sync_duration_ms": 2100}'::jsonb),
  ('4963a49e-b48f-432a-86a8-656ccdd4e5f5', 'device-001-android', 'survey_upload', '{"survey_id": "d3000000-0000-0000-0000-000000000003", "photos_count": 2, "sync_duration_ms": 1800}'::jsonb),
  ('4963a49e-b48f-432a-86a8-656ccdd4e5f5', 'device-001-android', 'survey_upload', '{"survey_id": "d4000000-0000-0000-0000-000000000004", "photos_count": 4, "sync_duration_ms": 3200}'::jsonb),
  ('5b81f6a7-9877-4918-8437-cb2cf485846a', 'device-002-ios', 'survey_upload', '{"survey_id": "d5000000-0000-0000-0000-000000000005", "photos_count": 1, "sync_duration_ms": 900}'::jsonb),
  ('5b81f6a7-9877-4918-8437-cb2cf485846a', 'device-002-ios', 'survey_upload', '{"survey_id": "d6000000-0000-0000-0000-000000000006", "photos_count": 2, "sync_duration_ms": 1400}'::jsonb),
  ('4963a49e-b48f-432a-86a8-656ccdd4e5f5', 'device-001-android', 'survey_upload', '{"survey_id": "d7000000-0000-0000-0000-000000000007", "photos_count": 3, "sync_duration_ms": 2000}'::jsonb),
  ('5b81f6a7-9877-4918-8437-cb2cf485846a', 'device-002-ios', 'survey_upload', '{"survey_id": "d8000000-0000-0000-0000-000000000008", "photos_count": 5, "sync_duration_ms": 3500}'::jsonb);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the seeded data:

-- SELECT 'provinces' as table_name, COUNT(*) as count FROM provinces
-- UNION ALL SELECT 'wards', COUNT(*) FROM wards
-- UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
-- UNION ALL SELECT 'web_users', COUNT(*) FROM web_users
-- UNION ALL SELECT 'land_certificates', COUNT(*) FROM land_certificates
-- UNION ALL SELECT 'land_parcels', COUNT(*) FROM land_parcels
-- UNION ALL SELECT 'land_parcel_owners', COUNT(*) FROM land_parcel_owners
-- UNION ALL SELECT 'land_parcel_uses', COUNT(*) FROM land_parcel_uses
-- UNION ALL SELECT 'survey_locations', COUNT(*) FROM survey_locations
-- UNION ALL SELECT 'survey_entry_points', COUNT(*) FROM survey_entry_points
-- UNION ALL SELECT 'approval_history', COUNT(*) FROM approval_history
-- UNION ALL SELECT 'location_identifiers', COUNT(*) FROM location_identifiers
-- UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
-- UNION ALL SELECT 'system_config', COUNT(*) FROM system_config
-- UNION ALL SELECT 'sync_events', COUNT(*) FROM sync_events;

-- ============================================
-- END OF SEEDING SCRIPT
-- ============================================
