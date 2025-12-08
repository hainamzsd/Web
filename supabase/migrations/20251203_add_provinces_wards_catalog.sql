-- Migration: Add provinces and wards catalog tables
-- This migration creates reference tables for Vietnamese administrative divisions
-- Following the API structure from https://provinces.open-api.vn/api/v2/

-- ============================================================
-- 1. CREATE PROVINCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS provinces (
  code INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  codename TEXT NOT NULL UNIQUE,
  division_type TEXT NOT NULL CHECK (division_type IN ('tỉnh', 'thành phố trung ương')),
  phone_code INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_provinces_codename ON provinces(codename);
CREATE INDEX IF NOT EXISTS idx_provinces_name ON provinces(name);

-- ============================================================
-- 2. CREATE WARDS TABLE (directly under province, no district level)
-- ============================================================
CREATE TABLE IF NOT EXISTS wards (
  code INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  codename TEXT NOT NULL,
  division_type TEXT NOT NULL CHECK (division_type IN ('xã', 'phường', 'thị trấn')),
  province_code INTEGER NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_wards_province_code ON wards(province_code);
CREATE INDEX IF NOT EXISTS idx_wards_codename ON wards(codename);
CREATE INDEX IF NOT EXISTS idx_wards_name ON wards(name);

-- ============================================================
-- 3. INSERT ALL 34 VIETNAMESE PROVINCES
-- ============================================================
INSERT INTO provinces (code, name, codename, division_type, phone_code) VALUES
  (1, 'Thành phố Hà Nội', 'ha_noi', 'thành phố trung ương', 24),
  (4, 'Tỉnh Hà Giang', 'ha_giang', 'tỉnh', 219),
  (8, 'Tỉnh Tuyên Quang', 'tuyen_quang', 'tỉnh', 207),
  (11, 'Tỉnh Lai Châu', 'lai_chau', 'tỉnh', 213),
  (12, 'Tỉnh Sơn La', 'son_la', 'tỉnh', 212),
  (14, 'Tỉnh Lào Cai', 'lao_cai', 'tỉnh', 214),
  (15, 'Tỉnh Yên Bái', 'yen_bai', 'tỉnh', 216),
  (19, 'Tỉnh Thái Nguyên', 'thai_nguyen', 'tỉnh', 208),
  (20, 'Tỉnh Lạng Sơn', 'lang_son', 'tỉnh', 205),
  (22, 'Tỉnh Bắc Kạn', 'bac_kan', 'tỉnh', 209),
  (24, 'Tỉnh Cao Bằng', 'cao_bang', 'tỉnh', 206),
  (25, 'Tỉnh Phú Thọ', 'phu_tho', 'tỉnh', 210),
  (31, 'Tỉnh Hải Dương', 'hai_duong', 'tỉnh', 220),
  (33, 'Tỉnh Hưng Yên', 'hung_yen', 'tỉnh', 221),
  (37, 'Tỉnh Thái Bình', 'thai_binh', 'tỉnh', 227),
  (38, 'Tỉnh Hà Nam', 'ha_nam', 'tỉnh', 226),
  (40, 'Tỉnh Nghệ An', 'nghe_an', 'tỉnh', 238),
  (42, 'Tỉnh Hà Tĩnh', 'ha_tinh', 'tỉnh', 239),
  (44, 'Tỉnh Quảng Bình', 'quang_binh', 'tỉnh', 232),
  (46, 'Tỉnh Thừa Thiên Huế', 'thua_thien_hue', 'tỉnh', 234),
  (48, 'Tỉnh Đà Nẵng', 'da_nang', 'thành phố trung ương', 236),
  (51, 'Tỉnh Quảng Ngãi', 'quang_ngai', 'tỉnh', 255),
  (52, 'Tỉnh Bình Định', 'binh_dinh', 'tỉnh', 256),
  (56, 'Tỉnh Khánh Hòa', 'khanh_hoa', 'tỉnh', 258),
  (66, 'Tỉnh Đắk Lắk', 'dak_lak', 'tỉnh', 262),
  (68, 'Tỉnh Lâm Đồng', 'lam_dong', 'tỉnh', 263),
  (75, 'Tỉnh Bình Dương', 'binh_duong', 'tỉnh', 274),
  (79, 'Thành phố Hồ Chí Minh', 'ho_chi_minh', 'thành phố trung ương', 28),
  (80, 'Tỉnh Long An', 'long_an', 'tỉnh', 272),
  (82, 'Tỉnh Bến Tre', 'ben_tre', 'tỉnh', 275),
  (86, 'Tỉnh Vĩnh Long', 'vinh_long', 'tỉnh', 270),
  (91, 'Tỉnh Kiên Giang', 'kien_giang', 'tỉnh', 297),
  (92, 'Thành phố Cần Thơ', 'can_tho', 'thành phố trung ương', 292),
  (96, 'Tỉnh Cà Mau', 'ca_mau', 'tỉnh', 290)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  codename = EXCLUDED.codename,
  division_type = EXCLUDED.division_type,
  phone_code = EXCLUDED.phone_code,
  updated_at = NOW();

-- ============================================================
-- 4. ADD TRIGGERS FOR updated_at
-- ============================================================
CREATE TRIGGER update_provinces_updated_at BEFORE UPDATE ON provinces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON wards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;

-- Public read access for provinces and wards (reference data)
CREATE POLICY "provinces_read_all" ON provinces
  FOR SELECT USING (true);

CREATE POLICY "wards_read_all" ON wards
  FOR SELECT USING (true);

-- Only system admins can modify provinces and wards
CREATE POLICY "provinces_write_admin" ON provinces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM web_users
      WHERE profile_id = auth.uid()
      AND role = 'system_admin'
      AND is_active = true
    )
  );

