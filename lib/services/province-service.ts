import { createClient } from '@/lib/supabase/client'
import type { Province, Ward, ProvinceWithWards } from '@/lib/types/database'

/**
 * Service for managing provinces and wards from the database
 * This replaces the external API calls with database queries for better performance
 */
export const ProvinceService = {
  /**
   * Get all provinces from the database
   */
  async getAllProvinces(): Promise<Province[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('provinces')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching provinces:', error)
      return []
    }

    return data || []
  },

  /**
   * Get a single province by code
   */
  async getProvinceByCode(code: number): Promise<Province | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('provinces')
      .select('*')
      .eq('code', code)
      .single()

    if (error) {
      console.error('Error fetching province:', error)
      return null
    }

    return data
  },

  /**
   * Get a province by codename (URL-safe identifier)
   */
  async getProvinceByCodename(codename: string): Promise<Province | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('provinces')
      .select('*')
      .eq('codename', codename)
      .single()

    if (error) {
      console.error('Error fetching province by codename:', error)
      return null
    }

    return data
  },

  /**
   * Get all wards for a specific province
   */
  async getWardsByProvince(provinceCode: number): Promise<Ward[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('wards')
      .select('*')
      .eq('province_code', provinceCode)
      .order('name')

    if (error) {
      console.error('Error fetching wards:', error)
      return []
    }

    return data || []
  },

  /**
   * Get a single ward by code
   */
  async getWardByCode(code: number): Promise<Ward | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('wards')
      .select('*')
      .eq('code', code)
      .single()

    if (error) {
      console.error('Error fetching ward:', error)
      return null
    }

    return data
  },

  /**
   * Get a ward by codename
   */
  async getWardByCodename(codename: string): Promise<Ward | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('wards')
      .select('*')
      .eq('codename', codename)
      .single()

    if (error) {
      console.error('Error fetching ward by codename:', error)
      return null
    }

    return data
  },

  /**
   * Get all provinces with their wards (for dropdown/selection UI)
   */
  async getProvincesWithWards(): Promise<ProvinceWithWards[]> {
    const supabase = createClient()

    // Get all provinces
    const { data: provinces, error: provincesError } = await supabase
      .from('provinces')
      .select('*')
      .order('name')

    if (provincesError || !provinces) {
      console.error('Error fetching provinces:', provincesError)
      return []
    }

    // Get all wards
    const { data: wards, error: wardsError } = await supabase
      .from('wards')
      .select('*')
      .order('name')

    if (wardsError) {
      console.error('Error fetching wards:', wardsError)
      // Return provinces without wards
      return provinces.map(p => ({ ...p, wards: [] }))
    }

    // Group wards by province
    const wardsByProvince = (wards || []).reduce((acc, ward) => {
      if (!acc[ward.province_code]) {
        acc[ward.province_code] = []
      }
      acc[ward.province_code].push(ward)
      return acc
    }, {} as Record<number, Ward[]>)

    // Combine provinces with their wards
    return provinces.map(province => ({
      ...province,
      wards: wardsByProvince[province.code] || []
    }))
  },

  /**
   * Search provinces by name (partial match)
   */
  async searchProvinces(query: string): Promise<Province[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('provinces')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10)

    if (error) {
      console.error('Error searching provinces:', error)
      return []
    }

    return data || []
  },

  /**
   * Search wards by name within a province (partial match)
   */
  async searchWardsInProvince(provinceCode: number, query: string): Promise<Ward[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('wards')
      .select('*')
      .eq('province_code', provinceCode)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(20)

    if (error) {
      console.error('Error searching wards:', error)
      return []
    }

    return data || []
  },

  /**
   * Get province name by code (utility function)
   */
  async getProvinceName(code: number): Promise<string | null> {
    const province = await this.getProvinceByCode(code)
    return province?.name || null
  },

  /**
   * Get ward name by code (utility function)
   */
  async getWardName(code: number): Promise<string | null> {
    const ward = await this.getWardByCode(code)
    return ward?.name || null
  },

  /**
   * Get full location string (Province > Ward)
   */
  async getLocationString(provinceCode: number, wardCode?: number): Promise<string> {
    const province = await this.getProvinceByCode(provinceCode)
    if (!province) return 'Unknown location'

    if (!wardCode) return province.name

    const ward = await this.getWardByCode(wardCode)
    if (!ward) return province.name

    return `${ward.name}, ${province.name}`
  },

  /**
   * Use the database function to get location info
   */
  async getLocationInfo(provinceCode: string, wardCode?: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .rpc('get_location_info', {
        p_province_code: provinceCode,
        p_ward_code: wardCode
      })

    if (error) {
      console.error('Error getting location info:', error)
      return null
    }

    return data
  }
}

export default ProvinceService
