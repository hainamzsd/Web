export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Database types based on Supabase schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          police_id: string | null
          unit: string | null
          avatar_url: string | null
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
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
