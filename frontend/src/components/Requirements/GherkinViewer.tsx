import { useState } from 'react'
import { Check, Edit3, Trash2, Copy, Download, Target, ListChecks } from 'lucide-react'
import toast from 'react-hot-toast'

export interface BaseRequirement {
  id: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  category?: string;
  status?: 'draft' | 'review' | 'approved';
}

export interface FunctionalRequirement extends BaseRequirement {
  type: 'Functional';
  requirement: string;
  derived_from: string;
  stakeholder_actor: string;
}

export interface NonFunctionalRequirement extends BaseRequirement {
  type: 'Non-Functional';
  requirement: string;
  description: string;
}

export interface LegacyGherkinRequirement extends BaseRequirement {
  type?: 'Legacy';
  feature: string;
  as_a: string;
  i_want: string;
  so_that: string;
  scenarios: GherkinScenario[];
}

export type GherkinRequirement = FunctionalRequirement | NonFunctionalRequirement | LegacyGherkinRequirement

interface GherkinScenario {
  title: string
  given: string[]
  when: string[]
  then: string[]
}

interface GherkinViewerProps {
  requirements: GherkinRequirement[]
  onUpdate: (requirements: GherkinRequirement[]) => void
  onEdit: (requirement: GherkinRequirement) => void
}