CREATE POLICY "wards_write_admin" ON wards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM web_users
      WHERE profile_id = auth.uid()
      AND role = 'system_admin'
      AND is_active = true
    )
  );

-- ============================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================

-- Function to get province by code
CREATE OR REPLACE FUNCTION get_province_by_code(p_code INTEGER)
RETURNS TABLE (
  code INTEGER,
  name TEXT,
  codename TEXT,
  division_type TEXT,
  phone_code INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.code, p.name, p.codename, p.division_type, p.phone_code
  FROM provinces p
  WHERE p.code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get wards by province code
CREATE OR REPLACE FUNCTION get_wards_by_province(p_province_code INTEGER)
RETURNS TABLE (
  code INTEGER,
  name TEXT,
  codename TEXT,
  division_type TEXT,
  province_code INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.code, w.name, w.codename, w.division_type, w.province_code
  FROM wards w
  WHERE w.province_code = p_province_code
  ORDER BY w.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all provinces
CREATE OR REPLACE FUNCTION get_all_provinces()
RETURNS TABLE (
  code INTEGER,
  name TEXT,
  codename TEXT,
  division_type TEXT,
  phone_code INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.code, p.name, p.codename, p.division_type, p.phone_code
  FROM provinces p
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. CREATE VIEW FOR EASY QUERYING
-- ============================================================
CREATE OR REPLACE VIEW province_ward_lookup AS
SELECT
  p.code AS province_code,
  p.name AS province_name,
  p.codename AS province_codename,
  p.division_type AS province_type,
  w.code AS ward_code,
  w.name AS ward_name,
  w.codename AS ward_codename,
  w.division_type AS ward_type
FROM provinces p
LEFT JOIN wards w ON w.province_code = p.code;

-- Grant access to the view
GRANT SELECT ON province_ward_lookup TO authenticated;
GRANT SELECT ON province_ward_lookup TO anon;

-- ============================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================
COMMENT ON TABLE provinces IS 'Vietnamese provinces and centrally-governed cities catalog';
COMMENT ON TABLE wards IS 'Vietnamese wards/communes/townships linked to provinces (no district level)';
COMMENT ON COLUMN provinces.code IS 'Official province code from government';
COMMENT ON COLUMN provinces.codename IS 'URL-safe province identifier';
COMMENT ON COLUMN provinces.division_type IS 'Either tỉnh (province) or thành phố trung ương (centrally-governed city)';
COMMENT ON COLUMN wards.code IS 'Official ward code from government';
COMMENT ON COLUMN wards.province_code IS 'Reference to parent province';
COMMENT ON COLUMN wards.division_type IS 'Either xã (commune), phường (ward), or thị trấn (township)';
