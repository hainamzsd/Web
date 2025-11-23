// Supabase Edge Function: Approval Workflow Handler
// Deploy: supabase functions deploy approval-workflow

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  survey_location_id: string
  action: 'approve' | 'reject' | 'submit_to_central'
  notes?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { survey_location_id, action, notes } = await req.json() as RequestBody

    if (!survey_location_id || !action) {
      throw new Error('survey_location_id and action are required')
    }

    // Get user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) throw new Error('Unauthorized')

    // Get user role
    const { data: webUser, error: webUserError } = await supabaseClient
      .from('web_users')
      .select('role')
      .eq('profile_id', user.id)
      .single()

    if (webUserError) throw webUserError

    // Get current survey
    const { data: survey, error: surveyError } = await supabaseClient
      .from('survey_locations')
      .select('*')
      .eq('id', survey_location_id)
      .single()

    if (surveyError) throw surveyError

    let newStatus = survey.status
    let actionType = action

    // Determine new status based on role and action
    if (action === 'approve') {
      if (webUser.role === 'commune_supervisor') {
        newStatus = 'approved_commune'
      } else if (webUser.role === 'central_admin') {
        newStatus = 'approved_central'
      }
    } else if (action === 'reject') {
      newStatus = 'rejected'
    } else if (action === 'submit_to_central') {
      newStatus = 'approved_commune'
      actionType = 'approved'
    }

    // Update survey status
    const { error: updateError } = await supabaseClient
      .from('survey_locations')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', survey_location_id)

    if (updateError) throw updateError

    // Add to approval history
    const { error: historyError } = await supabaseClient
      .from('approval_history')
      .insert({
        survey_location_id,
        action: actionType,
        actor_id: user.id,
        actor_role: webUser.role,
        previous_status: survey.status,
        new_status: newStatus,
        notes: notes || '',
      })

    if (historyError) throw historyError

    return new Response(
      JSON.stringify({
        success: true,
        new_status: newStatus,
        message: 'Workflow action completed successfully'
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
