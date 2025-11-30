-- Seed sample survey locations with polygon geometries for testing
-- Run this in your Supabase SQL Editor

-- First, get a user ID to use as surveyor_id
-- You may need to replace this with an actual user ID from your profiles table
DO $$
DECLARE
    surveyor_uuid UUID;
BEGIN
    -- Try to get an existing user, or use a placeholder
    SELECT id INTO surveyor_uuid FROM profiles LIMIT 1;

    IF surveyor_uuid IS NULL THEN
        -- Create a placeholder profile if none exists
        INSERT INTO profiles (id, full_name, phone)
        VALUES (gen_random_uuid(), 'Test Surveyor', '0123456789')
        RETURNING id INTO surveyor_uuid;
    END IF;

    -- Insert sample surveys in Hanoi area
    INSERT INTO survey_locations (
        surveyor_id, location_name, address, latitude, longitude,
        province_code, district_code, ward_code,
        owner_name, land_area_m2, status, object_type, land_use_type,
        polygon_geometry
    ) VALUES
    -- Survey 1: A house in Hanoi with polygon
    (
        surveyor_uuid,
        'Nhà ông Nguyễn Văn A',
        '123 Phố Huế, Hai Bà Trưng, Hà Nội',
        21.0115, 105.8530,
        '01', '007', '00256',
        'Nguyễn Văn A', 150.5, 'pending', 'residential', 'urban',
        '{"type": "Polygon", "coordinates": [[[105.8525, 21.0110], [105.8535, 21.0110], [105.8535, 21.0120], [105.8525, 21.0120], [105.8525, 21.0110]]]}'::jsonb
    ),
    -- Survey 2: Agricultural land
    (
        surveyor_uuid,
        'Thửa đất nông nghiệp Bắc Từ Liêm',
        'Xã Tây Tựu, Bắc Từ Liêm, Hà Nội',
        21.0650, 105.7420,
        '01', '019', '00649',
        'Trần Thị B', 2500.0, 'reviewed', 'agricultural', 'rural',
        '{"type": "Polygon", "coordinates": [[[105.7400, 21.0630], [105.7440, 21.0630], [105.7440, 21.0670], [105.7400, 21.0670], [105.7400, 21.0630]]]}'::jsonb
    ),
    -- Survey 3: Commercial building
    (
        surveyor_uuid,
        'Tòa nhà văn phòng ABC',
        '45 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
        21.0245, 105.8490,
        '01', '001', '00001',
        'Công ty TNHH ABC', 800.0, 'approved_commune', 'commercial', 'urban',
        '{"type": "Polygon", "coordinates": [[[105.8480, 21.0240], [105.8500, 21.0240], [105.8500, 21.0250], [105.8480, 21.0250], [105.8480, 21.0240]]]}'::jsonb
    ),
    -- Survey 4: School
    (
        surveyor_uuid,
        'Trường THPT Chu Văn An',
        'Số 10 Thụy Khuê, Tây Hồ, Hà Nội',
        21.0450, 105.8250,
        '01', '011', '00364',
        'Sở GD&ĐT Hà Nội', 15000.0, 'approved_central', 'education', 'urban',
        '{"type": "Polygon", "coordinates": [[[105.8220, 21.0430], [105.8280, 21.0430], [105.8280, 21.0470], [105.8220, 21.0470], [105.8220, 21.0430]]]}'::jsonb
    ),
    -- Survey 5: Park
    (
        surveyor_uuid,
        'Công viên Thống Nhất',
        'Quận Hai Bà Trưng, Hà Nội',
        21.0080, 105.8440,
        '01', '007', '00253',
        'UBND Quận Hai Bà Trưng', 50000.0, 'published', 'public', 'urban',
        '{"type": "Polygon", "coordinates": [[[105.8400, 21.0050], [105.8480, 21.0050], [105.8480, 21.0110], [105.8400, 21.0110], [105.8400, 21.0050]]]}'::jsonb
    );

    -- Insert sample surveys in Ho Chi Minh City area
    INSERT INTO survey_locations (
        surveyor_id, location_name, address, latitude, longitude,
        province_code, district_code, ward_code,
        owner_name, land_area_m2, status, object_type, land_use_type,
        polygon_geometry
    ) VALUES
    -- Survey 6: House in District 1
    (
        surveyor_uuid,
        'Nhà phố Nguyễn Huệ',
        '100 Nguyễn Huệ, Quận 1, TP.HCM',
        10.7735, 106.7020,
        '79', '760', '26734',
        'Lê Văn C', 200.0, 'pending', 'residential', 'urban',
        '{"type": "Polygon", "coordinates": [[[106.7010, 10.7730], [106.7030, 10.7730], [106.7030, 10.7740], [106.7010, 10.7740], [106.7010, 10.7730]]]}'::jsonb
    ),
    -- Survey 7: Factory in Thu Duc
    (
        surveyor_uuid,
        'Nhà máy sản xuất XYZ',
        'Khu công nghiệp, TP. Thủ Đức, TP.HCM',
        10.8540, 106.7850,
        '79', '769', '26899',
        'Công ty CP XYZ', 5000.0, 'reviewed', 'industrial', 'industrial',
        '{"type": "Polygon", "coordinates": [[[106.7820, 10.8520], [106.7880, 10.8520], [106.7880, 10.8560], [106.7820, 10.8560], [106.7820, 10.8520]]]}'::jsonb
    ),
    -- Survey 8: Apartment building
    (
        surveyor_uuid,
        'Chung cư Sunrise City',
        '25 Nguyễn Hữu Thọ, Quận 7, TP.HCM',
        10.7320, 106.7180,
        '79', '778', '27211',
        'Công ty BĐS Novaland', 3000.0, 'approved_commune', 'residential', 'urban',
        '{"type": "Polygon", "coordinates": [[[106.7160, 10.7300], [106.7200, 10.7300], [106.7200, 10.7340], [106.7160, 10.7340], [106.7160, 10.7300]]]}'::jsonb
    );

    -- Insert sample surveys in Da Nang area
    INSERT INTO survey_locations (
        surveyor_id, location_name, address, latitude, longitude,
        province_code, district_code, ward_code,
        owner_name, land_area_m2, status, object_type, land_use_type,
        polygon_geometry
    ) VALUES
    -- Survey 9: Beach resort
    (
        surveyor_uuid,
        'Resort Biển Mỹ Khê',
        'Đường Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
        16.0650, 108.2470,
        '48', '490', '20194',
        'Tập đoàn Du lịch ABC', 20000.0, 'approved_central', 'tourism', 'coastal',
        '{"type": "Polygon", "coordinates": [[[108.2440, 16.0620], [108.2500, 16.0620], [108.2500, 16.0680], [108.2440, 16.0680], [108.2440, 16.0620]]]}'::jsonb
    ),
    -- Survey 10: Dragon Bridge area
    (
        surveyor_uuid,
        'Khu vực Cầu Rồng',
        'Cầu Rồng, Sơn Trà, Đà Nẵng',
        16.0610, 108.2275,
        '48', '490', '20191',
        'UBND TP Đà Nẵng', 8000.0, 'published', 'infrastructure', 'urban',
        '{"type": "Polygon", "coordinates": [[[108.2250, 16.0590], [108.2300, 16.0590], [108.2300, 16.0630], [108.2250, 16.0630], [108.2250, 16.0590]]]}'::jsonb
    );

    -- Insert some surveys WITHOUT polygon (to test mixed data)
    INSERT INTO survey_locations (
        surveyor_id, location_name, address, latitude, longitude,
        province_code, district_code, ward_code,
        owner_name, land_area_m2, status, object_type, land_use_type,
        polygon_geometry
    ) VALUES
    -- Survey without polygon 1
    (
        surveyor_uuid,
        'Điểm khảo sát mới 1',
        '50 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
        21.0280, 105.8510,
        '01', '001', '00004',
        'Phạm Văn D', NULL, 'pending', 'residential', 'urban',
        NULL
    ),
    -- Survey without polygon 2
    (
        surveyor_uuid,
        'Điểm khảo sát mới 2',
        '200 Lê Lợi, Quận 1, TP.HCM',
        10.7720, 106.6980,
        '79', '760', '26737',
        'Hoàng Thị E', NULL, 'reviewed', 'commercial', 'urban',
        NULL
    ),
    -- Survey without polygon 3
    (
        surveyor_uuid,
        'Điểm khảo sát mới 3',
        '15 Bạch Đằng, Hải Châu, Đà Nẵng',
        16.0680, 108.2200,
        '48', '492', '20227',
        NULL, NULL, 'pending', NULL, NULL,
        NULL
    );

    RAISE NOTICE 'Successfully inserted % sample survey locations', 13;
END $$;

-- Verify the data
SELECT
    location_name,
    address,
    status,
    CASE WHEN polygon_geometry IS NOT NULL THEN 'Yes' ELSE 'No' END as has_polygon,
    land_area_m2
FROM survey_locations
ORDER BY created_at DESC
LIMIT 15;
