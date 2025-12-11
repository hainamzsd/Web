-- ============================================================================
-- Migration: Sync Provinces from Open API v2
-- Date: 2025-12-12
-- Source: https://provinces.open-api.vn/api/v2/
-- Total: 34 provinces/cities
-- ============================================================================

-- Step 1: UPSERT provinces (INSERT or UPDATE if exists)
-- This avoids foreign key constraint issues with survey_locations
INSERT INTO provinces (code, name, codename, division_type, phone_code) VALUES
(1, 'Thành phố Hà Nội', 'ha_noi', 'thành phố trung ương', 24),
(4, 'Cao Bằng', 'cao_bang', 'tỉnh', 206),
(8, 'Tuyên Quang', 'tuyen_quang', 'tỉnh', 207),
(11, 'Điện Biên', 'dien_bien', 'tỉnh', 215),
(12, 'Lai Châu', 'lai_chau', 'tỉnh', 213),
(14, 'Sơn La', 'son_la', 'tỉnh', 212),
(15, 'Lào Cai', 'lao_cai', 'tỉnh', 214),
(19, 'Thái Nguyên', 'thai_nguyen', 'tỉnh', 208),
(20, 'Lạng Sơn', 'lang_son', 'tỉnh', 205),
(22, 'Quảng Ninh', 'quang_ninh', 'tỉnh', 203),
(24, 'Bắc Ninh', 'bac_ninh', 'tỉnh', 222),
(25, 'Phú Thọ', 'phu_tho', 'tỉnh', 210),
(31, 'Thành phố Hải Phòng', 'hai_phong', 'thành phố trung ương', 225),
(33, 'Hưng Yên', 'hung_yen', 'tỉnh', 221),
(37, 'Ninh Bình', 'ninh_binh', 'tỉnh', 229),
(38, 'Thanh Hóa', 'thanh_hoa', 'tỉnh', 237),
(40, 'Nghệ An', 'nghe_an', 'tỉnh', 238),
(42, 'Hà Tĩnh', 'ha_tinh', 'tỉnh', 239),
(44, 'Quảng Trị', 'quang_tri', 'tỉnh', 233),
(46, 'Thành phố Huế', 'hue', 'thành phố trung ương', 234),
(48, 'Thành phố Đà Nẵng', 'da_nang', 'thành phố trung ương', 236),
(51, 'Quảng Ngãi', 'quang_ngai', 'tỉnh', 255),
(52, 'Gia Lai', 'gia_lai', 'tỉnh', 269),
(56, 'Khánh Hòa', 'khanh_hoa', 'tỉnh', 258),
(66, 'Đắk Lắk', 'dak_lak', 'tỉnh', 262),
(68, 'Lâm Đồng', 'lam_dong', 'tỉnh', 263),
(75, 'Đồng Nai', 'dong_nai', 'tỉnh', 251),
(79, 'Thành phố Hồ Chí Minh', 'ho_chi_minh', 'thành phố trung ương', 28),
(80, 'Tây Ninh', 'tay_ninh', 'tỉnh', 276),
(82, 'Đồng Tháp', 'dong_thap', 'tỉnh', 277),
(86, 'Vĩnh Long', 'vinh_long', 'tỉnh', 270),
(91, 'An Giang', 'an_giang', 'tỉnh', 296),
(92, 'Thành phố Cần Thơ', 'can_tho', 'thành phố trung ương', 292),
(96, 'Cà Mau', 'ca_mau', 'tỉnh', 290)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  codename = EXCLUDED.codename,
  division_type = EXCLUDED.division_type,
  phone_code = EXCLUDED.phone_code;

-- Step 2: Delete provinces that are NOT in the API list and NOT referenced by survey_locations
DELETE FROM provinces
WHERE code NOT IN (1, 4, 8, 11, 12, 14, 15, 19, 20, 22, 24, 25, 31, 33, 37, 38, 40, 42, 44, 46, 48, 51, 52, 56, 66, 68, 75, 79, 80, 82, 86, 91, 92, 96)
AND code NOT IN (SELECT DISTINCT province_id FROM survey_locations WHERE province_id IS NOT NULL);

-- Step 3: Verify
DO $$
DECLARE
    prov_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO prov_count FROM provinces;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Provinces sync complete!';
    RAISE NOTICE 'Total provinces: %', prov_count;
END $$;
