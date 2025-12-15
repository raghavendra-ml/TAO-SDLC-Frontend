import React, { useEffect, useMemo, useState, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getProjects, getJiraStats, getProjectPhases } from '../services/api'
import { getJiraConfig, saveJiraConfig, isJiraConfigured } from '../services/jiraConfig'
import { useProjectStore } from '../store/projectStore'
import { RefreshCw, AlertCircle } from 'lucide-react'

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
    return { hasError: true, error: error?.message || String(error) || 'An error occurred' }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('🔴 [Dashboard Error Boundary]:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Dashboard Error</p>
                <p className="text-xs text-red-700 mt-1">{this.state.error}</p>
                <p className="text-xs text-red-600 mt-2">Please try refreshing the page or contact support.</p>
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
  // Loading flag for projects
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [jiraOverview, setJiraOverview] = useState<{ projects: number; issues: number; inProgress: number; completed: number } | null>(null)
  const [jiraError, setJiraError] = useState<string | null>(null)
  const [isAutoConnecting, setIsAutoConnecting] = useState(false)
  const [jiraConfigReady, setJiraConfigReady] = useState(false) // Track when config is saved
  const { projects, setProjects } = useProjectStore()
  const [docActivity, setDocActivity] = useState<Record<number, { prdCount: number; prdLast?: string; brdCount: number; brdLast?: string }>>({})
  
  const loadProjects = async () => {
    setLoadingProjects(true)
    setProjectsError(null)
    try {
      console.log('📥 [Dashboard] Loading projects...')
      const res = await getProjects()
      console.log('✅ [Dashboard] Projects loaded:', res.data)
      setProjects(res.data)
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error'
      console.error('❌ [Dashboard] Error loading projects:', errorMsg, error)
      console.error('❌ [Dashboard] Full error:', error)
      setProjectsError(`Failed to load projects: ${errorMsg}`)
    } finally {
      setLoadingProjects(false)
    }
  }

  useEffect(() => {
    loadProjects()
    // Load cached JIRA stats from localStorage first for instant display
    const saved = localStorage.getItem('jira_stats')
    if (saved) {
      try { 
        const cachedStats = JSON.parse(saved)
        setJiraOverview(cachedStats)
        console.log('✅ [Dashboard] Loaded cached JIRA stats:', cachedStats)
      } catch (e) {
        console.warn('Failed to parse cached JIRA stats')
      }
    }
    
    if (!saved) {
      // Set default mock stats for first time
      const defaultStats = { projects: 0, issues: 0, inProgress: 0, completed: 0 }
      setJiraOverview(defaultStats)
      localStorage.setItem('jira_stats', JSON.stringify(defaultStats))
    }
    
    // Auto-connect with defaults if not connected
    autoConnectJira().catch(err => {
      console.error('[Dashboard] Auto-connect error caught:', err)
      // Don't re-throw - we have fallback data
    }).finally(() => {
      // After auto-connect completes, refresh stats after a short delay
      setTimeout(() => {
        refreshJiraStats().catch(err => {
          console.error('[Dashboard] Refresh error caught:', err)
          // Don't re-throw - we have fallback data
        })
      }, 300)
    })
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


  const totalProjects = projects.length
  const completedProjects = useMemo(() => (projects || []).filter(p => (p.completed_phases || 0) >= (p.total_phases || 6)).length, [projects])
  const inProgressProjects = Math.max(0, totalProjects - completedProjects)

  const isJiraConnected = jiraConfigReady || !!localStorage.getItem('jira_config')
  const recentProjects = useMemo(() => {
    // Sort by id desc as a proxy for recent if no created_at
    const sorted = [...projects].sort((a: any, b: any) => (b.id || 0) - (a.id || 0))
    return sorted.slice(0, 3)
  }, [projects])

  useEffect(() => {
    // Load Phase 1 version history for up to 3 recent projects
    const loadDocActivity = async () => {
      try {
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
    if (projects.length) loadDocActivity()
  }, [projects])
  
  // Ensure we always render something
  if (!projects) {
    return (
      <DashboardErrorBoundary>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </DashboardErrorBoundary>
    )
  }

  return (
    <DashboardErrorBoundary>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">High-level status overview</p>
          </div>
        </div>

        {/* Show projects loading error if any */}
        {projectsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Projects Error</p>
              <p className="text-xs text-red-700 mt-1">{projectsError}</p>
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
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-sm text-gray-600">Failed to load JIRA statistics</p>
              <p className="text-xs text-gray-500 mt-1">{jiraError}</p>
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
    </DashboardErrorBoundary>
  )
}

export default Dashboard

