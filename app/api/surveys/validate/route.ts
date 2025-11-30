/**
 * API Route: /api/surveys/validate
 *
 * Validates survey location data against the user's assigned boundary.
 * This provides backend enforcement of location-based access control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

interface ValidationRequest {
  gpsPoint?: {
    lat: number;
    lng: number;
  };
  polygon?: {
    lat: number;
    lng: number;
  }[];
}

interface ValidationResponse {
  isValid: boolean;
  message: string;
  details?: {
    pointValid?: boolean;
    polygonValid?: boolean;
    wardCode?: number;
    wardName?: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ValidationResponse>> {
  try {
    // Create Supabase client with user session
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { isValid: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile with assigned ward
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('ward_code, district_code, province_code, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { isValid: false, message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Admin can bypass
    if (profile.role === 'admin') {
      return NextResponse.json({
        isValid: true,
        message: 'Admin access - validation bypassed',
        details: { wardCode: profile.ward_code },
      });
    }

    // Parse request body
    const body: ValidationRequest = await request.json();

    if (!body.gpsPoint && !body.polygon) {
      return NextResponse.json(
        { isValid: false, message: 'No location data provided' },
        { status: 400 }
      );
    }

    let pointValid = true;
    let polygonValid = true;

    // Validate GPS point
    if (body.gpsPoint) {
      const { data: pointResult, error: pointError } = await supabase.rpc(
        'validate_point_access',
        {
          lat: body.gpsPoint.lat,
          lng: body.gpsPoint.lng,
        }
      );

      if (pointError) {
        console.error('Point validation error:', pointError);
        return NextResponse.json(
          { isValid: false, message: 'Point validation failed' },
          { status: 500 }
        );
      }

      pointValid = pointResult?.isValid ?? false;
    }

    // Validate polygon
    if (body.polygon && body.polygon.length >= 3) {
      // Check each vertex of the polygon
      for (const vertex of body.polygon) {
        const { data: vertexResult, error: vertexError } = await supabase.rpc(
          'validate_point_access',
          {
            lat: vertex.lat,
            lng: vertex.lng,
          }
        );

        if (vertexError || !vertexResult?.isValid) {
          polygonValid = false;
          break;
        }
      }
    }

    const isValid = pointValid && polygonValid;

    // Get ward name for response
    const { data: ward } = await supabase
      .from('admin_boundaries')
      .select('name')
      .eq('code', profile.ward_code)
      .eq('level', 'ward')
      .single();

    return NextResponse.json({
      isValid,
      message: isValid
        ? 'Dữ liệu khảo sát hợp lệ'
        : 'Vị trí nằm ngoài khu vực bạn được phân công',
      details: {
        pointValid,
        polygonValid,
        wardCode: profile.ward_code,
        wardName: ward?.name,
      },
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { isValid: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
