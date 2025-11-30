-- ============================================================================
-- Fix RLS Policies for Survey Sync from Mobile App
-- ============================================================================
-- Ensures that synced surveys from the mobile app can be properly inserted
-- and accessed by web users even if the surveyor profile doesn't exist yet
-- ============================================================================

-- Drop and recreate profile insert policy to allow service role
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

CREATE POLICY "Service role can insert profiles"
ON profiles FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to insert surveys (for sync)
DROP POLICY IF EXISTS "Service role can insert surveys" ON survey_locations;

CREATE POLICY "Service role can insert surveys"
ON survey_locations FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to update surveys (for marking as synced)
DROP POLICY IF EXISTS "Service role can update surveys" ON survey_locations;

CREATE POLICY "Service role can update surveys"
ON survey_locations FOR UPDATE
TO service_role
USING (true);

-- Fix: Allow users to view surveys even if surveyor profile doesn't exist in web_users
-- This handles the case where mobile app officers sync surveys but aren't web users
DROP POLICY IF EXISTS "Commune officers see their commune data" ON survey_locations;
DROP POLICY IF EXISTS "Commune supervisors see their commune data" ON survey_locations;
DROP POLICY IF EXISTS "Central admins see all data" ON survey_locations;

-- Commune officers can view surveys in their commune
CREATE POLICY "Commune officers see their commune data"
  ON survey_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'commune_officer'
        AND wu.is_active = true
        AND survey_locations.ward_code = wu.commune_code
    )
  );

-- Commune supervisors can view surveys in their commune
CREATE POLICY "Commune supervisors see their commune data"
  ON survey_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'commune_supervisor'
        AND wu.is_active = true
        AND survey_locations.ward_code = wu.commune_code
    )
  );

-- Central admins can view all surveys
CREATE POLICY "Central admins see all data"
  ON survey_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role IN ('central_admin', 'system_admin')
        AND wu.is_active = true
    )
  );

-- System admins can view all surveys (duplicate for clarity)
CREATE POLICY "System admins see all data"
  ON survey_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'system_admin'
        AND wu.is_active = true
    )
  );

-- ============================================================================
-- Add helper function to check if a survey is synced from mobile
-- ============================================================================
CREATE OR REPLACE FUNCTION is_mobile_synced_survey(survey_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- A survey is considered mobile-synced if:
  -- 1. The surveyor_id references a profile that exists
  -- 2. The profile has a police_id (synced from mobile app)
  RETURN EXISTS (
    SELECT 1
    FROM survey_locations sl
    JOIN profiles p ON p.id = sl.surveyor_id
    WHERE sl.id = survey_id
      AND p.police_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_mobile_synced_survey(UUID) TO authenticated;

-- ============================================================================
-- Completion Message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed for sync compatibility!';
  RAISE NOTICE '';
  RAISE NOTICE 'Service role can now:';
  RAISE NOTICE '  • Insert profiles (auto-sync from mobile)';
  RAISE NOTICE '  • Insert surveys (auto-sync from mobile)';
  RAISE NOTICE '  • Update surveys (mark as synced)';
  RAISE NOTICE '';
  RAISE NOTICE 'Web users can view surveys based on their role and jurisdiction.';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper function: is_mobile_synced_survey(survey_id)';
END $$;
