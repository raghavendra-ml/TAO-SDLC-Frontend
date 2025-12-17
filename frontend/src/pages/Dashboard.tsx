import React, { useEffect, useMemo, useState, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getProjects, getJiraStats, getProjectPhases } from '../services/api'
import { getJiraConfig, saveJiraConfig, isJiraConfigured } from '../services/jiraConfig'
import { useProjectStore } from '../store/projectStore'
import { RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// Error boundary wrapper for dashboard sections
class DashboardErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error: string | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    console.error('🔴 [Dashboard ErrorBoundary] Caught error:', error)
    console.error('🔴 [Dashboard ErrorBoundary] Full stack:', error?.stack)
    return { hasError: true, error: error?.message || String(error) || 'An error occurred' }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('🔴 [Dashboard Error Boundary] Component Stack:', errorInfo.componentStack)
    console.error('🔴 [Dashboard Error Boundary] Full error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-2xl p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-900">Dashboard Error</h2>
                <p className="text-sm text-red-700 mt-2">{this.state.error}</p>
                <p className="text-xs text-red-600 mt-3">Check the browser console (F12) for more details.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const Dashboard = () => {
  // Add global error handler
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('🔴 [Dashboard] Uncaught error:', event.error)
      console.error('   Message:', event.message)
      console.error('   Filename:', event.filename)
      console.error('   Line:', event.lineno)
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])
  
  // Use a ref to track if initialization is in progress
  const initInProgress = React.useRef(false)
  const [renderTrigger, setRenderTrigger] = useState(0)  // Force re-render by changing this
  
  // Diagnostic logging on mount
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL
    const hasToken = !!localStorage.getItem('token')
    const isVercel = window.location.hostname.includes('vercel.app')
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    console.log('🔍 [Dashboard] Environment Check:')
    console.log(`  - VITE_API_URL: ${apiUrl || '(not set - using /api proxy)'}`)
    console.log(`  - Current hostname: ${window.location.hostname}`)
    console.log(`  - Deployment: ${isVercel ? '🚀 Vercel' : isLocalhost ? '💻 Localhost' : '🌐 Other'}`)
    console.log(`  - Token in storage: ${hasToken ? '✅ Yes' : '❌ No'}`)
    console.log(`  - FULL API URL: ${apiUrl ? `${apiUrl}/api` : '/api'}`)
    
    // For Vercel: add extra debugging
    if (isVercel && !apiUrl) {
      console.error('🔴 [Dashboard] VERCEL DEPLOYMENT: VITE_API_URL not set!')
      console.error('   Fix: Add VITE_API_URL to Vercel environment variables')
      console.error('   See: FRONTEND_SETUP_QUICK_START.md - Deployment section')
    }
    
    console.log('🔍 [Dashboard] Component mounted successfully')
  }, [])

  // Loading flag for projects - use local state, NOT zustand (zustand isn't triggering re-renders on Vercel)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [projects, setLocalProjects] = useState<any[]>([])  // LOCAL state instead of zustand
  const [jiraOverview, setJiraOverview] = useState<{ projects: number; issues: number; inProgress: number; completed: number } | null>(null)
  const [jiraError, setJiraError] = useState<string | null>(null)
  const [isAutoConnecting, setIsAutoConnecting] = useState(false)
  const [jiraConfigReady, setJiraConfigReady] = useState(false)
  const [docActivity, setDocActivity] = useState<Record<number, { prdCount: number; prdLast?: string; brdCount: number; brdLast?: string }>>({})
  
  const loadProjects = async () => {
    setProjectsError(null)
    try {
      console.log('📥 [Dashboard] Loading projects...')
      const res = await getProjects()
      console.log('✅ [Dashboard] Projects loaded:', res.data)
      setLocalProjects(res.data)  // Use local state setter
      return true
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error'
      console.error('❌ [Dashboard] Error loading projects:', errorMsg, error)
      
      let displayError = errorMsg
      if (error.message?.includes('Network') || error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
        const ngrokUrl = import.meta.env.VITE_API_URL
        if (ngrokUrl) {
          displayError = `Cannot connect to backend (${ngrokUrl}). Please ensure ngrok is running.`
        } else {
          displayError = 'Cannot connect to backend at localhost:8000. Please ensure the backend server is running.'
        }
      }
      
      setProjectsError(`Failed to load projects: ${displayError}`)
      toast.error(`Projects error: ${displayError}`, { id: 'projects-error' })
      return false
    }
  }

  useEffect(() => {
    const initializeDashboard = async () => {
      if (initInProgress.current) {
        console.log('⚠️ [Dashboard] Initialization already in progress')
        return
      }
      
      initInProgress.current = true
      console.log('🚀 [Dashboard] Initializing...')
      
      try {
        // Step 1: Load projects
        console.log('📥 [Dashboard] Step 1: Loading projects...')
        await loadProjects()
        console.log('✅ [Dashboard] Step 1: Projects loaded')
        
        // Step 2: Load JIRA stats from cache
        console.log('📥 [Dashboard] Step 2: Loading cached JIRA stats...')
        const saved = localStorage.getItem('jira_stats')
        if (saved) {
          try { 
            const cachedStats = JSON.parse(saved)
            setJiraOverview(cachedStats)
            console.log('✅ [Dashboard] Step 2: Loaded cached JIRA stats:', cachedStats)
          } catch (e) {
            console.warn('⚠️ [Dashboard] Failed to parse cached JIRA stats:', e)
          }
        } else {
          const defaultStats = { projects: 0, issues: 0, inProgress: 0, completed: 0 }
          setJiraOverview(defaultStats)
          localStorage.setItem('jira_stats', JSON.stringify(defaultStats))
          console.log('✅ [Dashboard] Step 2: Created default JIRA stats')
        }
        
        // Step 3: Auto-connect to JIRA
        console.log('📥 [Dashboard] Step 3: Auto-connecting to JIRA...')
        await autoConnectJira()
        console.log('✅ [Dashboard] Step 3: Auto-connect completed')
      } catch (err) {
        console.error('❌ [Dashboard] Initialization error:', err)
      } finally {
        console.log('✅ [Dashboard] Initialization complete - all steps done')
        // Set loading to false FIRST
        setLoadingProjects(false)
        console.log('✅ [Dashboard] Set loadingProjects=false')
        
        // Then after a micro-delay, trigger render
        setTimeout(() => {
          console.log('🔄 [Dashboard] Forcing render with trigger update')
          setRenderTrigger(prev => prev + 1)
        }, 10)
      }
    }
    
    initializeDashboard()
  }, [])

  const refreshJiraStats = async () => {
    try {
      const jiraConfig = getJiraConfig()
      
      if (!jiraConfig.isConfigured) {
        console.warn('⚠️ [Dashboard] JIRA not configured for refresh')
        return
      }
      
      console.log('🔄 [Dashboard] Refreshing JIRA stats...')
      
      const res = await getJiraStats({
        url: jiraConfig.url,
        email: jiraConfig.email,
        api_token: jiraConfig.apiToken,
        project_key: jiraConfig.projectKey,
      })
      
      if (res.data?.success) {
        const stats = {
          projects: res.data.projects,
          issues: res.data.issues,
          inProgress: res.data.in_progress,
          completed: res.data.completed,
        }
        setJiraOverview(stats)
        setJiraError(null)
        localStorage.setItem('jira_stats', JSON.stringify(stats))
        console.log('✅ [Dashboard] Stats refreshed:', stats)
      } else {
        const errorMsg = res.data?.error || 'Unknown error'
        console.warn('⚠️ [Dashboard] Refresh failed:', errorMsg)
        setJiraError(`JIRA Error: ${errorMsg}`)
      }
    } catch (e: any) {
      const statusCode = e.response?.status
      const errorMsg = e.response?.data?.detail || e.message || 'Unknown error'
      
      console.error('❌ [Dashboard] Refresh error:', errorMsg)
      
      let userMessage = 'Failed to refresh JIRA stats. '
      if (statusCode === 401 || statusCode === 403) {
        userMessage += 'Check your JIRA credentials in Settings.'
      } else if (statusCode === 404) {
        userMessage += 'JIRA instance not found.'
      } else {
        userMessage += 'Please check your JIRA configuration.'
      }
      
      setJiraError(userMessage + ' (Using cached data)')
      console.log('✓ [Dashboard] Continuing with cached JIRA data despite refresh error')
      // Don't show toast for JIRA errors - use cached data instead
    }
  }

  const autoConnectJira = async () => {
    // Use centralized JIRA config with fallback mechanism
    try {
      console.log('🔵 [Dashboard] Starting auto-connect to JIRA...')
      setIsAutoConnecting(true)
      
      // Get config from centralized helper (checks localStorage then env vars)
      const jiraConfig = getJiraConfig()
      
      if (!jiraConfig.isConfigured) {
        console.log('⚠️ [Dashboard] JIRA not configured - skipping JIRA section')
        setJiraError('JIRA is not configured. Configure your JIRA instance in Settings to enable statistics.')
        setIsAutoConnecting(false)
        return
      }
      
      console.log('🟢 [Dashboard] JIRA configured, attempting connection...')
      
      try {
        const payload = {
          url: jiraConfig.url,
          email: jiraConfig.email,
          api_token: jiraConfig.apiToken,
          project_key: jiraConfig.projectKey,
        }
        
        const res = await getJiraStats(payload)
        
        if (res.data?.success) {
          const stats = {
            projects: res.data.projects,
            issues: res.data.issues,
            inProgress: res.data.in_progress,
            completed: res.data.completed,
          }
          setJiraOverview(stats)
          setJiraError(null)
          localStorage.setItem('jira_stats', JSON.stringify(stats))
          console.log('✅ [Dashboard] JIRA connected and stats loaded:', stats)
        } else {
          // API returned error response - skip JIRA section
          const errorMsg = res.data?.error || 'Connection failed'
          console.warn('⚠️ [Dashboard] JIRA error:', errorMsg)
          setJiraError(errorMsg)
        }
      } catch (apiError: any) {
        // API call failed - skip JIRA section
        const statusCode = apiError.response?.status
        const errorMsg = apiError.response?.data?.detail || apiError.message || 'Connection failed'
        
        console.warn('⚠️ [Dashboard] JIRA API error:', { status: statusCode, message: errorMsg })
        
        // Set error to indicate JIRA is not available, but don't block the dashboard
        setJiraError(`JIRA unavailable: ${errorMsg}`)
      }
    } finally {
      setIsAutoConnecting(false)
      console.log('✓ [Dashboard] Auto-connect finished')
    }
  }

  // Log when projects update
  useEffect(() => {
    if (projects && projects.length > 0) {
      console.log(`📊 [Dashboard] Projects updated: ${projects.length} projects, renderTrigger=${renderTrigger}, loading=${loadingProjects}`)
    }
  }, [projects, renderTrigger, loadingProjects])

  // Watch renderTrigger changes
  useEffect(() => {
    if (renderTrigger > 0) {
      console.log(`🔄 [Dashboard] renderTrigger changed to ${renderTrigger}`)
    }
  }, [renderTrigger])

  const totalProjects = (projects || []).length
  const completedProjects = useMemo(() => (projects || []).filter((p: any) => (p.completed_phases || 0) >= (p.total_phases || 6)).length, [projects])
  const inProgressProjects = Math.max(0, totalProjects - completedProjects)

  const isJiraConnected = jiraConfigReady || !!localStorage.getItem('jira_config')
  const recentProjects = useMemo(() => {
    // Sort by id desc as a proxy for recent if no created_at
    if (!projects || !Array.isArray(projects)) return []
    const sorted = [...projects].sort((a: any, b: any) => (b.id || 0) - (a.id || 0))
    return sorted.slice(0, 3)
  }, [projects])

  useEffect(() => {
    // Load Phase 1 version history for up to 3 recent projects
    const loadDocActivity = async () => {
      try {
        if (!projects || !Array.isArray(projects) || projects.length === 0) return
        const targets = [...projects].sort((a: any, b: any) => (b.id || 0) - (a.id || 0)).slice(0, 3)
        const results: Record<number, { prdCount: number; prdLast?: string; brdCount: number; brdLast?: string }> = {}
        for (const p of targets) {
          try {
            const res = await getProjectPhases(p.id)
            const phase1 = (res.data || []).find((ph: any) => ph.phase_number === 1)
            const vh = phase1?.data?.versionHistory
            results[p.id] = {
              prdCount: (vh?.prd?.length) || 0,
              prdLast: vh?.prd && vh.prd.length ? vh.prd[vh.prd.length - 1].editedAt : undefined,
              brdCount: (vh?.brd?.length) || 0,
              brdLast: vh?.brd && vh.brd.length ? vh.brd[vh.brd.length - 1].editedAt : undefined,
            }
          } catch (e) {
            // Ignore per-project errors
            console.warn(`Failed to load activity for project ${p.id}:`, e)
          }
        }
        setDocActivity(results)
      } catch (e) {
        console.error('Failed to load document activity:', e)
        // Continue without activity data
      }
    }
    if (projects && Array.isArray(projects) && projects.length) loadDocActivity()
  }, [projects])
  
  // Render decision: Show loading if projects haven't loaded yet
  // OR show dashboard if we have projects (even if still loading JIRA data)
  const hasProjects = projects && projects.length > 0
  
  console.log(`🎯 [Dashboard] RENDER CHECK: hasProjects=${hasProjects}, projectsLength=${projects?.length || 0}, loading=${loadingProjects}, trigger=${renderTrigger}`)
  
  if (!hasProjects && loadingProjects) {
    console.log(`🔵 [Dashboard] Render: Still loading. projects=${projects?.length || 0}, loading=${loadingProjects}`)
    return (
      <DashboardErrorBoundary>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <p className="text-sm text-gray-600">Loading projects...</p>
            </div>
          </div>
        </div>
      </DashboardErrorBoundary>
    )
  }

  // Log render state after each render
  React.useMemo(() => {
    if (hasProjects) {
      console.log(`🟢 [Dashboard] Render: MAIN DASHBOARD RENDERING NOW! projects=${projects.length}, trigger=${renderTrigger}`)
    }
  }, [hasProjects, projects, renderTrigger])

  try {
    console.log(`💚 [Dashboard] RETURNING MAIN DASHBOARD. Projects: ${projects.length}, trigger=${renderTrigger}`)
    return (
      <DashboardErrorBoundary>
        <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 mt-1">High-level status overview</p>
            </div>
          </div>

          {/* Environment Diagnostic Panel (Shows in dev mode or on localhost) */}
          {(import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname.includes('vercel.app')) && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
              <p className="font-mono text-amber-900">
                <span className="font-bold">Diagnostic:</span> API URL = <span className="bg-amber-100 px-2 rounded">{import.meta.env.VITE_API_URL || '(using /api proxy)'}</span> | Token = {localStorage.getItem('token') ? '✅ present' : '❌ missing'}
              </p>
            </div>
          )}

          {/* Show projects loading error if any */}
          {projectsError && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">Projects Error</p>
                <p className="text-sm text-red-700 mt-2">{projectsError}</p>
                <button 
                  onClick={loadProjects}
                  className="mt-3 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Show JIRA error if any */}
          {jiraError && (
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">JIRA Status</p>
                <p className="text-sm text-amber-700 mt-1">{jiraError}</p>
              </div>
            </div>
          )}
        
          {/* Two-column layout: Projects and JIRA sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Projects Overview */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Projects Overview</h2>
                <Link to="/projects" className="text-sm text-primary-600 hover:underline">View all</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg border border-gray-200 p-4 text-center">
                  {loadingProjects ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-gray-900">{totalProjects}</p>
                      <p className="text-xs text-gray-600 mt-1">Total</p>
                    </>
                  )}
                </div>
                <div className="rounded-lg border border-gray-200 p-4 text-center">
                  {loadingProjects ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-blue-600">{inProgressProjects}</p>
                      <p className="text-xs text-gray-600 mt-1">In Progress</p>
                    </>
                  )}
                </div>
                <div className="rounded-lg border border-gray-200 p-4 text-center">
                  {loadingProjects ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-green-600">{completedProjects}</p>
                      <p className="text-xs text-gray-600 mt-1">Completed</p>
                    </>
                  )}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Recent projects</h3>
                {loadingProjects ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-3 rounded-lg border border-gray-200 animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full"></div>
                        <div className="mt-2 h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                ) : recentProjects.length === 0 ? (
                  <p className="text-sm text-gray-500">No projects yet. <Link to="/projects" className="text-primary-600 hover:underline">Create one</Link>.</p>
                ) : (
                  <div className="space-y-3">
                    {recentProjects.map((p: any) => {
                      const total = p.total_phases || 6
                      const completed = p.completed_phases || 0
                      const pct = Math.min(100, Math.round((completed / total) * 100))
                      const activity = docActivity[p.id]
                      return (
                        <div key={p.id} className="p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-900 truncate pr-3">{p.name}</div>
                            <div className="text-xs text-gray-500">{completed}/{total} phases</div>
                          </div>
                          <div className="mt-2 h-2 bg-gray-100 rounded-full">
                            <div className="h-2 bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          {activity && (
                            <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-3">
                              <span>PRD v{activity.prdCount}{activity.prdLast ? ` • ${new Date(activity.prdLast).toLocaleDateString()}` : ''}</span>
                              <span>BRD v{activity.brdCount}{activity.brdLast ? ` • ${new Date(activity.brdLast).toLocaleDateString()}` : ''}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* JIRA Overview */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">JIRA Overview</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={refreshJiraStats} 
                    disabled={isAutoConnecting}
                    className="text-gray-500 hover:text-gray-800 text-sm inline-flex items-center gap-1 disabled:opacity-50" 
                    title="Refresh JIRA"
                  >
                    <RefreshCw className={`w-4 h-4 ${isAutoConnecting ? 'animate-spin' : ''}`} /> {isAutoConnecting ? 'Connecting...' : 'Refresh'}
                  </button>
                </div>
              </div>
              
              {jiraError ? (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-center">
                  <p className="text-sm font-medium text-amber-900">JIRA Not Connected</p>
                  <p className="text-xs text-amber-700 mt-2">{jiraError}</p>
                </div>
              ) : jiraOverview ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{jiraOverview.projects ?? 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Projects</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{jiraOverview.issues ?? 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Issues</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{jiraOverview.inProgress ?? 0}</p>
                    <p className="text-xs text-gray-600 mt-1">In Progress</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{jiraOverview.completed ?? 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Completed</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-lg border border-gray-200 p-4 text-center animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
    )
  } catch (error: any) {
    console.error('🔴 [Dashboard] RENDER ERROR:', error)
    console.error('🔴 [Dashboard] RENDER ERROR STACK:', error?.stack)
    return (
      <DashboardErrorBoundary>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-2xl p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-900">Dashboard Render Error</h2>
                <p className="text-sm text-red-700 mt-2">{error?.message || 'Unknown error occurred during render'}</p>
                <p className="text-xs text-red-600 mt-3">Check the browser console for full error details.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardErrorBoundary>
    )
  }
}

export default Dashboard

