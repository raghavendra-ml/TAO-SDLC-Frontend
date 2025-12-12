import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { getProject, getProjectPhases } from '../services/api'
import { CheckCircle, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ProjectPage = () => {
  const { projectId } = useParams()
  const { currentProject, phases, setCurrentProject, setPhases } = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Phase names matching the exact headings in individual phase pages
  const getPhaseHeading = (phaseNumber: number) => {
    const headings: { [key: number]: string } = {
      1: 'Phase 1: Requirements & Business Analysis',
      2: 'Phase 2: Planning & Product Backlog',
      3: 'Phase 3: Architecture & High-Level Design (HLD)',
      4: 'Phase 4: Detailed Technical Design (LLD)',
      5: 'Phase 5: Development',
      6: 'Phase 6: Testing & QA',
      7: 'Phase 7: Deployment, Release & Operations'
    }
    return headings[phaseNumber] || `Phase ${phaseNumber}`
  }
  
  useEffect(() => {
    if (projectId) {
      setLoading(true)
      setError(null)
      
      Promise.all([
        getProject(Number(projectId)),
        getProjectPhases(Number(projectId))
      ])
        .then(([projectRes, phasesRes]) => {
          console.log('✅ Project loaded:', projectRes.data)
          console.log('✅ Phases loaded:', phasesRes.data)
          setCurrentProject(projectRes.data)
          setPhases(phasesRes.data)
          setLoading(false)
        })
        .catch((err) => {
          console.error('❌ Error loading project:', err)
          setError('Failed to load project. Please try again.')
          toast.error('Failed to load project')
          setLoading(false)
        })
    }
  }, [projectId, setCurrentProject, setPhases])
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'pending_approval':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }
  
  if (error || !currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-900 font-semibold mb-2">Failed to Load Project</p>
          <p className="text-gray-600">{error || 'Project not found'}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{currentProject.name}</h1>
        <p className="text-gray-500 mt-2">{currentProject.description}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {phases.map((phase) => (
          <Link
            key={phase.id}
            to={`/projects/${projectId}/phase${phase.phase_number}`}
            className="card group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {getStatusIcon(phase.status)}
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {getPhaseHeading(phase.phase_number)}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 capitalize">{phase.status.replace('_', ' ')}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium text-gray-700">
                  {phase.status === 'approved' ? '100%' : phase.status === 'in_progress' ? '50%' : '0%'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default ProjectPage

