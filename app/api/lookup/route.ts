import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create client (public API - no auth required)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('id')

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // Clean and format the location ID
    const cleanId = locationId.trim().toUpperCase()

    // Search for the location identifier
    const { data: identifierData, error: identifierError } = await supabase
      .from('location_identifiers')
      .select(`
        id,
        location_id,
        is_active,
        assigned_at,
        survey_location_id
      `)
      .ilike('location_id', cleanId)
      .single()

    if (identifierError || !identifierData) {
      // Try partial match
      const { data: partialData, error: partialError } = await supabase
        .from('location_identifiers')
        .select(`
          id,
          location_id,
          is_active,
          assigned_at,
          survey_location_id
        `)
        .ilike('location_id', `%${cleanId}%`)
        .limit(5)

      if (partialError || !partialData || partialData.length === 0) {
        return NextResponse.json(
          {
            found: false,
            message: 'Mã định danh không tồn tại trong hệ thống',
            suggestions: []
          },
          { status: 404 }
        )
      }

      // Return suggestions for partial matches
      return NextResponse.json({
        found: false,
        message: 'Không tìm thấy chính xác, có thể bạn muốn tìm:',
        suggestions: partialData.map(d => ({
          locationId: d.location_id,
          isActive: d.is_active
        }))
      })
    }

    // Found exact match - get survey location details
    const { data: surveyData, error: surveyError } = await supabase
      .from('survey_locations')
      .select(`
        id,
        location_name,
        address,
        latitude,
        longitude,
        province_id,
        ward_id,
        object_type,
        status
      `)
      .eq('id', identifierData.survey_location_id)
      .single()

    if (surveyError || !surveyData) {
      return NextResponse.json(
        {
          found: true,
          location: {
            locationId: identifierData.location_id,
            isActive: identifierData.is_active,
            assignedAt: identifierData.assigned_at,
          },
          details: null,
          message: 'Mã định danh hợp lệ nhưng không có thông tin chi tiết'
        }
      )
    }

    // Get province and ward names
    let provinceName = null
    let wardName = null

    if (surveyData.province_id) {
      const { data: provinceData } = await supabase
        .from('provinces')
        .select('name')
        .eq('code', surveyData.province_id)
        .single()
      provinceName = provinceData?.name
    }

    if (surveyData.ward_id) {
      const { data: wardData } = await supabase
        .from('wards')
        .select('name')
        .eq('code', surveyData.ward_id)
        .single()
      wardName = wardData?.name
    }

    return NextResponse.json({
      found: true,
      location: {
        locationId: identifierData.location_id,
        isActive: identifierData.is_active,
        assignedAt: identifierData.assigned_at,
        locationName: surveyData.location_name,
        address: surveyData.address,
        latitude: surveyData.latitude,
        longitude: surveyData.longitude,
        objectType: surveyData.object_type,
        province: provinceName,
        ward: wardName,
        status: surveyData.status === 'published' ? 'Đã công bố' : 'Đang xử lý'
      }
    })

  } catch (error) {
    console.error('Lookup error:', error)
    return NextResponse.json(
      { error: 'Lỗi hệ thống. Vui lòng thử lại sau.' },
      { status: 500 }
    )
  }
}
