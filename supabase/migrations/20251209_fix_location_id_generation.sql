-- ============================================================================
-- Migration: Fix Location ID Generation
-- Date: 2025-12-09
-- Description:
--   1. Add unique constraint on (admin_code, sequence_number)
--   2. Update generate_location_id function to use province_id and ward_id
--   3. Add index for faster sequence lookup
-- ============================================================================

-- Add unique constraint to prevent duplicate sequences per admin_code
ALTER TABLE location_identifiers
ADD CONSTRAINT unique_admin_code_sequence
UNIQUE (admin_code, sequence_number);

-- Add index for faster sequence number lookup
CREATE INDEX IF NOT EXISTS idx_location_identifiers_admin_code_sequence
ON location_identifiers(admin_code, sequence_number DESC);

-- Drop old function if exists
DROP FUNCTION IF EXISTS generate_location_id(TEXT, TEXT, TEXT);

-- Create new function that uses province_id and ward_id
-- Format: PP-WWWW-SSSSSS
-- PP = province_id zero-padded to 2 digits
-- WWWW = ward_id zero-padded to 4 digits
-- SSSSSS = sequence number zero-padded to 6 digits
CREATE OR REPLACE FUNCTION generate_location_id_v2(
  p_province_id INTEGER,
  p_ward_id INTEGER
)
RETURNS TABLE (
  location_id TEXT,
  admin_code TEXT,
  sequence_number TEXT
) AS $$
DECLARE
  v_admin_code TEXT;
  v_sequence INT;
  v_sequence_str TEXT;
  v_location_id TEXT;
  v_province_code TEXT;
  v_ward_code TEXT;
BEGIN
  -- Zero-pad province_id to 2 digits (e.g., 4 → "04")
  v_province_code := LPAD(COALESCE(p_province_id, 0)::TEXT, 2, '0');

  -- Zero-pad ward_id to 4 digits (e.g., 28 → "0028")
  v_ward_code := LPAD(COALESCE(p_ward_id, 0)::TEXT, 4, '0');

  -- Create admin code (PP-WWWW)
  v_admin_code := v_province_code || '-' || v_ward_code;

  -- Get next sequence number for this admin code with lock
  -- FOR UPDATE prevents race conditions
  SELECT COALESCE(MAX(CAST(li.sequence_number AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM location_identifiers li
  WHERE li.admin_code = v_admin_code
  FOR UPDATE;

  -- Format sequence as 6-digit string
  v_sequence_str := LPAD(v_sequence::TEXT, 6, '0');

  -- Create full location ID (PP-WWWW-SSSSSS)
  v_location_id := v_admin_code || '-' || v_sequence_str;

  -- Return the results
  RETURN QUERY SELECT v_location_id, v_admin_code, v_sequence_str;
END;
$$ LANGUAGE plpgsql;

-- Create a function to safely generate and insert location identifier
-- This function handles the entire operation atomically
CREATE OR REPLACE FUNCTION create_location_identifier(
  p_survey_location_id UUID,
  p_province_id INTEGER,
  p_ward_id INTEGER,
  p_assigned_by UUID
)
RETURNS TABLE (
  location_id TEXT,
  admin_code TEXT,
  sequence_number TEXT
) AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Generate the location ID
  SELECT * INTO v_result FROM generate_location_id_v2(p_province_id, p_ward_id);

  -- Insert into location_identifiers
  INSERT INTO location_identifiers (
    survey_location_id,
    location_id,
    admin_code,
    sequence_number,
    assigned_by,
    is_active
  ) VALUES (
    p_survey_location_id,
    v_result.location_id,
    v_result.admin_code,
    v_result.sequence_number,
    p_assigned_by,
    true
  );

  -- Return the generated values
  RETURN QUERY SELECT v_result.location_id, v_result.admin_code, v_result.sequence_number;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_location_id_v2(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_location_identifier(UUID, INTEGER, INTEGER, UUID) TO authenticated;
