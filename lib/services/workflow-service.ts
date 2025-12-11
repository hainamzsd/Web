/**
 * Workflow Service
 * Manages the approval workflow for survey locations
 */

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']
type ApprovalHistory = Database['public']['Tables']['approval_history']['Insert']

export type WorkflowAction = 'approve' | 'reject' | 'forward'

export interface WorkflowResult {
  success: boolean
  message: string
  newStatus?: string
  error?: any
}

/**
 * Workflow state transitions
 *
 * NEW FLOW:
 * - App (Xã) creates survey → pending
 * - Province (Tỉnh) approves → approved_province
 * - Central (TW) approves → approved_central (after land parcel check)
 *
 * BACKWARD COMPATIBILITY (old statuses still supported):
 * - reviewed → approved_province (Tỉnh can approve old 'reviewed' status)
 * - approved_commune → approved_central (TW can approve old 'approved_commune' status)
 */
const WORKFLOW_TRANSITIONS = {
  pending: {
    approve: 'approved_province',  // Province approves
    reject: 'rejected',
    forward: 'reviewed'            // Commune forwards to Province (marked as reviewed)
  },
  reviewed: {
    approve: 'approved_province',  // Province approves (backward compatibility)
    reject: 'rejected'
  },
  approved_province: {
    approve: 'approved_central',   // Central approves (after land parcel verification)
    reject: 'rejected'
  },
  approved_commune: {
    approve: 'approved_central',   // Central approves (backward compatibility)
    reject: 'rejected'
  },
  rejected: {
    // Rejected surveys must be resubmitted from App
  }
}

/**
 * Execute workflow action on a survey
 */
export async function executeWorkflowAction(
  surveyId: string,
  action: WorkflowAction,
  actorId: string,
  actorRole: string,
  notes?: string
): Promise<WorkflowResult> {
  const supabase = createClient()

  try {
    // Fetch current survey
    const { data: survey, error: fetchError } = await supabase
      .from('survey_locations')
      .select('*')
      .eq('id', surveyId)
      .single()

    if (fetchError || !survey) {
      return {
        success: false,
        message: 'Không tìm thấy khảo sát',
        error: fetchError
      }
    }

    // Determine new status based on action
    let newStatus: string
    const currentStatus = survey.status

    switch (action) {
      case 'approve':
        if (currentStatus === 'pending' || currentStatus === 'reviewed') {
          // Province officer approves pending/reviewed survey
          newStatus = 'approved_province'
        } else if (currentStatus === 'approved_province' || currentStatus === 'approved_commune') {
          // Central admin approves after land parcel verification
          newStatus = 'approved_central'
        } else {
          return {
            success: false,
            message: 'Không thể phê duyệt từ trạng thái hiện tại'
          }
        }
        break
      case 'reject':
        if (currentStatus === 'pending' || currentStatus === 'reviewed' ||
          currentStatus === 'approved_province' || currentStatus === 'approved_commune') {
          newStatus = 'rejected'
        } else {
          return {
            success: false,
            message: 'Không thể từ chối từ trạng thái hiện tại'
          }
        }
        break
      case 'forward':
        if (currentStatus === 'pending') {
          // Commune officer forwards to province
          newStatus = 'reviewed'
        } else {
          return {
            success: false,
            message: 'Chỉ có thể chuyển tiếp hồ sơ đang chờ xử lý'
          }
        }
        break
      default:
        return {
          success: false,
          message: 'Hành động không hợp lệ'
        }
    }

    // Update survey status
    const { error: updateError } = await supabase
      .from('survey_locations')
      .update({
        status: newStatus as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', surveyId)

    if (updateError) {
      return {
        success: false,
        message: 'Không thể cập nhật trạng thái',
        error: updateError
      }
    }

    // Log approval history
    const historyRecord: ApprovalHistory = {
      survey_location_id: surveyId,
      action: action as any,
      actor_id: actorId,
      actor_role: actorRole,
      previous_status: currentStatus,
      new_status: newStatus,
      notes: notes || null
    }

    const { error: historyError } = await supabase
      .from('approval_history')
      .insert(historyRecord)

    if (historyError) {
      console.error('Failed to log approval history:', historyError)
      // Don't fail the whole operation if history logging fails
    }

    // Log audit trail
    await logAuditTrail(
      actorId,
      'workflow_action',
      {
        survey_id: surveyId,
        action,
        previous_status: currentStatus,
        new_status: newStatus,
        notes
      }
    )

    return {
      success: true,
      message: getSuccessMessage(action, newStatus),
      newStatus
    }
  } catch (error) {
    console.error('Workflow action error:', error)
    return {
      success: false,
      message: 'Đã xảy ra lỗi khi thực hiện hành động',
      error
    }
  }
}

/**
 * Batch approve multiple surveys
 */
export async function batchApprove(
  surveyIds: string[],
  actorId: string,
  actorRole: string,
  notes?: string
): Promise<{ successful: number; failed: number; errors: any[] }> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as any[]
  }

  for (const surveyId of surveyIds) {
    const result = await executeWorkflowAction(
      surveyId,
      'approve',
      actorId,
      actorRole,
      notes
    )

    if (result.success) {
      results.successful++
    } else {
      results.failed++
      results.errors.push({
        surveyId,
        error: result.message
      })
    }
  }

  return results
}

