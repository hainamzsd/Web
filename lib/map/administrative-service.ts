
export interface ApiProvince {
    code: number
    name: string
    division_type: string
    codename: string
    phone_code: number
    districts?: ApiDistrict[]
}

export interface ApiDistrict {
    code: number
    name: string
    division_type: string
    codename: string
    province_code: number
    wards?: ApiWard[]
}

export interface ApiWard {
    code: number
    name: string
    division_type: string
    codename: string
    district_code: number
}

const BASE_URL = 'https://provinces.open-api.vn/api'

export const AdministrativeService = {
    async getProvinces(): Promise<ApiProvince[]> {
        try {
            const response = await fetch(`${BASE_URL}/p/`)
            if (!response.ok) throw new Error('Failed to fetch provinces')
            return await response.json()
        } catch (error) {
            console.error('Error fetching provinces:', error)
            return []
        }
    },

    async getDistricts(provinceCode: number | string): Promise<ApiDistrict[]> {
        try {
            const response = await fetch(`${BASE_URL}/p/${provinceCode}?depth=2`)
            if (!response.ok) throw new Error('Failed to fetch districts')
            const data = await response.json()
            return data.districts || []
        } catch (error) {
            console.error('Error fetching districts:', error)
            return []
        }
    },

    async getWards(districtCode: number | string): Promise<ApiWard[]> {
        try {
            const response = await fetch(`${BASE_URL}/d/${districtCode}?depth=2`)
            if (!response.ok) throw new Error('Failed to fetch wards')
            const data = await response.json()
            return data.wards || []
        } catch (error) {
            console.error('Error fetching wards:', error)
            return []
        }
    },

    async getWardsByProvince(provinceCode: number | string): Promise<ApiWard[]> {
        try {
            const response = await fetch(`${BASE_URL}/p/${provinceCode}?depth=3`)
            if (!response.ok) throw new Error('Failed to fetch province details')
            const data = await response.json()

            if (!data.districts) return []

            // Flatten all wards from all districts
            const allWards = data.districts.reduce((acc: ApiWard[], district: ApiDistrict) => {
                return acc.concat(district.wards || [])
            }, [])

            return allWards
        } catch (error) {
            console.error('Error fetching wards by province:', error)
            return []
        }
    },

    async getProvince(code: number | string): Promise<ApiProvince | null> {
        try {
            const response = await fetch(`${BASE_URL}/d/${code}`)
            if (!response.ok) return null
            return await response.json()
        } catch (error) {
            console.error('Error fetching district:', error)
            return null
        }
    },

    async getWard(code: number | string): Promise<ApiWard | null> {
        try {
            const response = await fetch(`${BASE_URL}/w/${code}`)
            if (!response.ok) return null
            return await response.json()
        } catch (error) {
            console.error('Error fetching ward:', error)
            return null
        }
    }
}
