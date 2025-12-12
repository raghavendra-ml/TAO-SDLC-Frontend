import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { getProjects, deleteProject, getJiraStats, getJiraProjects } from '../services/api'
import { Activity, FolderOpen, RefreshCw, Trash2, Plus, Download, Settings, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import CreateProjectModal from '../components/modals/CreateProjectModal'

// Environment variables
const VITE_JIRA_URL = import.meta.env.VITE_JIRA_URL || ''
const VITE_JIRA_EMAIL = import.meta.env.VITE_JIRA_EMAIL || ''
const VITE_JIRA_API_TOKEN_2 = import.meta.env.VITE_JIRA_API_TOKEN_2 || ''

const ProjectsPage = () => {
  const { projects, setProjects } = useProjectStore()
  const [loading, setLoading] = useState(false)

  // Create project modal
  const [isModalOpen, setIsModalOpen] = useState(false)

  // JIRA integration state
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [showJiraProjectsModal, setShowJiraProjectsModal] = useState(false)
  const [jiraConnected, setJiraConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)

  const [jiraProjects, setJiraProjects] = useState<any[]>([])
  const [displayedJiraProjects, setDisplayedJiraProjects] = useState<any[]>([])

  const [jiraConfig, setJiraConfig] = useState({
    url: import.meta.env.VITE_JIRA_URL || '',
    email: import.meta.env.VITE_JIRA_EMAIL || '',
    apiToken: import.meta.env.VITE_JIRA_API_TOKEN_2 || '',
    projectKey: ''
  })

  const [jiraStats, setJiraStats] = useState({
    projects: 0,
    issues: 0,
    inProgress: 0,
    completed: 0
  })

  const load = () => {
    setLoading(true)
    getProjects()
      .then(res => setProjects(res.data))
      .catch(err => {
        console.error('Failed to load projects', err)
        toast.error('Failed to load projects')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!projects || projects.length === 0) {
      load()
    }

    const savedDisplayed = localStorage.getItem('displayed_jira_projects')
    if (savedDisplayed) setDisplayedJiraProjects(JSON.parse(savedDisplayed))

    const savedJiraConfig = localStorage.getItem('jira_config')
    if (savedJiraConfig) {
      const cfg = JSON.parse(savedJiraConfig)
      setJiraConfig(cfg)
      setJiraConnected(true)
      const savedStats = localStorage.getItem('jira_stats')
      if (savedStats) setJiraStats(JSON.parse(savedStats))
    }
  }, [])

  const handleDeleteProject = async (e: React.MouseEvent, projectId: number, projectName: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) return
    try {
      await deleteProject(projectId)
      toast.success('Project deleted successfully')
      load()
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }

  const handleConnectJira = async () => {
    if (!jiraConfig.url || !jiraConfig.email || !jiraConfig.apiToken) {
      toast.error('Please fill in all JIRA credentials')
      return
    }
    try {
      const loadingToast = toast.loading('🔄 Connecting to JIRA...')
      const response = await getJiraStats({
        url: jiraConfig.url,
        email: jiraConfig.email,
        api_token: jiraConfig.apiToken,
        project_key: jiraConfig.projectKey || undefined
      })
      toast.dismiss(loadingToast)
      if (response.data.success) {
        localStorage.setItem('jira_config', JSON.stringify(jiraConfig))
        setJiraConnected(true)
        setShowJiraModal(false)
        const stats = {
          projects: response.data.projects,
          issues: response.data.issues,
          inProgress: response.data.in_progress,
          completed: response.data.completed
        }
        setJiraStats(stats)
        localStorage.setItem('jira_stats', JSON.stringify(stats))
        toast.success('✅ Connected to JIRA successfully!')
      } else {
        toast.error(response.data.error || 'Failed to connect to JIRA. Please check your credentials.')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to connect to JIRA. Please check your credentials.'
      toast.error(errorMessage)
    }
  }

  const handleSyncJira = async () => {
    if (!jiraConnected) return
    setIsSyncing(true)
    try {
      const loadingToast = toast.loading('🔄 Syncing with JIRA...')
      const response = await getJiraStats({
        url: jiraConfig.url,
        email: jiraConfig.email,
        api_token: jiraConfig.apiToken,
        project_key: jiraConfig.projectKey || undefined
      })
      toast.dismiss(loadingToast)
      if (response.data.success) {
        const stats = {
          projects: response.data.projects,
          issues: response.data.issues,
          inProgress: response.data.in_progress,
          completed: response.data.completed
        }
        setJiraStats(stats)
        localStorage.setItem('jira_stats', JSON.stringify(stats))
        toast.success(`✅ Synced: ${stats.projects} projects, ${stats.issues} issues`)
      } else {
        toast.error(response.data.error || 'Failed to sync with JIRA')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to sync with JIRA'
      toast.error(errorMessage)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleViewJiraProjects = async () => {
    if (!jiraConnected) {
      toast('Please connect to JIRA first to view projects', { duration: 3000, icon: '💡' })
      return
    }
    setLoadingProjects(true)
    setShowJiraProjectsModal(true)
    try {
      // Fetch ALL projects - don't filter by projectKey
      const response = await getJiraProjects({
        url: jiraConfig.url,
        email: jiraConfig.email,
        api_token: jiraConfig.apiToken
        // NOTE: NOT passing project_key here so we get ALL projects
      })
      if (response.data.success) {
        setJiraProjects(response.data.projects)
      } else {
        toast.error(response.data.error || 'Failed to load JIRA projects')
        setJiraProjects([])
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Failed to load JIRA projects'
      toast.error(errorMessage)
      setJiraProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  const handleDisplayJiraProject = (project: any) => {
    if (displayedJiraProjects.some(p => p.key === project.key)) {
      toast.error('Project already displayed in projects view')
      return
    }
    const updated = [...displayedJiraProjects, project]
    setDisplayedJiraProjects(updated)
    localStorage.setItem('displayed_jira_projects', JSON.stringify(updated))
    toast.success(`Added "${project.name}" to projects view!`)
  }

  const removeDisplayedJiraProject = (key: string) => {
    const updated = displayedJiraProjects.filter(p => p.key !== key)
    setDisplayedJiraProjects(updated)
    localStorage.setItem('displayed_jira_projects', JSON.stringify(updated))
    toast.success('Removed from projects view')
  }

  // Removed summary counters from Projects page; kept only in Dashboard

  const getPhaseColor = (phase: number) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500']
    return colors[phase - 1] || 'bg-gray-500'
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Create, sync, and manage projects</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-secondary inline-flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary inline-flex items-center">
            <Plus className="w-5 h-5 mr-2" /> New Project
          </button>
        </div>
      </div>

      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={load} />

      {/* JIRA Integration */}
      <div className="mb-6 card bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">JIRA Integration</h2>
              <div className="flex items-center space-x-2 mt-1">
                {jiraConnected ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Not connected</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {jiraConnected ? (
              <>
                <button onClick={handleSyncJira} disabled={isSyncing} className="btn-secondary flex items-center space-x-2 disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync JIRA Data'}</span>
                </button>
                <button onClick={handleViewJiraProjects} className="btn-secondary">View Projects</button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to disconnect from JIRA?')) {
                      localStorage.removeItem('jira_config')
                      localStorage.removeItem('jira_stats')
                      setJiraConnected(false)
                      setJiraConfig({ 
                        url: import.meta.env.VITE_JIRA_URL || '',
                        email: import.meta.env.VITE_JIRA_EMAIL || '',
                        apiToken: import.meta.env.VITE_JIRA_API_TOKEN_2 || '',
                        projectKey: 'SCRUM'
                      })
                      setJiraStats({ projects: 0, issues: 0, inProgress: 0, completed: 0 })
                      setJiraProjects([])
                      toast.success('Disconnected from JIRA')
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-700 px-3 py-2"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={() => setShowJiraModal(true)} className="btn-primary flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Connect to JIRA</span>
              </button>
            )}
          </div>
        </div>
        {jiraConnected && (
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
            <button onClick={handleViewJiraProjects} className="text-center hover:bg-blue-50 rounded-lg p-3 transition-colors cursor-pointer group" title="Click to select JIRA projects to display as cards">
              <p className="text-2xl font-bold text-blue-600 group-hover:text-blue-700">{jiraStats.projects}</p>
              <p className="text-xs text-gray-600 mt-1">JIRA Projects</p>
              <p className="text-xs text-gray-400 mt-1">Click to display</p>
            </button>
            <div className="text-center p-3">
              <p className="text-2xl font-bold text-gray-900">{jiraStats.issues}</p>
              <p className="text-xs text-gray-600 mt-1">Total Issues</p>
            </div>
            <div className="text-center p-3">
              <p className="text-2xl font-bold text-blue-600">{jiraStats.inProgress}</p>
              <p className="text-xs text-gray-600 mt-1">In Progress</p>
            </div>
            <div className="text-center p-3">
              <p className="text-2xl font-bold text-green-600">{jiraStats.completed}</p>
              <p className="text-xs text-gray-600 mt-1">Completed</p>
            </div>
          </div>
        )}
      </div>

      {/* Status cards removed from Projects per request; kept on Dashboard only */}

      {jiraConnected && displayedJiraProjects.length === 0 && (projects?.length || 0) > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
          <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">JIRA Projects Available</h3>
            <p className="text-sm text-blue-700 mt-1">
              You have {jiraStats.projects} JIRA projects available. 
              <button onClick={handleViewJiraProjects} className="font-semibold text-blue-600 hover:text-blue-800 ml-1">
                Click here to select and display them as cards →
              </button>
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (projects?.length || 0) === 0 && displayedJiraProjects.length === 0 ? (
        <div className="card text-center">
          <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No projects found. Use New Project or connect JIRA.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="card group cursor-pointer relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                </div>
                <button
                  onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                  className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    Phase {project.completed_phases || 0} of {project.total_phases || 6}
                  </span>
                </div>
                <div className={`${getPhaseColor(project.current_phase)} w-2 h-2 rounded-full`}></div>
              </div>
              <div className="mt-4 bg-gray-100 rounded-full h-2">
                <div
                  className={`${getPhaseColor(project.current_phase)} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${((project.completed_phases || 0) / (project.total_phases || 6)) * 100}%` }}
                />
              </div>
            </Link>
          ))}

          {displayedJiraProjects.map((jiraProject) => (
            <div key={jiraProject.key} className="card group cursor-pointer relative border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    <span className="px-2 py-1 text-xs font-bold bg-blue-600 text-white rounded">JIRA</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{jiraProject.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-medium text-blue-600">{jiraProject.key}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 capitalize">{jiraProject.project_type}</span>
                  </div>
                </div>
                <button onClick={() => removeDisplayedJiraProject(jiraProject.key)} className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove from view">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white rounded-lg p-2 text-center border border-gray-200">
                  <p className="text-lg font-bold text-purple-600">{jiraProject.epic_count}</p>
                  <p className="text-[10px] text-gray-600">Epics</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-gray-200">
                  <p className="text-lg font-bold text-indigo-600">{jiraProject.story_count}</p>
                  <p className="text-[10px] text-gray-600">Stories</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-gray-200">
                  <p className="text-lg font-bold text-gray-900">{jiraProject.issue_count}</p>
                  <p className="text-[10px] text-gray-600">Issues</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <span className="text-gray-600">{jiraProject.in_progress_count} in progress</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    <span className="text-gray-600">{jiraProject.completed_count} done</span>
                  </div>
                </div>
              </div>
              <a href={jiraProject.url} target="_blank" rel="noopener noreferrer" className="mt-3 btn-secondary w-full flex items-center justify-center space-x-2 text-xs">
                <span>View in JIRA</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}

      {/* JIRA Configuration Modal */}
      {showJiraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold">Connect to JIRA</h3>
              </div>
              <button onClick={() => setShowJiraModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Connect your JIRA workspace to sync projects, issues, and track progress across platforms.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">JIRA URL</label>
                <input type="text" className="input" placeholder="https://your-domain.atlassian.net" value={jiraConfig.url} onChange={(e) => setJiraConfig({ ...jiraConfig, url: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input" placeholder="your-email@company.com" value={jiraConfig.email} onChange={(e) => setJiraConfig({ ...jiraConfig, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
                <input type="password" className="input" placeholder="Your JIRA API token" value={jiraConfig.apiToken} onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">
                  <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Generate API token →</a>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Key <span className="text-gray-400">(Optional)</span></label>
                <input type="text" className="input" placeholder="SCRUM (just the key, not URL)" value={jiraConfig.projectKey} onChange={(e) => setJiraConfig({ ...jiraConfig, projectKey: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">Enter only the project key like "SCRUM" to filter stats for that project only.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800"><strong>Note:</strong> This is a demo integration. Your credentials are stored locally for demonstration purposes. In production, they will be securely encrypted and stored server-side.</p>
              </div>
              <div className="flex space-x-3 pt-2">
                <button onClick={() => setShowJiraModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleConnectJira} className="btn-primary flex-1">
                  <Download className="w-4 h-4 mr-2 inline" />
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JIRA Projects Modal */}
      {showJiraProjectsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Download className="w-5 h-5 text-primary-600" />
                <h3 className="text-xl font-semibold">JIRA Projects</h3>
              </div>
              <button onClick={() => setShowJiraProjectsModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>ℹ️ Showing all JIRA projects.</strong> Select the projects you want to display as cards in the Projects view.
              </p>
            </div>
            {loadingProjects ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
                <span className="ml-3 text-gray-600">Loading projects from JIRA...</span>
              </div>
            ) : jiraProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No JIRA projects found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jiraProjects.map((project, index) => (
                  <div key={index} className="card hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{project.name}</h4>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">{project.key}</span>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded capitalize">{project.project_type}</span>
                        </div>
                        {project.description && <p className="text-sm text-gray-600 mb-3">{project.description}</p>}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Activity className="w-4 h-4" />
                            <span>Lead: {project.lead_name}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-4 mt-4 pt-4 border-t border-gray-200">
                          <div className="text-center">
                            <p className="text-xl font-bold text-gray-900">{project.issue_count}</p>
                            <p className="text-xs text-gray-600 mt-1">Total Issues</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-purple-600">{project.epic_count}</p>
                            <p className="text-xs text-gray-600 mt-1">Epics</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-indigo-600">{project.story_count}</p>
                            <p className="text-xs text-gray-600 mt-1">Stories</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-blue-600">{project.in_progress_count}</p>
                            <p className="text-xs text-gray-600 mt-1">In Progress</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-green-600">{project.completed_count}</p>
                            <p className="text-xs text-gray-600 mt-1">Completed</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <button onClick={() => handleDisplayJiraProject(project)} disabled={displayedJiraProjects.some(p => p.key === project.key)} className="btn-primary flex items-center space-x-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                          <Plus className="w-4 h-4" />
                          <span>Display in Projects</span>
                        </button>
                        <a href={project.url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center space-x-2 whitespace-nowrap">
                          <span>View in JIRA</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button onClick={() => setShowJiraProjectsModal(false)} className="btn-secondary w-full">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
