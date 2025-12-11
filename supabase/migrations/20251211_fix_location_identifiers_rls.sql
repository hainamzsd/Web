-- ============================================================================
-- Migration: Fix Location Identifiers RLS Policies
-- Date: 2025-12-11
-- Description:
--   Fix RLS policies for location_identifiers table to use helper functions
--   and properly allow central_admin to view/manage all records
-- ============================================================================

-- First, create helper functions for province_id and ward_id
CREATE OR REPLACE FUNCTION public.get_user_province_id()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT province_id FROM web_users WHERE profile_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_ward_id()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ward_id FROM web_users WHERE profile_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_province_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_ward_id() TO authenticated;

-- Drop existing policies on location_identifiers
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'location_identifiers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON location_identifiers', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE location_identifiers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create new policies using helper functions
-- ============================================================================

-- Policy 1: Central/System admins can view ALL location identifiers
CREATE POLICY "Admins view all location identifiers"
  ON location_identifiers
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('central_admin', 'system_admin')
  );

-- Policy 2: Province supervisors can view location identifiers in their province
CREATE POLICY "Supervisors view province location identifiers"
  ON location_identifiers
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'commune_supervisor'
    AND EXISTS (
      SELECT 1 FROM survey_locations sl
      WHERE sl.id = location_identifiers.survey_location_id
        AND sl.province_id = get_user_province_id()
    )
  );

-- Policy 3: Commune officers can view location identifiers in their ward
CREATE POLICY "Officers view ward location identifiers"
  ON location_identifiers
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'commune_officer'
    AND EXISTS (
      SELECT 1 FROM survey_locations sl
      WHERE sl.id = location_identifiers.survey_location_id
        AND sl.ward_id = get_user_ward_id()
    )
  );

-- Policy 4: Central/System admins can INSERT location identifiers
CREATE POLICY "Admins insert location identifiers"
  ON location_identifiers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('central_admin', 'system_admin')
  );

-- Policy 5: Central/System admins can UPDATE location identifiers
CREATE POLICY "Admins update location identifiers"
  ON location_identifiers
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('central_admin', 'system_admin')
  )
  WITH CHECK (
    get_user_role() IN ('central_admin', 'system_admin')
  );

-- Policy 6: Central/System admins can DELETE location identifiers
CREATE POLICY "Admins delete location identifiers"
  ON location_identifiers
  FOR DELETE
  TO authenticated
  USING (
    get_user_role() IN ('central_admin', 'system_admin')
  );

-- ============================================================================
-- Also fix approval_history RLS if needed
-- ============================================================================

-- Drop existing policies on approval_history
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'approval_history'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON approval_history', pol.policyname);
        RAISE NOTICE 'Dropped approval_history policy: %', pol.policyname;
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;

-- Policy: Central/System admins can view all approval history
CREATE POLICY "Admins view all approval history"
  ON approval_history
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('central_admin', 'system_admin')
  );

-- Policy: Province supervisors can view approval history in their province
CREATE POLICY "Supervisors view province approval history"
  ON approval_history
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'commune_supervisor'
    AND EXISTS (
      SELECT 1 FROM survey_locations sl
      WHERE sl.id = approval_history.survey_location_id
        AND sl.province_id = get_user_province_id()
    )
  );

-- Policy: Commune officers can view approval history in their ward
CREATE POLICY "Officers view ward approval history"
  ON approval_history
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'commune_officer'
    AND EXISTS (
      SELECT 1 FROM survey_locations sl
      WHERE sl.id = approval_history.survey_location_id
        AND sl.ward_id = get_user_ward_id()
    )
  );

-- Policy: Users can view approval history for their own surveys
CREATE POLICY "Users view own approval history"
  ON approval_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_locations sl
      WHERE sl.id = approval_history.survey_location_id
        AND sl.surveyor_id = auth.uid()
    )
  );

-- Policy: Central/System admins and supervisors can INSERT approval history
CREATE POLICY "Admins and supervisors insert approval history"
  ON approval_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('central_admin', 'system_admin', 'commune_supervisor')
  );

-- ============================================================================
-- Verify
-- ============================================================================
DO $$
DECLARE
    li_count INTEGER;
    ah_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO li_count FROM pg_policies WHERE tablename = 'location_identifiers';
    SELECT COUNT(*) INTO ah_count FROM pg_policies WHERE tablename = 'approval_history';
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS policies updated!';
    RAISE NOTICE 'location_identifiers policies: %', li_count;
    RAISE NOTICE 'approval_history policies: %', ah_count;
END $$;
