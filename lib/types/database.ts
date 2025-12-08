export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Province division types
export type ProvinceDivisionType = 'tỉnh' | 'thành phố trung ương'

// Ward division types
export type WardDivisionType = 'xã' | 'phường' | 'thị trấn'

// Database types based on Supabase schema
export interface Database {
  public: {
    Tables: {
      provinces: {
        Row: {
          code: number
          name: string
          codename: string
          division_type: ProvinceDivisionType
          phone_code: number
          created_at: string
          updated_at: string
        }
        Insert: {
          code: number
          name: string
          codename: string
          division_type: ProvinceDivisionType
          phone_code: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: number
          name?: string
          codename?: string
          division_type?: ProvinceDivisionType
          phone_code?: number
          created_at?: string
          updated_at?: string
        }
      }
      wards: {
        Row: {
          code: number
          name: string
          codename: string
          division_type: WardDivisionType
          province_code: number
          created_at: string
          updated_at: string
        }
        Insert: {
          code: number
          name: string
          codename: string
          division_type: WardDivisionType
          province_code: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: number
          name?: string
          codename?: string
          division_type?: WardDivisionType
          province_code?: number
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          police_id: string | null
          unit: string | null
          avatar_url: string | null
          province_id: number | null
          ward_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          police_id?: string | null
          unit?: string | null
          avatar_url?: string | null
          province_id?: number | null
          ward_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          police_id?: string | null
          unit?: string | null
          avatar_url?: string | null
          province_id?: number | null
          ward_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      web_users: {
        Row: {
          id: string
          profile_id: string
          role: 'commune_officer' | 'commune_supervisor' | 'central_admin' | 'system_admin'
          commune_code: string | null
          district_code: string | null
          province_code: string | null
          province_id: number | null
          ward_id: number | null
          permissions: Json
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          role: 'commune_officer' | 'commune_supervisor' | 'central_admin' | 'system_admin'
          commune_code?: string | null
          district_code?: string | null
          province_code?: string | null
          province_id?: number | null
          ward_id?: number | null
          permissions?: Json
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          role?: 'commune_officer' | 'commune_supervisor' | 'central_admin' | 'system_admin'
          commune_code?: string | null
          district_code?: string | null
          province_code?: string | null
          province_id?: number | null
          ward_id?: number | null
          permissions?: Json
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      survey_locations: {
        Row: {
          id: string
          surveyor_id: string
          location_name: string | null
          address: string | null
          house_number: string | null
          street: string | null
          hamlet: string | null
          ward_code: string | null
          district_code: string | null
          province_code: string | null
          province_id: number | null
          ward_id: number | null
          latitude: number
          longitude: number
          accuracy: number | null
          polygon_geometry: Json | null
          object_type: string | null
          land_use_type: string | null
          owner_name: string | null
          owner_id_number: string | null
          owner_phone: string | null
          parcel_code: string | null
          land_area_m2: number | null
          photos: string[]
          notes: string | null
          status: 'pending' | 'reviewed' | 'approved_commune' | 'rejected' | 'approved_central' | 'published'
          location_identifier: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          surveyor_id: string
          location_name?: string | null
          address?: string | null
          house_number?: string | null
          street?: string | null
          hamlet?: string | null
          ward_code?: string | null
          district_code?: string | null
          province_code?: string | null
          province_id?: number | null
          ward_id?: number | null
          latitude: number
          longitude: number
          accuracy?: number | null
          polygon_geometry?: Json | null
          object_type?: string | null
          land_use_type?: string | null
          owner_name?: string | null
          owner_id_number?: string | null
          owner_phone?: string | null
          parcel_code?: string | null
          land_area_m2?: number | null
          photos?: string[]
          notes?: string | null
          status?: 'pending' | 'reviewed' | 'approved_commune' | 'rejected' | 'approved_central' | 'published'
          location_identifier?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          surveyor_id?: string
          location_name?: string | null
          address?: string | null
          house_number?: string | null
          street?: string | null
          hamlet?: string | null
          ward_code?: string | null
          district_code?: string | null
          province_code?: string | null
          province_id?: number | null
          ward_id?: number | null
          latitude?: number
          longitude?: number
          accuracy?: number | null
          polygon_geometry?: Json | null
          object_type?: string | null
          land_use_type?: string | null
          owner_name?: string | null
          owner_id_number?: string | null
          owner_phone?: string | null
          parcel_code?: string | null
          land_area_m2?: number | null
          photos?: string[]
          notes?: string | null
          status?: 'pending' | 'reviewed' | 'approved_commune' | 'rejected' | 'approved_central' | 'published'
          location_identifier?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      approval_history: {
        Row: {
          id: string
          survey_location_id: string
          action: 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'published'
          actor_id: string
          actor_role: string
          previous_status: string | null
          new_status: string | null
          notes: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          survey_location_id: string
          action: 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'published'
          actor_id: string
          actor_role: string
          previous_status?: string | null
          new_status?: string | null
          notes?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          survey_location_id?: string
          action?: 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'published'
          actor_id?: string
          actor_role?: string
          previous_status?: string | null
          new_status?: string | null
          notes?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      location_identifiers: {
        Row: {
          id: string
          survey_location_id: string
          location_id: string
          admin_code: string
          sequence_number: string
          assigned_by: string
          assigned_at: string
          is_active: boolean
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
        }
        Insert: {
          id?: string
          survey_location_id: string
          location_id: string
          admin_code: string
          sequence_number: string
          assigned_by: string
          assigned_at?: string
          is_active?: boolean
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
        }
        Update: {
          id?: string
          survey_location_id?: string
          location_id?: string
          admin_code?: string
          sequence_number?: string
          assigned_by?: string
          assigned_at?: string
          is_active?: boolean
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
        }
      }
      land_parcels: {
        Row: {
          id: string
          parcel_code: string
          province_code: string
          district_code: string
          ward_code: string
          province_id: number | null
          ward_id: number | null
          owner_name: string | null
          owner_id_number: string | null
          owner_phone: string | null
          land_use_certificate_number: string | null
          parcel_area_m2: number | null
          land_use_type_code: string | null
          geometry: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parcel_code: string
          province_code: string
          district_code: string
          ward_code: string
          province_id?: number | null
          ward_id?: number | null
          owner_name?: string | null
          owner_id_number?: string | null
          owner_phone?: string | null
          land_use_certificate_number?: string | null
          parcel_area_m2?: number | null
          land_use_type_code?: string | null
          geometry?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parcel_code?: string
          province_code?: string
          district_code?: string
          ward_code?: string
          province_id?: number | null
          ward_id?: number | null
          owner_name?: string | null
          owner_id_number?: string | null
          owner_phone?: string | null
          land_use_certificate_number?: string | null
          parcel_area_m2?: number | null
          land_use_type_code?: string | null
          geometry?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      province_ward_lookup: {
        Row: {
          province_code: number | null
          province_name: string | null
          province_codename: string | null
          province_type: string | null
          ward_code: number | null
          ward_name: string | null
          ward_codename: string | null
          ward_type: string | null
        }
      }
      survey_locations_with_location: {
        Row: {
          id: string
          surveyor_id: string
          location_name: string | null
          province_id: number | null
          ward_id: number | null
          province_name: string | null
          province_codename: string | null
          province_type: string | null
          ward_name: string | null
          ward_codename: string | null
          ward_type: string | null
          latitude: number
          longitude: number
          status: string
          created_at: string
          updated_at: string
        }
      }
      web_users_with_location: {
        Row: {
          id: string
          profile_id: string
          role: string
          full_name: string | null
          phone: string | null
          police_id: string | null
          province_id: number | null
          ward_id: number | null
          province_name: string | null
          province_codename: string | null
          ward_name: string | null
          ward_codename: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
      }
    }
    Functions: {
      get_province_by_code: {
        Args: { p_code: number }
        Returns: {
          code: number
          name: string
          codename: string
          division_type: string
          phone_code: number
        }[]
      }
      get_wards_by_province: {
        Args: { p_province_code: number }
        Returns: {
          code: number
          name: string
          codename: string
          division_type: string
          province_code: number
        }[]
      }
      get_all_provinces: {
        Args: Record<string, never>
        Returns: {
          code: number
          name: string
          codename: string
          division_type: string
          phone_code: number
        }[]
      }
      get_location_info: {
        Args: { p_province_code: string; p_ward_code?: string }
        Returns: {
          province_code: number
          province_name: string
          province_codename: string
          province_type: string
          ward_code: number | null
          ward_name: string | null
          ward_codename: string | null
          ward_type: string | null
        }[]
      }
    }
    Enums: Record<string, never>
  }
}

// Convenient type aliases for common use
export type Province = Database['public']['Tables']['provinces']['Row']
export type ProvinceInsert = Database['public']['Tables']['provinces']['Insert']
export type ProvinceUpdate = Database['public']['Tables']['provinces']['Update']

export type Ward = Database['public']['Tables']['wards']['Row']
export type WardInsert = Database['public']['Tables']['wards']['Insert']
export type WardUpdate = Database['public']['Tables']['wards']['Update']

// Province with wards for dropdown/selection
export interface ProvinceWithWards extends Province {
  wards: Ward[]
}
