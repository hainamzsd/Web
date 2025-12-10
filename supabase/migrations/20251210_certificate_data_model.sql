-- Migration: Certificate Data Model for Land Parcel Management
-- This migration restructures the land parcel system to support:
-- 1. Certificate of Land Use Rights (Giấy chứng nhận QSDĐ)
-- 2. Multiple owners per land parcel
-- 3. Multiple land use purposes per parcel
-- 4. Survey locations linked to parcels via certificate

-- ============================================
-- STEP 1: Create land_certificates table
-- ============================================
CREATE TABLE IF NOT EXISTS land_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Certificate identification
  certificate_number TEXT UNIQUE NOT NULL,      -- Số giấy chứng nhận
  certificate_book_number TEXT,                  -- Số vào sổ cấp GCN
  certificate_serial TEXT,                       -- Số phát hành (serial)

  -- Issue information
  issue_date DATE,                               -- Ngày cấp
  issuing_authority TEXT,                        -- Cơ quan cấp (e.g., 'Sở TN&MT tỉnh Bà Rịa - Vũng Tàu')

  -- Location (province/ward of the certificate)
  province_id INTEGER,
  ward_id INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,

  -- API metadata
  fetched_from_api_at TIMESTAMPTZ,              -- When data was fetched from external API
  api_source TEXT DEFAULT 'mock',               -- 'mock', 'ministry_api', etc.
  api_response_data JSONB,                       -- Raw API response for reference

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for land_certificates
CREATE INDEX IF NOT EXISTS idx_land_certificates_number ON land_certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_land_certificates_province ON land_certificates(province_id);
CREATE INDEX IF NOT EXISTS idx_land_certificates_ward ON land_certificates(ward_id);

-- ============================================
-- STEP 2: Recreate land_parcels table (drop old, create new)
-- ============================================

-- Drop old land_parcels table and related views
DROP VIEW IF EXISTS land_parcels_with_location CASCADE;
DROP TABLE IF EXISTS land_parcels CASCADE;

-- Create new land_parcels table
CREATE TABLE land_parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to certificate
  certificate_id UUID REFERENCES land_certificates(id) ON DELETE CASCADE,

  -- Parcel identification
  parcel_code TEXT NOT NULL,                     -- Mã thửa đất (unique within certificate)
  sheet_number TEXT,                             -- Số tờ bản đồ
  parcel_number TEXT,                            -- Số thửa

  -- Location
  province_id INTEGER,
  ward_id INTEGER,
  address TEXT,                                  -- Địa chỉ thửa đất

  -- Geometry and area
  total_area_m2 NUMERIC,                         -- Tổng diện tích (m2)
  geometry GEOMETRY(Polygon, 4326),              -- PostGIS polygon boundary

  -- Origin of land (Nguồn gốc sử dụng)
  land_origin TEXT,                              -- e.g., 'Nhà nước giao đất có thu tiền', 'Nhận chuyển nhượng'

  -- Legal status
  legal_status TEXT DEFAULT 'active',            -- 'active', 'disputed', 'pending_transfer'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(certificate_id, parcel_code)
);

-- Indexes for land_parcels
CREATE INDEX IF NOT EXISTS idx_land_parcels_certificate ON land_parcels(certificate_id);
CREATE INDEX IF NOT EXISTS idx_land_parcels_code ON land_parcels(parcel_code);
CREATE INDEX IF NOT EXISTS idx_land_parcels_province ON land_parcels(province_id);
CREATE INDEX IF NOT EXISTS idx_land_parcels_ward ON land_parcels(ward_id);
CREATE INDEX IF NOT EXISTS idx_land_parcels_geometry ON land_parcels USING GIST(geometry);

-- ============================================
-- STEP 3: Create land_parcel_owners table
-- ============================================
CREATE TABLE IF NOT EXISTS land_parcel_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  land_parcel_id UUID NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,

  -- Owner identification
  owner_type TEXT CHECK (owner_type IN ('individual', 'organization', 'household', 'couple')),
  full_name TEXT NOT NULL,                       -- Họ và tên / Tên tổ chức

  -- ID information
  id_number TEXT,                                -- CCCD/CMND/Mã số thuế/Hộ chiếu
  id_type TEXT CHECK (id_type IN ('cccd', 'cmnd', 'passport', 'tax_code', 'business_reg')),
  id_issue_date DATE,                            -- Ngày cấp
  id_issue_place TEXT,                           -- Nơi cấp

  -- Personal info (for individuals)
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  nationality TEXT DEFAULT 'Việt Nam',

  -- Contact information
  phone TEXT,
  email TEXT,
  permanent_address TEXT,                        -- Địa chỉ thường trú

  -- Ownership details
  ownership_share NUMERIC(5,2),                  -- Tỷ lệ sở hữu (e.g., 50.00 for 50%)
  ownership_type TEXT CHECK (ownership_type IN ('owner', 'co_owner', 'representative', 'heir')),
  is_primary_contact BOOLEAN DEFAULT false,      -- Primary contact person for this parcel

  -- Dates
  ownership_start_date DATE,
  ownership_end_date DATE,                       -- NULL if still active

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for land_parcel_owners
CREATE INDEX IF NOT EXISTS idx_land_parcel_owners_parcel ON land_parcel_owners(land_parcel_id);
CREATE INDEX IF NOT EXISTS idx_land_parcel_owners_id_number ON land_parcel_owners(id_number);
CREATE INDEX IF NOT EXISTS idx_land_parcel_owners_name ON land_parcel_owners(full_name);

