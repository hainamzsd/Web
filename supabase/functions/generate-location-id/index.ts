// Supabase Edge Function: Generate Location ID
// Deploy: supabase functions deploy generate-location-id
// Format: PP-WWWW-SSSSSS (Province 2 digits, Ward 4 digits, Sequence 6 digits)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  survey_location_id: string
}

const MAX_RETRIES = 3

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for atomic operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get request body
    const { survey_location_id } = await req.json() as RequestBody

    if (!survey_location_id) {
      throw new Error('survey_location_id is required')
    }

    // Get survey location
    const { data: survey, error: surveyError } = await supabaseClient
      .from('survey_locations')
      .select('*')
      .eq('id', survey_location_id)
      .single()

    if (surveyError) throw surveyError
    if (!survey) throw new Error('Survey location not found')

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) throw new Error('Unauthorized')

    // Try to use database function first (atomic, prevents race conditions)
    let locationId: string
    let adminCode: string
    let sequenceStr: string

    const { data: rpcResult, error: rpcError } = await supabaseClient
      .rpc('create_location_identifier', {
        p_survey_location_id: survey_location_id,
        p_province_id: survey.province_id || 0,
        p_ward_id: survey.ward_id || 0,
        p_assigned_by: user.id
      })

    if (!rpcError && rpcResult && rpcResult.length > 0) {
      // Database function succeeded
      locationId = rpcResult[0].location_id
      adminCode = rpcResult[0].admin_code
      sequenceStr = rpcResult[0].sequence_number
    } else {
      // Fallback to client-side generation with retry logic
      console.warn('Database function failed, using fallback:', rpcError)

      // Zero-pad province_id to 2 digits (e.g., 4 → "04", 23 → "23")
      const provinceCode = (survey.province_id || 0).toString().padStart(2, '0')
      // Zero-pad ward_id to 4 digits (e.g., 28 → "0028", 1234 → "1234")
      const wardCode = (survey.ward_id || 0).toString().padStart(4, '0')
      adminCode = `${provinceCode}-${wardCode}`

      let insertSuccess = false
      let lastError: any = null

      for (let attempt = 1; attempt <= MAX_RETRIES && !insertSuccess; attempt++) {
        // Get next sequence number for this admin code
        const { data: existingIds, error: idsError } = await supabaseClient
          .from('location_identifiers')
          .select('sequence_number')
          .eq('admin_code', adminCode)
          .order('sequence_number', { ascending: false })
          .limit(1)

        if (idsError) throw idsError

        let nextSequence = 1
        if (existingIds && existingIds.length > 0) {
          const lastSeq = parseInt(existingIds[0].sequence_number, 10)
          if (!isNaN(lastSeq)) {
            nextSequence = lastSeq + 1
          }
        }

        sequenceStr = nextSequence.toString().padStart(6, '0')
        locationId = `${provinceCode}-${wardCode}-${sequenceStr}`

        // Try to insert (may fail due to race condition)
        const { error: insertError } = await supabaseClient
          .from('location_identifiers')
          .insert({
            survey_location_id,
            location_id: locationId,
            admin_code: adminCode,
            sequence_number: sequenceStr,
            assigned_by: user.id,
            is_active: true,
          })

        if (!insertError) {
          insertSuccess = true
        } else if (insertError.code === '23505') {
          // Duplicate key - retry
          lastError = insertError
          console.log(`Attempt ${attempt}: Duplicate detected, retrying...`)
        } else {
          throw insertError
        }
      }

      if (!insertSuccess) {
        throw lastError || new Error('Failed to generate unique location ID after retries')
      }
    }

    // Update survey location
    const { error: updateError } = await supabaseClient
      .from('survey_locations')
      .update({
        location_identifier: locationId,
        status: 'approved_central',
        updated_at: new Date().toISOString(),
      })
      .eq('id', survey_location_id)

    if (updateError) throw updateError

    // Add to approval history
    const { error: historyError } = await supabaseClient
      .from('approval_history')
      .insert({
        survey_location_id,
        action: 'approved',
        actor_id: user.id,
        actor_role: 'central_admin',
        previous_status: survey.status,
        new_status: 'approved_central',
        notes: `Đã phê duyệt cấp trung ương. Mã định danh: ${locationId}`,
      })

    if (historyError) throw historyError

    return new Response(
      JSON.stringify({
        success: true,
        location_id: locationId,
        message: 'Location ID generated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
