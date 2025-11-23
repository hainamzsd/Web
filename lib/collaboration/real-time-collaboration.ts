// Real-Time Collaboration System
// Multi-user editing, presence tracking, and conflict resolution

import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface UserPresence {
  userId: string
  userName: string
  userRole: string
  currentPage: string
  currentSurveyId?: string
  isEditing: boolean
  lastSeen: string
  cursorPosition?: { x: number; y: number }
  selectedFeatures?: string[]
}

export interface CollaborativeEdit {
  id: string
  userId: string
  userName: string
  surveyId: string
  field: string
  oldValue: any
  newValue: any
  timestamp: string
  status: 'pending' | 'applied' | 'conflicted' | 'rejected'
  conflictWith?: string
}

export interface EditLock {
  surveyId: string
  userId: string
  userName: string
  lockedAt: string
  expiresAt: string
  fields: string[]
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  userRole: string
  message: string
  mentions?: string[]
  attachments?: string[]
  timestamp: string
  surveyId?: string
  replyTo?: string
}

/**
 * Real-Time Collaboration Manager
 * Handles presence, locking, conflict resolution, and chat
 */
export class CollaborationManager {
  private supabase = createClient()
  private channel: RealtimeChannel | null = null
  private presence: Map<string, UserPresence> = new Map()
  private locks: Map<string, EditLock> = new Map()
  private pendingEdits: Map<string, CollaborativeEdit[]> = new Map()
  private userId: string = ''
  private userName: string = ''

  // Callbacks
  private onPresenceUpdate?: (presence: Map<string, UserPresence>) => void
  private onEditReceived?: (edit: CollaborativeEdit) => void
  private onLockAcquired?: (lock: EditLock) => void
  private onLockReleased?: (surveyId: string) => void
  private onChatMessage?: (message: ChatMessage) => void

  /**
   * Initialize collaboration for a room (e.g., specific commune or survey)
   */
  async initialize(
    roomId: string,
    userId: string,
    userName: string,
    callbacks: {
      onPresenceUpdate?: (presence: Map<string, UserPresence>) => void
      onEditReceived?: (edit: CollaborativeEdit) => void
      onLockAcquired?: (lock: EditLock) => void
      onLockReleased?: (surveyId: string) => void
      onChatMessage?: (message: ChatMessage) => void
    }
  ) {
    this.userId = userId
    this.userName = userName
    this.onPresenceUpdate = callbacks.onPresenceUpdate
    this.onEditReceived = callbacks.onEditReceived
    this.onLockAcquired = callbacks.onLockAcquired
    this.onLockReleased = callbacks.onLockReleased
    this.onChatMessage = callbacks.onChatMessage

    // Create channel for this room
    this.channel = this.supabase.channel(`collaboration:${roomId}`, {
      config: {
        presence: {
          key: userId
        }
      }
    })

    // Track presence
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState()
        if (state) {
          this.updatePresence(state)
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {

      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {

        this.presence.delete(key)
        this.onPresenceUpdate?.(this.presence)
      })

    // Listen for collaborative edits
    this.channel.on('broadcast', { event: 'edit' }, ({ payload }) => {
      this.handleIncomingEdit(payload as CollaborativeEdit)
    })

    // Listen for lock events
    this.channel.on('broadcast', { event: 'lock' }, ({ payload }) => {
      this.handleLockEvent(payload)
    })

    // Listen for chat messages
    this.channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      this.handleChatMessage(payload as ChatMessage)
    })

