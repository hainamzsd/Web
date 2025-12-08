'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { PhotoUpload } from '@/components/survey/photo-upload'
import { ArrowLeft, Save, Send, Camera, MapPin, Search, LogIn } from 'lucide-react'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'
import { Database } from '@/lib/types/database'
import { toast } from 'sonner'
import { EntryPointsSection } from '@/components/survey/entry-points-section'
import { EntryPoint } from '@/lib/types/entry-points'
import { getEntryPoints } from '@/lib/services/entry-points-service'

const EnhancedSurveyMap = nextDynamic(
  () => import('@/components/map/enhanced-survey-map').then(mod => mod.EnhancedSurveyMap),
  {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Đang tải bản đồ...</div>
  }
)

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export default function SurveyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { webUser, user } = useAuth()
  const [survey, setSurvey] = useState<SurveyLocation | null>(null)
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [parcelCode, setParcelCode] = useState('')
  const [parcelSearchLoading, setParcelSearchLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchSurvey() {
      if (!params?.id) {
        console.log('No survey ID provided')
        setLoading(false)
        return
      }

      console.log('Fetching survey with ID:', params.id)


      try {
        const { data, error } = await supabase
          .from('survey_locations')
          .select('*')
          .eq('id', params.id as string)
          .abortSignal(abortController.signal)
          .single()


        if (error) {
          if (error.code === 'PGRST116') {
            console.log('Survey not found (PGRST116)')
            // Not found is not a critical error, just no data
          } else {
            throw error
          }
        }

        if (mounted) {
          console.log('Survey fetched successfully:', data)
          setSurvey(data)

          // Fetch entry points for this survey
          if (data?.id) {
            const entryPointsData = await getEntryPoints(data.id)
            if (mounted) {
              setEntryPoints(entryPointsData)
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted')
        } else {
          console.error('Error fetching survey:', error)
          if (mounted) {
            toast.error("Lỗi", {
              description: "Không thể tải thông tin khảo sát.",
            })
          }
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchSurvey()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [params?.id])

  const handleParcelSearch = async () => {
    if (!parcelCode || !survey) return
    setParcelSearchLoading(true)

    try {
      const { data, error } = await supabase
        .from('land_parcels')
        .select('*')
        .eq('parcel_code', parcelCode)
        .single()

      if (error) throw error

      if (data) {
        setSurvey({
          ...survey,
          parcel_code: data.parcel_code,
          land_area_m2: data.parcel_area_m2,
          owner_name: data.owner_name || survey.owner_name,
        })
        setSurvey({
          ...survey,
          parcel_code: data.parcel_code,
          land_area_m2: data.parcel_area_m2,
          owner_name: data.owner_name || survey.owner_name,
        })
        toast.success("Thành công", {
          description: "Đã tìm thấy thửa đất!",
        })
      } else {
        toast.error("Không tìm thấy", {
          description: "Không tìm thấy thửa đất với mã này.",
        })
      }
    } catch (error) {
      console.error('Error searching parcel:', error)
      toast.error("Lỗi", {
        description: "Lỗi khi tìm kiếm thửa đất!",
      })
    } finally {
      setParcelSearchLoading(false)
    }
  }

  const handleSave = async () => {
    if (!survey || !user) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('survey_locations')
        .update({
          location_name: survey.location_name,
          owner_name: survey.owner_name,
          owner_phone: survey.owner_phone,
          owner_id_number: survey.owner_id_number,
          notes: survey.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)

      if (error) throw error

      toast.success("Thành công", {
        description: "Đã lưu thay đổi!",
      })
    } catch (error) {
      console.error('Error saving survey:', error)
      toast.error("Lỗi", {
        description: "Lỗi khi lưu!",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!survey || !user) return
    setSaving(true)

    try {
      // Update status to reviewed
      const { error: updateError } = await supabase
        .from('survey_locations')
        .update({
          status: 'reviewed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)

      if (updateError) throw updateError

      // Add approval history
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          survey_location_id: survey.id,
          action: 'reviewed',
          actor_id: user.id,
          actor_role: webUser?.role || 'commune_officer',
          previous_status: survey.status,
          new_status: 'reviewed',
          notes: 'Submitted for supervisor review',
        })

      if (historyError) throw historyError

      toast.success("Thành công", {
        description: "Đã gửi để xem xét!",
      })
      router.push('/commune/surveys')
    } catch (error) {
      console.error('Error submitting survey:', error)
      toast.error("Lỗi", {
        description: "Lỗi khi gửi!",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-600">Không tìm thấy khảo sát</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/commune/surveys">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {survey.location_name || 'Chi tiết khảo sát'}
            </h1>
            <p className="text-gray-500 mt-1">
              ID: {survey.id.substring(0, 8)}
            </p>
          </div>
        </div>
        <StatusBadge status={survey.status} />
      </div>

      {/* Map Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Bản đồ vị trí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
            <EnhancedSurveyMap
              surveys={survey ? [survey] : []}
              center={survey?.latitude && survey?.longitude ? [survey.latitude, survey.longitude] : undefined}
              zoom={16}
              showHeatmap={false}
              showClustering={false}
              enableDrawing={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Parcel Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Gán thửa đất</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập mã thửa đất (Số tờ/Số thửa)..."
              value={parcelCode}
              onChange={(e) => setParcelCode(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2"
            />
            <Button
              onClick={handleParcelSearch}
              disabled={parcelSearchLoading || !parcelCode}
              variant="secondary"
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              {parcelSearchLoading ? 'Đang tìm...' : 'Tìm kiếm'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Mã thửa đất
              </label>
              <input
                type="text"
                value={survey?.parcel_code || ''}
                readOnly
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Diện tích (m²)
              </label>
              <input
                type="number"
                value={survey?.land_area_m2 || ''}
                onChange={(e) => setSurvey(survey ? { ...survey, land_area_m2: parseFloat(e.target.value) } : null)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin vị trí</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Tên vị trí
              </label>
              <input
                type="text"
                value={survey.location_name || ''}
                onChange={(e) => setSurvey({ ...survey, location_name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Địa chỉ
              </label>
              <input
                type="text"
                value={survey.address || ''}
                readOnly
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Vĩ độ
                </label>
                <input
                  type="text"
                  value={survey.latitude}
                  readOnly
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Kinh độ
                </label>
                <input
                  type="text"
                  value={survey.longitude}
                  readOnly
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin chủ sở hữu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Tên chủ sở hữu
              </label>
              <input
                type="text"
                value={survey.owner_name || ''}
                onChange={(e) => setSurvey({ ...survey, owner_name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Số CMND/CCCD
              </label>
              <input
                type="text"
                value={survey.owner_id_number || ''}
                onChange={(e) => setSurvey({ ...survey, owner_id_number: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Số điện thoại
              </label>
              <input
                type="text"
                value={survey.owner_phone || ''}
                onChange={(e) => setSurvey({ ...survey, owner_phone: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ghi chú</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={survey.notes || ''}
            onChange={(e) => setSurvey({ ...survey, notes: e.target.value })}
            rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="Thêm ghi chú..."
          />
        </CardContent>
      </Card>

      <Card className="shadow-lg border-2 border-blue-100">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            Ảnh khảo sát
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <PhotoUpload
            surveyId={survey.id}
            existingPhotos={survey.photos || []}
            onPhotosChange={(photos) => setSurvey({ ...survey, photos })}
            maxPhotos={10}
            disabled={survey.status === 'published' || survey.status === 'approved_central'}
          />
        </CardContent>
      </Card>

      {/* Entry Points Section */}
      <Card className="shadow-lg border-2 border-green-100">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-green-600" />
            Lối vào ({entryPoints.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <EntryPointsSection entryPoints={entryPoints} />
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          Lưu thay đổi
        </Button>

        {survey.status === 'pending' && (
          <Button
            onClick={handleSubmitForReview}
            disabled={saving}
            variant="default"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Gửi xem xét
          </Button>
        )}
      </div>
    </div>
  )
}
