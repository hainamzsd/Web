-- Migration: Fix Entry Points RLS Policies
-- Date: 2025-12-08
-- Description: Adds missing RLS policies for commune officers and fixes location-based access

-- ============================================================================
-- 1. Create helper functions for ward_id and province_id lookup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_ward_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ward_id FROM web_users WHERE profile_id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_province_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT province_id FROM web_users WHERE profile_id = auth.uid() AND is_active = true LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_ward_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_province_id() TO authenticated;

-- ============================================================================
-- 2. Drop existing entry points policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view entry points for their surveys" ON survey_entry_points;
DROP POLICY IF EXISTS "Users can insert entry points for their surveys" ON survey_entry_points;
DROP POLICY IF EXISTS "Users can update entry points for their surveys" ON survey_entry_points;
DROP POLICY IF EXISTS "Users can delete entry points for their surveys" ON survey_entry_points;
DROP POLICY IF EXISTS "Supervisors can view all entry points" ON survey_entry_points;

-- ============================================================================
-- 3. Create new comprehensive RLS policies
-- ============================================================================

-- Policy 1: Mobile users can view entry points for their own surveys
CREATE POLICY "Users can view own survey entry points"
ON survey_entry_points FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.surveyor_id = auth.uid()
    )
);

-- Policy 2: Mobile users can insert entry points for their own surveys
CREATE POLICY "Users can insert own survey entry points"
ON survey_entry_points FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.surveyor_id = auth.uid()
    )
);

-- Policy 3: Mobile users can update entry points for their own surveys
CREATE POLICY "Users can update own survey entry points"
ON survey_entry_points FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.surveyor_id = auth.uid()
    )
);

-- Policy 4: Mobile users can delete entry points for their own surveys
CREATE POLICY "Users can delete own survey entry points"
ON survey_entry_points FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.surveyor_id = auth.uid()
    )
);

-- Policy 5: Commune officers can view entry points for surveys in their commune (ward)
CREATE POLICY "Commune officers view ward entry points"
ON survey_entry_points FOR SELECT
TO authenticated
USING (
    get_user_role() = 'commune_officer'
    AND EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.ward_id = get_user_ward_id()
    )
);

-- Policy 6: Province supervisors can view all entry points in their province
CREATE POLICY "Supervisors view province entry points"
ON survey_entry_points FOR SELECT
TO authenticated
USING (
    get_user_role() = 'commune_supervisor'
    AND EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.province_id = get_user_province_id()
    )
);

-- Policy 7: Supervisors can update entry points in their province
CREATE POLICY "Supervisors update province entry points"
ON survey_entry_points FOR UPDATE
TO authenticated
USING (
    get_user_role() = 'commune_supervisor'
    AND EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.province_id = get_user_province_id()
    )
);

-- Policy 8: Central/System admins can view all entry points
CREATE POLICY "Admins view all entry points"
ON survey_entry_points FOR SELECT
TO authenticated
USING (
    get_user_role() IN ('central_admin', 'system_admin')
);

-- Policy 9: Central/System admins can update all entry points
CREATE POLICY "Admins update all entry points"
ON survey_entry_points FOR UPDATE
TO authenticated
USING (
    get_user_role() IN ('central_admin', 'system_admin')
);

-- Policy 10: Central/System admins can delete all entry points
CREATE POLICY "Admins delete all entry points"
ON survey_entry_points FOR DELETE
TO authenticated
USING (
    get_user_role() IN ('central_admin', 'system_admin')
);

-- ============================================================================
-- 4. Verify policies were created
-- ============================================================================
DO $$
DECLARE
    pol_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pol_count FROM pg_policies WHERE tablename = 'survey_entry_points';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Survey entry points RLS policies updated!';
    RAISE NOTICE 'Total policies: %', pol_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Access summary:';
    RAISE NOTICE '  - Mobile users: Entry points for own surveys only (by surveyor_id)';
    RAISE NOTICE '  - Commune officers: Entry points for surveys in their ward (by ward_id)';
    RAISE NOTICE '  - Province supervisors: Entry points for surveys in their province (by province_id)';
    RAISE NOTICE '  - Central/System admins: All entry points';
END $$;
