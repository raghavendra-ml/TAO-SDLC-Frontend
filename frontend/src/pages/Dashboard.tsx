import React, { useEffect, useState, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getProjects, getJiraStats, getProjectPhases } from '../services/api'
import { getJiraConfig } from '../services/jiraConfig'
import { RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// Simple error boundary
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
    return { hasError: true, error: error?.message || 'An error occurred' }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-2xl p-6 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
            <h2 className="text-lg font-semibold text-red-900">Dashboard Error</h2>
            <p className="text-sm text-red-700 mt-2">{this.state.error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const Dashboard = () => {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jiraOverview, setJiraOverview] = useState<any>(null)
  const [jiraError, setJiraError] = useState<string | null>(null)
  const [isAutoConnecting, setIsAutoConnecting] = useState(false)
  const [jiraConfigReady, setJiraConfigReady] = useState(false)

  const refreshJiraStats = async () => {
    const cfgRaw = localStorage.getItem('jira_config')
    if (!cfgRaw) {
      console.warn('⚠️ [Dashboard] No JIRA config found for refresh')
      return
    }
    try {
      const cfg = JSON.parse(cfgRaw)
      console.log('🔄 [Dashboard] Refreshing JIRA stats...')
      
      const res = await getJiraStats({
        url: cfg.url,
        email: cfg.email,
        api_token: cfg.apiToken,
        project_key: cfg.projectKey || undefined,
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
        toast.success('JIRA stats refreshed')
      } else {
        const errorMsg = res.data?.error || 'Unknown error'
        console.warn('⚠️ [Dashboard] Refresh failed:', errorMsg)
        setJiraError(errorMsg)
      }
    } catch (e: any) {
      console.error('❌ [Dashboard] Refresh exception:', e.message)
      const msg = e.response?.data?.error || e.message || 'Could not refresh JIRA data'
      setJiraError(msg)
      toast.error(msg)
    }
  }

  const autoConnectJira = async () => {
    console.log('🔵 [Dashboard] Starting auto-connect to JIRA...')
    setIsAutoConnecting(true)
    
    const defaultConfig = {
      url: import.meta.env.VITE_JIRA_URL || 'https://taodigitalsolutions-team-x1wa6h9b.atlassian.net/',
      email: import.meta.env.VITE_JIRA_EMAIL || 'raghavendra.thummala@taodigitalsolutions.com',
      apiToken: import.meta.env.VITE_JIRA_API_TOKEN_2 || 'ATATT3xFfGF02vtMz5bnQP6tu-potUe3ki6ID8J64agtTZA1Zn78JOmuruszUpq9mKjJAljDvy8RDvc8_jNuLXgAJFzSH4o0QuEXS_Ls1T1CQHN6g48TrzoCw5FePqXDuljgCKYT2TwIs7JjCF7rDiQeBytSURwkWcI6J64L_lmLukxVLbD3UNA=A3B4A7C6',
      projectKey: 'SCRUM'
    }
    
    localStorage.setItem('jira_config', JSON.stringify(defaultConfig))
    setJiraConfigReady(true)
    console.log('🟢 [Dashboard] Config saved to localStorage')
    
    try {
      console.log('🟡 [Dashboard] Calling getJiraStats API...')
      const res = await getJiraStats({
        url: defaultConfig.url,
        email: defaultConfig.email,
        api_token: defaultConfig.apiToken,
        project_key: defaultConfig.projectKey || undefined,
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
        setJiraError(errorMsg)
      }
    } catch (e: any) {
      console.error('❌ [Dashboard] Exception:', e.message)
      const errMsg = e.response?.data?.error || e.message || 'Connection failed'
      setJiraError(`Could not connect: ${errMsg}`)
    } finally {
      setIsAutoConnecting(false)
      console.log('✓ [Dashboard] Auto-connect finished')
    }
  }

  // Simple initialization
  useEffect(() => {
    const init = async () => {
      console.log('🚀 [Dashboard] Starting initialization')
      try {
        // Load projects
        console.log('📥 [Dashboard] Loading projects...')
        const projectsRes = await getProjects()
        console.log('✅ [Dashboard] Projects loaded:', projectsRes.data)
        setProjects(projectsRes.data || [])
        
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
        
        setError(null)
        console.log('✅ [Dashboard] Initialization complete')
      } catch (err: any) {
        const msg = err.response?.data?.detail || err.message || 'Failed to load dashboard'
        console.error('❌ [Dashboard] Error:', msg)
        setError(msg)
        toast.error(msg)
        setProjects([])
      } finally {
        setLoading(false)
        console.log('🟢 [Dashboard] Loading complete, showing dashboard')
      }
    }
    
    init()
    
    // Auto-connect JIRA after projects load
    autoConnectJira().then(() => {
      setTimeout(() => {
        refreshJiraStats()
      }, 300)
    })
  }, [])

  // Render loading state
  if (loading) {
    console.log('🔵 [Dashboard] Rendering: Loading spinner')
    return (
      <DashboardErrorBoundary>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardErrorBoundary>
    )
  }

  console.log(`🟢 [Dashboard] Rendering: Main view. Projects: ${projects.length}`)

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 mt-1">Project & JIRA Overview</p>
            </div>
            <Link
              to="/projects"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Manage Projects
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">Error Loading Dashboard</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Project Statistics Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Total Projects</p>
                <p className="text-4xl font-bold text-blue-900 mt-3">{projects.length}</p>
                <p className="text-xs text-blue-600 mt-2">Active projects in system</p>
              </div>
              <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium">Active Projects</p>
                <p className="text-4xl font-bold text-green-900 mt-3">
                  {projects.filter((p: any) => p.status === 'Active' || !p.status).length}
                </p>
                <p className="text-xs text-green-600 mt-2">Currently in progress</p>
              </div>
              <div className="p-6 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600 font-medium">Average Phase</p>
                <p className="text-4xl font-bold text-orange-900 mt-3">
                  {projects.length > 0 
                    ? (projects.reduce((sum: number, p: any) => sum + (p.current_phase || 1), 0) / projects.length).toFixed(1)
                    : '0'}
                </p>
                <p className="text-xs text-orange-600 mt-2">Across all projects</p>
              </div>
            </div>
          </div>

          {/* Phase Breakdown */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Projects by Phase</h2>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((phase) => {
                const count = projects.filter((p: any) => (p.current_phase || 1) === phase).length
                return (
                  <div key={phase} className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <p className="text-sm font-medium text-gray-600">Phase {phase}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                    <p className="text-xs text-gray-500 mt-1">{count === 1 ? 'project' : 'projects'}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* JIRA Statistics Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
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
                    <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-gray-600">Connecting to JIRA...</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">JIRA isn't connected yet.</p>
                    <Link to="/projects" className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Connect in Projects</Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}

export default Dashboard
