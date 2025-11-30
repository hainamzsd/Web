-- =============================================================================
-- COMPLETE FIX: All Survey Locations RLS Policies
-- =============================================================================
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Step 1: Create helper functions (SECURITY DEFINER bypasses RLS)

CREATE OR REPLACE FUNCTION public.get_user_commune_code()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT commune_code FROM web_users WHERE profile_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_province_code()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT province_code FROM web_users WHERE profile_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM web_users WHERE profile_id = auth.uid() AND is_active = true LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_commune_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_province_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- Step 2: Drop ALL existing policies on survey_locations
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'survey_locations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON survey_locations', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 3: Enable RLS
ALTER TABLE survey_locations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Step 4: Create new policies
-- =============================================================================

-- Policy 1: Users can INSERT their own surveys
CREATE POLICY "Users can insert own surveys"
  ON survey_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (surveyor_id = auth.uid());

-- Policy 2: Users can SELECT their own surveys (mobile app users)
CREATE POLICY "Users can select own surveys"
  ON survey_locations
  FOR SELECT
  TO authenticated
  USING (surveyor_id = auth.uid());

-- Policy 3: Users can UPDATE their own surveys
CREATE POLICY "Users can update own surveys"
  ON survey_locations
  FOR UPDATE
  TO authenticated
  USING (surveyor_id = auth.uid())
  WITH CHECK (surveyor_id = auth.uid());

-- Policy 4: Users can DELETE their own surveys
CREATE POLICY "Users can delete own surveys"
  ON survey_locations
  FOR DELETE
  TO authenticated
  USING (surveyor_id = auth.uid());

-- Policy 5: Commune officers can view all surveys in their commune
CREATE POLICY "Commune officers view commune surveys"
  ON survey_locations
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'commune_officer'
    AND ward_code = get_user_commune_code()
  );

-- Policy 6: Province supervisors can view ALL surveys in their province
CREATE POLICY "Supervisors view province surveys"
  ON survey_locations
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'commune_supervisor'
    AND province_code = get_user_province_code()
  );

-- Policy 7: Province supervisors can UPDATE surveys in their province
CREATE POLICY "Supervisors update province surveys"
  ON survey_locations
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'commune_supervisor'
    AND province_code = get_user_province_code()
  )
  WITH CHECK (
    get_user_role() = 'commune_supervisor'
    AND province_code = get_user_province_code()
  );

-- Policy 8: Central/System admins can view ALL surveys
CREATE POLICY "Admins view all surveys"
  ON survey_locations
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('central_admin', 'system_admin')
  );

-- Policy 9: Central/System admins can UPDATE all surveys
CREATE POLICY "Admins update all surveys"
  ON survey_locations
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('central_admin', 'system_admin')
  )
  WITH CHECK (
    get_user_role() IN ('central_admin', 'system_admin')
  );

-- Policy 10: Central/System admins can DELETE all surveys
CREATE POLICY "Admins delete all surveys"
  ON survey_locations
  FOR DELETE
  TO authenticated
  USING (
    get_user_role() IN ('central_admin', 'system_admin')
  );

-- =============================================================================
-- Verify
-- =============================================================================
DO $$
DECLARE
    pol_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pol_count FROM pg_policies WHERE tablename = 'survey_locations';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Survey locations RLS policies updated!';
    RAISE NOTICE 'Total policies: %', pol_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Access summary:';
    RAISE NOTICE '  - Mobile users: Own surveys only (by surveyor_id)';
    RAISE NOTICE '  - Commune officers: All surveys in their commune (by ward_code)';
    RAISE NOTICE '  - Province supervisors: All surveys in their province (by province_code)';
    RAISE NOTICE '  - Central/System admins: All surveys';
END $$;
