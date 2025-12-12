export type PhaseStatus = 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected' | 'blocked'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'conditional'

export interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: string
  created_at: string
}

export interface Project {
  id: number
  name: string
  description: string
  current_phase: number
  status: string
  created_at: string
  completed_phases?: number
  total_phases?: number
}

export interface Phase {
  id: number
  project_id: number
  phase_number: number
  phase_name: string
  status: PhaseStatus
  data: Record<string, any>
  ai_confidence_score: number
  created_at: string
}

export interface Approval {
  id: number
  phase_id: number
  approver_id: number
  status: ApprovalStatus
  comments?: string
  created_at: string
  approved_at?: string
}

export interface AIQuery {
  project_id: number
  phase_id: number
  query: string
  context?: Record<string, any>
}

export interface AIResponse {
  response: string
  confidence_score: number
  alternatives?: string[]
  explanation?: string
}

