/**
 * Entry Points Service
 * Handles fetching and managing entry points for survey locations
 */

import { createClient } from '@/lib/supabase/client'
import { EntryPoint, EntryPointRow, rowToEntryPoint } from '@/lib/types/entry-points'

/**
 * Get all entry points for a survey location
 */
export async function getEntryPoints(surveyLocationId: string): Promise<EntryPoint[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('survey_entry_points')
    .select('*')
    .eq('survey_location_id', surveyLocationId)
    .order('sequence_number', { ascending: true })

  if (error) {
    console.error('[EntryPointsService] Failed to fetch entry points:', error)
    return []
  }

  return (data || []).map((row: EntryPointRow) => rowToEntryPoint(row))
}

/**
 * Get entry points for multiple survey locations (batch fetch)
 */
export async function getEntryPointsBatch(
  surveyLocationIds: string[]
): Promise<Record<string, EntryPoint[]>> {
  if (surveyLocationIds.length === 0) return {}

  const supabase = createClient()

  const { data, error } = await supabase
    .from('survey_entry_points')
    .select('*')
    .in('survey_location_id', surveyLocationIds)
    .order('sequence_number', { ascending: true })

  if (error) {
    console.error('[EntryPointsService] Failed to batch fetch entry points:', error)
    return {}
  }

  // Group by survey_location_id
  const result: Record<string, EntryPoint[]> = {}
  for (const row of (data || []) as EntryPointRow[]) {
    const locationId = row.survey_location_id
    if (!result[locationId]) {
      result[locationId] = []
    }
    result[locationId].push(rowToEntryPoint(row))
  }

  return result
}

/**
 * Get entry point counts for multiple surveys
 */
export async function getEntryPointCounts(
  surveyLocationIds: string[]
): Promise<Record<string, number>> {
  if (surveyLocationIds.length === 0) return {}

  const supabase = createClient()

  const { data, error } = await supabase
    .from('survey_entry_points')
    .select('survey_location_id')
    .in('survey_location_id', surveyLocationIds)

  if (error) {
    console.error('[EntryPointsService] Failed to fetch entry point counts:', error)
    return {}
  }

  // Count by survey_location_id
  const counts: Record<string, number> = {}
  for (const row of data || []) {
    const locationId = row.survey_location_id
    counts[locationId] = (counts[locationId] || 0) + 1
  }

  return counts
}

/**
 * Get primary entry point for a survey location
 */
export async function getPrimaryEntryPoint(surveyLocationId: string): Promise<EntryPoint | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('survey_entry_points')
    .select('*')
    .eq('survey_location_id', surveyLocationId)
    .eq('is_primary', true)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is okay
      console.error('[EntryPointsService] Failed to fetch primary entry point:', error)
    }
    return null
  }

  return data ? rowToEntryPoint(data as EntryPointRow) : null
}

/**
 * Create a new entry point
 */
export async function createEntryPoint(
  surveyLocationId: string,
  entryPoint: Partial<EntryPoint>
): Promise<EntryPoint | null> {
  const supabase = createClient()

  const insertData = {
    survey_location_id: surveyLocationId,
    sequence_number: entryPoint.sequenceNumber || 1,
    latitude: entryPoint.latitude!,
    longitude: entryPoint.longitude!,
    elevation: entryPoint.elevation || null,
    house_number: entryPoint.houseNumber || null,
    street: entryPoint.street || null,
    address_full: entryPoint.addressFull || null,
    entry_type: entryPoint.entryType || 'main_gate',
    is_primary: entryPoint.isPrimary ?? false,
    facing_direction: entryPoint.facingDirection || null,
    notes: entryPoint.notes || null,
  }

  const { data, error } = await supabase
    .from('survey_entry_points')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('[EntryPointsService] Failed to create entry point:', error)
    return null
  }

  return data ? rowToEntryPoint(data as EntryPointRow) : null
}

/**
 * Update an entry point
 */
export async function updateEntryPoint(
  entryPointId: string,
  updates: Partial<EntryPoint>
): Promise<EntryPoint | null> {
  const supabase = createClient()

  const updateData: Record<string, any> = {}
  if (updates.sequenceNumber !== undefined) updateData.sequence_number = updates.sequenceNumber
  if (updates.latitude !== undefined) updateData.latitude = updates.latitude
  if (updates.longitude !== undefined) updateData.longitude = updates.longitude
  if (updates.elevation !== undefined) updateData.elevation = updates.elevation
  if (updates.houseNumber !== undefined) updateData.house_number = updates.houseNumber
  if (updates.street !== undefined) updateData.street = updates.street
  if (updates.addressFull !== undefined) updateData.address_full = updates.addressFull
  if (updates.entryType !== undefined) updateData.entry_type = updates.entryType
  if (updates.isPrimary !== undefined) updateData.is_primary = updates.isPrimary
  if (updates.facingDirection !== undefined) updateData.facing_direction = updates.facingDirection
  if (updates.notes !== undefined) updateData.notes = updates.notes

  const { data, error } = await supabase
    .from('survey_entry_points')
    .update(updateData)
    .eq('id', entryPointId)
    .select()
    .single()

  if (error) {
    console.error('[EntryPointsService] Failed to update entry point:', error)
    return null
  }

  return data ? rowToEntryPoint(data as EntryPointRow) : null
}

/**
 * Delete an entry point
 */
export async function deleteEntryPoint(entryPointId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('survey_entry_points')
    .delete()
    .eq('id', entryPointId)

  if (error) {
    console.error('[EntryPointsService] Failed to delete entry point:', error)
    return false
  }

  return true
}
