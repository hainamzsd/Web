-- Fix infinite recursion in RLS policies by using a SECURITY DEFINER function

-- 1. Create a helper function to get the current user's web_user record bypassing RLS
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
  WHERE profile_id = auth.uid();
$$;

-- 2. Drop existing recursive policies on web_users
DROP POLICY IF EXISTS "System admins can view all web users" ON web_users;
DROP POLICY IF EXISTS "Central admins can view all web users" ON web_users;
DROP POLICY IF EXISTS "System admins can manage web users" ON web_users;

-- 3. Re-create policies using the safe function

-- System admins can view all web users
CREATE POLICY "System admins can view all web users"
  ON web_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_web_user() wu
      WHERE wu.role = 'system_admin'
        AND wu.is_active = true
    )
  );

-- Central admins can view all web users
CREATE POLICY "Central admins can view all web users"
  ON web_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_web_user() wu
      WHERE wu.role = 'central_admin'
        AND wu.is_active = true
    )
  );

-- System admins can manage web users
CREATE POLICY "System admins can manage web users"
  ON web_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_web_user() wu
      WHERE wu.role = 'system_admin'
        AND wu.is_active = true
    )
  );
