-- Quick seed script for survey locations with polygons
-- Run this in Supabase SQL Editor
-- Replace 'YOUR_USER_ID_HERE' with an actual user UUID from your auth.users table

-- First, check your existing users:
-- SELECT id, email FROM auth.users LIMIT 5;

-- Then replace the UUID below and run:

INSERT INTO survey_locations (
    surveyor_id, location_name, address, latitude, longitude,
    province_code, district_code, ward_code,
    owner_name, land_area_m2, status, object_type, land_use_type,
    polygon_geometry
) VALUES
-- Hanoi - Residential with polygon
(
    (SELECT id FROM auth.users LIMIT 1), -- Uses first user
    'Nhà ông Nguyễn Văn A',
    '123 Phố Huế, Hai Bà Trưng, Hà Nội',
    21.0115, 105.8530,
    '01', '007', '00256',
    'Nguyễn Văn A', 150.5, 'pending', 'residential', 'urban',
    '{"type": "Polygon", "coordinates": [[[105.8525, 21.0110], [105.8535, 21.0110], [105.8535, 21.0120], [105.8525, 21.0120], [105.8525, 21.0110]]]}'::jsonb
),
-- Hanoi - Agricultural land with larger polygon
(
    (SELECT id FROM auth.users LIMIT 1),
    'Thửa đất nông nghiệp Bắc Từ Liêm',
    'Xã Tây Tựu, Bắc Từ Liêm, Hà Nội',
    21.0650, 105.7420,
    '01', '019', '00649',
    'Trần Thị B', 2500.0, 'reviewed', 'agricultural', 'rural',
    '{"type": "Polygon", "coordinates": [[[105.7400, 21.0630], [105.7440, 21.0630], [105.7440, 21.0670], [105.7400, 21.0670], [105.7400, 21.0630]]]}'::jsonb
),
-- Hanoi - Commercial with polygon
(
    (SELECT id FROM auth.users LIMIT 1),
    'Tòa nhà văn phòng ABC',
    '45 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
    21.0245, 105.8490,
    '01', '001', '00001',
    'Công ty TNHH ABC', 800.0, 'approved_commune', 'commercial', 'urban',
    '{"type": "Polygon", "coordinates": [[[105.8480, 21.0240], [105.8500, 21.0240], [105.8500, 21.0250], [105.8480, 21.0250], [105.8480, 21.0240]]]}'::jsonb
),
-- Hanoi - School with large polygon
(
    (SELECT id FROM auth.users LIMIT 1),
    'Trường THPT Chu Văn An',
    'Số 10 Thụy Khuê, Tây Hồ, Hà Nội',
    21.0450, 105.8250,
    '01', '011', '00364',
    'Sở GD&ĐT Hà Nội', 15000.0, 'approved_central', 'education', 'urban',
    '{"type": "Polygon", "coordinates": [[[105.8220, 21.0430], [105.8280, 21.0430], [105.8280, 21.0470], [105.8220, 21.0470], [105.8220, 21.0430]]]}'::jsonb
),
-- Hanoi - Park with very large polygon
(
    (SELECT id FROM auth.users LIMIT 1),
    'Công viên Thống Nhất',
    'Quận Hai Bà Trưng, Hà Nội',
    21.0080, 105.8440,
    '01', '007', '00253',
    'UBND Quận Hai Bà Trưng', 50000.0, 'published', 'public', 'urban',
    '{"type": "Polygon", "coordinates": [[[105.8400, 21.0050], [105.8480, 21.0050], [105.8480, 21.0110], [105.8400, 21.0110], [105.8400, 21.0050]]]}'::jsonb
),
-- HCMC - Residential
(
    (SELECT id FROM auth.users LIMIT 1),
    'Nhà phố Nguyễn Huệ',
    '100 Nguyễn Huệ, Quận 1, TP.HCM',
    10.7735, 106.7020,
    '79', '760', '26734',
    'Lê Văn C', 200.0, 'pending', 'residential', 'urban',
    '{"type": "Polygon", "coordinates": [[[106.7010, 10.7730], [106.7030, 10.7730], [106.7030, 10.7740], [106.7010, 10.7740], [106.7010, 10.7730]]]}'::jsonb
),
-- HCMC - Industrial
(
    (SELECT id FROM auth.users LIMIT 1),
    'Nhà máy sản xuất XYZ',
    'Khu công nghiệp, TP. Thủ Đức, TP.HCM',
    10.8540, 106.7850,
    '79', '769', '26899',
    'Công ty CP XYZ', 5000.0, 'reviewed', 'industrial', 'industrial',
    '{"type": "Polygon", "coordinates": [[[106.7820, 10.8520], [106.7880, 10.8520], [106.7880, 10.8560], [106.7820, 10.8560], [106.7820, 10.8520]]]}'::jsonb
),
-- Da Nang - Resort
(
    (SELECT id FROM auth.users LIMIT 1),
    'Resort Biển Mỹ Khê',
    'Đường Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
    16.0650, 108.2470,
    '48', '490', '20194',
    'Tập đoàn Du lịch ABC', 20000.0, 'approved_central', 'tourism', 'coastal',
    '{"type": "Polygon", "coordinates": [[[108.2440, 16.0620], [108.2500, 16.0620], [108.2500, 16.0680], [108.2440, 16.0680], [108.2440, 16.0620]]]}'::jsonb
),
-- Da Nang - Infrastructure
(
    (SELECT id FROM auth.users LIMIT 1),
    'Khu vực Cầu Rồng',
    'Cầu Rồng, Sơn Trà, Đà Nẵng',
    16.0610, 108.2275,
    '48', '490', '20191',
    'UBND TP Đà Nẵng', 8000.0, 'published', 'infrastructure', 'urban',
    '{"type": "Polygon", "coordinates": [[[108.2250, 16.0590], [108.2300, 16.0590], [108.2300, 16.0630], [108.2250, 16.0630], [108.2250, 16.0590]]]}'::jsonb
),
-- Without polygon - for testing mixed display
(
    (SELECT id FROM auth.users LIMIT 1),
    'Điểm khảo sát chưa có ranh giới',
    '50 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    21.0280, 105.8510,
    '01', '001', '00004',
    'Phạm Văn D', NULL, 'pending', 'residential', 'urban',
    NULL
),
-- Another without polygon
(
    (SELECT id FROM auth.users LIMIT 1),
    'Điểm khảo sát mới - HCMC',
    '200 Lê Lợi, Quận 1, TP.HCM',
    10.7720, 106.6980,
    '79', '760', '26737',
    'Hoàng Thị E', NULL, 'reviewed', 'commercial', 'urban',
    NULL
);

-- Show results
SELECT
    location_name,
    status,
    CASE WHEN polygon_geometry IS NOT NULL THEN 'Co ranh gioi' ELSE 'Chua co' END as polygon_status,
    land_area_m2,
    province_code
FROM survey_locations
ORDER BY created_at DESC
LIMIT 15;
