import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SurveysClient } from './surveys-client'

export const dynamic = 'force-dynamic'

// Helper to get entry point counts
async function getEntryPointCounts(supabase: any, surveyIds: string[]): Promise<Record<string, number>> {
  if (surveyIds.length === 0) return {}

  const { data, error } = await supabase
    .from('survey_entry_points')
    .select('survey_location_id')
    .in('survey_location_id', surveyIds)

  if (error) {
    console.error('Failed to fetch entry point counts:', error)
    return {}
  }

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    const id = row.survey_location_id
    counts[id] = (counts[id] || 0) + 1
  }
  return counts
}

export default async function SurveysPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get web user data
  const { data: webUser } = await supabase
    .from('web_users')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (!webUser) {
    redirect('/login')
  }

  // Fetch surveys for this commune - filter by ward_id
  if (!webUser.ward_id) {
    return <SurveysClient initialSurveys={[]} entryPointCounts={{}} />
  }

  const { data: surveys } = await supabase
    .from('survey_locations')
    .select('*')
    .eq('ward_id', webUser.ward_id)
    .order('created_at', { ascending: false })

  // Fetch entry point counts
  const surveyIds = (surveys || []).map(s => s.id)
  const entryPointCounts = await getEntryPointCounts(supabase, surveyIds)

  return <SurveysClient initialSurveys={surveys || []} entryPointCounts={entryPointCounts} />
}
