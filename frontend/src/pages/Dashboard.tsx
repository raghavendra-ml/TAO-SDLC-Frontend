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
  const [jiraStats, setJiraStats] = useState<any>(null)
  const [jiraError, setJiraError] = useState<string | null>(null)

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
        
        // Load JIRA stats (non-critical)
        try {
          console.log('📥 [Dashboard] Loading JIRA stats...')
          const jiraConfig = getJiraConfig()
          if (jiraConfig.isConfigured) {
            const statsRes = await getJiraStats({
              url: jiraConfig.url,
              email: jiraConfig.email,
              api_token: jiraConfig.apiToken,
              project_key: jiraConfig.projectKey,
            })
            if (statsRes.data?.success) {
              setJiraStats(statsRes.data)
              setJiraError(null)
              console.log('✅ [Dashboard] JIRA stats loaded')
            }
          }
        } catch (e: any) {
          const msg = e.response?.data?.detail || e.message || 'JIRA connection failed'
          console.warn('⚠️ [Dashboard] JIRA stats failed (non-critical):', msg)
          setJiraError(msg)
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
              <p className="text-gray-500 mt-1">Project overview</p>
            </div>
            <Link
              to="/projects"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              All Projects
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

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No projects found</p>
              <Link to="/projects" className="text-blue-600 hover:underline mt-2 inline-block">
                Create a new project
              </Link>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Projects ({projects.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project: any) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all"
                  >
                    <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Phase {project.current_phase || 1}/{project.total_phases || 6}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {project.status || 'Active'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Project Statistics */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Total Projects</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{projects.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium">Active Projects</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {projects.filter((p: any) => p.status === 'Active').length}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600 font-medium">Average Phase</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">
                  {(projects.reduce((sum: number, p: any) => sum + (p.current_phase || 1), 0) / projects.length).toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {/* JIRA Statistics */}
          {jiraStats && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">JIRA Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">JIRA Projects</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{jiraStats.projects || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">Total Issues</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{jiraStats.issues || 0}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-600 font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-orange-900 mt-2">{jiraStats.in_progress || 0}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-900 mt-2">{jiraStats.completed || 0}</p>
                </div>
              </div>
            </div>
          )}

          {jiraError && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">JIRA Status</p>
                  <p className="text-sm text-amber-700 mt-1">{jiraError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}

export default Dashboard
