import axios from 'axios'
import { Project, Phase, Approval, AIQuery, AIResponse } from '../types'

// Helper to determine API URL - supports both local dev and production
const getApiBaseUrl = () => {
  const viteApiUrl = import.meta.env.VITE_API_URL
  
  // If VITE_API_URL is set (ngrok URL for production), use it
  if (viteApiUrl && viteApiUrl.trim()) {
    console.log('🔵 [API] Using ngrok/production URL:', viteApiUrl)
    return `${viteApiUrl}/api`
  }
  
  // For local development without ngrok, use relative path that proxies through Vite
  // This uses the proxy configured in vite.config.ts
  console.log('🔵 [API] Using relative proxy URL: /api')
  return '/api'
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok interstitial page
    'User-Agent': 'TAO-SDLC-Frontend/1.0', // Also helps ngrok recognize as API client
  },
})

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log(`✅ [API] Added auth token to ${config.url}`)
    } else {
      console.warn(`⚠️ [API] No token for ${config.url}`)
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
    // Enhanced logging for Vercel debugging
    const isProduction = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('deployed')
    const apiUrl = import.meta.env.VITE_API_URL
    
    // Log all errors with detailed info for debugging
    console.error('🔴 [API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      apiBaseUrl: apiUrl,
      isProduction,
      environment: window.location.hostname
    })
    
    // If response exists, log response details
    if (error.response) {
      console.error('🔴 [API Response Error]', error.response.data)
    }
    
    // If no response (network error), provide more detail
    if (!error.response && error.message === 'Network Error') {
      console.error('🔴 [Network Error - Likely CORS or Connection Blocked]', {
        trying: apiUrl,
        suggestion: 'Check Vercel Environment Variables or CORS settings'
      })
    }
    
    if (error.response?.status === 401) {
      // Unauthorized - token invalid or missing
      const token = localStorage.getItem('token')
      console.error('🔴 [API] 401 Unauthorized:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        url: error.config?.url,
        message: error.response?.data?.detail || error.response?.data?.message || 'Unauthorized'
      })
      
      // Clear auth and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Redirect to login on next page load
      if (!window.location.pathname.includes('/login')) {
        console.error('🔴 [API] Redirecting to login due to 401')
        // Use a small delay to allow logs to flush
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }
    }
    
    // Log the error for debugging but don't throw for non-critical endpoints
    const url = error.config?.url || ''
    const isCritical = !url.includes('stats') && !url.includes('jira') && !url.includes('activity')
    
    if (!isCritical && error.message === 'Network Error') {
      // Non-critical requests fail silently
      console.debug('⚠️ [API] Non-critical endpoint failed (suppressed):', url)
      return Promise.reject(error)
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

// Helper function to get full API URL for fetch() calls
// Automatically handles both local dev (relative path) and production (ngrok URL)
export const getFullApiUrl = (endpoint: string) => {
  const viteApiUrl = import.meta.env.VITE_API_URL
  
  // If VITE_API_URL is set (ngrok URL for production), use it
  if (viteApiUrl && viteApiUrl.trim()) {
    // Remove leading slash from endpoint to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint
    return `${viteApiUrl}/${cleanEndpoint}`
  }
  
  // For local development without ngrok, use relative path
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`
}

// Health check for debugging connectivity
export const healthCheck = async () => {
  try {
    const result = await api.get('/health/')
    return { ok: true, data: result.data }
  } catch (error: any) {
    return {
      ok: false,
      error: {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      }
    }
  }
}

export default api