const GherkinViewer = ({ requirements, onUpdate, onEdit }: GherkinViewerProps) => {
  const [expandedRequirements, setExpandedRequirements] = useState<Set<string>>(new Set())

  const toggleRequirement = (id: string) => {
    const newExpanded = new Set(expandedRequirements)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRequirements(newExpanded)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-600 text-white border-red-700'
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'review':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const updateRequirementStatus = (id: string, status: GherkinRequirement['status']) => {
    const updated = requirements.map(req =>
      req.id === id ? { ...req, status } : req
    )
    onUpdate(updated)
    toast.success(`Requirement ${status}`)
  }

  const deleteRequirement = (id: string) => {
    const updated = requirements.filter(req => req.id !== id)
    onUpdate(updated)
    toast.success('Requirement deleted')
  }

  const copyToClipboard = (requirement: GherkinRequirement) => {
    let requirementText = ''
    
    if (requirement.type === 'Functional') {
      requirementText = `ID: ${requirement.id}
Type: Functional
Requirement: ${requirement.requirement}
Derived From: ${requirement.derived_from}
Stakeholder/Actor: ${requirement.stakeholder_actor}
Priority: ${requirement.priority}
Category: ${requirement.category}`
    } else if (requirement.type === 'Non-Functional') {
      requirementText = `ID: ${requirement.id}
Type: Non-Functional
Category: ${requirement.category}
Requirement: ${requirement.requirement}
Description: ${requirement.description}
Priority: ${requirement.priority}`
    } 
    // Legacy Gherkin format
    else {
      const legacyReq = requirement as LegacyGherkinRequirement
      requirementText = `Feature: ${legacyReq.feature}
  As a ${legacyReq.as_a}
  I want ${legacyReq.i_want}
  So that ${legacyReq.so_that}

${legacyReq.scenarios.map((scenario, idx) => `  Scenario ${idx + 1}: ${scenario.title}
${scenario.given.map(g => `    Given ${g}`).join('\n')}
${scenario.when.map(w => `    When ${w}`).join('\n')}
${scenario.then.map(t => `    Then ${t}`).join('\n')}`).join('\n\n')}`
    }

    navigator.clipboard.writeText(requirementText)
    toast.success('Copied to clipboard!')
  }

  const exportAllAsGherkin = () => {
    const allRequirements = requirements.map(req => {
      if (req.type === 'Functional') {
        return `ID: ${req.id}
Type: Functional
Requirement: ${req.requirement}
Derived From: ${req.derived_from}
Stakeholder/Actor: ${req.stakeholder_actor}
Priority: ${req.priority}
Category: ${req.category}`
      } else if (req.type === 'Non-Functional') {
        return `ID: ${req.id}
Type: Non-Functional
Category: ${req.category}
Requirement: ${req.requirement}
Description: ${req.description}
Priority: ${req.priority}`
      }
      // Legacy Gherkin format
      else {
        const legacyReq = req as LegacyGherkinRequirement
        return `Feature: ${legacyReq.feature}
  As a ${legacyReq.as_a}
  I want ${legacyReq.i_want}
  So that ${legacyReq.so_that}

${legacyReq.scenarios.map((scenario, idx) => `  Scenario ${idx + 1}: ${scenario.title}
${scenario.given.map(g => `    Given ${g}`).join('\n')}
${scenario.when.map(w => `    When ${w}`).join('\n')}
${scenario.then.map(t => `    Then ${t}`).join('\n')}`).join('\n\n')}`
      }
    }).join('\n\n' + '='.repeat(80) + '\n\n')

    const blob = new Blob([allRequirements], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'requirements.txt'
    a.click()
    toast.success('Requirements file downloaded!')
  }

  if (requirements.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">No requirements extracted yet. Upload documents to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Extracted Requirements ({requirements.length})
        </h3>
        <button
          onClick={exportAllAsGherkin}
          className="btn-secondary flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export All</span>
        </button>
      </div>

      {requirements.map((requirement) => {
        const isFunctional = requirement.type === 'Functional'
        const isNonFunctional = requirement.type === 'Non-Functional'
        const isLegacyGherkin = !isFunctional && !isNonFunctional
        
        const priorityClass = getPriorityColor(requirement.priority)
        const category = ('category' in requirement) ? requirement.category : undefined
        const status = requirement.status
        
        return (
          <div
            key={requirement.id}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div
              className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer"
              onClick={() => toggleRequirement(requirement.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${priorityClass}`}>
                      {requirement.priority}
                    </span>
                    {category && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 border-blue-200">
                        {category}
                      </span>
                    )}
                    {status && (
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    )}
                  </div>
                  
                  {isFunctional ? (
                    // Functional Requirement Display
                    <>
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="w-5 h-5 text-primary-600" />
                        <h4 className="text-lg font-bold text-gray-900">
                          {requirement.requirement}
                        </h4>
                      </div>
                      <div className="text-sm text-gray-600 mt-2 p-3 bg-white rounded-lg border border-gray-200">
                        <p><span className="font-semibold">Derived From:</span> {requirement.derived_from}</p>
                        <p><span className="font-semibold">Stakeholder/Actor:</span> {requirement.stakeholder_actor}</p>
                      </div>
                    </>
                  ) : isNonFunctional ? (
                    // Non-Functional Requirement Display
                    <>
                      <div className="flex items-center space-x-2 mb-2">
                        <ListChecks className="w-5 h-5 text-purple-600" />
                        <h4 className="text-lg font-bold text-gray-900">
                          {requirement.requirement}
                        </h4>
                      </div>
                      <div className="text-sm text-gray-600 mt-2 p-3 bg-white rounded-lg border border-gray-200">
                        <p><span className="font-semibold">Description:</span> {requirement.description}</p>
                      </div>
                    </>
                  ) : (
                    // Legacy Gherkin Format Display
                    <>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">
                        Feature: {(requirement as LegacyGherkinRequirement).feature}
                      </h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p><span className="font-semibold">As a</span> {(requirement as LegacyGherkinRequirement).as_a}</p>
                        <p><span className="font-semibold">I want</span> {(requirement as LegacyGherkinRequirement).i_want}</p>
                        <p><span className="font-semibold">So that</span> {(requirement as LegacyGherkinRequirement).so_that}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(requirement)
                    }}
                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-white rounded transition-colors"
                    title="Edit Requirement"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(requirement)
                    }}
                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-white rounded transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateRequirementStatus(requirement.id, 'approved')
                    }}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-white rounded transition-colors"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteRequirement(requirement.id)
                    }}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Expandable Details */}
            {expandedRequirements.has(requirement.id) && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                {isFunctional ? (
                  // Functional Requirement: No specific steps
                  <div className="text-sm text-gray-700">
                    <p><span className="font-semibold">Derived From:</span> {requirement.derived_from}</p>
                    <p><span className="font-semibold">Stakeholder/Actor:</span> {requirement.stakeholder_actor}</p>
                  </div>
                ) : isNonFunctional ? (
                  // Non-Functional Requirement: No specific steps
                  <div className="text-sm text-gray-700">
                    <p><span className="font-semibold">Description:</span> {requirement.description}</p>
                  </div>
                ) : (
                  // Legacy Gherkin Format: Scenarios
                  requirement.scenarios && (
                    <>
                      <h5 className="font-semibold text-gray-900 mb-3">
                        Scenarios ({requirement.scenarios.length})
                      </h5>
                      <div className="space-y-4">
                        {requirement.scenarios.map((scenario, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-4 rounded-lg border border-gray-200"
                          >
                            <h6 className="font-semibold text-gray-900 mb-3">
                              Scenario {idx + 1}: {scenario.title}
                            </h6>
                            
                            <div className="space-y-2 font-mono text-sm">
                              {scenario.given.map((given, gIdx) => (
                                <div key={`g-${gIdx}`} className="flex items-start">
                                  <span className="text-blue-600 font-semibold mr-2">Given</span>
                                  <span className="text-gray-700">{given}</span>
                                </div>
                              ))}
                              {scenario.when.map((when, wIdx) => (
                                <div key={`w-${wIdx}`} className="flex items-start">
                                  <span className="text-green-600 font-semibold mr-2">When</span>
                                  <span className="text-gray-700">{when}</span>
                                </div>
                              ))}
                              {scenario.then.map((then, tIdx) => (
                                <div key={`t-${tIdx}`} className="flex items-start">
                                  <span className="text-purple-600 font-semibold mr-2">Then</span>
                                  <span className="text-gray-700">{then}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default GherkinViewer