-- ============================================
-- STEP 4: Create land_parcel_uses table
-- ============================================
CREATE TABLE IF NOT EXISTS land_parcel_uses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  land_parcel_id UUID NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,

  -- Land use details
  land_use_type_code TEXT NOT NULL,              -- Mã loại đất (e.g., 'ODT', 'CLN', 'LUC', 'BHK')
  land_use_purpose TEXT,                         -- Mục đích sử dụng chi tiết
  area_m2 NUMERIC NOT NULL,                      -- Diện tích theo mục đích (m2)

  -- Duration
  use_term_type TEXT CHECK (use_term_type IN ('permanent', 'limited', 'stable')),
  use_start_date DATE,
  use_end_date DATE,                             -- NULL if permanent/stable

  -- Additional info
  use_restrictions TEXT,                         -- Hạn chế sử dụng (nếu có)
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for land_parcel_uses
CREATE INDEX IF NOT EXISTS idx_land_parcel_uses_parcel ON land_parcel_uses(land_parcel_id);
CREATE INDEX IF NOT EXISTS idx_land_parcel_uses_type ON land_parcel_uses(land_use_type_code);

-- ============================================
-- STEP 5: Modify survey_locations table
-- ============================================

-- Rename owner columns to representative
ALTER TABLE survey_locations
  RENAME COLUMN owner_name TO representative_name;

ALTER TABLE survey_locations
  RENAME COLUMN owner_id_number TO representative_id_number;

ALTER TABLE survey_locations
  RENAME COLUMN owner_phone TO representative_phone;

-- Add parcel linkage columns
ALTER TABLE survey_locations
  ADD COLUMN IF NOT EXISTS land_parcel_id UUID REFERENCES land_parcels(id);

ALTER TABLE survey_locations
  ADD COLUMN IF NOT EXISTS certificate_id UUID REFERENCES land_certificates(id);

ALTER TABLE survey_locations
  ADD COLUMN IF NOT EXISTS parcel_verified_at TIMESTAMPTZ;

ALTER TABLE survey_locations
  ADD COLUMN IF NOT EXISTS parcel_verified_by UUID REFERENCES profiles(id);

-- Add index for parcel lookups
CREATE INDEX IF NOT EXISTS idx_survey_locations_parcel ON survey_locations(land_parcel_id);
CREATE INDEX IF NOT EXISTS idx_survey_locations_certificate ON survey_locations(certificate_id);

-- ============================================
-- STEP 6: Create helper view for parcels with location names
-- ============================================
CREATE OR REPLACE VIEW land_parcels_with_details AS
SELECT
  lp.*,
  lc.certificate_number,
  lc.issue_date as certificate_issue_date,
  lc.issuing_authority,
  p.name as province_name,
  w.name as ward_name,
  (
    SELECT json_agg(json_build_object(
      'id', lpo.id,
      'full_name', lpo.full_name,
      'id_number', lpo.id_number,
      'id_type', lpo.id_type,
      'ownership_share', lpo.ownership_share,
      'ownership_type', lpo.ownership_type,
      'is_primary_contact', lpo.is_primary_contact,
      'phone', lpo.phone,
      'permanent_address', lpo.permanent_address
    ))
    FROM land_parcel_owners lpo
    WHERE lpo.land_parcel_id = lp.id
  ) as owners,
  (
    SELECT json_agg(json_build_object(
      'id', lpu.id,
      'land_use_type_code', lpu.land_use_type_code,
      'land_use_purpose', lpu.land_use_purpose,
      'area_m2', lpu.area_m2,
      'use_term_type', lpu.use_term_type,
      'use_end_date', lpu.use_end_date
    ))
    FROM land_parcel_uses lpu
    WHERE lpu.land_parcel_id = lp.id
  ) as land_uses
FROM land_parcels lp
LEFT JOIN land_certificates lc ON lp.certificate_id = lc.id
LEFT JOIN provinces p ON lp.province_id = p.code
LEFT JOIN wards w ON lp.ward_id = w.code;

