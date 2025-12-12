import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, MessageSquare, Loader2, ExternalLink } from 'lucide-react'
import { getProjectPhases } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import toast from 'react-hot-toast'

interface PhaseApproval {
  phaseId: number
  projectId: number
  projectName: string
  phaseName: string
  phaseNumber: number
  status: string
  submittedDate: string
  data: any
}

const ApprovalCenter = () => {
  const [pendingApprovals, setPendingApprovals] = useState<PhaseApproval[]>([])
  const [approvalHistory, setApprovalHistory] = useState<PhaseApproval[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setPhases } = useProjectStore()
  
  useEffect(() => {
    loadApprovals()
  }, [])
  
  const loadApprovals = async () => {
    setLoading(true)
    try {
      // Fetch all projects first
      const { getProjects } = await import('../services/api')
      const projectsResponse = await getProjects()
      const projects = projectsResponse.data
      
      const pending: PhaseApproval[] = []
      const history: PhaseApproval[] = []
      
      // Load phases from all projects
      for (const project of projects) {
        try {
          const phasesResponse = await getProjectPhases(project.id)
          const phases = phasesResponse.data
          
          phases.forEach((phase: any) => {
            const approval: PhaseApproval = {
              phaseId: phase.id,
              projectId: phase.project_id,
              projectName: project.name, // Use actual project name
              phaseName: phase.phase_name,
              phaseNumber: phase.phase_number,
              status: phase.status,
              submittedDate: new Date(phase.created_at).toLocaleDateString(),
              data: phase.data
            }
            
            if (phase.status === 'pending_approval') {
              pending.push(approval)
            } else if (phase.status === 'approved' || phase.status === 'rejected') {
              history.push(approval)
            }
          })
        } catch (phaseError) {
          console.error(`Error loading phases for project ${project.id}:`, phaseError)
        }
      }
      
      setPendingApprovals(pending)
      setApprovalHistory(history)
      
      console.log(`✅ Loaded approvals: ${pending.length} pending, ${history.length} in history`)
    } catch (error) {
      console.error('Error loading approvals:', error)
      toast.error('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }
  
  const handleApprove = async (phaseId: number, projectName: string, phaseName: string) => {
    try {
      // Import updatePhase from api
      const { updatePhase } = await import('../services/api')
      
      // Get the project ID from the phase being approved
      const phaseToApprove = pendingApprovals.find(p => p.phaseId === phaseId)
      const projectId = phaseToApprove?.projectId
      
      await updatePhase(phaseId, {
        status: 'approved'
      })
      
      toast.success(`✅ Approved: ${projectName} - ${phaseName}`)
      
      // Reload approvals to update the lists
      await loadApprovals()
      
      // Also refresh the phase list in sidebar if on project page
      if (projectId) {
        const phasesResponse = await getProjectPhases(projectId)
        setPhases(phasesResponse.data)
      }
    } catch (error) {
      console.error('Error approving phase:', error)
      toast.error('Failed to approve. Please try again.')
    }
  }
  
  const handleReject = async (phaseId: number, projectName: string, phaseName: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) {
      toast.error('Rejection cancelled - reason is required')
      return
    }
    
    try {
      // Import updatePhase and getPhase from api
      const { updatePhase, getPhase } = await import('../services/api')
      
      // Get the project ID from the phase being rejected
      const phaseToReject = pendingApprovals.find(p => p.phaseId === phaseId)
      const projectId = phaseToReject?.projectId
      
      // Get current phase data to preserve it
      const phaseResponse = await getPhase(phaseId)
      const currentData = phaseResponse.data.data || {}
      
      await updatePhase(phaseId, {
        status: 'rejected',
        data: {
          ...currentData, // Preserve existing data (PRD, BRD, etc.)
          rejectionReason: reason,
          rejectedBy: user?.full_name || 'Unknown',
          rejectedAt: new Date().toISOString()
        }
      })
      
      toast.error(`❌ Rejected: ${projectName} - ${phaseName}`)
      
      // Reload approvals to update the lists
      await loadApprovals()
      
      // Also refresh the phase list in sidebar if on project page
      if (projectId) {
        const phasesResponse = await getProjectPhases(projectId)
        setPhases(phasesResponse.data)
      }
    } catch (error) {
      console.error('Error rejecting phase:', error)
      toast.error('Failed to reject. Please try again.')
    }
  }
  
  const handleViewPhase = (projectId: number, phaseNumber: number) => {
    navigate(`/projects/${projectId}/phase${phaseNumber}`)
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
      </div>
    )
  }
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Approval Center</h1>
        <p className="text-gray-500 mt-2">Review and approve project phases</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-5 h-5 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-900">Pending Approvals</h2>
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
                {pendingApprovals.length}
              </span>
            </div>
            
            <div className="space-y-4">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pending approvals</p>
                  <p className="text-sm text-gray-400 mt-2">All caught up! 🎉</p>
                </div>
              ) : (
                pendingApprovals.map((approval) => (
                  <div key={approval.phaseId} className="p-4 border-l-4 border-yellow-500 bg-yellow-50 rounded">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{approval.projectName}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Phase {approval.phaseNumber}: {approval.phaseName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted on {approval.submittedDate}
                        </p>
                        
                        {/* Show stakeholders if available */}
                        {approval.data?.stakeholders && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 font-medium">Stakeholders:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {approval.data.stakeholders.map((sh: any, idx: number) => (
                                <span key={idx} className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                                  {sh.role}: {sh.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleViewPhase(approval.projectId, approval.phaseNumber)}
                        className="ml-4 text-primary-600 hover:text-primary-800"
                        title="View Phase Details"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="mt-4 flex items-center space-x-2">
                      <button 
                        onClick={() => handleApprove(approval.phaseId, approval.projectName, approval.phaseName)}
                        className="flex-1 btn-primary flex items-center justify-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button 
                        onClick={() => handleReject(approval.phaseId, approval.projectName, approval.phaseName)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                      <button 
                        onClick={() => alert('Comment feature coming soon!')}
                        className="btn-secondary flex items-center space-x-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Comment</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Approval History</h2>
            </div>
            
            <div className="space-y-3">
              {approvalHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No approval history yet</p>
                </div>
              ) : (
                approvalHistory.map((approval) => (
                  <div
                    key={approval.phaseId}
                    className={`p-4 border-l-4 rounded ${
                      approval.status === 'approved'
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{approval.projectName}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Phase {approval.phaseNumber}: {approval.phaseName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{approval.submittedDate}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                          approval.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {approval.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Stats</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-yellow-600">{pendingApprovals.length}</p>
                <p className="text-sm text-gray-600 mt-1">Pending</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">{approvalHistory.filter(a => a.status === 'approved').length}</p>
                <p className="text-sm text-gray-600 mt-1">Total Approved</p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-red-600">{approvalHistory.filter(a => a.status === 'rejected').length}</p>
                <p className="text-sm text-gray-600 mt-1">Total Rejected</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            
            <div className="space-y-2">
              <button className="w-full btn-secondary text-left">
                Bulk Approve Selected
              </button>
              <button className="w-full btn-secondary text-left">
                Delegate Approvals
              </button>
              <button className="w-full btn-secondary text-left">
                Set Auto-Approve Rules
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApprovalCenter

