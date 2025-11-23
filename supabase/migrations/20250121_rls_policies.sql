-- Row Level Security Policies for C06 Web Platform

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================
-- WEB_USERS POLICIES
-- ============================================

-- Users can view their own web_user record
CREATE POLICY "Users can view own web_user"
  ON web_users FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- System admins can view all web users
CREATE POLICY "System admins can view all web users"
  ON web_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'system_admin'
        AND wu.is_active = true
    )
  );

-- Central admins can view all web users
CREATE POLICY "Central admins can view all web users"
  ON web_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'central_admin'
        AND wu.is_active = true
    )
  );

-- System admins can insert/update/delete web users
CREATE POLICY "System admins can manage web users"
  ON web_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'system_admin'
        AND wu.is_active = true
    )
  );

-- ============================================
-- SURVEY_LOCATIONS POLICIES
-- ============================================

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

-- Commune officers can update surveys in their commune (only pending/reviewed status)
CREATE POLICY "Commune officers can update their commune surveys"
  ON survey_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'commune_officer'
        AND wu.is_active = true
        AND survey_locations.ward_code = wu.commune_code
        AND survey_locations.status IN ('pending', 'reviewed', 'rejected')
    )
  );

-- Commune supervisors can update surveys in their commune
CREATE POLICY "Commune supervisors can update their commune surveys"
  ON survey_locations FOR UPDATE
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

-- Central admins can update all surveys
CREATE POLICY "Central admins can update all surveys"
  ON survey_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role IN ('central_admin', 'system_admin')
        AND wu.is_active = true
    )
  );

-- ============================================
-- APPROVAL_HISTORY POLICIES
-- ============================================

-- Users can view approval history for surveys they can access
CREATE POLICY "Users can view relevant approval history"
  ON approval_history FOR SELECT
  TO authenticated
  USING (
    -- Check if user can access the related survey
    EXISTS (
      SELECT 1 FROM survey_locations sl
      JOIN web_users wu ON wu.profile_id = auth.uid()
      WHERE sl.id = approval_history.survey_location_id
        AND wu.is_active = true
        AND (
          -- Commune officers/supervisors see their commune
          (wu.role IN ('commune_officer', 'commune_supervisor') AND sl.ward_code = wu.commune_code)
          OR
          -- Central admins see all
          (wu.role IN ('central_admin', 'system_admin'))
        )
    )
  );

-- Users can insert approval history
CREATE POLICY "Users can insert approval history"
  ON approval_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- ============================================
-- LOCATION_IDENTIFIERS POLICIES
-- ============================================

-- Users can view location identifiers for surveys they can access
CREATE POLICY "Users can view relevant location identifiers"
  ON location_identifiers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_locations sl
      JOIN web_users wu ON wu.profile_id = auth.uid()
      WHERE sl.id = location_identifiers.survey_location_id
        AND wu.is_active = true
        AND (
          (wu.role IN ('commune_officer', 'commune_supervisor') AND sl.ward_code = wu.commune_code)
          OR
          (wu.role IN ('central_admin', 'system_admin'))
        )
    )
  );

-- Only central admins can insert location identifiers
CREATE POLICY "Central admins can insert location identifiers"
  ON location_identifiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role IN ('central_admin', 'system_admin')
        AND wu.is_active = true
    )
  );

-- Only central admins can update location identifiers
CREATE POLICY "Central admins can update location identifiers"
  ON location_identifiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role IN ('central_admin', 'system_admin')
        AND wu.is_active = true
    )
  );

-- ============================================
-- LAND_PARCELS POLICIES
-- ============================================

-- Commune officers can view land parcels in their commune
CREATE POLICY "Commune users can view their commune parcels"
  ON land_parcels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.is_active = true
        AND (
          (wu.role IN ('commune_officer', 'commune_supervisor') AND land_parcels.ward_code = wu.commune_code)
          OR
          (wu.role IN ('central_admin', 'system_admin'))
        )
    )
  );

-- ============================================
-- SYSTEM_CONFIG POLICIES
-- ============================================

-- All authenticated users can read system config
CREATE POLICY "Authenticated users can read system config"
  ON system_config FOR SELECT
  TO authenticated
  USING (true);

-- Only system admins can update system config
CREATE POLICY "System admins can update system config"
  ON system_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'system_admin'
        AND wu.is_active = true
    )
  );

-- ============================================
-- AUDIT_LOGS POLICIES
-- ============================================

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System admins can view all audit logs
CREATE POLICY "System admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'system_admin'
        AND wu.is_active = true
    )
  );

-- All authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
