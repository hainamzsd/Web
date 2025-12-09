import { createClient } from '@/lib/supabase/client'
import type {
  CertificateAPIResponse,
  LandCertificate,
  LandParcel,
  LandParcelOwner,
  LandParcelUse,
  LandParcelWithDetails
} from '@/lib/types/database'

// Mock certificate data for demo purposes
// In production, this would be fetched from the Ministry of Agriculture API
const MOCK_CERTIFICATES: Record<string, CertificateAPIResponse> = {
  'GCN-04-2023-001234': {
    certificate_number: 'GCN-04-2023-001234',
    certificate_book_number: 'CS/2023/001234',
    issue_date: '2023-06-15',
    issuing_authority: 'UBND Huyện Mường Lay',
    parcels: [
      {
        parcel_code: '04-0028-001',
        sheet_number: 'T01',
        parcel_number: '156',
        total_area_m2: 2500,
        address: 'Thôn Nà Lay, Xã Lay Nưa, Huyện Mường Lay',
        province_id: 4,
        ward_id: 133,
        owners: [
          {
            full_name: 'Nguyễn Văn An',
            id_number: '004089012345',
            id_type: 'cccd',
            owner_type: 'individual',
            phone: '0912345678',
            permanent_address: 'Thôn Nà Lay, Xã Lay Nưa, Huyện Mường Lay, Tỉnh Điện Biên',
            ownership_share: 50,
            ownership_type: 'co_owner',
            is_primary_contact: true
          },
          {
            full_name: 'Nguyễn Thị Bình',
            id_number: '004089067890',
            id_type: 'cccd',
            owner_type: 'individual',
            phone: '0987654321',
            permanent_address: 'Thôn Nà Lay, Xã Lay Nưa, Huyện Mường Lay, Tỉnh Điện Biên',
            ownership_share: 50,
            ownership_type: 'co_owner',
            is_primary_contact: false
          }
        ],
        land_uses: [
          {
            land_use_type_code: 'CLN',
            land_use_purpose: 'Đất trồng cây lâu năm',
            area_m2: 1800,
            use_term_type: 'permanent'
          },
          {
            land_use_type_code: 'ODT',
            land_use_purpose: 'Đất ở tại nông thôn',
            area_m2: 700,
            use_term_type: 'permanent'
          }
        ]
      }
    ]
  },
  'GCN-04-2022-005678': {
    certificate_number: 'GCN-04-2022-005678',
    certificate_book_number: 'CS/2022/005678',
    issue_date: '2022-11-20',
    issuing_authority: 'UBND Huyện Mường Lay',
    parcels: [
      {
        parcel_code: '04-0028-002',
        sheet_number: 'T01',
        parcel_number: '157',
        total_area_m2: 3200,
        address: 'Thôn Huổi Lóng, Xã Lay Nưa, Huyện Mường Lay',
        province_id: 4,
        ward_id: 133,
        owners: [
          {
            full_name: 'Lò Văn Cường',
            id_number: '004090123456',
            id_type: 'cccd',
            owner_type: 'individual',
            phone: '0911223344',
            permanent_address: 'Thôn Huổi Lóng, Xã Lay Nưa, Huyện Mường Lay, Tỉnh Điện Biên',
            ownership_share: 100,
            ownership_type: 'owner',
            is_primary_contact: true
          }
        ],
        land_uses: [
          {
            land_use_type_code: 'LUC',
            land_use_purpose: 'Đất trồng lúa',
            area_m2: 2000,
            use_term_type: 'limited',
            use_start_date: '2022-11-20',
            use_end_date: '2072-11-20'
          },
          {
            land_use_type_code: 'NKH',
            land_use_purpose: 'Đất nông nghiệp khác',
            area_m2: 1200,
            use_term_type: 'limited',
            use_start_date: '2022-11-20',
            use_end_date: '2072-11-20'
          }
        ]
      }
    ]
  },
  'GCN-04-2021-009012': {
    certificate_number: 'GCN-04-2021-009012',
    certificate_book_number: 'CS/2021/009012',
    issue_date: '2021-08-10',
    issuing_authority: 'UBND Huyện Mường Lay',
    parcels: [
      {
        parcel_code: '04-0028-003',
        sheet_number: 'T02',
        parcel_number: '089',
        total_area_m2: 1500,
        address: 'Thôn Nà Hai, Xã Lay Nưa, Huyện Mường Lay',
        province_id: 4,
        ward_id: 133,
        owners: [
          {
            full_name: 'Hợp tác xã Nông nghiệp Lay Nưa',
            id_number: '0400012345',
            id_type: 'tax_code',
            owner_type: 'organization',
            phone: '02153861234',
            email: 'htx.laynua@gmail.com',
            permanent_address: 'Trung tâm Xã Lay Nưa, Huyện Mường Lay, Tỉnh Điện Biên',
            ownership_share: 100,
            ownership_type: 'owner',
            is_primary_contact: true
          }
        ],
        land_uses: [
          {
            land_use_type_code: 'NTS',
            land_use_purpose: 'Đất nuôi trồng thủy sản',
            area_m2: 1500,
            use_term_type: 'limited',
            use_start_date: '2021-08-10',
            use_end_date: '2071-08-10'
          }
        ]
      }
    ]
  },
  'GCN-04-2023-003456': {
    certificate_number: 'GCN-04-2023-003456',
    certificate_book_number: 'CS/2023/003456',
    issue_date: '2023-03-25',
    issuing_authority: 'UBND Huyện Mường Lay',
    parcels: [
      {
        parcel_code: '04-0028-004',
        sheet_number: 'T01',
        parcel_number: '201',
        total_area_m2: 800,
        address: 'Thôn Nà Lay, Xã Lay Nưa, Huyện Mường Lay',
        province_id: 4,
        ward_id: 133,
        owners: [
          {
            full_name: 'Quàng Văn Dũng',
            id_number: '004091234567',
            id_type: 'cccd',
            owner_type: 'individual',
            phone: '0933445566',
            permanent_address: 'Thôn Nà Lay, Xã Lay Nưa, Huyện Mường Lay, Tỉnh Điện Biên',
            ownership_share: 60,
            ownership_type: 'owner',
            is_primary_contact: true
          },
          {
            full_name: 'Quàng Thị Em',
            id_number: '004091234568',
            id_type: 'cccd',
            owner_type: 'individual',
            phone: '0933445567',
            permanent_address: 'Thôn Nà Lay, Xã Lay Nưa, Huyện Mường Lay, Tỉnh Điện Biên',
            ownership_share: 40,
            ownership_type: 'co_owner',
            is_primary_contact: false
          }
        ],
        land_uses: [
          {
            land_use_type_code: 'ODT',
            land_use_purpose: 'Đất ở tại nông thôn',
            area_m2: 400,
            use_term_type: 'permanent'
          },
          {
            land_use_type_code: 'CLN',
            land_use_purpose: 'Đất trồng cây lâu năm',
            area_m2: 400,
            use_term_type: 'permanent'
          }
        ]
      }
    ]
  },
  'GCN-04-2020-007890': {
    certificate_number: 'GCN-04-2020-007890',
    certificate_book_number: 'CS/2020/007890',
    issue_date: '2020-12-01',
    issuing_authority: 'UBND Huyện Mường Lay',
    parcels: [
      {
        parcel_code: '04-0028-005',
        sheet_number: 'T03',
        parcel_number: '045',
        total_area_m2: 5000,
        address: 'Bản Hua Rốm, Xã Lay Nưa, Huyện Mường Lay',
        province_id: 4,
        ward_id: 133,
        owners: [
          {
            full_name: 'Hộ gia đình ông Mào A Phử',
            id_number: '004088012345',
            id_type: 'cccd',
            owner_type: 'household',
            phone: '0944556677',
            permanent_address: 'Bản Hua Rốm, Xã Lay Nưa, Huyện Mường Lay, Tỉnh Điện Biên',
            ownership_share: 100,
            ownership_type: 'owner',
            is_primary_contact: true
          }
        ],
        land_uses: [
          {
            land_use_type_code: 'RSX',
            land_use_purpose: 'Đất rừng sản xuất',
            area_m2: 3500,
            use_term_type: 'limited',
            use_start_date: '2020-12-01',
            use_end_date: '2070-12-01'
          },
          {
            land_use_type_code: 'CLN',
            land_use_purpose: 'Đất trồng cây lâu năm',
            area_m2: 1000,
            use_term_type: 'permanent'
          },
          {
            land_use_type_code: 'ODT',
            land_use_purpose: 'Đất ở tại nông thôn',
            area_m2: 500,
            use_term_type: 'permanent'
          }
        ]
      }
    ]
  }
}

