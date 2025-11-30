import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SurveysClient } from './surveys-client'

export const dynamic = 'force-dynamic'

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

  // Fetch surveys for this commune
  const { data: surveys } = await supabase
    .from('survey_locations')
    .select('*')
    .eq('ward_code', webUser.commune_code)
    .order('created_at', { ascending: false })

  return <SurveysClient initialSurveys={surveys || []} />
}
