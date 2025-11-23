/**
 * Workflow Service
 * Manages the approval workflow for survey locations
 */

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']
type ApprovalHistory = Database['public']['Tables']['approval_history']['Insert']

export type WorkflowAction = 'submit' | 'review' | 'approve' | 'reject' | 'forward'

export interface WorkflowResult {
  success: boolean
  message: string
  newStatus?: string
  error?: any
}

/**
 * Workflow state transitions
 */
const WORKFLOW_TRANSITIONS = {
  pending: {
    submit: 'reviewed',
    reject: 'rejected'
  },
  reviewed: {
    approve: 'approved_commune',
    reject: 'rejected'
  },
  approved_commune: {
    approve: 'approved_central',
    reject: 'rejected'
  },
  rejected: {
    submit: 'pending'
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
      case 'submit':
      case 'forward':
        newStatus = 'reviewed'
        break
      case 'review':
        newStatus = 'reviewed'
        break
      case 'approve':
        if (currentStatus === 'reviewed') {
          newStatus = 'approved_commune'
        } else if (currentStatus === 'approved_commune') {
          newStatus = 'approved_central'
        } else {
          return {
            success: false,
            message: 'Không thể phê duyệt từ trạng thái hiện tại'
          }
        }
        break
      case 'reject':
        newStatus = 'rejected'
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
      action: action === 'forward' ? 'reviewed' : action as any,
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
    case 'submit':
    case 'forward':
      return 'Đã gửi khảo sát để xem xét'
    case 'review':
      return 'Đã xem xét khảo sát'
    case 'approve':
      if (newStatus === 'approved_commune') {
        return 'Đã phê duyệt ở cấp xã'
      } else if (newStatus === 'approved_central') {
        return 'Đã phê duyệt ở cấp trung ương'
      }
      return 'Đã phê duyệt khảo sát'
    case 'reject':
      return 'Đã từ chối khảo sát'
    default:
      return 'Đã thực hiện hành động'
  }
}

/**
 * Validate if user can perform action on survey
 */
export function canPerformAction(
  survey: SurveyLocation,
  action: WorkflowAction,
  userRole: string,
  userCommuneCode?: string | null
): { allowed: boolean; reason?: string } {
  // Check commune jurisdiction for commune-level roles
  if (
    (userRole === 'commune_officer' || userRole === 'commune_supervisor') &&
    survey.ward_code !== userCommuneCode
  ) {
    return {
      allowed: false,
      reason: 'Khảo sát không thuộc quyền hạn của bạn'
    }
  }

  // Check action permissions based on role and status
  const status = survey.status

  switch (userRole) {
    case 'commune_officer':
      if (action === 'forward' && status === 'pending') {
        return { allowed: true }
      }
      if (action === 'submit' && (status === 'pending' || status === 'rejected')) {
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: 'Bạn không có quyền thực hiện hành động này'
      }

    case 'commune_supervisor':
      if ((action === 'approve' || action === 'reject') && status === 'reviewed') {
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: 'Bạn không có quyền thực hiện hành động này'
      }

    case 'central_admin':
    case 'system_admin':
      if (
        (action === 'approve' || action === 'reject') &&
        status === 'approved_commune'
      ) {
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: 'Chỉ có thể phê duyệt khảo sát đã được phê duyệt cấp xã'
      }

    default:
      return {
        allowed: false,
        reason: 'Vai trò không hợp lệ'
      }
  }
}
