// Supabase Edge Function: Generate Location ID
// Deploy: supabase functions deploy generate-location-id

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  survey_location_id: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
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

    // Generate location ID
    const adminCode = `${survey.province_code}-${survey.district_code}-${survey.ward_code}`

    // Get next sequence number
    const { data: existingIds, error: idsError } = await supabaseClient
      .from('location_identifiers')
      .select('sequence_number')
      .eq('admin_code', adminCode)
      .order('sequence_number', { ascending: false })
      .limit(1)

    if (idsError) throw idsError

    let nextSequence = 1
    if (existingIds && existingIds.length > 0) {
      nextSequence = parseInt(existingIds[0].sequence_number) + 1
    }

    const sequenceStr = nextSequence.toString().padStart(6, '0')
    const locationId = `${adminCode}-${sequenceStr}`

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) throw new Error('Unauthorized')

    // Insert location identifier
    const { error: insertError } = await supabaseClient
      .from('location_identifiers')
      .insert({
        survey_location_id,
        location_id: locationId,
        admin_code: adminCode,
        sequence_number: sequenceStr,
        assigned_by: user.id,
      })

    if (insertError) throw insertError

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
        notes: `Location ID generated: ${locationId}`,
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
