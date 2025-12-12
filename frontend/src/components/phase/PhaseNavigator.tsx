import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProjectStore } from '../../store/projectStore'
import { getProjectPhases } from '../../services/api'
import { Check, Circle, Lock } from 'lucide-react'

const PhaseNavigator = () => {
  const { projectId } = useParams()
  const { phases, setPhases } = useProjectStore()
  
  useEffect(() => {
    if (projectId) {
      getProjectPhases(Number(projectId)).then((res) => setPhases(res.data))
    }
  }, [projectId])
  
  // Full phase names matching the exact headings in each phase page
  const getShortPhaseName = (phaseNumber: number) => {
    const shortNames: { [key: number]: string } = {
      1: 'Phase 1: Requirements & Business Analysis',
      2: 'Phase 2: Planning & Product Backlog',
      3: 'Phase 3: Architecture & High-Level Design (HLD)',
      4: 'Phase 4: Detailed Technical Design (LLD)',
      5: 'Phase 5: Development',
      6: 'Phase 6: Testing & QA',
      7: 'Phase 7: Deployment, Release & Operations'
    }
    return shortNames[phaseNumber] || `Phase ${phaseNumber}`
  }
  
  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Circle className="w-5 h-5 text-blue-500 fill-blue-500" />
      case 'pending_approval':
        return <Circle className="w-5 h-5 text-yellow-500" />
      default:
        return <Lock className="w-5 h-5 text-gray-400" />
    }
  }
  
  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Phase Progress</h3>
      <div className="space-y-2">
        {phases.map((phase) => (
          <Link
            key={phase.id}
            to={`/projects/${projectId}/phase${phase.phase_number}`}
            className="flex items-start space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0 mt-0.5">
              {getPhaseIcon(phase.status)}
            </div>
            <div className="flex-1 overflow-visible">
              <p className="text-xs font-medium text-gray-900 leading-tight break-words">
                {getShortPhaseName(phase.phase_number)}
              </p>
              <p className="text-[10px] text-gray-500 capitalize mt-0.5">{phase.status.replace('_', ' ')}</p>
              <div className="mt-1.5 flex items-center space-x-1">
                <div className="flex-1 bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full ${
                      phase.status === 'approved' ? 'bg-green-500' :
                      phase.status === 'in_progress' ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`}
                    style={{ width: phase.status === 'approved' ? '100%' : phase.status === 'in_progress' ? '50%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default PhaseNavigator

