import { useParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Rocket, Server, Activity, FileText, AlertCircle, CheckCircle2, Play, ChevronDown, ChevronUp, ExternalLink, Send } from 'lucide-react'
import { getProject, getProjectPhases, updatePhase } from '../services/api'
import { toast } from 'react-hot-toast'

const Phase7Page = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [projectName, setProjectName] = useState<string>('')
  const [phaseId, setPhaseId] = useState<number | null>(null)
  const [phaseStatus, setPhaseStatus] = useState<string>('in_progress')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    deploymentPipeline: false,
    cicdPipeline: false,
    systemMonitoring: false,
    documentation: false,
    toolIntegrations: false
  })

  useEffect(() => {
    if (projectId) {
      loadProjectName()
    }
  }, [projectId])

  const loadProjectName = async () => {
    try {
      const response = await getProject(Number(projectId))
      setProjectName(response.data.name || 'Unknown Project')
      
      // Load phase 7 data
      const phases = await getProjectPhases(Number(projectId))
      const phase7 = phases.data.find((p: any) => p.phase_number === 7)
      if (phase7) {
        setPhaseId(phase7.id)
        setPhaseStatus(phase7.status || 'in_progress')
      }
      console.log('Phase 7 - Project loaded:', response.data.name)
    } catch (error) {
      console.error('Phase 7 - Error loading project:', error)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleSubmitForApproval = async () => {
    if (!phaseId) {
      toast.error('Phase not found')
      return
    }

    setIsSubmitting(true)
    try {
      // Update phase status to pending_approval
      await updatePhase(phaseId, {
        status: 'pending_approval',
        data: {
          submittedAt: new Date().toISOString(),
          submittedBy: 'User'
        }
      })

      console.log('✅ Phase 7 submitted for approval')
      setPhaseStatus('pending_approval')
      
      toast.success('Phase 7 submitted for approval!')
      
      // Navigate to approvals page after a short delay
      setTimeout(() => {
        navigate('/approvals')
      }, 2000)
    } catch (error) {
      console.error('Error submitting for approval:', error)
      toast.error('Failed to submit for approval. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deploymentStages = [
    { name: 'Staging', status: 'completed', url: 'https://staging.example.com' },
    { name: 'Production', status: 'pending', url: 'https://example.com' },
  ]

  const monitoringMetrics = [
    { name: 'Uptime', value: '99.9%', status: 'good', icon: Activity },
    { name: 'Response Time', value: '145ms', status: 'good', icon: Activity },
    { name: 'Error Rate', value: '0.02%', status: 'good', icon: AlertCircle },
    { name: 'CPU Usage', value: '45%', status: 'warning', icon: Server },
  ]

  return (
    <div>
      <div className="mb-8">
        {projectName && (
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-500">Project:</span>
            <h2 className="text-3xl font-bold text-primary-600">{projectName}</h2>
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900">Phase 7: Deployment, Release & Operations</h1>
        <p className="text-gray-500 mt-2">Release to production and monitor system performance</p>
      </div>

      {/* TAO Infra Landing Page Heading Section */}
      <div className="mb-8 p-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-lg text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.2)_25%,rgba(255,255,255,.2)_50%,transparent_50%,transparent_75%,rgba(255,255,255,.2)_75%,rgba(255,255,255,.2))] bg-[length:40px_40px]"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-5xl font-black tracking-tight">TAO Infra</h1>
            <a 
              href="https://www.example.com/infra-landing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors"
            >
              <span>Learn More</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-sm text-orange-100 mb-4">Infrastructure Automation & Deployment Platform</p>
          <p className="text-sm text-orange-100 font-medium">By TAO Deployment Product</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployment Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <button
              onClick={() => toggleSection('deploymentPipeline')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Rocket className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Deployment Pipeline</h2>
              </div>
              {expandedSections.deploymentPipeline ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {expandedSections.deploymentPipeline && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <button className="btn-primary flex items-center space-x-2">
                    <Play className="w-4 h-4" />
                    <span>Deploy to Production</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {deploymentStages.map((stage, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        stage.status === 'completed'
                          ? 'border-green-500 bg-green-50'
                          : stage.status === 'in_progress'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stage.name} Environment</h3>
                          <p className="text-sm text-gray-600 mt-1">{stage.url}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          {stage.status === 'completed' && (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          )}
                          {stage.status === 'pending' && (
                            <button className="btn-primary text-sm">Deploy</button>
                          )}
                        </div>
                      </div>

                      {stage.status === 'completed' && (
                        <div className="mt-3 grid grid-cols-3 gap-3 pt-3 border-t border-green-200">
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Deployed</p>
                            <p className="text-sm font-medium text-gray-900">2 hours ago</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Build</p>
                            <p className="text-sm font-medium text-gray-900">#245</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Version</p>
                            <p className="text-sm font-medium text-gray-900">v1.2.3</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CI/CD Pipeline */}
          <div className="card">
            <button
              onClick={() => toggleSection('cicdPipeline')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Server className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">CI/CD Pipeline</h2>
              </div>
              {expandedSections.cicdPipeline ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {expandedSections.cicdPipeline && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">Build #245</p>
                        <p className="text-xs text-gray-500">main branch • 2 hours ago</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                      Passed
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <div>
                        <p className="font-medium text-gray-900">Build #246</p>
                        <p className="text-xs text-gray-500">develop branch • Running...</p>
                      </div>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                      In Progress
                    </span>
                  </div>
                </div>

                <button className="btn-secondary w-full mt-4">View Pipeline History</button>
              </div>
            )}
          </div>

          {/* System Monitoring */}
          <div className="card">
            <button
              onClick={() => toggleSection('systemMonitoring')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Activity className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">System Monitoring</h2>
              </div>
              {expandedSections.systemMonitoring ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {expandedSections.systemMonitoring && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {monitoringMetrics.map((metric, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <metric.icon className="w-5 h-5 text-gray-600" />
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            metric.status === 'good'
                              ? 'bg-green-100 text-green-800'
                              : metric.status === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {metric.status}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                      <p className="text-sm text-gray-600">{metric.name}</p>
                    </div>
                  ))}
                </div>

                <button className="btn-primary w-full mt-4">Open Full Dashboard</button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Documentation */}
          <div className="card">
            <button
              onClick={() => toggleSection('documentation')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Documentation</h2>
              </div>
              {expandedSections.documentation ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {expandedSections.documentation && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                <div className="space-y-2">
                  <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
                    📄 Release Notes v1.2.3
                  </button>
                  <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
                    📘 User Guide
                  </button>
                  <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
                    🔧 Admin Manual
                  </button>
                  <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
                    🚨 Runbook
                  </button>
                </div>
                <button className="btn-primary w-full mt-4">Generate Documentation</button>
              </div>
            )}
          </div>

          {/* Tool Integrations */}
          <div className="card">
            <button
              onClick={() => toggleSection('toolIntegrations')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Server className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Tool Integrations</h2>
              </div>
              {expandedSections.toolIntegrations ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {expandedSections.toolIntegrations && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">GitHub</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Jira</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Confluence</span>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Not Connected</span>
                  </div>
                </div>
                <button className="btn-secondary w-full mt-4">Manage Integrations</button>
              </div>
            )}
          </div>

          {/* Deployment Checklist */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <FileText className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Deployment Checklist</h2>
            </div>

            <div className="space-y-2">
              {[
                { item: 'Run all tests', done: true },
                { item: 'Update documentation', done: true },
                { item: 'Database backup', done: true },
                { item: 'Notify stakeholders', done: false },
                { item: 'Monitor for 1 hour', done: false },
              ].map((task, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={task.done}
                    className="w-4 h-4 text-primary-600 rounded"
                    readOnly
                  />
                  <span className={`text-sm ${task.done ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                    {task.item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rollback Plan */}
          <div className="card bg-yellow-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Rollback Plan</h2>
            <p className="text-sm text-gray-600 mb-4">
              If issues are detected, the system can automatically rollback to the previous stable version.
            </p>
            <button className="btn-secondary w-full text-red-600 border-red-300 hover:bg-red-50">
              Initiate Rollback
            </button>
          </div>
        </div>
      </div>

      {/* Submit for Approval Section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Ready for Phase Approval?</h3>
              <p className="text-sm text-gray-600">
                Submit Phase 7 for approval to complete the deployment cycle.
              </p>
            </div>
            <button
              onClick={handleSubmitForApproval}
              disabled={isSubmitting || phaseStatus === 'pending_approval' || phaseStatus === 'approved'}
              className="btn-primary flex items-center space-x-2 px-6 py-2 whitespace-nowrap"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit for Approval</span>
                </>
              )}
            </button>
          </div>
          
          {phaseStatus === 'pending_approval' && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">
                ⏳ This phase is awaiting approval. Check the Approvals section for status updates.
              </p>
            </div>
          )}
          
          {phaseStatus === 'approved' && (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                ✅ This phase has been approved!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Phase7Page

