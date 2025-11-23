-- ============================================
-- COMPLETE RLS POLICY RESET SCRIPT
-- This script removes all existing RLS policies and creates fresh ones
-- ============================================

-- Drop all existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Disable RLS temporarily
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS web_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS survey_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS approval_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS location_identifiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS land_parcels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;

-- Drop existing helper functions if they exist
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS get_user_commune_code();
DROP FUNCTION IF EXISTS is_user_active();

-- ============================================
-- HELPER FUNCTIONS (Non-recursive)
-- ============================================

-- Get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM web_users WHERE profile_id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- Get current user's commune code (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_commune_code()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT commune_code FROM web_users WHERE profile_id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- Check if user is active (bypasses RLS)
CREATE OR REPLACE FUNCTION is_user_active()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE((SELECT is_active FROM web_users WHERE profile_id = auth.uid() LIMIT 1), false);
$$;

-- ============================================
-- RE-ENABLE RLS
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow inserts for new user registration (service_role only)
CREATE POLICY "profiles_insert_service"
ON profiles FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- WEB_USERS POLICIES - CRITICAL FOR AUTH
-- ============================================

-- IMPORTANT: Users MUST be able to read their own web_user record
-- This is required for authentication to work
CREATE POLICY "web_users_select_own"
ON web_users FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- System admins can view all web users
CREATE POLICY "web_users_select_admin"
ON web_users FOR SELECT
TO authenticated
USING (get_user_role() IN ('system_admin', 'central_admin'));

-- System admins can manage web users
CREATE POLICY "web_users_insert_admin"
ON web_users FOR INSERT
TO authenticated
WITH CHECK (get_user_role() = 'system_admin');

CREATE POLICY "web_users_update_admin"
ON web_users FOR UPDATE
TO authenticated
USING (get_user_role() = 'system_admin')
WITH CHECK (get_user_role() = 'system_admin');

CREATE POLICY "web_users_delete_admin"
ON web_users FOR DELETE
TO authenticated
USING (get_user_role() = 'system_admin');

-- ============================================
-- SURVEY_LOCATIONS POLICIES
-- ============================================

-- Commune officers/supervisors can view surveys in their commune
CREATE POLICY "survey_locations_select_commune"
ON survey_locations FOR SELECT
TO authenticated
USING (
  is_user_active() AND (
    -- Commune users see their commune
    (get_user_role() IN ('commune_officer', 'commune_supervisor')
     AND ward_code = get_user_commune_code())
    OR
    -- Admins see everything
    (get_user_role() IN ('central_admin', 'system_admin'))
  )
);

-- Commune officers can insert surveys in their commune
CREATE POLICY "survey_locations_insert_commune"
ON survey_locations FOR INSERT
TO authenticated
WITH CHECK (
  is_user_active() AND
  get_user_role() = 'commune_officer' AND
  ward_code = get_user_commune_code()
);

-- Commune officers can update surveys in their commune (pending/reviewed/rejected only)
CREATE POLICY "survey_locations_update_commune_officer"
ON survey_locations FOR UPDATE
TO authenticated
USING (
  is_user_active() AND
  get_user_role() = 'commune_officer' AND
  ward_code = get_user_commune_code() AND
  status IN ('pending', 'reviewed', 'rejected')
)
WITH CHECK (
  is_user_active() AND
  get_user_role() = 'commune_officer' AND
  ward_code = get_user_commune_code()
);

-- Commune supervisors can update surveys in their commune
CREATE POLICY "survey_locations_update_commune_supervisor"
ON survey_locations FOR UPDATE
TO authenticated
USING (
  is_user_active() AND
  get_user_role() = 'commune_supervisor' AND
  ward_code = get_user_commune_code()
)
WITH CHECK (
  is_user_active() AND
  get_user_role() = 'commune_supervisor' AND
  ward_code = get_user_commune_code()
);

-- Central admins can update all surveys
CREATE POLICY "survey_locations_update_admin"
ON survey_locations FOR UPDATE
TO authenticated
USING (
  is_user_active() AND
  get_user_role() IN ('central_admin', 'system_admin')
)
WITH CHECK (
  is_user_active() AND
  get_user_role() IN ('central_admin', 'system_admin')
);

-- Admins can delete surveys
CREATE POLICY "survey_locations_delete_admin"
ON survey_locations FOR DELETE
TO authenticated
USING (
  is_user_active() AND
  get_user_role() IN ('central_admin', 'system_admin')
);

-- ============================================
-- APPROVAL_HISTORY POLICIES
-- ============================================

-- Users can view approval history for surveys they can access
CREATE POLICY "approval_history_select"
ON approval_history FOR SELECT
TO authenticated
USING (
  is_user_active() AND
  EXISTS (
    SELECT 1 FROM survey_locations sl
    WHERE sl.id = approval_history.survey_location_id
    AND (
      (get_user_role() IN ('commune_officer', 'commune_supervisor')
       AND sl.ward_code = get_user_commune_code())
      OR
      (get_user_role() IN ('central_admin', 'system_admin'))
    )
  )
);

-- Users can insert approval history
CREATE POLICY "approval_history_insert"
ON approval_history FOR INSERT
TO authenticated
WITH CHECK (
  is_user_active() AND
  auth.uid() = actor_id
);

-- ============================================
-- LOCATION_IDENTIFIERS POLICIES
-- ============================================

-- Users can view location identifiers for surveys they can access
CREATE POLICY "location_identifiers_select"
ON location_identifiers FOR SELECT
TO authenticated
USING (
  is_user_active() AND
  EXISTS (
    SELECT 1 FROM survey_locations sl
    WHERE sl.id = location_identifiers.survey_location_id
    AND (
      (get_user_role() IN ('commune_officer', 'commune_supervisor')
       AND sl.ward_code = get_user_commune_code())
      OR
      (get_user_role() IN ('central_admin', 'system_admin'))
    )
  )
);

-- Only central admins can insert/update location identifiers
CREATE POLICY "location_identifiers_insert_admin"
ON location_identifiers FOR INSERT
TO authenticated
WITH CHECK (
  is_user_active() AND
  get_user_role() IN ('central_admin', 'system_admin')
);

CREATE POLICY "location_identifiers_update_admin"
ON location_identifiers FOR UPDATE
TO authenticated
USING (
  is_user_active() AND
  get_user_role() IN ('central_admin', 'system_admin')
)
WITH CHECK (
  is_user_active() AND
  get_user_role() IN ('central_admin', 'system_admin')
);

-- ============================================
-- LAND_PARCELS POLICIES
-- ============================================

-- Users can view land parcels based on their access level
CREATE POLICY "land_parcels_select"
ON land_parcels FOR SELECT
TO authenticated
USING (
  is_user_active() AND (
    (get_user_role() IN ('commune_officer', 'commune_supervisor')
     AND ward_code = get_user_commune_code())
    OR
    (get_user_role() IN ('central_admin', 'system_admin'))
  )
);

-- Only admins can modify land parcels
CREATE POLICY "land_parcels_insert_admin"
ON land_parcels FOR INSERT
TO authenticated
WITH CHECK (
  is_user_active() AND
  get_user_role() IN ('central_admin', 'system_admin')
);

CREATE POLICY "land_parcels_update_admin"
ON land_parcels FOR UPDATE
TO authenticated
USING (
  is_user_active() AND
  get_user_role() IN ('central_admin', 'system_admin')
)
WITH CHECK (
  is_user_active() AND
  get_user_role() IN ('central_admin', 'system_admin')
);

CREATE POLICY "land_parcels_delete_admin"
ON land_parcels FOR DELETE
TO authenticated
USING (
  is_user_active() AND
  get_user_role() IN ('central_admin', 'system_admin')
);

-- ============================================
-- SYSTEM_CONFIG POLICIES (if table exists)
-- ============================================

-- All authenticated users can read system config
CREATE POLICY "system_config_select"
ON system_config FOR SELECT
TO authenticated
USING (is_user_active());

-- Only system admins can modify system config
CREATE POLICY "system_config_modify_admin"
ON system_config FOR ALL
TO authenticated
USING (
  is_user_active() AND
  get_user_role() = 'system_admin'
)
WITH CHECK (
  is_user_active() AND
  get_user_role() = 'system_admin'
);

-- ============================================
-- AUDIT_LOGS POLICIES (if table exists)
-- ============================================

-- Users can view their own audit logs
CREATE POLICY "audit_logs_select_own"
ON audit_logs FOR SELECT
TO authenticated
USING (
  is_user_active() AND
  auth.uid() = user_id
);

-- System admins can view all audit logs
CREATE POLICY "audit_logs_select_admin"
ON audit_logs FOR SELECT
TO authenticated
USING (
  is_user_active() AND
  get_user_role() = 'system_admin'
);

-- All authenticated users can insert audit logs
CREATE POLICY "audit_logs_insert"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  is_user_active() AND
  auth.uid() = user_id
);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_commune_code() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_active() TO authenticated;

-- Grant usage on helper functions to service_role
GRANT EXECUTE ON FUNCTION get_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION get_user_commune_code() TO service_role;
GRANT EXECUTE ON FUNCTION is_user_active() TO service_role;

-- ============================================
-- VERIFICATION
-- ============================================

-- List all policies to verify
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify helper functions exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_role', 'get_user_commune_code', 'is_user_active');
