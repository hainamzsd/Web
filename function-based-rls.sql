-- FUNCTION-BASED RLS - Most reliable approach
-- Uses PostgreSQL functions to avoid circular dependencies

-- ============================================
-- STEP 1: Create helper functions
-- ============================================

-- Function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER -- This bypasses RLS
STABLE
AS $$
  SELECT role
  FROM public.web_users
  WHERE profile_id = auth.uid()
  LIMIT 1;
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- This bypasses RLS
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.web_users
    WHERE profile_id = auth.uid()
      AND role IN ('system_admin', 'central_admin')
      AND is_active = true
  );
$$;

-- Function to check if current user is system admin
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- This bypasses RLS
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.web_users
    WHERE profile_id = auth.uid()
      AND role = 'system_admin'
      AND is_active = true
  );
$$;

-- ============================================
-- STEP 2: Drop all existing policies
-- ============================================

DROP POLICY IF EXISTS "profiles_own_record" ON profiles;
DROP POLICY IF EXISTS "web_users_own_record" ON web_users;
DROP POLICY IF EXISTS "web_users_modifications" ON web_users;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own web_user" ON web_users;
DROP POLICY IF EXISTS "System admins can view all web users" ON web_users;
DROP POLICY IF EXISTS "Central admins can view all web users" ON web_users;
DROP POLICY IF EXISTS "System admins can manage web users" ON web_users;
DROP POLICY IF EXISTS "web_users_select_policy" ON web_users;
DROP POLICY IF EXISTS "web_users_admin_manage_policy" ON web_users;

-- ============================================
-- STEP 3: Create new policies using functions
-- ============================================

-- PROFILES policies
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- WEB_USERS policies
CREATE POLICY "web_users_select"
  ON web_users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = profile_id
    OR public.is_admin()
  );

CREATE POLICY "web_users_insert"
  ON web_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY "web_users_update"
  ON web_users FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY "web_users_delete"
  ON web_users FOR DELETE
  TO authenticated
  USING (public.is_system_admin());

-- ============================================
-- STEP 4: Test the functions
-- ============================================

-- Test the helper functions (run while logged in)
SELECT
  auth.uid() as my_user_id,
  public.get_my_role() as my_role,
  public.is_admin() as am_i_admin,
  public.is_system_admin() as am_i_system_admin;

-- Test querying web_users
SELECT
  'My web_user record:' as label,
  wu.*
FROM web_users wu
WHERE wu.profile_id = auth.uid();

RAISE NOTICE '✅ Function-based RLS policies created successfully!';
RAISE NOTICE 'The policies now use SECURITY DEFINER functions to bypass RLS when checking roles.';
RAISE NOTICE 'This prevents circular dependency issues.';
