'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Database } from '@/lib/types/database'
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  Edit,
  MapPin,
  User,
  FileText,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

interface RecordProcessorProps {
  record: SurveyLocation
  userRole: 'commune_officer' | 'commune_supervisor' | 'central_admin' | 'system_admin'
  onApprove?: (record: SurveyLocation, notes?: string) => Promise<void>
  onReject?: (record: SurveyLocation, reason: string) => Promise<void>
  onEdit?: (record: SurveyLocation) => void
  onForward?: (record: SurveyLocation, notes?: string) => Promise<void>
}

/**
 * Record Processor Component
 * Handles display and processing of individual survey records
 */
export function RecordProcessor({
  record,
  userRole,
  onApprove,
  onReject,
  onEdit,
  onForward
}: RecordProcessorProps) {
  const [processing, setProcessing] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [forwardNotes, setForwardNotes] = useState('')

  const handleApprove = async () => {
    if (!onApprove) return
    setProcessing(true)
    try {
      await onApprove(record, forwardNotes)
      toast.success('Phê duyệt thành công', {
        description: `Đã phê duyệt khảo sát ${record.location_name || record.id}`
      })
    } catch (error) {
      toast.error('Lỗi', {
        description: 'Không thể phê duyệt khảo sát'
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!onReject || !rejectReason.trim()) {
      toast.error('Lỗi', {
        description: 'Vui lòng nhập lý do từ chối'
      })
      return
    }
    setProcessing(true)
    try {
      await onReject(record, rejectReason)
      toast.success('Đã từ chối', {
        description: `Đã từ chối khảo sát ${record.location_name || record.id}`
      })
      setShowRejectDialog(false)
      setRejectReason('')
    } catch (error) {
      toast.error('Lỗi', {
        description: 'Không thể từ chối khảo sát'
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleForward = async () => {
    if (!onForward) return
    setProcessing(true)
    try {
      await onForward(record, forwardNotes)
      toast.success('Đã chuyển tiếp', {
        description: `Đã chuyển khảo sát lên cấp trên`
      })
      setForwardNotes('')
    } catch (error) {
      toast.error('Lỗi', {
        description: 'Không thể chuyển tiếp khảo sát'
      })
    } finally {
      setProcessing(false)
    }
  }

  // Determine available actions based on role and status
  const canEdit = ['pending', 'rejected', 'reviewed'].includes(record.status)
  const canApprove =
    (userRole === 'commune_supervisor' && record.status === 'reviewed') ||
    (userRole === 'central_admin' && record.status === 'approved_commune')
  const canReject =
    (userRole === 'commune_supervisor' && record.status === 'reviewed') ||
    (userRole === 'central_admin' && record.status === 'approved_commune')
  const canForward =
    userRole === 'commune_officer' && record.status === 'pending'

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              {record.location_name || 'Chưa đặt tên'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              ID: {record.id.substring(0, 8)}...
            </p>
          </div>
          <StatusBadge status={record.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 font-medium">Địa chỉ</p>
            <p className="text-gray-900">{record.address || 'Chưa có'}</p>
          </div>
          <div>
            <p className="text-gray-600 font-medium">Tọa độ</p>
            <p className="text-gray-900">
              {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 font-medium">Tỉnh/Huyện/Xã</p>
            <p className="text-gray-900">
              {record.province_code}/{record.district_code}/{record.ward_code}
            </p>
          </div>
          <div>
            <p className="text-gray-600 font-medium">Loại đối tượng</p>
            <p className="text-gray-900">{record.object_type || 'Chưa xác định'}</p>
          </div>
        </div>

        {/* Owner Information */}
        {record.representative_name && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-600" />
              <p className="text-gray-600 font-medium">Thông tin chủ sở hữu</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Tên</p>
                <p className="text-gray-900">{record.representative_name}</p>
              </div>
              {record.representative_phone && (
                <div>
                  <p className="text-gray-600">Số điện thoại</p>
                  <p className="text-gray-900">{record.representative_phone}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Land Parcel Information */}
        {record.parcel_code && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <p className="text-gray-600 font-medium">Thông tin thửa đất</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Mã thửa</p>
                <p className="text-gray-900">{record.parcel_code}</p>
              </div>
              {record.land_area_m2 && (
                <div>
                  <p className="text-gray-600">Diện tích</p>
                  <p className="text-gray-900">{record.land_area_m2} m²</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {record.notes && (
          <div className="border-t pt-4">
            <p className="text-gray-600 font-medium text-sm mb-1">Ghi chú</p>
            <p className="text-gray-900 text-sm">{record.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t pt-4 flex flex-wrap gap-2">
          {canEdit && onEdit && (
            <Button
              onClick={() => onEdit(record)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Chỉnh sửa
            </Button>
          )}

          {canForward && onForward && (
            <div className="flex-1 flex gap-2">
              <Button
                onClick={handleForward}
                disabled={processing}
                variant="default"
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <ArrowRight className="h-4 w-4" />
                Gửi xem xét
              </Button>
            </div>
          )}

          {canApprove && onApprove && (
            <Button
              onClick={handleApprove}
              disabled={processing}
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              Phê duyệt
            </Button>
          )}

          {canReject && onReject && (
            <Button
              onClick={() => setShowRejectDialog(true)}
              disabled={processing}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Từ chối
            </Button>
          )}
        </div>

        {/* Reject Dialog */}
        {showRejectDialog && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-gray-900 font-medium">Lý do từ chối</p>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nhập lý do từ chối khảo sát này..."
            />
            <div className="flex gap-2 mt-2">
              <Button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                variant="destructive"
                size="sm"
              >
                Xác nhận từ chối
              </Button>
              <Button
                onClick={() => {
                  setShowRejectDialog(false)
                  setRejectReason('')
                }}
                variant="outline"
                size="sm"
              >
                Hủy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