-- ============================================
-- STEP 7: RLS Policies for new tables
-- ============================================

-- Enable RLS on new tables
ALTER TABLE land_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_parcel_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_parcel_uses ENABLE ROW LEVEL SECURITY;

-- land_certificates policies
CREATE POLICY "Authenticated users can view certificates"
  ON land_certificates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Officers can insert certificates"
  ON land_certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.is_active = true
    )
  );

CREATE POLICY "Officers can update certificates"
  ON land_certificates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.is_active = true
    )
  );

-- land_parcels policies
CREATE POLICY "Authenticated users can view parcels"
  ON land_parcels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Officers can insert parcels"
  ON land_parcels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.is_active = true
    )
  );

CREATE POLICY "Officers can update parcels"
  ON land_parcels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.is_active = true
    )
  );

-- land_parcel_owners policies
CREATE POLICY "Authenticated users can view parcel owners"
  ON land_parcel_owners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Officers can manage parcel owners"
  ON land_parcel_owners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.is_active = true
    )
  );

-- land_parcel_uses policies
CREATE POLICY "Authenticated users can view parcel uses"
  ON land_parcel_uses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Officers can manage parcel uses"
  ON land_parcel_uses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.is_active = true
    )
  );

-- ============================================
-- STEP 8: Insert mock certificate data for demo
-- ============================================

-- Insert sample certificates
INSERT INTO land_certificates (id, certificate_number, certificate_book_number, certificate_serial, issue_date, issuing_authority, province_id, ward_id, api_source)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'BV-123456', 'CS 00123', 'AX 123456', '2020-05-15', 'Sở Tài nguyên và Môi trường tỉnh Bà Rịa - Vũng Tàu', 77, 26734, 'mock'),
  ('a2000000-0000-0000-0000-000000000002', 'BV-234567', 'CS 00456', 'AX 234567', '2019-08-22', 'Sở Tài nguyên và Môi trường tỉnh Bà Rịa - Vũng Tàu', 77, 26734, 'mock'),
  ('a3000000-0000-0000-0000-000000000003', 'BV-345678', 'CS 00789', 'AX 345678', '2021-03-10', 'Sở Tài nguyên và Môi trường tỉnh Bà Rịa - Vũng Tàu', 77, 26737, 'mock'),
  ('a4000000-0000-0000-0000-000000000004', 'BV-456789', 'CS 01234', 'AX 456789', '2018-11-05', 'Sở Tài nguyên và Môi trường tỉnh Bà Rịa - Vũng Tàu', 77, 26737, 'mock'),
  ('a5000000-0000-0000-0000-000000000005', 'BV-567890', 'CS 05678', 'AX 567890', '2022-07-18', 'Sở Tài nguyên và Môi trường tỉnh Bà Rịa - Vũng Tàu', 77, 26740, 'mock')
ON CONFLICT (certificate_number) DO NOTHING;

-- Insert sample land parcels
INSERT INTO land_parcels (id, certificate_id, parcel_code, sheet_number, parcel_number, province_id, ward_id, address, total_area_m2, land_origin)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '77-26734-001', '15', '123', 77, 26734, '123 Đường Trần Hưng Đạo, Phường 1, TP. Vũng Tàu', 250.5, 'Nhà nước giao đất có thu tiền sử dụng đất'),
  ('b2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', '77-26734-002', '15', '124', 77, 26734, '125 Đường Trần Hưng Đạo, Phường 1, TP. Vũng Tàu', 180.0, 'Nhận chuyển nhượng quyền sử dụng đất'),
  ('b3000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000003', '77-26737-001', '22', '456', 77, 26737, '45 Đường Lê Lợi, Phường 4, TP. Vũng Tàu', 320.0, 'Nhà nước giao đất không thu tiền sử dụng đất'),
  ('b4000000-0000-0000-0000-000000000004', 'a4000000-0000-0000-0000-000000000004', '77-26737-002', '22', '457', 77, 26737, '47 Đường Lê Lợi, Phường 4, TP. Vũng Tàu', 450.0, 'Được Nhà nước cho thuê đất trả tiền hàng năm'),
  ('b5000000-0000-0000-0000-000000000005', 'a5000000-0000-0000-0000-000000000005', '77-26740-001', '08', '789', 77, 26740, '89 Đường Nguyễn An Ninh, Phường 7, TP. Vũng Tàu', 520.0, 'Nhận thừa kế quyền sử dụng đất')
ON CONFLICT (certificate_id, parcel_code) DO NOTHING;

