import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProcessClient } from './process-client'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export const dynamic = 'force-dynamic'

export default async function ProcessRecordsPage() {
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

  // Fetch initial surveys (default to pending)
  const { data: surveys } = await supabase
    .from('survey_locations')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Fetch stats
  const statuses = ['pending', 'reviewed', 'approved_commune', 'rejected']
  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabase
        .from('survey_locations')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
      return count || 0
    })
  )

  const initialStats = {
    pending: counts[0],
    reviewed: counts[1],
    approved: counts[2],
    rejected: counts[3]
  }

  return (
    <ProcessClient
      initialSurveys={surveys || []}
      initialStats={initialStats}
    />
  )
}
