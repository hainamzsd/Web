-- Migration: Add foreign key relationships to provinces and wards tables
-- This migration adds province_id and ward_id columns to existing tables
-- and creates triggers to sync between TEXT codes and INTEGER IDs

-- ============================================================
-- 1. ADD province_id and ward_id COLUMNS TO EXISTING TABLES
-- ============================================================

-- survey_locations: Add province_id and ward_id
ALTER TABLE survey_locations
  ADD COLUMN IF NOT EXISTS province_id INTEGER REFERENCES provinces(code),
  ADD COLUMN IF NOT EXISTS ward_id INTEGER REFERENCES wards(code);

CREATE INDEX IF NOT EXISTS idx_survey_locations_province_id ON survey_locations(province_id);
CREATE INDEX IF NOT EXISTS idx_survey_locations_ward_id ON survey_locations(ward_id);

-- profiles: Add province_id and ward_id
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS province_id INTEGER REFERENCES provinces(code),
  ADD COLUMN IF NOT EXISTS ward_id INTEGER REFERENCES wards(code);

CREATE INDEX IF NOT EXISTS idx_profiles_province_id ON profiles(province_id);
CREATE INDEX IF NOT EXISTS idx_profiles_ward_id ON profiles(ward_id);

-- web_users: Add province_id and ward_id
ALTER TABLE web_users
  ADD COLUMN IF NOT EXISTS province_id INTEGER REFERENCES provinces(code),
  ADD COLUMN IF NOT EXISTS ward_id INTEGER REFERENCES wards(code);

CREATE INDEX IF NOT EXISTS idx_web_users_province_id ON web_users(province_id);
CREATE INDEX IF NOT EXISTS idx_web_users_ward_id ON web_users(ward_id);

-- land_parcels: Add province_id and ward_id
ALTER TABLE land_parcels
  ADD COLUMN IF NOT EXISTS province_id INTEGER REFERENCES provinces(code),
  ADD COLUMN IF NOT EXISTS ward_id INTEGER REFERENCES wards(code);

CREATE INDEX IF NOT EXISTS idx_land_parcels_province_id ON land_parcels(province_id);
CREATE INDEX IF NOT EXISTS idx_land_parcels_ward_id ON land_parcels(ward_id);

-- ============================================================
-- 2. CREATE TRIGGER FUNCTION TO SYNC province_code <-> province_id
-- ============================================================

CREATE OR REPLACE FUNCTION sync_location_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- If province_code is set and province_id is null, look up the province
  IF NEW.province_code IS NOT NULL AND NEW.province_id IS NULL THEN
    SELECT code INTO NEW.province_id
    FROM provinces
    WHERE code::TEXT = NEW.province_code
       OR codename = NEW.province_code;
  END IF;

  -- If ward_code is set and ward_id is null, look up the ward
  IF NEW.ward_code IS NOT NULL AND NEW.ward_id IS NULL THEN
    SELECT code INTO NEW.ward_id
    FROM wards
    WHERE code::TEXT = NEW.ward_code
       OR codename = NEW.ward_code;
  END IF;

  -- Reverse sync: if province_id is set but province_code is null
  IF NEW.province_id IS NOT NULL AND NEW.province_code IS NULL THEN
    SELECT code::TEXT INTO NEW.province_code
    FROM provinces
    WHERE code = NEW.province_id;
  END IF;

  -- Reverse sync: if ward_id is set but ward_code is null
  IF NEW.ward_id IS NOT NULL AND NEW.ward_code IS NULL THEN
    SELECT code::TEXT INTO NEW.ward_code
    FROM wards
    WHERE code = NEW.ward_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for web_users (uses commune_code instead of ward_code)