-- Insert sample parcel owners (multiple owners per parcel)
INSERT INTO land_parcel_owners (land_parcel_id, owner_type, full_name, id_number, id_type, id_issue_date, id_issue_place, date_of_birth, gender, phone, permanent_address, ownership_share, ownership_type, is_primary_contact)
VALUES
  -- Parcel 1: Single owner
  ('b1000000-0000-0000-0000-000000000001', 'individual', 'Nguyễn Văn An', '079085001234', 'cccd', '2021-01-15', 'Cục CS QLHC về TTXH', '1975-03-20', 'male', '0901234567', '123 Đường Trần Hưng Đạo, Phường 1, TP. Vũng Tàu', 100.00, 'owner', true),

  -- Parcel 2: Couple (husband and wife)
  ('b2000000-0000-0000-0000-000000000002', 'couple', 'Trần Văn Bình', '079080005678', 'cccd', '2020-06-10', 'Cục CS QLHC về TTXH', '1980-07-15', 'male', '0912345678', '125 Đường Trần Hưng Đạo, Phường 1, TP. Vũng Tàu', 50.00, 'owner', true),
  ('b2000000-0000-0000-0000-000000000002', 'couple', 'Lê Thị Cúc', '079082009876', 'cccd', '2020-06-10', 'Cục CS QLHC về TTXH', '1982-12-25', 'female', '0923456789', '125 Đường Trần Hưng Đạo, Phường 1, TP. Vũng Tàu', 50.00, 'co_owner', false),

  -- Parcel 3: Household with multiple members
  ('b3000000-0000-0000-0000-000000000003', 'household', 'Phạm Văn Dũng', '079075003456', 'cccd', '2019-09-20', 'Cục CS QLHC về TTXH', '1970-01-10', 'male', '0934567890', '45 Đường Lê Lợi, Phường 4, TP. Vũng Tàu', 40.00, 'owner', true),
  ('b3000000-0000-0000-0000-000000000003', 'household', 'Nguyễn Thị Em', '079078007890', 'cccd', '2019-09-20', 'Cục CS QLHC về TTXH', '1972-05-18', 'female', '0945678901', '45 Đường Lê Lợi, Phường 4, TP. Vũng Tàu', 30.00, 'co_owner', false),
  ('b3000000-0000-0000-0000-000000000003', 'household', 'Phạm Văn Phúc', '079095004567', 'cccd', '2021-03-15', 'Cục CS QLHC về TTXH', '1995-08-22', 'male', '0956789012', '45 Đường Lê Lợi, Phường 4, TP. Vũng Tàu', 30.00, 'co_owner', false),

  -- Parcel 4: Organization
  ('b4000000-0000-0000-0000-000000000004', 'organization', 'Công ty TNHH Đầu tư Xây dựng Vũng Tàu', '3500123456', 'tax_code', '2015-04-01', 'Sở KH&ĐT tỉnh BR-VT', NULL, NULL, '02543123456', '47 Đường Lê Lợi, Phường 4, TP. Vũng Tàu', 100.00, 'owner', true),

  -- Parcel 5: Individual with representative
  ('b5000000-0000-0000-0000-000000000005', 'individual', 'Hoàng Thị Giang', '079065008901', 'cccd', '2018-11-20', 'Cục CS QLHC về TTXH', '1965-04-12', 'female', '0967890123', '89 Đường Nguyễn An Ninh, Phường 7, TP. Vũng Tàu', 100.00, 'owner', false),
  ('b5000000-0000-0000-0000-000000000005', 'individual', 'Hoàng Văn Hải', '079090002345', 'cccd', '2020-02-28', 'Cục CS QLHC về TTXH', '1990-09-30', 'male', '0978901234', '89 Đường Nguyễn An Ninh, Phường 7, TP. Vũng Tàu', 0.00, 'representative', true);

-- Insert sample land uses (multiple uses per parcel)
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
  ('b5000000-0000-0000-0000-000000000005', 'CLN', 'Đất trồng cây lâu năm', 120.0, 'stable', '2022-07-18', NULL);

-- ============================================
-- STEP 9: Add comment for documentation
-- ============================================
COMMENT ON TABLE land_certificates IS 'Certificate of Land Use Rights (Giấy chứng nhận QSDĐ) from Ministry of Agriculture and Environment';
COMMENT ON TABLE land_parcels IS 'Land parcels linked to certificates, can have multiple owners and uses';
COMMENT ON TABLE land_parcel_owners IS 'Multiple owners per land parcel with ownership shares';
COMMENT ON TABLE land_parcel_uses IS 'Multiple land use purposes per parcel with different areas and terms';
COMMENT ON COLUMN survey_locations.representative_name IS 'On-site contact person name (not official owner from certificate)';
COMMENT ON COLUMN survey_locations.representative_phone IS 'On-site contact phone (not official owner from certificate)';
COMMENT ON COLUMN survey_locations.land_parcel_id IS 'Link to official land parcel from certificate lookup';
