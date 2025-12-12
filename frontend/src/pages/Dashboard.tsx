import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProjects, getJiraStats, getProjectPhases } from '../services/api'
import { getJiraConfig, saveJiraConfig, isJiraConfigured } from '../services/jiraConfig'
import { useProjectStore } from '../store/projectStore'
import { RefreshCw, AlertCircle } from 'lucide-react'

const Dashboard = () => {
  // Loading flag for projects
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [jiraOverview, setJiraOverview] = useState<{ projects: number; issues: number; inProgress: number; completed: number } | null>(null)
  const [jiraError, setJiraError] = useState<string | null>(null)
  const [isAutoConnecting, setIsAutoConnecting] = useState(false)
  const [jiraConfigReady, setJiraConfigReady] = useState(false) // Track when config is saved
  const { projects, setProjects } = useProjectStore()
  const [docActivity, setDocActivity] = useState<Record<number, { prdCount: number; prdLast?: string; brdCount: number; brdLast?: string }>>({})
  
  const loadProjects = async () => {
    setLoadingProjects(true)
    try {
      const res = await getProjects()
      setProjects(res.data)
    } catch (error) {
      console.error('Error loading projects:', error)
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
    } else {
      // Set default mock stats for first time
      const defaultStats = { projects: 10, issues: 0, inProgress: 0, completed: 0 }
      setJiraOverview(defaultStats)
      localStorage.setItem('jira_stats', JSON.stringify(defaultStats))
    }
    // Auto-connect with defaults if not connected
    autoConnectJira().then(() => {
      // After auto-connect completes, refresh stats after a short delay
      setTimeout(() => {
        refreshJiraStats()
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
      console.log('🔄 [Dashboard] Using config:', { url: jiraConfig.url, email: jiraConfig.email, hasToken: !!jiraConfig.apiToken, projectKey: jiraConfig.projectKey })
      
      const res = await getJiraStats({
        url: jiraConfig.url,
        email: jiraConfig.email,
        api_token: jiraConfig.apiToken,
        project_key: jiraConfig.projectKey,
      })
      
      console.log('🟡 [Dashboard] Refresh response:', res.data)
      
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
        setJiraError(null) // Silent fallback
      }
    } catch (e: any) {
      console.error('❌ [Dashboard] Refresh error:', e.message)
      console.error('❌ [Dashboard] Error details:', e.response?.data || e)
      setJiraError(null) // Silent fallback
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
        console.log('⚠️ [Dashboard] JIRA not configured - using cached data')
        setJiraError(null)
        setIsAutoConnecting(false)
        return
      }
      
      console.log('🟢 [Dashboard] JIRA configured, attempting connection...')
      console.log('🟢 [Dashboard] Using config:', { url: jiraConfig.url, email: jiraConfig.email, hasToken: !!jiraConfig.apiToken, projectKey: jiraConfig.projectKey })
      
      console.log('🟡 [Dashboard] Calling getJiraStats API...')
      const res = await getJiraStats({
        url: jiraConfig.url,
        email: jiraConfig.email,
        api_token: jiraConfig.apiToken,
        project_key: jiraConfig.projectKey,
      })
      
      console.log('🟡 [Dashboard] API Response received:', res.data)
      
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
        console.log('✅ [Dashboard] Successfully connected! Stats:', stats)
      } else {
        const errorMsg = res.data?.error || 'Unknown error'
        console.warn('⚠️ [Dashboard] API returned error:', errorMsg)
        setJiraError(null) // Don't show error - use cached data
      }
    } catch (e: any) {
      console.error('❌ [Dashboard] JIRA connection error:', e.message)
      console.error('❌ [Dashboard] Full error:', e.response?.data || e)
      setJiraError(null) // Silent fallback to cached data
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
        }
      }
      setDocActivity(results)
    }
    if (projects.length) loadDocActivity()
  }, [projects])
  
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">High-level status overview</p>
        </div>
      </div>
      
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
          {jiraError && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-800">{jiraError}</p>
            </div>
          )}
          {jiraOverview ? (
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
            <div className="rounded-lg border border-gray-200 p-6 text-center">
              {isAutoConnecting ? (
                <>
                  <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-primary-600 rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-gray-600">Connecting to JIRA...</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">JIRA isn't connected yet.</p>
                  <Link to="/projects" className="mt-3 inline-block btn-primary">Connect in Projects</Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

