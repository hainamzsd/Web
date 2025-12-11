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
          role?: 'commune_officer' | 'province_officer' | 'central_admin' | 'system_admin'
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
          // Representative contact (optional on-site contact, NOT official owner)
          representative_name: string | null
          representative_id_number: string | null
          representative_phone: string | null
          parcel_code: string | null
          land_area_m2: number | null
          photos: string[]
          notes: string | null
          status: 'pending' | 'reviewed' | 'approved_commune' | 'approved_province' | 'approved_central' | 'rejected'
          location_identifier: string | null
          // Land parcel linkage
          land_parcel_id: string | null
          certificate_id: string | null
          parcel_verified_at: string | null
          parcel_verified_by: string | null
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
          representative_name?: string | null
          representative_id_number?: string | null
          representative_phone?: string | null
          parcel_code?: string | null
          land_area_m2?: number | null
          photos?: string[]
          notes?: string | null
          status?: 'pending' | 'reviewed' | 'approved_commune' | 'rejected' | 'approved_central'
          location_identifier?: string | null
          land_parcel_id?: string | null
          certificate_id?: string | null
          parcel_verified_at?: string | null
          parcel_verified_by?: string | null
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
          representative_name?: string | null
          representative_id_number?: string | null
          representative_phone?: string | null
          parcel_code?: string | null
          land_area_m2?: number | null
          photos?: string[]
          notes?: string | null
          status?: 'pending' | 'reviewed' | 'approved_commune' | 'rejected' | 'approved_central'
          location_identifier?: string | null
          land_parcel_id?: string | null
          certificate_id?: string | null
          parcel_verified_at?: string | null
          parcel_verified_by?: string | null
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
          certificate_id: string | null
          parcel_code: string
          sheet_number: string | null
          parcel_number: string | null
          province_id: number | null
          ward_id: number | null
          address: string | null
          total_area_m2: number | null
          geometry: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          certificate_id?: string | null
          parcel_code: string
          sheet_number?: string | null
          parcel_number?: string | null
          province_id?: number | null
          ward_id?: number | null
          address?: string | null
          total_area_m2?: number | null
          geometry?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          certificate_id?: string | null
          parcel_code?: string
          sheet_number?: string | null
          parcel_number?: string | null
          province_id?: number | null
          ward_id?: number | null
          address?: string | null
          total_area_m2?: number | null
          geometry?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      land_certificates: {
        Row: {
          id: string
          certificate_number: string
          certificate_book_number: string | null
          issue_date: string | null
          issuing_authority: string | null
          province_id: number | null
          ward_id: number | null
          is_active: boolean
          deactivated_at: string | null
          deactivation_reason: string | null
          fetched_from_api_at: string | null
          api_response_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          certificate_number: string
          certificate_book_number?: string | null
          issue_date?: string | null
          issuing_authority?: string | null
          province_id?: number | null
          ward_id?: number | null
          is_active?: boolean
          deactivated_at?: string | null
          deactivation_reason?: string | null
          fetched_from_api_at?: string | null
          api_response_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          certificate_number?: string
          certificate_book_number?: string | null
          issue_date?: string | null
          issuing_authority?: string | null
          province_id?: number | null
          ward_id?: number | null
          is_active?: boolean
          deactivated_at?: string | null
          deactivation_reason?: string | null
          fetched_from_api_at?: string | null
          api_response_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      land_parcel_owners: {
        Row: {
          id: string
          land_parcel_id: string
          owner_type: 'individual' | 'organization' | 'household'
          full_name: string
          id_number: string | null
          id_type: 'cccd' | 'cmnd' | 'passport' | 'tax_code' | null
          phone: string | null
          email: string | null
          permanent_address: string | null
          ownership_share: number | null
          ownership_type: 'owner' | 'co_owner' | 'representative' | null
          is_primary_contact: boolean
          ownership_start_date: string | null
          ownership_end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          land_parcel_id: string
          owner_type: 'individual' | 'organization' | 'household'
          full_name: string
          id_number?: string | null
          id_type?: 'cccd' | 'cmnd' | 'passport' | 'tax_code' | null
          phone?: string | null
          email?: string | null
          permanent_address?: string | null
          ownership_share?: number | null
          ownership_type?: 'owner' | 'co_owner' | 'representative' | null
          is_primary_contact?: boolean
          ownership_start_date?: string | null
          ownership_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          land_parcel_id?: string
          owner_type?: 'individual' | 'organization' | 'household'
          full_name?: string
          id_number?: string | null
          id_type?: 'cccd' | 'cmnd' | 'passport' | 'tax_code' | null
          phone?: string | null
          email?: string | null
          permanent_address?: string | null
          ownership_share?: number | null
          ownership_type?: 'owner' | 'co_owner' | 'representative' | null
          is_primary_contact?: boolean
          ownership_start_date?: string | null
          ownership_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      land_parcel_uses: {
        Row: {
          id: string
          land_parcel_id: string
          land_use_type_code: string
          land_use_purpose: string | null
          area_m2: number
          use_term_type: 'permanent' | 'limited' | null
          use_start_date: string | null
          use_end_date: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          land_parcel_id: string
          land_use_type_code: string
          land_use_purpose?: string | null
          area_m2: number
          use_term_type?: 'permanent' | 'limited' | null
          use_start_date?: string | null
          use_end_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          land_parcel_id?: string
          land_use_type_code?: string
          land_use_purpose?: string | null
          area_m2?: number
          use_term_type?: 'permanent' | 'limited' | null
          use_start_date?: string | null
          use_end_date?: string | null
          notes?: string | null
          created_at?: string
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

// Survey location types
export type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']
export type SurveyLocationInsert = Database['public']['Tables']['survey_locations']['Insert']
export type SurveyLocationUpdate = Database['public']['Tables']['survey_locations']['Update']

// Land certificate types
export type LandCertificate = Database['public']['Tables']['land_certificates']['Row']
export type LandCertificateInsert = Database['public']['Tables']['land_certificates']['Insert']
export type LandCertificateUpdate = Database['public']['Tables']['land_certificates']['Update']

// Land parcel types
export type LandParcel = Database['public']['Tables']['land_parcels']['Row']
export type LandParcelInsert = Database['public']['Tables']['land_parcels']['Insert']
export type LandParcelUpdate = Database['public']['Tables']['land_parcels']['Update']

// Land parcel owner types
export type LandParcelOwner = Database['public']['Tables']['land_parcel_owners']['Row']
export type LandParcelOwnerInsert = Database['public']['Tables']['land_parcel_owners']['Insert']
export type LandParcelOwnerUpdate = Database['public']['Tables']['land_parcel_owners']['Update']

// Land parcel use types
export type LandParcelUse = Database['public']['Tables']['land_parcel_uses']['Row']
export type LandParcelUseInsert = Database['public']['Tables']['land_parcel_uses']['Insert']
export type LandParcelUseUpdate = Database['public']['Tables']['land_parcel_uses']['Update']

// Extended types with relationships
export interface LandParcelWithDetails extends LandParcel {
  certificate?: LandCertificate | null
  owners: LandParcelOwner[]
  land_uses: LandParcelUse[]
}

export interface SurveyLocationWithParcel extends SurveyLocation {
  land_parcel?: LandParcelWithDetails | null
  certificate?: LandCertificate | null
}

// Certificate API response type (for mock/real API)
export interface CertificateAPIResponse {
  certificate_number: string
  certificate_book_number?: string
  issue_date?: string
  issuing_authority?: string
  parcels: {
    parcel_code: string
    sheet_number?: string
    parcel_number?: string
    total_area_m2?: number
    address?: string
    province_id?: number
    ward_id?: number
    owners: {
      full_name: string
      id_number?: string
      id_type?: 'cccd' | 'cmnd' | 'passport' | 'tax_code'
      owner_type: 'individual' | 'organization' | 'household'
      phone?: string
      email?: string
      permanent_address?: string
      ownership_share?: number
      ownership_type?: 'owner' | 'co_owner' | 'representative'
      is_primary_contact?: boolean
    }[]
    land_uses: {
      land_use_type_code: string
      land_use_purpose?: string
      area_m2: number
      use_term_type?: 'permanent' | 'limited'
      use_start_date?: string
      use_end_date?: string
    }[]
  }[]
}