// Land use type codes reference
export const LAND_USE_TYPES: Record<string, string> = {
  'ODT': 'Đất ở tại nông thôn',
  'ONT': 'Đất ở tại đô thị',
  'CLN': 'Đất trồng cây lâu năm',
  'LUC': 'Đất trồng lúa',
  'LUK': 'Đất lúa khác',
  'HNK': 'Đất trồng cây hàng năm khác',
  'RSX': 'Đất rừng sản xuất',
  'RPH': 'Đất rừng phòng hộ',
  'RDD': 'Đất rừng đặc dụng',
  'NTS': 'Đất nuôi trồng thủy sản',
  'NKH': 'Đất nông nghiệp khác',
  'TMD': 'Đất thương mại, dịch vụ',
  'SKC': 'Đất sản xuất kinh doanh',
  'CCC': 'Đất công cộng'
}

/**
 * Lookup certificate by certificate number (mock API)
 * In production, this would call the Ministry of Agriculture API
 */
export async function lookupCertificate(
  certificateNumber: string
): Promise<CertificateAPIResponse | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // Normalize certificate number
  const normalizedNumber = certificateNumber.trim().toUpperCase()

  // Search in mock data
  const certificate = MOCK_CERTIFICATES[normalizedNumber]

  if (certificate) {
    return certificate
  }

  // Also search by partial match
  for (const [key, value] of Object.entries(MOCK_CERTIFICATES)) {
    if (key.includes(normalizedNumber) || normalizedNumber.includes(key)) {
      return value
    }
  }

  return null
}

