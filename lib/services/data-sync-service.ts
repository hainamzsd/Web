/**
 * Data Sync Service
 * Handles synchronization of approved data with national database
 */

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: SyncError[]
  syncId?: string
}

export interface SyncError {
  surveyId: string
  error: string
  timestamp: string
}

export interface SyncStatus {
  lastSyncTime: string | null
  pendingSyncCount: number
  totalSynced: number
  syncInProgress: boolean
}

/**
 * Sync approved surveys to national database
 * In production, this would call an external API
 */
export async function syncToNationalDatabase(
  surveyIds?: string[]
): Promise<SyncResult> {
  const supabase = createClient()
  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    failedCount: 0,
    errors: []
  }

  try {
    // Build query for approved surveys
    let query = supabase
      .from('survey_locations')
      .select('*')
      .eq('status', 'approved_central')

    // If specific IDs provided, filter by them
    if (surveyIds && surveyIds.length > 0) {
      query = query.in('id', surveyIds)
    }

    const { data: surveys, error: fetchError } = await query

    if (fetchError) {
      console.error('Failed to fetch surveys for sync:', fetchError)
      result.success = false
      result.errors.push({
        surveyId: 'N/A',
        error: 'Failed to fetch surveys',
        timestamp: new Date().toISOString()
      })
      return result
    }

    if (!surveys || surveys.length === 0) {
      return {
        ...result,
        success: true,
        syncedCount: 0
      }
    }

    // Create sync record
    const syncId = crypto.randomUUID()

    // Process each survey
    for (const survey of surveys) {
      try {
        // Simulate API call to national database
        // In production, replace with actual API call
        await simulateNationalDatabaseSync(survey)

        // Mark as published
        const { error: updateError } = await supabase
          .from('survey_locations')
          .update({
            status: 'published',
            updated_at: new Date().toISOString()
          })
          .eq('id', survey.id)

        if (updateError) {
          throw new Error('Failed to update status after sync')
        }

        // Log sync in approval history
        await supabase.from('approval_history').insert({
          survey_location_id: survey.id,
          action: 'published',
          actor_id: survey.surveyor_id,
          actor_role: 'system',
          previous_status: 'approved_central',
          new_status: 'published',
          notes: `Synced to national database - Sync ID: ${syncId}`
        })

        result.syncedCount++
      } catch (error: any) {
        console.error(`Failed to sync survey ${survey.id}:`, error)
        result.failedCount++
        result.errors.push({
          surveyId: survey.id,
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString()
        })
      }
    }

    result.success = result.failedCount === 0
    result.syncId = syncId

    // Log overall sync operation
    await logSyncOperation(syncId, result)

    return result
  } catch (error: any) {
    console.error('Sync operation failed:', error)
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [{
        surveyId: 'N/A',
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }]
    }
  }
}

/**
 * Get sync status for dashboard
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const supabase = createClient()

  try {
    // Get last sync time from system config
    const { data: config } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'last_sync_time')
      .single()

    // Count pending syncs (approved_central status)
    const { count: pendingCount } = await supabase
      .from('survey_locations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved_central')

    // Count total synced (published status)
    const { count: totalSynced } = await supabase
      .from('survey_locations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    // Check if sync is in progress (from system config)
    const { data: syncInProgress } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'sync_in_progress')
      .single()

    return {
      lastSyncTime: config?.config_value as string || null,
      pendingSyncCount: pendingCount || 0,
      totalSynced: totalSynced || 0,
      syncInProgress: syncInProgress?.config_value === 'true'
    }
  } catch (error) {
    console.error('Failed to get sync status:', error)
    return {
      lastSyncTime: null,
      pendingSyncCount: 0,
      totalSynced: 0,
      syncInProgress: false
    }
  }
}

/**
 * Schedule automatic sync
 * In production, this would be handled by a cron job or scheduled task
 */
export async function scheduleAutoSync(intervalMinutes: number = 60): Promise<void> {
  console.log(`Auto-sync scheduled every ${intervalMinutes} minutes`)

  // In production, implement with:
  // - Supabase Edge Functions with cron
  // - External scheduler service
  // - Server-side cron job
}

/**
 * Simulate national database API call
 * Replace with actual implementation
 */
async function simulateNationalDatabaseSync(survey: SurveyLocation): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100))

  // Simulate random failure (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('Simulated network error')
  }

  // In production, make actual API call:
  /*
  const response = await fetch('https://national-database-api.gov.vn/locations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      location_identifier: survey.location_identifier,
      latitude: survey.latitude,
      longitude: survey.longitude,
      address: survey.address,
      owner_name: survey.owner_name,
      parcel_code: survey.parcel_code,
      // ... other fields
    })
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }
  */
}

/**
 * Log sync operation to audit trail
 */
async function logSyncOperation(syncId: string, result: SyncResult): Promise<void> {
  const supabase = createClient()

  try {
    // Update last sync time in system config
    await supabase
      .from('system_config')
      .upsert({
        config_key: 'last_sync_time',
        config_value: new Date().toISOString(),
        description: 'Last national database sync timestamp'
      })

    // Log to audit_logs if there's a current user
    // In server-side context, you'd use service role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'data_sync',
        resource_type: 'survey_location',
        resource_id: syncId,
        metadata: {
          sync_id: syncId,
          synced_count: result.syncedCount,
          failed_count: result.failedCount,
          errors: result.errors
        },
        ip_address: null,
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
      })
    }
  } catch (error) {
    console.error('Failed to log sync operation:', error)
  }
}

/**
 * Retry failed syncs
 */
export async function retryFailedSyncs(surveyIds: string[]): Promise<SyncResult> {
  return await syncToNationalDatabase(surveyIds)
}

/**
 * Get sync history
 */
export async function getSyncHistory(limit: number = 50) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'data_sync')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch sync history:', error)
    return []
  }

  return data
}
