-- Complete fix for web_users RLS to prevent recursion and timeouts
-- This migration ensures only ONE simple policy exists for viewing own record

-- 1. Drop ALL existing policies on web_users to start fresh
DROP POLICY IF EXISTS "Users can view own web_user" ON web_users;
DROP POLICY IF EXISTS "System admins can view all web users" ON web_users;
DROP POLICY IF EXISTS "Central admins can view all web users" ON web_users;
DROP POLICY IF EXISTS "System admins can manage web users" ON web_users;

-- 2. Create/replace the helper function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_current_web_user()
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  role text,
  commune_code text,
  district_code text,
  province_code text,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    id, profile_id, role, commune_code, district_code, province_code, is_active
  FROM web_users
  WHERE profile_id = auth.uid()
  LIMIT 1;
$$;

-- 3. Create a SINGLE simple policy that allows users to see their own record
-- This is the most critical policy and MUST NOT cause recursion
CREATE POLICY "Users can view own web_user"
  ON web_users FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- 4. Create policy for admins to view all users (using the safe function)
CREATE POLICY "Admins can view all web users"
  ON web_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_web_user() wu
      WHERE wu.role IN ('system_admin', 'central_admin')
        AND wu.is_active = true
    )
  );

-- 5. Create policy for system admins to manage (insert/update/delete) web users
CREATE POLICY "System admins can manage web users"
  ON web_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_web_user() wu
      WHERE wu.role = 'system_admin'
        AND wu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_web_user() wu
      WHERE wu.role = 'system_admin'
        AND wu.is_active = true
    )
  );

-- 6. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_current_web_user() TO authenticated;
