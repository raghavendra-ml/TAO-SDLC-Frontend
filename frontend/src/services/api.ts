import axios from 'axios'
import { Project, Phase, Approval, AIQuery, AIResponse } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Projects
export const getProjects = () => api.get<Project[]>('/projects/')
export const getProject = (id: number) => api.get<Project>(`/projects/${id}`)
export const createProject = (data: { name: string; description: string }) => 
  api.post<Project>('/projects/', data)
export const deleteProject = (id: number) => api.delete(`/projects/${id}`)

// Phases
export const getProjectPhases = (projectId: number) => 
  api.get<Phase[]>(`/phases/project/${projectId}`)
export const getPhase = (phaseId: number) => api.get<Phase>(`/phases/${phaseId}`)
export const updatePhase = (phaseId: number, data: Partial<Phase>) => 
  api.put<Phase>(`/phases/${phaseId}`, data)

// Approvals
export const getPhaseApprovals = (phaseId: number) => 
  api.get<Approval[]>(`/approvals/phase/${phaseId}`)
export const getPendingApprovals = (userId: number) => 
  api.get<Approval[]>(`/approvals/pending/${userId}`)
export const updateApproval = (approvalId: number, data: { status: string; comments?: string }) => 
  api.put<Approval>(`/approvals/${approvalId}`, data)

// AI Copilot
export const queryAI = (data: AIQuery) => api.post<AIResponse>('/ai/query', data)
export const generateContent = (phaseId: number, contentType: string, additionalData?: any) => {
  const payload = { content_type: contentType, ...additionalData }
  console.log('🔴 [API.TS] Sending request to /ai/generate/' + phaseId)
  console.log('🔴 [API.TS] Payload:', payload)
  console.log('🔴 [API.TS] system_components in payload:', payload.system_components)
  console.log('🔴 [API.TS] system_components count:', payload.system_components?.length || 0)
  return api.post(`/ai/generate/${phaseId}`, payload)
}
export const analyzeRisks = (phaseId: number) => 
  api.post(`/ai/analyze-risks/${phaseId}`)
export const chatWithAI = (data: {
  query: string
  context_type: string
  project_id?: number
  phase_id?: number
  // Optional rich context for better answers
  version_context?: any
}) => api.post<AIResponse>('/chat/query', data)

// Phase 5 Persistence - Get Persisted Deliverables
export const getPersistedDeliverable = (projectId: number, storyId: string) => 
  api.get(`/ai/phase5/deliverable/${projectId}/${storyId}`)

export const getPersistedDeliverablesBulk = (projectId: number, storyIds: string[]) => 
  api.post('/ai/phase5/deliverables/bulk', {
    project_id: projectId,
    story_ids: storyIds
  })

// Authentication
export const login = (username: string, password: string) => {
  const formData = new FormData()
  formData.append('username', username)
  formData.append('password', password)
  return api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const signup = (data: {
  username: string
  email: string
  full_name: string
  password: string
  role?: string
}) => api.post('/auth/signup', data)

export const demoLogin = () => api.post('/auth/demo')

export const getCurrentUser = () => api.get('/auth/me')

export const logout = () => api.post('/auth/logout')

// JIRA Integration
export const exportToJira = (phaseId: number, jiraConfig: {
  url: string
  email: string
  api_token: string
  project_key: string
}) => api.post('/integrations/jira/export', {
  phase_id: phaseId,
  jira_config: jiraConfig
})

export const getJiraStats = (jiraConfig: {
  url: string
  email: string
  api_token: string
  project_key?: string
}) => api.post('/integrations/jira/stats', jiraConfig)

export const getJiraProjects = (jiraConfig: {
  url: string
  email: string
  api_token: string
  project_key?: string
}) => api.post('/integrations/jira/projects', jiraConfig)

export default api