CREATE OR REPLACE FUNCTION sync_web_user_location_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- If province_code is set and province_id is null
  IF NEW.province_code IS NOT NULL AND NEW.province_id IS NULL THEN
    SELECT code INTO NEW.province_id
    FROM provinces
    WHERE code::TEXT = NEW.province_code
       OR codename = NEW.province_code;
  END IF;

  -- If commune_code is set and ward_id is null
  IF NEW.commune_code IS NOT NULL AND NEW.ward_id IS NULL THEN
    SELECT code INTO NEW.ward_id
    FROM wards
    WHERE code::TEXT = NEW.commune_code
       OR codename = NEW.commune_code;
  END IF;

  -- Reverse sync
  IF NEW.province_id IS NOT NULL AND NEW.province_code IS NULL THEN
    SELECT code::TEXT INTO NEW.province_code
    FROM provinces
    WHERE code = NEW.province_id;
  END IF;

  IF NEW.ward_id IS NOT NULL AND NEW.commune_code IS NULL THEN
    SELECT code::TEXT INTO NEW.commune_code
    FROM wards
    WHERE code = NEW.ward_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. CREATE TRIGGERS ON TABLES
-- ============================================================

DROP TRIGGER IF EXISTS sync_survey_location_ids ON survey_locations;
CREATE TRIGGER sync_survey_location_ids
  BEFORE INSERT OR UPDATE ON survey_locations
  FOR EACH ROW EXECUTE FUNCTION sync_location_ids();

DROP TRIGGER IF EXISTS sync_profile_location_ids ON profiles;
CREATE TRIGGER sync_profile_location_ids
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_location_ids();

DROP TRIGGER IF EXISTS sync_web_user_location_ids ON web_users;
CREATE TRIGGER sync_web_user_location_ids
  BEFORE INSERT OR UPDATE ON web_users
  FOR EACH ROW EXECUTE FUNCTION sync_web_user_location_ids();

DROP TRIGGER IF EXISTS sync_land_parcel_location_ids ON land_parcels;
CREATE TRIGGER sync_land_parcel_location_ids
  BEFORE INSERT OR UPDATE ON land_parcels
  FOR EACH ROW EXECUTE FUNCTION sync_location_ids();

-- ============================================================
-- 4. CREATE VIEWS WITH JOINED PROVINCE/WARD DATA
-- ============================================================

CREATE OR REPLACE VIEW survey_locations_with_location AS
SELECT
  sl.*,
  p.name AS province_name,
  p.codename AS province_codename,
  w.name AS ward_name,
  w.codename AS ward_codename
FROM survey_locations sl
LEFT JOIN provinces p ON sl.province_id = p.code
LEFT JOIN wards w ON sl.ward_id = w.code;

CREATE OR REPLACE VIEW web_users_with_location AS
SELECT
  wu.*,
  pr.full_name,
  pr.phone,
  pr.police_id,
  p.name AS province_name,
  w.name AS ward_name
FROM web_users wu
LEFT JOIN profiles pr ON wu.profile_id = pr.id
LEFT JOIN provinces p ON wu.province_id = p.code
LEFT JOIN wards w ON wu.ward_id = w.code;

GRANT SELECT ON survey_locations_with_location TO authenticated;
GRANT SELECT ON web_users_with_location TO authenticated;

-- ============================================================
-- 5. FUNCTION TO GET LOCATION INFO
-- ============================================================

CREATE OR REPLACE FUNCTION get_location_info(
  p_province_code TEXT,
  p_ward_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  province_code INTEGER,
  province_name TEXT,
  province_codename TEXT,
  ward_code INTEGER,
  ward_name TEXT,
  ward_codename TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.code AS province_code,
    p.name AS province_name,
    p.codename AS province_codename,
    w.code AS ward_code,
    w.name AS ward_name,
    w.codename AS ward_codename
  FROM provinces p
  LEFT JOIN wards w ON w.province_code = p.code
    AND (p_ward_code IS NULL OR w.code::TEXT = p_ward_code OR w.codename = p_ward_code)
  WHERE p.code::TEXT = p_province_code OR p.codename = p_province_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