/**
 * Search certificates by various criteria
 */
export async function searchCertificates(query: {
  certificateNumber?: string
  parcelCode?: string
  ownerName?: string
  ownerIdNumber?: string
}): Promise<CertificateAPIResponse[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))

  const results: CertificateAPIResponse[] = []

  for (const cert of Object.values(MOCK_CERTIFICATES)) {
    let matches = false

    // Match by certificate number
    if (query.certificateNumber) {
      const normalizedQuery = query.certificateNumber.trim().toUpperCase()
      if (cert.certificate_number.toUpperCase().includes(normalizedQuery)) {
        matches = true
      }
    }

    // Match by parcel code
    if (query.parcelCode) {
      const normalizedQuery = query.parcelCode.trim()
      for (const parcel of cert.parcels) {
        if (parcel.parcel_code.includes(normalizedQuery)) {
          matches = true
          break
        }
      }
    }

    // Match by owner name
    if (query.ownerName) {
      const normalizedQuery = query.ownerName.trim().toLowerCase()
      for (const parcel of cert.parcels) {
        for (const owner of parcel.owners) {
          if (owner.full_name.toLowerCase().includes(normalizedQuery)) {
            matches = true
            break
          }
        }
        if (matches) break
      }
    }

    // Match by owner ID number
    if (query.ownerIdNumber) {
      const normalizedQuery = query.ownerIdNumber.trim()
      for (const parcel of cert.parcels) {
        for (const owner of parcel.owners) {
          if (owner.id_number?.includes(normalizedQuery)) {
            matches = true
            break
          }
        }
        if (matches) break
      }
    }

    if (matches) {
      results.push(cert)
    }
  }

  return results
}

/**
 * Save certificate data to database
 * Creates or updates certificate, parcels, owners, and land uses
 */
