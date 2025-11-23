-- C06 Web Platform Schema
-- Migration for web-specific tables and extensions

-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create profiles table (if not exists from mobile app)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  police_id TEXT UNIQUE,
  unit TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create survey_locations table (if not exists from mobile app)
CREATE TABLE IF NOT EXISTS survey_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  surveyor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  location_name TEXT,
  address TEXT,
  house_number TEXT,
  street TEXT,
  hamlet TEXT,
  ward_code TEXT,
  district_code TEXT,
  province_code TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL,
  polygon_geometry JSONB,
  object_type TEXT,
  land_use_type TEXT,
  owner_name TEXT,
  owner_id_number TEXT,
  owner_phone TEXT,
  parcel_code TEXT,
  land_area_m2 DECIMAL,
  photos TEXT[] DEFAULT '{}',
  notes TEXT,
  status TEXT DEFAULT 'pending',
  location_identifier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Web users table
CREATE TABLE web_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('commune_officer', 'commune_supervisor', 'central_admin', 'system_admin')),
  commune_code TEXT,
  district_code TEXT,
  province_code TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- Approval workflow tracking
CREATE TABLE approval_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_location_id UUID REFERENCES survey_locations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'reviewed', 'approved', 'rejected', 'published')),
  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location identifier assignments
CREATE TABLE location_identifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_location_id UUID UNIQUE REFERENCES survey_locations(id),
  location_id TEXT UNIQUE NOT NULL,
  admin_code TEXT NOT NULL,
  sequence_number TEXT NOT NULL,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES profiles(id),
  deactivation_reason TEXT
);

-- Land parcel integration
CREATE TABLE land_parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_code TEXT UNIQUE NOT NULL,
  province_code TEXT NOT NULL,
  district_code TEXT NOT NULL,
  ward_code TEXT NOT NULL,
  owner_name TEXT,
  owner_id_number TEXT,
  owner_phone TEXT,
  land_use_certificate_number TEXT,
  parcel_area_m2 NUMERIC,
  land_use_type_code TEXT,
  geometry GEOMETRY(Polygon, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System configuration
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs for compliance
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_web_users_role ON web_users(role);
CREATE INDEX idx_web_users_commune ON web_users(commune_code) WHERE commune_code IS NOT NULL;
CREATE INDEX idx_web_users_district ON web_users(district_code) WHERE district_code IS NOT NULL;
CREATE INDEX idx_web_users_province ON web_users(province_code) WHERE province_code IS NOT NULL;

CREATE INDEX idx_survey_locations_status ON survey_locations(status);
CREATE INDEX idx_survey_locations_ward ON survey_locations(ward_code);
CREATE INDEX idx_survey_locations_district ON survey_locations(district_code);
CREATE INDEX idx_survey_locations_province ON survey_locations(province_code);
CREATE INDEX idx_survey_locations_surveyor ON survey_locations(surveyor_id);

CREATE INDEX idx_approval_history_location ON approval_history(survey_location_id);
CREATE INDEX idx_approval_history_actor ON approval_history(actor_id);
CREATE INDEX idx_approval_history_created ON approval_history(created_at);

CREATE INDEX idx_location_identifiers_location ON location_identifiers(survey_location_id);
CREATE INDEX idx_location_identifiers_id ON location_identifiers(location_id);

CREATE INDEX idx_land_parcels_code ON land_parcels(parcel_code);
CREATE INDEX idx_land_parcels_ward ON land_parcels(ward_code);
CREATE INDEX idx_land_parcels_geometry ON land_parcels USING GIST(geometry);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_web_users_updated_at BEFORE UPDATE ON web_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_locations_updated_at BEFORE UPDATE ON survey_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_land_parcels_updated_at BEFORE UPDATE ON land_parcels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate location ID
CREATE OR REPLACE FUNCTION generate_location_id(
  p_province_code TEXT,
  p_district_code TEXT,
  p_commune_code TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_admin_code TEXT;
  v_sequence INT;
  v_sequence_str TEXT;
  v_location_id TEXT;
BEGIN
  -- Create admin code (PP-DD-CC)
  v_admin_code := p_province_code || '-' || p_district_code || '-' || p_commune_code;

  -- Get next sequence number for this admin code
  SELECT COALESCE(MAX(CAST(sequence_number AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM location_identifiers
  WHERE admin_code = v_admin_code;

  -- Format sequence as 6-digit string
  v_sequence_str := LPAD(v_sequence::TEXT, 6, '0');

  -- Create full location ID
  v_location_id := v_admin_code || '-' || v_sequence_str;

  RETURN v_location_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default system config
INSERT INTO system_config (key, value, description) VALUES
  ('id_sequence_start', '1', 'Starting sequence number for location IDs'),
  ('approval_sla_hours', '48', 'Target hours for approval workflow'),
  ('required_fields', '["location_name", "address", "owner_name"]', 'Required fields for survey submission'),
  ('map_tile_server', '"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"', 'Map tile server URL')
ON CONFLICT (key) DO NOTHING;