    // Subscribe and announce presence
    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel?.track({
          userId,
          userName,
          currentPage: window.location.pathname,
          isEditing: false,
          lastSeen: new Date().toISOString()
        })
      }
    })
  }

  /**
   * Update cursor position for real-time tracking
   */
  async updateCursor(x: number, y: number) {
    await this.channel?.track({
      userId: this.userId,
      userName: this.userName,
      currentPage: window.location.pathname,
      isEditing: true,
      lastSeen: new Date().toISOString(),
      cursorPosition: { x, y }
    })
  }

  /**
   * Update current editing state
   */
  async updateEditingState(surveyId?: string, isEditing: boolean = true) {
    await this.channel?.track({
      userId: this.userId,
      userName: this.userName,
      currentPage: window.location.pathname,
      currentSurveyId: surveyId,
      isEditing,
      lastSeen: new Date().toISOString()
    })
  }

  /**
   * Broadcast an edit to all collaborators
   */
  async broadcastEdit(edit: Omit<CollaborativeEdit, 'id' | 'userId' | 'userName' | 'timestamp' | 'status'>) {
    const fullEdit: CollaborativeEdit = {
      id: crypto.randomUUID(),
      userId: this.userId,
      userName: this.userName,
      timestamp: new Date().toISOString(),
      status: 'pending',
      ...edit
    }

    // Send to all collaborators
    await this.channel?.send({
      type: 'broadcast',
      event: 'edit',
      payload: fullEdit
    })

    // Apply locally
    await this.applyEdit(fullEdit)
  }

  /**
   * Request lock on a survey for editing
   */
  async requestLock(surveyId: string, fields: string[] = ['*']): Promise<boolean> {
    // Check if already locked
    const existingLock = this.locks.get(surveyId)
    if (existingLock && existingLock.userId !== this.userId) {
      const expiresAt = new Date(existingLock.expiresAt)
      if (expiresAt > new Date()) {

        return false
      }
    }

    // Acquire lock
    const lock: EditLock = {
      surveyId,
      userId: this.userId,
      userName: this.userName,
      lockedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      fields
    }

    this.locks.set(surveyId, lock)

    // Broadcast lock
    await this.channel?.send({
      type: 'broadcast',
      event: 'lock',
      payload: { action: 'acquire', lock }
    })

    this.onLockAcquired?.(lock)
    return true
  }

  /**
   * Release lock on a survey
   */
  async releaseLock(surveyId: string) {
    const lock = this.locks.get(surveyId)
    if (lock && lock.userId === this.userId) {
      this.locks.delete(surveyId)

      await this.channel?.send({
        type: 'broadcast',
        event: 'lock',
        payload: { action: 'release', surveyId }
      })

      this.onLockReleased?.(surveyId)
    }
  }

  /**
   * Send chat message
   */
  async sendMessage(message: string, surveyId?: string, replyTo?: string, mentions?: string[]) {
    const chatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      userId: this.userId,
      userName: this.userName,
      userRole: 'commune_officer', // Get from context
      message,
      timestamp: new Date().toISOString(),
      surveyId,
      replyTo,
      mentions
    }

    await this.channel?.send({
      type: 'broadcast',
      event: 'chat',
      payload: chatMessage
    })

    // Save to database
    await this.supabase.from('chat_messages').insert({
      id: chatMessage.id,
      user_id: this.userId,
      message: chatMessage.message,
      survey_id: surveyId,
      reply_to: replyTo,
      mentions: mentions
    })

    return chatMessage
  }

  /**
   * Get who is currently editing a survey
   */
  getActiveEditors(surveyId: string): UserPresence[] {
    return Array.from(this.presence.values()).filter(
      p => p.currentSurveyId === surveyId && p.isEditing
    )
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): UserPresence[] {
    return Array.from(this.presence.values())
  }

  /**
   * Check if a survey is locked
   */
  isLocked(surveyId: string): EditLock | null {
    const lock = this.locks.get(surveyId)
    if (!lock) return null

    // Check expiry
    const expiresAt = new Date(lock.expiresAt)
    if (expiresAt <= new Date()) {
      this.locks.delete(surveyId)
      return null
    }

    return lock
  }

  /**
   * Disconnect from collaboration
   */
  async disconnect() {
    // Release all locks
    for (const [surveyId, lock] of this.locks.entries()) {
      if (lock.userId === this.userId) {
        await this.releaseLock(surveyId)
      }
    }

    // Unsubscribe from channel
    await this.channel?.unsubscribe()
    this.channel = null
    this.presence.clear()
    this.locks.clear()
  }

  // Private methods

  private updatePresence(state: Record<string, any>) {
    this.presence.clear()
    for (const [userId, presences] of Object.entries(state)) {
      const presence = (presences as any[])[0]
      if (presence) {
        this.presence.set(userId, presence as UserPresence)
      }
    }
    this.onPresenceUpdate?.(this.presence)
  }

  private handleIncomingEdit(edit: CollaborativeEdit) {
    // Check for conflicts
    const conflicts = this.detectConflicts(edit)
    if (conflicts.length > 0) {
      edit.status = 'conflicted'
      edit.conflictWith = conflicts[0].id
      // Queue for manual resolution
      this.queueConflict(edit)
    } else {
      this.applyEdit(edit)
    }

    this.onEditReceived?.(edit)
  }

  private detectConflicts(incomingEdit: CollaborativeEdit): CollaborativeEdit[] {
    const pending = this.pendingEdits.get(incomingEdit.surveyId) || []
    return pending.filter(
      e =>
        e.field === incomingEdit.field &&
        e.userId !== incomingEdit.userId &&
        new Date(e.timestamp) > new Date(incomingEdit.timestamp)
    )
  }

  private async applyEdit(edit: CollaborativeEdit) {
    // Apply to database
    await this.supabase
      .from('survey_locations')
      .update({ [edit.field]: edit.newValue })
      .eq('id', edit.surveyId)

    edit.status = 'applied'
  }

  private queueConflict(edit: CollaborativeEdit) {
    const surveyEdits = this.pendingEdits.get(edit.surveyId) || []
    surveyEdits.push(edit)
    this.pendingEdits.set(edit.surveyId, surveyEdits)
  }

  private handleLockEvent(payload: any) {
    if (payload.action === 'acquire') {
      this.locks.set(payload.lock.surveyId, payload.lock)
      if (payload.lock.userId !== this.userId) {
        this.onLockAcquired?.(payload.lock)
      }
    } else if (payload.action === 'release') {
      this.locks.delete(payload.surveyId)
      this.onLockReleased?.(payload.surveyId)
    }
  }

  private handleChatMessage(message: ChatMessage) {
    this.onChatMessage?.(message)
  }
}

// Export singleton
export const collaborationManager = new CollaborationManager()
