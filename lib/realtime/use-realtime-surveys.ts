'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

interface UseRealtimeSurveysOptions {
  wardCode?: string | null
  enabled?: boolean
}

export function useRealtimeSurveys(options: UseRealtimeSurveysOptions = {}) {
  const { wardCode, enabled = true } = options
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    async function fetchSurveys() {
      try {
        let query = supabase.from('survey_locations').select('*')

        if (wardCode) {
          query = query.eq('ward_code', wardCode)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error
        setSurveys(data || [])
      } catch (error) {
        console.error('Error fetching surveys:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSurveys()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('survey_locations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'survey_locations',
          filter: wardCode ? `ward_code=eq.${wardCode}` : undefined,
        },
        (payload) => {


          if (payload.eventType === 'INSERT') {
            setSurveys((prev) => [payload.new as SurveyLocation, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setSurveys((prev) =>
              prev.map((survey) =>
                survey.id === payload.new.id ? (payload.new as SurveyLocation) : survey
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setSurveys((prev) => prev.filter((survey) => survey.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wardCode, enabled])

  return { surveys, loading, setSurveys }
}
