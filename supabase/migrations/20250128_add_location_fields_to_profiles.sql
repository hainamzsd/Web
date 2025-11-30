-- =============================================================================
-- Migration: Add Location Fields to Web Profiles
-- =============================================================================
-- This migration adds the location fields (province_code, district_code, ward_code)
-- to the web profiles table to support location-based access control for
-- mobile surveyors who may not have web_users entries.
--
-- This works ALONGSIDE existing web_users-based RLS policies.
-- =============================================================================

-- Add missing location columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS province_code TEXT,
ADD COLUMN IF NOT EXISTS district_code TEXT,
ADD COLUMN IF NOT EXISTS ward_code TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'officer';

-- Add constraint if not exists (handle gracefully)
DO $$
BEGIN
  ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('officer', 'leader', 'admin'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_province ON profiles(province_code);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON profiles(district_code);
CREATE INDEX IF NOT EXISTS idx_profiles_ward ON profiles(ward_code);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =============================================================================
-- Helper Functions for Location Access
-- =============================================================================

-- Function to get user's location scope from profiles table
CREATE OR REPLACE FUNCTION get_user_location_scope(user_id UUID)
RETURNS TABLE (
  user_role TEXT,
  user_province_code TEXT,
  user_district_code TEXT,
  user_ward_code TEXT,
  scope_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.role,
    p.province_code,
    p.district_code,
    p.ward_code,
    CASE
      WHEN p.role = 'admin' THEN 'admin'::TEXT
      WHEN p.role = 'leader' AND p.ward_code IS NULL THEN 'province'::TEXT
      ELSE 'ward'::TEXT
    END as scope_level
  FROM profiles p
  WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can access a survey based on profile location
CREATE OR REPLACE FUNCTION user_can_access_survey_by_profile(
  user_id UUID,
  survey_province_code TEXT,
  survey_ward_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  user_scope RECORD;
BEGIN
  SELECT * INTO user_scope FROM get_user_location_scope(user_id) LIMIT 1;

  -- No profile location data, deny access
  IF user_scope IS NULL OR user_scope.user_province_code IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admin can access everything
  IF user_scope.scope_level = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check province match
  IF survey_province_code != user_scope.user_province_code THEN
    RETURN FALSE;
  END IF;

  -- Province-level users can access all wards in their province
  IF user_scope.scope_level = 'province' THEN
    RETURN TRUE;
  END IF;

  -- Ward-level users can only access their own ward
  RETURN survey_ward_code = user_scope.user_ward_code;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user's assigned boundary info
CREATE OR REPLACE FUNCTION get_user_boundary_info(user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  uid UUID;
  user_scope RECORD;
BEGIN
  uid := COALESCE(user_id, auth.uid());

  SELECT * INTO user_scope FROM get_user_location_scope(uid) LIMIT 1;

  IF user_scope IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'User not found',
      'scopeLevel', null
    );
  END IF;

  RETURN jsonb_build_object(
    'scopeLevel', user_scope.scope_level,
    'provinceCode', user_scope.user_province_code,
    'districtCode', user_scope.user_district_code,
    'wardCode', user_scope.user_ward_code,
    'role', user_scope.user_role
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- ADDITIONAL RLS Policies for Profile-Based Access
-- These work ALONGSIDE existing web_users-based policies
-- =============================================================================

-- Add policy for mobile surveyors to see their own surveys
-- (surveyors who don't have web_users entries)
DROP POLICY IF EXISTS "Surveyors can see own surveys" ON survey_locations;
CREATE POLICY "Surveyors can see own surveys"
ON survey_locations FOR SELECT
TO authenticated
USING (surveyor_id = auth.uid());

-- Add policy for mobile surveyors to see surveys in their ward via profiles
DROP POLICY IF EXISTS "Profile-based ward access" ON survey_locations;
CREATE POLICY "Profile-based ward access"
ON survey_locations FOR SELECT
TO authenticated
USING (
  -- User has profile with matching ward_code
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.province_code IS NOT NULL
    AND p.ward_code IS NOT NULL
    AND survey_locations.province_code = p.province_code
    AND survey_locations.ward_code = p.ward_code
  )
);

-- Add policy for profile-based province access (leaders)
DROP POLICY IF EXISTS "Profile-based province access" ON survey_locations;
CREATE POLICY "Profile-based province access"
ON survey_locations FOR SELECT
TO authenticated
USING (
  -- User is a leader with province-level access
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'leader'
    AND p.province_code IS NOT NULL
    AND survey_locations.province_code = p.province_code
  )
);

-- Add policy for profile-based admin access
DROP POLICY IF EXISTS "Profile-based admin access" ON survey_locations;
CREATE POLICY "Profile-based admin access"
ON survey_locations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Add update policy for surveyors on their own surveys
DROP POLICY IF EXISTS "Surveyors can update own surveys" ON survey_locations;
CREATE POLICY "Surveyors can update own surveys"
ON survey_locations FOR UPDATE
TO authenticated
USING (
  surveyor_id = auth.uid()
  AND status IN ('pending', 'rejected')  -- Only pending/rejected surveys
)
WITH CHECK (
  surveyor_id = auth.uid()
);

-- =============================================================================
-- Ensure service role has full access (for sync function)
-- =============================================================================

-- Ensure service role can insert profiles
DROP POLICY IF EXISTS "Service role profile insert" ON profiles;
CREATE POLICY "Service role profile insert"
ON profiles FOR INSERT
TO service_role
WITH CHECK (true);

-- Ensure service role can update profiles
DROP POLICY IF EXISTS "Service role profile update" ON profiles;
CREATE POLICY "Service role profile update"
ON profiles FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure service role can select profiles
DROP POLICY IF EXISTS "Service role profile select" ON profiles;
CREATE POLICY "Service role profile select"
ON profiles FOR SELECT
TO service_role
USING (true);

-- =============================================================================
-- Grant Permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_user_location_scope(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_access_survey_by_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_boundary_info(UUID) TO authenticated;

-- =============================================================================
-- Migration Complete
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Location fields added to profiles table';
  RAISE NOTICE '';
  RAISE NOTICE 'New columns: province_code, district_code, ward_code, role';
  RAISE NOTICE '';
  RAISE NOTICE 'New helper functions:';
  RAISE NOTICE '  • get_user_location_scope(user_id)';
  RAISE NOTICE '  • user_can_access_survey_by_profile(user_id, province, ward)';
  RAISE NOTICE '  • get_user_boundary_info(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'New RLS policies work alongside existing web_users policies';
  RAISE NOTICE 'Mobile surveyors can now access surveys in their assigned area';
END $$;