export async function saveCertificateToDatabase(
  apiResponse: CertificateAPIResponse
): Promise<{
  certificate: LandCertificate
  parcels: LandParcelWithDetails[]
}> {
  const supabase = createClient()

  // Upsert certificate
  const { data: certificate, error: certError } = await supabase
    .from('land_certificates')
    .upsert(
      {
        certificate_number: apiResponse.certificate_number,
        certificate_book_number: apiResponse.certificate_book_number || null,
        issue_date: apiResponse.issue_date || null,
        issuing_authority: apiResponse.issuing_authority || null,
        is_active: true,
        fetched_from_api_at: new Date().toISOString(),
        api_response_data: apiResponse as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'certificate_number'
      }
    )
    .select()
    .single()

  if (certError) {
    throw new Error(`Failed to save certificate: ${certError.message}`)
  }

  const parcelsWithDetails: LandParcelWithDetails[] = []

  // Process each parcel
  for (const parcelData of apiResponse.parcels) {
    // Upsert parcel
    const { data: parcel, error: parcelError } = await supabase
      .from('land_parcels')
      .upsert(
        {
          certificate_id: certificate.id,
          parcel_code: parcelData.parcel_code,
          sheet_number: parcelData.sheet_number || null,
          parcel_number: parcelData.parcel_number || null,
          province_id: parcelData.province_id || null,
          ward_id: parcelData.ward_id || null,
          address: parcelData.address || null,
          total_area_m2: parcelData.total_area_m2 || null,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'certificate_id,parcel_code'
        }
      )
      .select()
      .single()

    if (parcelError) {
      throw new Error(`Failed to save parcel: ${parcelError.message}`)
    }

    // Delete existing owners and land uses for this parcel (to replace with fresh data)
    await supabase.from('land_parcel_owners').delete().eq('land_parcel_id', parcel.id)
    await supabase.from('land_parcel_uses').delete().eq('land_parcel_id', parcel.id)

    // Insert owners
    const owners: LandParcelOwner[] = []
    for (const ownerData of parcelData.owners) {
      const { data: owner, error: ownerError } = await supabase
        .from('land_parcel_owners')
        .insert({
          land_parcel_id: parcel.id,
          owner_type: ownerData.owner_type,
          full_name: ownerData.full_name,
          id_number: ownerData.id_number || null,
          id_type: ownerData.id_type || null,
          phone: ownerData.phone || null,
          email: ownerData.email || null,
          permanent_address: ownerData.permanent_address || null,
          ownership_share: ownerData.ownership_share || null,
          ownership_type: ownerData.ownership_type || null,
          is_primary_contact: ownerData.is_primary_contact || false
        })
        .select()
        .single()

      if (ownerError) {
        throw new Error(`Failed to save owner: ${ownerError.message}`)
      }
      owners.push(owner)
    }

    // Insert land uses
    const landUses: LandParcelUse[] = []
    for (const useData of parcelData.land_uses) {
      const { data: landUse, error: useError } = await supabase
        .from('land_parcel_uses')
        .insert({
          land_parcel_id: parcel.id,
          land_use_type_code: useData.land_use_type_code,
          land_use_purpose: useData.land_use_purpose || LAND_USE_TYPES[useData.land_use_type_code] || null,
          area_m2: useData.area_m2,
          use_term_type: useData.use_term_type || null,
          use_start_date: useData.use_start_date || null,
          use_end_date: useData.use_end_date || null
        })
        .select()
        .single()

      if (useError) {
        throw new Error(`Failed to save land use: ${useError.message}`)
      }
      landUses.push(landUse)
    }

    parcelsWithDetails.push({
      ...parcel,
      certificate: certificate,
      owners,
      land_uses: landUses
    })
  }

  return {
    certificate,
    parcels: parcelsWithDetails
  }
}

/**
 * Get parcel with all related data by ID
 */
export async function getParcelWithDetails(
  parcelId: string
): Promise<LandParcelWithDetails | null> {
  const supabase = createClient()

  // Get parcel
  const { data: parcel, error: parcelError } = await supabase
    .from('land_parcels')
    .select('*')
    .eq('id', parcelId)
    .single()

  if (parcelError || !parcel) {
    return null
  }

  // Get certificate
  let certificate: LandCertificate | null = null
  if (parcel.certificate_id) {
    const { data: cert } = await supabase
      .from('land_certificates')
      .select('*')
      .eq('id', parcel.certificate_id)
      .single()
    certificate = cert
  }

  // Get owners
  const { data: owners } = await supabase
    .from('land_parcel_owners')
    .select('*')
    .eq('land_parcel_id', parcelId)
    .order('is_primary_contact', { ascending: false })
    .order('ownership_share', { ascending: false })

  // Get land uses
  const { data: landUses } = await supabase
    .from('land_parcel_uses')
    .select('*')
    .eq('land_parcel_id', parcelId)
    .order('area_m2', { ascending: false })

  return {
    ...parcel,
    certificate,
    owners: owners || [],
    land_uses: landUses || []
  }
}

/**
 * Link a survey location to a land parcel
 */
export async function linkSurveyToParcel(
  surveyLocationId: string,
  parcelId: string,
  certificateId: string,
  verifiedBy: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('survey_locations')
    .update({
      land_parcel_id: parcelId,
      certificate_id: certificateId,
      parcel_verified_at: new Date().toISOString(),
      parcel_verified_by: verifiedBy,
      updated_at: new Date().toISOString()
    })
    .eq('id', surveyLocationId)

  if (error) {
    throw new Error(`Failed to link survey to parcel: ${error.message}`)
  }
}

/**
 * Unlink a survey location from its parcel
 */
export async function unlinkSurveyFromParcel(
  surveyLocationId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('survey_locations')
    .update({
      land_parcel_id: null,
      certificate_id: null,
      parcel_verified_at: null,
      parcel_verified_by: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', surveyLocationId)

  if (error) {
    throw new Error(`Failed to unlink survey from parcel: ${error.message}`)
  }
}

/**
 * Get all available mock certificate numbers (for demo purposes)
 */
export function getAvailableCertificateNumbers(): string[] {
  return Object.keys(MOCK_CERTIFICATES)
}
