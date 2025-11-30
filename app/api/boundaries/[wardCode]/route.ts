/**
 * API Route: /api/boundaries/[wardCode]
 *
 * Serves ward boundary GeoJSON data for the frontend map components.
 * This endpoint fetches boundary data from the database or external API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wardCode: string }> }
) {
  try {
    const { wardCode: wardCodeParam } = await params;
    const wardCode = parseInt(wardCodeParam, 10);

    if (isNaN(wardCode)) {
      return NextResponse.json(
        { error: 'Invalid ward code' },
        { status: 400 }
      );
    }

    // Try to get boundary from database
    const { data: boundary, error } = await supabase
      .rpc('get_ward_boundary_geojson', { ward_code_param: wardCode });

    if (error) {
      console.error('Database error:', error);

      // Fallback: Try to fetch from local file or external API
      // You can customize this fallback logic
      return NextResponse.json(
        { error: 'Boundary not found', details: error.message },
        { status: 404 }
      );
    }

    if (!boundary) {
      return NextResponse.json(
        { error: 'Boundary not found for this ward' },
        { status: 404 }
      );
    }

    // Return the GeoJSON boundary
    return NextResponse.json(boundary, {
      headers: {
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error fetching boundary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
