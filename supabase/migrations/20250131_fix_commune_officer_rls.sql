-- =============================================================================
-- FIX: RLS policies for commune officers and province supervisors
-- =============================================================================
-- Problem:
--   - Commune officers can only see their own surveys, not all surveys in their commune
--   - Supervisors are province-level users, they should see all surveys in their province
-- Solution:
--   - Add RLS policy for commune officers to see surveys by ward_code
--   - Add RLS policy for supervisors to see surveys by province_code
-- =============================================================================

-- Helper function to get current user's commune code (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_user_commune_code()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT commune_code FROM web_users WHERE profile_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_commune_code() TO authenticated;

-- Helper function to get current user's province code
CREATE OR REPLACE FUNCTION public.get_user_province_code()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT province_code FROM web_users WHERE profile_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_province_code() TO authenticated;

-- Helper function to check if user is a commune officer (NOT supervisor)
CREATE OR REPLACE FUNCTION public.is_commune_officer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM web_users
    WHERE profile_id = auth.uid()
      AND role = 'commune_officer'
      AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_commune_officer() TO authenticated;

-- Helper function to check if user is a province supervisor
CREATE OR REPLACE FUNCTION public.is_province_supervisor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM web_users
    WHERE profile_id = auth.uid()
      AND role = 'commune_supervisor'  -- This role is actually province-level
      AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_province_supervisor() TO authenticated;

-- =============================================================================
-- Drop existing conflicting policies
-- =============================================================================
DROP POLICY IF EXISTS "Commune users can view commune surveys" ON survey_locations;
DROP POLICY IF EXISTS "Commune supervisors can update commune surveys" ON survey_locations;
DROP POLICY IF EXISTS "Commune officers can view commune surveys" ON survey_locations;
DROP POLICY IF EXISTS "Province supervisors can view province surveys" ON survey_locations;
DROP POLICY IF EXISTS "Province supervisors can update province surveys" ON survey_locations;

-- =============================================================================
-- Policy for COMMUNE OFFICERS: Can view surveys in their commune (by ward_code)
-- =============================================================================
CREATE POLICY "Commune officers can view commune surveys"
  ON survey_locations
  FOR SELECT
  TO authenticated
  USING (
    is_commune_officer() AND ward_code = get_user_commune_code()
  );

-- =============================================================================
-- Policy for PROVINCE SUPERVISORS: Can view ALL surveys in their province
-- =============================================================================
CREATE POLICY "Province supervisors can view province surveys"
  ON survey_locations
  FOR SELECT
  TO authenticated
  USING (
    is_province_supervisor() AND province_code = get_user_province_code()
  );

-- =============================================================================
-- Policy for PROVINCE SUPERVISORS: Can update surveys in their province
-- =============================================================================
CREATE POLICY "Province supervisors can update province surveys"
  ON survey_locations
  FOR UPDATE
  TO authenticated
  USING (
    is_province_supervisor() AND province_code = get_user_province_code()
  )
  WITH CHECK (
    is_province_supervisor() AND province_code = get_user_province_code()
  );

-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS policies updated for commune officers and province supervisors!';
  RAISE NOTICE '';
  RAISE NOTICE 'Commune Officers (role = commune_officer):';
  RAISE NOTICE '  - Can view surveys WHERE ward_code = their commune_code';
  RAISE NOTICE '';
  RAISE NOTICE 'Province Supervisors (role = commune_supervisor):';
  RAISE NOTICE '  - Can view ALL surveys WHERE province_code = their province_code';
  RAISE NOTICE '  - Can update ALL surveys WHERE province_code = their province_code';
  RAISE NOTICE '';
  RAISE NOTICE 'Central/System Admins:';
  RAISE NOTICE '  - Can view and update ALL surveys (existing policy)';
END $$;
