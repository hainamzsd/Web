-- Migration: Add Entry Points Support
-- Date: 2025-12-05
-- Description: Adds entry_points table and related functionality for location identification system

-- ============================================================================
-- 1. Create survey_entry_points table
-- ============================================================================
CREATE TABLE IF NOT EXISTS survey_entry_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_location_id uuid NOT NULL REFERENCES survey_locations(id) ON DELETE CASCADE,
    sequence_number integer NOT NULL DEFAULT 1,

    -- Coordinates
    latitude numeric(10, 7) NOT NULL,
    longitude numeric(10, 7) NOT NULL,
    elevation numeric(6, 2),  -- meters above sea level
    gps_point geography(Point, 4326),

    -- Address specific to this entry point
    house_number text,
    street text,
    address_full text,

    -- Entry point metadata
    entry_type text NOT NULL DEFAULT 'main_gate' CHECK (
        entry_type IN ('main_gate', 'side_gate', 'service_entrance', 'emergency_exit', 'pedestrian', 'vehicle', 'other')
    ),
    is_primary boolean DEFAULT false,
    facing_direction text CHECK (
        facing_direction IS NULL OR
        facing_direction IN ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW')
    ),
    notes text,

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Constraints
    UNIQUE(survey_location_id, sequence_number)
);

-- Add comments for documentation
COMMENT ON TABLE survey_entry_points IS 'Entry points (lối vào) for survey locations. Each location can have multiple entry points.';
COMMENT ON COLUMN survey_entry_points.sequence_number IS 'Order of entry point (1, 2, 3...)';
COMMENT ON COLUMN survey_entry_points.entry_type IS 'Type: main_gate, side_gate, service_entrance, emergency_exit, pedestrian, vehicle, other';
COMMENT ON COLUMN survey_entry_points.is_primary IS 'Whether this is the primary/main entry point';
COMMENT ON COLUMN survey_entry_points.facing_direction IS 'Compass direction the entry faces: N, NE, E, SE, S, SW, W, NW';

-- ============================================================================
-- 2. Create trigger to auto-generate gps_point from lat/lng
-- ============================================================================
CREATE OR REPLACE FUNCTION update_entry_point_gps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.gps_point = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entry_point_gps ON survey_entry_points;
CREATE TRIGGER trg_entry_point_gps
    BEFORE INSERT OR UPDATE OF latitude, longitude ON survey_entry_points
    FOR EACH ROW EXECUTE FUNCTION update_entry_point_gps();

-- ============================================================================
-- 3. Create trigger to ensure only one primary entry point per location
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_single_primary_entry_point()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this entry point as primary, unset others
    IF NEW.is_primary = true THEN
        UPDATE survey_entry_points
        SET is_primary = false
        WHERE survey_location_id = NEW.survey_location_id
          AND id != NEW.id
          AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_primary_entry_point ON survey_entry_points;
CREATE TRIGGER trg_single_primary_entry_point
    AFTER INSERT OR UPDATE OF is_primary ON survey_entry_points
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION ensure_single_primary_entry_point();

-- ============================================================================
-- 4. Create function to auto-set first entry point as primary
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_set_primary_entry_point()
RETURNS TRIGGER AS $$
DECLARE
    existing_count integer;
BEGIN
    -- Count existing entry points for this location
    SELECT COUNT(*) INTO existing_count
    FROM survey_entry_points
    WHERE survey_location_id = NEW.survey_location_id;

    -- If this is the first entry point, make it primary
    IF existing_count = 0 THEN
        NEW.is_primary = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_primary_entry_point ON survey_entry_points;
CREATE TRIGGER trg_auto_primary_entry_point
    BEFORE INSERT ON survey_entry_points
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_primary_entry_point();

-- ============================================================================
-- 5. Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_entry_points_location
ON survey_entry_points(survey_location_id);

CREATE INDEX IF NOT EXISTS idx_entry_points_primary
ON survey_entry_points(survey_location_id, is_primary)
WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_entry_points_gps
ON survey_entry_points USING GIST(gps_point);

-- ============================================================================
-- 6. Enable Row Level Security
-- ============================================================================
ALTER TABLE survey_entry_points ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view entry points for their own surveys
CREATE POLICY "Users can view entry points for their surveys"
ON survey_entry_points FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.surveyor_id = auth.uid()
    )
);

