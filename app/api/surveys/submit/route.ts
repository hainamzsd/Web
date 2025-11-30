/**
 * API Route: /api/surveys/submit
 *
 * Handles survey submission with spatial access control validation.
 * This is the main endpoint for syncing survey data from the mobile app.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

interface SurveySubmission {
  clientLocalId: string;
  missionId?: string;
  provinceCode: string;
  districtCode: string;
  wardCode: string;
  tempName?: string;
  description?: string;
  objectTypeCode?: string;
  landUseTypeCode?: string;
  rawAddress?: string;
  houseNumber?: string;
  streetName?: string;
  gpsPoint?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  gpsAccuracyM?: number;
  gpsSource?: string;
  roughArea?: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  status?: string;
}

interface SubmitResponse {
  success: boolean;
  message: string;
  surveyId?: string;
  errors?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<SubmitResponse>> {
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
        { success: false, message: 'Unauthorized', errors: ['Authentication required'] },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body: SurveySubmission = await request.json();

    // Validate required fields
    const errors: string[] = [];

    if (!body.clientLocalId) {
      errors.push('clientLocalId is required');
    }

    if (!body.provinceCode || !body.districtCode || !body.wardCode) {
      errors.push('Administrative codes (province, district, ward) are required');
    }

    if (!body.gpsPoint && !body.roughArea) {
      errors.push('At least one of gpsPoint or roughArea is required');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Verify the survey is within the user's assigned ward
    // (Non-admin users can only submit to their assigned area)
    if (profile.role !== 'admin') {
      if (body.wardCode !== profile.ward_code) {
        return NextResponse.json(
          {
            success: false,
            message: 'Bạn không có quyền tạo khảo sát tại khu vực này',
            errors: ['Ward code mismatch with assigned area'],
          },
          { status: 403 }
        );
      }
    }

    // Additional spatial validation using PostGIS
    // This is a secondary check - the database trigger will also validate
    if (body.gpsPoint) {
      const [lng, lat] = body.gpsPoint.coordinates;

      const { data: validation, error: validationError } = await supabase.rpc(
        'validate_point_access',
        { lat, lng }
      );

      if (validationError) {
        console.error('Spatial validation error:', validationError);
      } else if (!validation?.isValid) {
        return NextResponse.json(
          {
            success: false,
            message: 'Vị trí GPS nằm ngoài khu vực bạn được phân công',
            errors: ['GPS point outside assigned boundary'],
          },
          { status: 403 }
        );
      }
    }

    // Check for existing survey with same clientLocalId
    const { data: existing } = await supabase
      .from('survey_locations')
      .select('id')
      .eq('client_local_id', body.clientLocalId)
      .eq('created_by', user.id)
      .single();

    if (existing) {
      // Update existing survey
      const { data: updated, error: updateError } = await supabase
        .from('survey_locations')
        .update({
          mission_id: body.missionId,
          province_code: body.provinceCode,
          district_code: body.districtCode,
          ward_code: body.wardCode,
          temp_name: body.tempName,
          description: body.description,
          object_type_code: body.objectTypeCode,
          land_use_type_code: body.landUseTypeCode,
          raw_address: body.rawAddress,
          house_number: body.houseNumber,
          street_name: body.streetName,
          gps_point: body.gpsPoint ? JSON.stringify(body.gpsPoint) : null,
          gps_accuracy_m: body.gpsAccuracyM,
          gps_source: body.gpsSource,
          rough_area: body.roughArea ? JSON.stringify(body.roughArea) : null,
          has_rough_area: !!body.roughArea,
          status: body.status || 'draft',
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);

        // Check if it's a spatial validation error from the trigger
        if (updateError.message.includes('ngoài khu vực')) {
          return NextResponse.json(
            {
              success: false,
              message: updateError.message,
              errors: ['Location outside your jurisdiction'],
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          { success: false, message: 'Failed to update survey', errors: [updateError.message] },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Survey updated successfully',
        surveyId: updated?.id,
      });
    }

    // Create new survey
    const { data: created, error: createError } = await supabase
      .from('survey_locations')
      .insert({
        created_by: user.id,
        assigned_to: user.id,
        client_local_id: body.clientLocalId,
        mission_id: body.missionId,
        province_code: body.provinceCode,
        district_code: body.districtCode,
        ward_code: body.wardCode,
        temp_name: body.tempName,
        description: body.description,
        object_type_code: body.objectTypeCode,
        land_use_type_code: body.landUseTypeCode,
        raw_address: body.rawAddress,
        house_number: body.houseNumber,
        street_name: body.streetName,
        gps_point: body.gpsPoint ? JSON.stringify(body.gpsPoint) : null,
        gps_accuracy_m: body.gpsAccuracyM,
        gps_source: body.gpsSource,
        rough_area: body.roughArea ? JSON.stringify(body.roughArea) : null,
        has_rough_area: !!body.roughArea,
        status: body.status || 'draft',
        synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Create error:', createError);

      // Check if it's a spatial validation error from the trigger
      if (createError.message.includes('ngoài khu vực')) {
        return NextResponse.json(
          {
            success: false,
            message: createError.message,
            errors: ['Location outside your jurisdiction'],
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Failed to create survey', errors: [createError.message] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Survey created successfully',
      surveyId: created?.id,
    });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: 500 }
    );
  }
}
