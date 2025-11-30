import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApprovalsClient } from './approvals-client'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
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

  // Fetch surveys awaiting central approval
  const { data: surveys } = await supabase
    .from('survey_locations')
    .select('*')
    .eq('status', 'approved_commune')
    .order('updated_at', { ascending: false })

  return <ApprovalsClient initialSurveys={surveys || []} />
}
