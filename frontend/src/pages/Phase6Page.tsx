import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TestTube, CheckCircle, XCircle, Shield, Zap, ChevronDown, ChevronUp, ExternalLink, Send } from 'lucide-react'
import { getProject, getProjectPhases, updatePhase } from '../services/api'
import { toast } from 'react-hot-toast'

const Phase6Page = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [projectName, setProjectName] = useState<string>('')
  const [phaseId, setPhaseId] = useState<number | null>(null)
  const [phaseStatus, setPhaseStatus] = useState<string>('in_progress')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    testSuites: false,
    securityTesting: false,
    performance: false
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
      
      // Load phase 6 data
      const phases = await getProjectPhases(Number(projectId))
      const phase6 = phases.data.find((p: any) => p.phase_number === 6)
      if (phase6) {
        setPhaseId(phase6.id)
        setPhaseStatus(phase6.status || 'in_progress')
      }
      console.log('Phase 6 - Project loaded:', response.data.name)
    } catch (error) {
      console.error('Phase 6 - Error loading project:', error)
    }
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

      console.log('✅ Phase 6 submitted for approval')
      setPhaseStatus('pending_approval')
      
      toast.success('Phase 6 submitted for approval!')
      
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const testSuites = [
    { name: 'Integration Tests', total: 45, passed: 43, failed: 2, status: 'warning' },
    { name: 'Functional Tests', total: 68, passed: 68, failed: 0, status: 'success' },
    { name: 'Security Tests', total: 32, passed: 30, failed: 2, status: 'warning' },
    { name: 'Performance Tests', total: 15, passed: 14, failed: 1, status: 'warning' },
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
        <h1 className="text-3xl font-bold text-gray-900">Phase 6: Testing & QA</h1>
        <p className="text-gray-500 mt-2">Quality assurance and comprehensive testing</p>
      </div>

      {/* ZETA Heading Section */}
      <div className="mb-8 p-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.2)_25%,rgba(255,255,255,.2)_50%,transparent_50%,transparent_75%,rgba(255,255,255,.2)_75%,rgba(255,255,255,.2))] bg-[length:40px_40px]"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-5xl font-black tracking-tight">ZETA</h1>
            <a 
              href="https://www.example.com/zeta" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              <span>Learn More</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-sm text-blue-100 mb-4">Zero Touch Automation</p>
          <p className="text-sm text-blue-100 font-medium">By TAO Testing Product</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Test Suites - Collapsible */}
          <div className="card">
            <button
              onClick={() => toggleSection('testSuites')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <TestTube className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Test Suites</h2>
              </div>
              {expandedSections.testSuites ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {expandedSections.testSuites && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <button className="btn-primary">Generate Tests with AI</button>
                </div>
                
                <div className="space-y-4">
                  {testSuites.map((suite, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{suite.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          suite.status === 'success' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {suite.passed}/{suite.total} Passed
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>{suite.passed} passed</span>
                        </div>
                        {suite.failed > 0 && (
                          <div className="flex items-center space-x-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>{suite.failed} failed</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            suite.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${(suite.passed / suite.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Security Testing - Collapsible */}
          <div className="card">
            <button
              onClick={() => toggleSection('securityTesting')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Security Testing</h2>
              </div>
              {expandedSections.securityTesting ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {expandedSections.securityTesting && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-gray-700">SQL Injection</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-gray-700">XSS Vulnerabilities</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  
                  <div className="p-3 bg-yellow-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-gray-700">CSRF Protection</span>
                    <span className="text-xs text-yellow-700">1 Warning</span>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-gray-700">Authentication</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                
                <button className="btn-secondary w-full mt-4">Run Security Scan</button>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Performance - Collapsible */}
          <div className="card">
            <button
              onClick={() => toggleSection('performance')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
              </div>
              {expandedSections.performance ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {expandedSections.performance && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">API Response Time</span>
                      <span className="text-sm font-medium text-green-600">125ms</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Page Load Time</span>
                      <span className="text-sm font-medium text-green-600">1.2s</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Memory Usage</span>
                      <span className="text-sm font-medium text-yellow-600">245MB</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                </div>
                
                <button className="btn-secondary w-full mt-4">Run Load Test</button>
              </div>
            )}
          </div>
          
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Coverage</h2>
            
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-green-50">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">91%</p>
                  <p className="text-xs text-gray-500">Coverage</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Backend</span>
                <span className="font-medium text-gray-900">87%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Frontend</span>
                <span className="font-medium text-gray-900">92%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Integration</span>
                <span className="font-medium text-gray-900">95%</span>
              </div>
            </div>
          </div>
          
          <div className="card bg-green-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">QA Sign-off</h2>
            <p className="text-sm text-gray-600 mb-4">All tests passed. Ready for production deployment.</p>
            <button className="btn-primary w-full">Submit for UAT</button>
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
                Submit Phase 6 for approval to move forward with the next phase.
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

export default Phase6Page

