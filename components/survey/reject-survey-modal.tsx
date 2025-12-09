'use client'

import { useState } from 'react'
import { XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Predefined rejection reasons in Vietnamese
export const REJECTION_REASONS = [
  {
    id: 'incomplete_info',
    label: 'Thông tin không đầy đủ',
    description: 'Thiếu thông tin cần thiết như tên chủ sở hữu, địa chỉ, hoặc số CMND/CCCD'
  },
  {
    id: 'incorrect_location',
    label: 'Vị trí không chính xác',
    description: 'Tọa độ GPS hoặc địa chỉ không khớp với thực tế'
  },
  {
    id: 'poor_photo_quality',
    label: 'Ảnh chất lượng kém',
    description: 'Ảnh mờ, thiếu ánh sáng, hoặc không thể hiện rõ đối tượng khảo sát'
  },
  {
    id: 'missing_photos',
    label: 'Thiếu ảnh khảo sát',
    description: 'Cần thêm ảnh từ các góc độ khác nhau hoặc ảnh chi tiết'
  },
  {
    id: 'duplicate_survey',
    label: 'Khảo sát trùng lặp',
    description: 'Đối tượng này đã được khảo sát trước đó'
  },
  {
    id: 'invalid_boundary',
    label: 'Ranh giới không hợp lệ',
    description: 'Polygon ranh giới không chính xác hoặc không phù hợp với thực tế'
  },
  {
    id: 'wrong_object_type',
    label: 'Phân loại đối tượng sai',
    description: 'Loại đối tượng hoặc mục đích sử dụng đất không đúng'
  },
  {
    id: 'missing_entry_points',
    label: 'Thiếu thông tin lối vào',
    description: 'Chưa có thông tin về các lối vào của đối tượng'
  },
  {
    id: 'owner_verification_failed',
    label: 'Xác minh chủ sở hữu thất bại',
    description: 'Không thể xác minh thông tin chủ sở hữu'
  },
  {
    id: 'other',
    label: 'Lý do khác',
    description: 'Nhập lý do cụ thể bên dưới'
  }
]

export interface RejectionData {
  reasonId: string
  reasonLabel: string
  customReason?: string
  notes: string
}

interface RejectSurveyModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: RejectionData) => Promise<void>
  surveyName: string
  isLoading?: boolean
}

export function RejectSurveyModal({
  isOpen,
  onClose,
  onConfirm,
  surveyName,
  isLoading = false
}: RejectSurveyModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [customReason, setCustomReason] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  if (!isOpen) return null

  const selectedReasonData = REJECTION_REASONS.find(r => r.id === selectedReason)
  const isOtherReason = selectedReason === 'other'
  const canSubmit = selectedReason && (!isOtherReason || customReason.trim())

  const handleSubmit = async () => {
    if (!canSubmit) return

    const data: RejectionData = {
      reasonId: selectedReason,
      reasonLabel: selectedReasonData?.label || 'Lý do khác',
      customReason: isOtherReason ? customReason : undefined,
      notes: additionalNotes
    }

    await onConfirm(data)
  }

  const handleClose = () => {
    setSelectedReason('')
    setCustomReason('')
    setAdditionalNotes('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="bg-red-50 border-b border-red-100">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <XCircle className="h-5 w-5" />
            Từ chối khảo sát
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6 overflow-y-auto flex-1">
          {/* Survey Name */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Khảo sát:</p>
            <p className="font-medium text-gray-900">{surveyName || 'Chưa đặt tên'}</p>
          </div>

          {/* Warning */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 font-medium">Lưu ý quan trọng</p>
              <p className="text-sm text-amber-700 mt-1">
                Sau khi từ chối, khảo sát sẽ được trả về cho cán bộ khảo sát để chỉnh sửa.
                Lý do từ chối sẽ được hiển thị trong lịch sử và trên ứng dụng di động.
              </p>
            </div>
          </div>

          {/* Rejection Reasons */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => setSelectedReason(reason.id)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    selectedReason === reason.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <p className={`font-medium text-sm ${
                    selectedReason === reason.id ? 'text-red-700' : 'text-gray-900'
                  }`}>
                    {reason.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{reason.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Reason (if "other" selected) */}
          {isOtherReason && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do cụ thể <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú bổ sung (tùy chọn)
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
              placeholder="Hướng dẫn cụ thể để cán bộ khảo sát sửa chữa..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </CardContent>

        {/* Actions */}
        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            {isLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
