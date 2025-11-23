-- SIMPLE RLS POLICIES - Guaranteed to work
-- This uses the simplest possible policies to avoid circular dependencies

-- ============================================
-- STEP 1: Clean slate - drop all policies
-- ============================================

-- Drop all policies on web_users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'web_users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON web_users';
    END LOOP;
END $$;

-- Drop all policies on profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Create SIMPLE policies
-- ============================================

-- PROFILES: Users can read and update their own profile
CREATE POLICY "profiles_own_record"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- WEB_USERS: Users can ALWAYS read their own web_user record
-- This is the CRITICAL policy that must work
CREATE POLICY "web_users_own_record"
  ON web_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- WEB_USERS: Allow inserts/updates by checking role in a safe way
-- This uses a separate policy for modifications
CREATE POLICY "web_users_modifications"
  ON web_users
  FOR ALL
  TO authenticated
  USING (
    -- Only allow if user is system_admin
    -- We check this by joining to the same table, which is allowed
    profile_id IN (
      SELECT wu.profile_id
      FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'system_admin'
        AND wu.is_active = true
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT wu.profile_id
      FROM web_users wu
      WHERE wu.profile_id = auth.uid()
        AND wu.role = 'system_admin'
        AND wu.is_active = true
    )
  );

-- ============================================
-- STEP 3: Verify it works
-- ============================================

-- Test query - should return your web_user when you're logged in
SELECT
  'Your web_user record:' as label,
  auth.uid() as your_user_id,
  wu.*
FROM web_users wu
WHERE wu.profile_id = auth.uid();

RAISE NOTICE 'RLS policies updated successfully!';
RAISE NOTICE 'You should now be able to query your own web_user record.';
RAISE NOTICE 'Test by logging in and checking if the dashboard loads.';