-- Policy: Users can insert entry points for their own surveys
CREATE POLICY "Users can insert entry points for their surveys"
ON survey_entry_points FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.surveyor_id = auth.uid()
    )
);

-- Policy: Users can update entry points for their own surveys
CREATE POLICY "Users can update entry points for their surveys"
ON survey_entry_points FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.surveyor_id = auth.uid()
    )
);

-- Policy: Users can delete entry points for their own surveys
CREATE POLICY "Users can delete entry points for their surveys"
ON survey_entry_points FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM survey_locations sl
        WHERE sl.id = survey_location_id
        AND sl.surveyor_id = auth.uid()
    )
);

-- Policy: Web users with supervisor/admin roles can view all entry points
CREATE POLICY "Supervisors can view all entry points"
ON survey_entry_points FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM web_users wu
        WHERE wu.profile_id = auth.uid()
        AND wu.role IN ('commune_supervisor', 'central_admin', 'system_admin')
        AND wu.is_active = true
    )
);

-- ============================================================================
-- 7. Also add entry_points JSONB column to survey_locations for denormalized storage
-- ============================================================================
ALTER TABLE survey_locations
ADD COLUMN IF NOT EXISTS entry_points jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN survey_locations.entry_points IS
'Denormalized array of entry points for faster reads. Synced from survey_entry_points table.';

-- ============================================================================
-- 8. Create function to sync entry_points column
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_entry_points_to_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the denormalized entry_points column on the survey_location
    UPDATE survey_locations
    SET entry_points = (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', ep.id,
                'sequenceNumber', ep.sequence_number,
                'latitude', ep.latitude,
                'longitude', ep.longitude,
                'elevation', ep.elevation,
                'houseNumber', ep.house_number,
                'street', ep.street,
                'addressFull', ep.address_full,
                'entryType', ep.entry_type,
                'isPrimary', ep.is_primary,
                'facingDirection', ep.facing_direction,
                'notes', ep.notes
            ) ORDER BY ep.sequence_number
        ), '[]'::jsonb)
        FROM survey_entry_points ep
        WHERE ep.survey_location_id = COALESCE(NEW.survey_location_id, OLD.survey_location_id)
    ),
    updated_at = now()
    WHERE id = COALESCE(NEW.survey_location_id, OLD.survey_location_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_entry_points ON survey_entry_points;
CREATE TRIGGER trg_sync_entry_points
    AFTER INSERT OR UPDATE OR DELETE ON survey_entry_points
    FOR EACH ROW
    EXECUTE FUNCTION sync_entry_points_to_location();

-- ============================================================================
-- 9. Create helper function to get entry points for a location
-- ============================================================================
CREATE OR REPLACE FUNCTION get_entry_points(p_location_id uuid)
RETURNS TABLE (
    id uuid,
    sequence_number integer,
    latitude numeric,
    longitude numeric,
    elevation numeric,
    house_number text,
    street text,
    address_full text,
    entry_type text,
    is_primary boolean,
    facing_direction text,
    notes text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ep.id,
        ep.sequence_number,
        ep.latitude,
        ep.longitude,
        ep.elevation,
        ep.house_number,
        ep.street,
        ep.address_full,
        ep.entry_type,
        ep.is_primary,
        ep.facing_direction,
        ep.notes
    FROM survey_entry_points ep
    WHERE ep.survey_location_id = p_location_id
    ORDER BY ep.sequence_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. Create function to add an entry point
-- ============================================================================
CREATE OR REPLACE FUNCTION add_entry_point(
    p_location_id uuid,
    p_latitude numeric,
    p_longitude numeric,
    p_entry_type text DEFAULT 'main_gate',
    p_is_primary boolean DEFAULT false,
    p_house_number text DEFAULT NULL,
    p_street text DEFAULT NULL,
    p_notes text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_next_seq integer;
    v_new_id uuid;
BEGIN
    -- Get next sequence number
    SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_next_seq
    FROM survey_entry_points
    WHERE survey_location_id = p_location_id;

    -- Insert new entry point
    INSERT INTO survey_entry_points (
        survey_location_id,
        sequence_number,
        latitude,
        longitude,
        entry_type,
        is_primary,
        house_number,
        street,
        notes
    ) VALUES (
        p_location_id,
        v_next_seq,
        p_latitude,
        p_longitude,
        p_entry_type,
        p_is_primary,
        p_house_number,
        p_street,
        p_notes
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