/**
 * Get workflow history for a survey
 */
export async function getWorkflowHistory(surveyId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('approval_history')
    .select('*')
    .eq('survey_location_id', surveyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch workflow history:', error)
    return []
  }

  return data
}

/**
 * Log audit trail
 */
async function logAuditTrail(
  userId: string,
  action: string,
  metadata: any
): Promise<void> {
  const supabase = createClient()

  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: 'survey_location',
      resource_id: metadata.survey_id,
      metadata,
      ip_address: null, // Could be captured from request headers
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
    })
  } catch (error) {
    console.error('Failed to log audit trail:', error)
  }
}

/**
 * Get success message for action
 */
function getSuccessMessage(action: WorkflowAction, newStatus: string): string {
  switch (action) {
    case 'approve':
      if (newStatus === 'approved_province') {
        return 'Đã phê duyệt ở cấp tỉnh'
      } else if (newStatus === 'approved_central') {
        return 'Đã phê duyệt ở cấp trung ương'
      }
      return 'Đã phê duyệt khảo sát'
    case 'reject':
      return 'Đã từ chối khảo sát'
    case 'forward':
      return 'Đã chuyển hồ sơ lên cấp trên'
    default:
      return 'Đã thực hiện hành động'
  }
}

/**
 * Validate if user can perform action on survey
 *
 * WORKFLOW:
 * - commune_officer: View only (stats + map) - Xã chỉ xem
 * - commune_supervisor: Approve/reject pending surveys (Tỉnh phê duyệt)
 * - central_admin: Approve/reject approved_province surveys (TW - after land parcel check)
 * - system_admin: Full access
 */
export function canPerformAction(
  survey: SurveyLocation,
  action: WorkflowAction,
  userRole: string,
  userProvinceCode?: string | null
): { allowed: boolean; reason?: string } {
  const status = survey.status

  switch (userRole) {
    case 'commune_officer':
      // Commune officers can view and forward pending surveys
      if (action === 'forward' && status === 'pending') {
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: 'Cán bộ xã chỉ có quyền xem và chuyển tiếp hồ sơ mới'
      }

    case 'commune_supervisor':
      // Province (Tỉnh) can approve/reject pending/reviewed surveys in their province
      if (survey.province_code !== userProvinceCode) {
        return {
          allowed: false,
          reason: 'Khảo sát không thuộc tỉnh của bạn'
        }
      }
      // Support both new 'pending' and old 'reviewed' status
      if ((action === 'approve' || action === 'reject') && (status === 'pending' || status === 'reviewed')) {
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: 'Chỉ có thể phê duyệt khảo sát đang chờ xử lý'
      }

    case 'central_admin':
    case 'system_admin':
      // Central can approve/reject surveys already approved by province
      // Support both new 'approved_province' and old 'approved_commune' status
      if (
        (action === 'approve' || action === 'reject') &&
        (status === 'approved_province' || status === 'approved_commune')
      ) {
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: 'Chỉ có thể phê duyệt khảo sát đã được tỉnh phê duyệt'
      }

    default:
      return {
        allowed: false,
        reason: 'Vai trò không hợp lệ'
      }
  }
}
