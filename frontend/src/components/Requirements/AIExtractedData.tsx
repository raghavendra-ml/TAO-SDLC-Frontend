import { useState } from 'react'
import { FileText, Target, ListChecks, Users, AlertTriangle, Edit2, Save, X, Trash2, Check, PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface BusinessProposal {
  Title?: string
  ProblemToSolve?: string
  Vision?: string
  Goals?: string[]
  SuccessMetrics?: string[]
  Scope?: {
    InScope?: string[]
    OutOfScope?: string[]
    IntegrationDetails?: string
  }
  Risks?: Record<string, any>
  Stakeholders?: Array<{
    Role: string
    Responsibility: string
    Notes: string
  }>
}

interface FunctionalRequirement {
  id: string
  requirement: string
  derived_from: string
  stakeholder_actor: string
  priority: string
  category: string
}

interface NonFunctionalRequirement {
  category: string
  requirement: string
  description: string
  priority: string
}

interface Stakeholder {
  Role?: string
  role?: string
  Responsibility?: string
  responsibility?: string
  Notes?: string
  notes?: string
}

interface AIExtractedDataProps {
  businessProposal?: BusinessProposal | null
  functionalRequirements: FunctionalRequirement[]
  nonFunctionalRequirements: NonFunctionalRequirement[]
  extractedStakeholders: Stakeholder[]
  extractedRisks?: Record<string, any> | null
  aiNotes?: string
  onUpdate?: (data: {
    businessProposal?: BusinessProposal | null
    functionalRequirements: FunctionalRequirement[]
    nonFunctionalRequirements: NonFunctionalRequirement[]
    extractedStakeholders: Stakeholder[]
    extractedRisks?: Record<string, any> | null
    aiNotes?: string
  }) => void
}

export default function AIExtractedData({
  businessProposal,
  functionalRequirements,
  nonFunctionalRequirements,
  extractedStakeholders,
  extractedRisks,
  aiNotes,
  onUpdate
}: AIExtractedDataProps) {
  // Local editing state
  const [editingFR, setEditingFR] = useState<string | null>(null)
  const [editingNFR, setEditingNFR] = useState<number | null>(null)
  const [editingStakeholder, setEditingStakeholder] = useState<number | null>(null)
  const [editingBP, setEditingBP] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  
  // Temporary edit values
  const [tempFR, setTempFR] = useState<FunctionalRequirement | null>(null)
  const [tempNFR, setTempNFR] = useState<NonFunctionalRequirement | null>(null)
  const [tempStakeholder, setTempStakeholder] = useState<Stakeholder | null>(null)
  const [tempBP, setTempBP] = useState<BusinessProposal | null>(null)
  const [tempNotes, setTempNotes] = useState<string>('')

  // Add-new states
  const [addingFR, setAddingFR] = useState<boolean>(false)
  const [newFR, setNewFR] = useState<FunctionalRequirement | null>(null)
  const [addingNFR, setAddingNFR] = useState<boolean>(false)
  const [newNFR, setNewNFR] = useState<NonFunctionalRequirement | null>(null)

  // Auto-save helper
  const autoSave = (updatedData: Partial<{
    businessProposal?: BusinessProposal | null
    functionalRequirements: FunctionalRequirement[]
    nonFunctionalRequirements: NonFunctionalRequirement[]
    extractedStakeholders: Stakeholder[]
    extractedRisks?: Record<string, any> | null
    aiNotes?: string
  }>) => {
    if (onUpdate) {
      onUpdate({
        businessProposal: updatedData.businessProposal ?? businessProposal,
        functionalRequirements: updatedData.functionalRequirements ?? functionalRequirements,
        nonFunctionalRequirements: updatedData.nonFunctionalRequirements ?? nonFunctionalRequirements,
        extractedStakeholders: updatedData.extractedStakeholders ?? extractedStakeholders,
        extractedRisks: updatedData.extractedRisks ?? extractedRisks,
        aiNotes: updatedData.aiNotes ?? aiNotes
      })
      toast.success('Changes saved automatically')
    }
  }

  // Edit handlers for Functional Requirements
  const handleEditFR = (req: FunctionalRequirement) => {
    setEditingFR(req.id)
    setTempFR({...req})
  }

  const handleSaveFR = () => {
    if (tempFR && editingFR) {
      const updated = functionalRequirements.map(req => 
        req.id === editingFR ? tempFR : req
      )
      autoSave({ functionalRequirements: updated })
      setEditingFR(null)
      setTempFR(null)
    }
  }

  const handleDeleteFR = (id: string) => {
    if (confirm('Delete this functional requirement?')) {
      const updated = functionalRequirements.filter(req => req.id !== id)
      autoSave({ functionalRequirements: updated })
    }
  }

  // Helpers for adding Functional Requirement
  const computeNextFRId = (): string => {
    // Find max numeric suffix among ids like FR1, FR-1, F1 etc. Default to FR1
    let maxNum = 0
    functionalRequirements.forEach(req => {
      const match = (req.id || '').match(/(\d+)/)
      if (match) {
        const n = parseInt(match[1], 10)
        if (!isNaN(n)) maxNum = Math.max(maxNum, n)
      }
    })
    return `FR${maxNum + 1}`
  }

  const startAddFR = () => {
    setAddingFR(true)
    setNewFR({
      id: '',
      requirement: '',
      derived_from: '',
      stakeholder_actor: '',
      priority: 'Medium',
      category: 'Functional'
    })
  }

  const saveNewFR = () => {
    if (!newFR || !newFR.requirement.trim()) {
      toast.error('Please enter the requirement text')
      return
    }
    const frToAdd: FunctionalRequirement = {
      ...newFR,
      id: newFR.id && newFR.id.trim() ? newFR.id.trim() : computeNextFRId()
    }
    autoSave({ functionalRequirements: [...functionalRequirements, frToAdd] })
    setAddingFR(false)
    setNewFR(null)
    toast.success('Functional requirement added')
  }

  // Edit handlers for Non-Functional Requirements
  const handleEditNFR = (req: NonFunctionalRequirement, idx: number) => {
    setEditingNFR(idx)
    setTempNFR({...req})
  }

  const handleSaveNFR = () => {
    if (tempNFR !== null && editingNFR !== null) {
      const updated = [...nonFunctionalRequirements]
      updated[editingNFR] = tempNFR
      autoSave({ nonFunctionalRequirements: updated })
      setEditingNFR(null)
      setTempNFR(null)
    }
  }

  // Helpers for adding Non-Functional Requirement
  const startAddNFR = () => {
    setAddingNFR(true)
    setNewNFR({
      category: '',
      requirement: '',
      description: '',
      priority: 'Medium'
    })
  }

  const saveNewNFR = () => {
    if (!newNFR || !newNFR.requirement.trim()) {
      toast.error('Please enter the requirement text')
      return
    }
    autoSave({ nonFunctionalRequirements: [...nonFunctionalRequirements, newNFR] })
    setAddingNFR(false)
    setNewNFR(null)
    toast.success('Non-functional requirement added')
  }

  const handleDeleteNFR = (idx: number) => {
    if (confirm('Delete this non-functional requirement?')) {
      const updated = nonFunctionalRequirements.filter((_, i) => i !== idx)
      autoSave({ nonFunctionalRequirements: updated })
    }
  }

  // Edit handlers for Stakeholders
  const handleEditStakeholder = (stakeholder: Stakeholder, idx: number) => {
    setEditingStakeholder(idx)
    setTempStakeholder({...stakeholder})
  }

  const handleSaveStakeholder = () => {
    if (tempStakeholder !== null && editingStakeholder !== null) {
      const updated = [...extractedStakeholders]
      updated[editingStakeholder] = tempStakeholder
      autoSave({ extractedStakeholders: updated })
      setEditingStakeholder(null)
      setTempStakeholder(null)
    }
  }

  const handleDeleteStakeholder = (idx: number) => {
    if (confirm('Delete this stakeholder?')) {
      const updated = extractedStakeholders.filter((_, i) => i !== idx)
      autoSave({ extractedStakeholders: updated })
    }
  }

  // Edit handlers for Business Proposal
  const handleEditBP = () => {
    setEditingBP(true)
    setTempBP(businessProposal ? {...businessProposal} : {})
  }

  const handleSaveBP = () => {
    autoSave({ businessProposal: tempBP })
    setEditingBP(false)
    setTempBP(null)
  }

  // Edit handlers for AI Notes
  const handleEditNotes = () => {
    setEditingNotes(true)
    setTempNotes(aiNotes || '')
  }

  const handleSaveNotes = () => {
    autoSave({ aiNotes: tempNotes })
    setEditingNotes(false)
    setTempNotes('')
  }
  // Check if there's any extracted data to display
  const hasData = 
    (businessProposal && Object.keys(businessProposal).length > 0) ||
    functionalRequirements.length > 0 ||
    nonFunctionalRequirements.length > 0 ||
    extractedStakeholders.length > 0 ||
    (extractedRisks && Object.keys(extractedRisks).length > 0) ||
    aiNotes

  // If no data, don't render anything
  if (!hasData) {
    return null
  }

  return (
    <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300">
      {/* Main Section Header */}
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b-2 border-blue-200">
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
          <Target className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">📊 Extracted Requirements</h2>
          <p className="text-sm text-gray-600 mt-1">AI-analyzed business requirements and specifications</p>
        </div>
      </div>

      {/* All subsections inside */}
      <div className="space-y-6">
      {/* SECTION 1: Business Proposal / Vision & Plans */}
      {businessProposal && Object.keys(businessProposal).length > 0 && (
        <div className="card bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Business Proposal / Vision & Plans</h2>
                <p className="text-sm text-gray-600">Strategic foundation and project scope</p>
              </div>
            </div>
            {!editingBP ? (
              <button onClick={handleEditBP} className="btn-primary flex items-center space-x-2">
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button onClick={handleSaveBP} className="btn-primary flex items-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>Save All</span>
                </button>
                <button onClick={() => {setEditingBP(false); setTempBP(null)}} className="btn-secondary flex items-center space-x-2">
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg p-6 space-y-4">
            {editingBP ? (
              // Edit Mode - All fields editable
              <>
                <div>
                  <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1 block">Project Title</label>
                  <input
                    type="text"
                    value={tempBP?.Title || ''}
                    onChange={(e) => setTempBP(prev => prev ? {...prev, Title: e.target.value} : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2 block">Problem to Solve</label>
                  <textarea
                    value={tempBP?.ProblemToSolve || ''}
                    onChange={(e) => setTempBP(prev => prev ? {...prev, ProblemToSolve: e.target.value} : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2 block">Vision</label>
                  <textarea
                    value={tempBP?.Vision || ''}
                    onChange={(e) => setTempBP(prev => prev ? {...prev, Vision: e.target.value} : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2 block">Goals (one per line)</label>
                  <textarea
                    value={(tempBP?.Goals || []).join('\n')}
                    onChange={(e) => setTempBP(prev => prev ? {...prev, Goals: e.target.value.split('\n').filter(g => g.trim())} : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={5}
                    placeholder="Enter each goal on a new line"
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2 block">Success Metrics (one per line)</label>
                  <textarea
                    value={(tempBP?.SuccessMetrics || []).join('\n')}
                    onChange={(e) => setTempBP(prev => prev ? {...prev, SuccessMetrics: e.target.value.split('\n').filter(m => m.trim())} : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={5}
                    placeholder="Enter each metric on a new line"
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3 block">Scope</label>
                  <div className="space-y-4">
                    <div>
                      <label className="font-medium text-gray-900 mb-2 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        In-Scope (one per line)
                      </label>
                      <textarea
                        value={(tempBP?.Scope?.InScope || []).join('\n')}
                        onChange={(e) => setTempBP(prev => prev ? {
                          ...prev,
                          Scope: {...(prev.Scope || {}), InScope: e.target.value.split('\n').filter(i => i.trim())}
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={4}
                        placeholder="Enter each in-scope item on a new line"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-gray-900 mb-2 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Out-of-Scope (one per line)
                      </label>
                      <textarea
                        value={(tempBP?.Scope?.OutOfScope || []).join('\n')}
                        onChange={(e) => setTempBP(prev => prev ? {
                          ...prev,
                          Scope: {...(prev.Scope || {}), OutOfScope: e.target.value.split('\n').filter(i => i.trim())}
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={4}
                        placeholder="Enter each out-of-scope item on a new line"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-blue-900 mb-1 block">Integration Details</label>
                      <textarea
                        value={tempBP?.Scope?.IntegrationDetails || ''}
                        onChange={(e) => setTempBP(prev => prev ? {
                          ...prev,
                          Scope: {...(prev.Scope || {}), IntegrationDetails: e.target.value}
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // View Mode
              <>
                {businessProposal.Title && (
                  <div>
                    <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Project Title</h3>
                    <p className="text-xl font-bold text-gray-900">{businessProposal.Title}</p>
                  </div>
                )}
                
                {businessProposal.ProblemToSolve && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Problem to Solve</h3>
                    <p className="text-gray-700 leading-relaxed">{businessProposal.ProblemToSolve}</p>
                  </div>
                )}
                
                {businessProposal.Vision && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Vision</h3>
                    <p className="text-gray-700 leading-relaxed">{businessProposal.Vision}</p>
                  </div>
                )}
                
                {businessProposal.Goals && businessProposal.Goals.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Goals</h3>
                    <ul className="space-y-2">
                      {businessProposal.Goals.map((goal, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-purple-500 mr-2 mt-1">•</span>
                          <span className="text-gray-700">{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {businessProposal.SuccessMetrics && businessProposal.SuccessMetrics.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Success Metrics</h3>
                    <ul className="space-y-2">
                      {businessProposal.SuccessMetrics.map((metric, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-500 mr-2 mt-1">✓</span>
                          <span className="text-gray-700">{metric}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {businessProposal.Scope && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3">Scope</h3>
                    {businessProposal.Scope.InScope && businessProposal.Scope.InScope.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          In-Scope
                        </h4>
                        <ul className="ml-6 space-y-1">
                          {businessProposal.Scope.InScope.map((item, idx) => (
                            <li key={idx} className="text-gray-700 text-sm">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {businessProposal.Scope.OutOfScope && businessProposal.Scope.OutOfScope.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                          Out-of-Scope
                        </h4>
                        <ul className="ml-6 space-y-1">
                          {businessProposal.Scope.OutOfScope.map((item, idx) => (
                            <li key={idx} className="text-gray-700 text-sm">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {businessProposal.Scope.IntegrationDetails && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold text-blue-900">Integration Details:</span> {businessProposal.Scope.IntegrationDetails}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: AI-Extracted Requirements */}
      {(functionalRequirements.length > 0 || nonFunctionalRequirements.length > 0) && (
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI-Extracted Requirements</h2>
              <p className="text-sm text-gray-600">Functional and non-functional requirements</p>
            </div>
          </div>

          {/* Functional Requirements */}
          {functionalRequirements.length > 0 && (
            <div className="bg-white rounded-lg p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Functional Requirements ({functionalRequirements.length})</h3>
                </div>
              </div>
              <div className="space-y-3">
                {functionalRequirements.map((req, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                    {editingFR === req.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase">Requirement</label>
                          <textarea
                            value={tempFR?.requirement || ''}
                            onChange={(e) => setTempFR(prev => prev ? {...prev, requirement: e.target.value} : null)}
                            className="input w-full mt-1"
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase">Derived From</label>
                            <input
                              value={tempFR?.derived_from || ''}
                              onChange={(e) => setTempFR(prev => prev ? {...prev, derived_from: e.target.value} : null)}
                              className="input w-full mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase">Stakeholder</label>
                            <input
                              value={tempFR?.stakeholder_actor || ''}
                              onChange={(e) => setTempFR(prev => prev ? {...prev, stakeholder_actor: e.target.value} : null)}
                              className="input w-full mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase">Priority</label>
                            <select
                              value={tempFR?.priority || 'Medium'}
                              onChange={(e) => setTempFR(prev => prev ? {...prev, priority: e.target.value} : null)}
                              className="input w-full mt-1"
                            >
                              <option value="Critical">Critical</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase">Category</label>
                            <input
                              value={tempFR?.category || ''}
                              onChange={(e) => setTempFR(prev => prev ? {...prev, category: e.target.value} : null)}
                              className="input w-full mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={handleSaveFR} className="btn-primary flex items-center space-x-1 text-sm">
                            <Save className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                          <button onClick={() => {setEditingFR(null); setTempFR(null)}} className="btn-secondary flex items-center space-x-1 text-sm">
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">{req.id}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              req.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                              req.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                              req.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {req.priority}
                            </span>
                            <button onClick={() => handleEditFR(req)} className="text-blue-600 hover:text-blue-800">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteFR(req.id)} className="text-red-600 hover:text-red-800">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-900 font-medium mb-3">{req.requirement}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs uppercase tracking-wide">Derived From</span>
                            <p className="text-gray-700 font-medium">{req.derived_from}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs uppercase tracking-wide">Stakeholder/Actor</span>
                            <p className="text-gray-700 font-medium">{req.stakeholder_actor}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs uppercase tracking-wide">Category</span>
                            <p className="text-gray-700 font-medium">{req.category}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {/* Add FR inline form or button */}
              {!addingFR ? (
                <div className="mt-4">
                  <button onClick={startAddFR} className="btn-secondary flex items-center space-x-2">
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Functional Requirement</span>
                  </button>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Requirement</label>
                    <textarea
                      value={newFR?.requirement || ''}
                      onChange={(e) => setNewFR(prev => prev ? { ...prev, requirement: e.target.value } : null)}
                      className="input w-full mt-1"
                      rows={2}
                      placeholder="Describe the requirement"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Derived From</label>
                      <input
                        value={newFR?.derived_from || ''}
                        onChange={(e) => setNewFR(prev => prev ? { ...prev, derived_from: e.target.value } : null)}
                        className="input w-full mt-1"
                        placeholder="Goal, Vision, or Source"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Stakeholder</label>
                      <input
                        value={newFR?.stakeholder_actor || ''}
                        onChange={(e) => setNewFR(prev => prev ? { ...prev, stakeholder_actor: e.target.value } : null)}
                        className="input w-full mt-1"
                        placeholder="e.g., Admin, User"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Priority</label>
                      <select
                        value={newFR?.priority || 'Medium'}
                        onChange={(e) => setNewFR(prev => prev ? { ...prev, priority: e.target.value } as any : null)}
                        className="input w-full mt-1"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Category</label>
                      <input
                        value={newFR?.category || ''}
                        onChange={(e) => setNewFR(prev => prev ? { ...prev, category: e.target.value } : null)}
                        className="input w-full mt-1"
                        placeholder="Category"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">ID (optional)</label>
                      <input
                        value={newFR?.id || ''}
                        onChange={(e) => setNewFR(prev => prev ? { ...prev, id: e.target.value } : null)}
                        className="input w-full mt-1"
                        placeholder="Auto-generates if left blank (e.g., FR6)"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={saveNewFR} className="btn-primary flex items-center space-x-1 text-sm">
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    <button onClick={() => { setAddingFR(false); setNewFR(null) }} className="btn-secondary flex items-center space-x-1 text-sm">
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Non-Functional Requirements */}
          {nonFunctionalRequirements.length > 0 && (
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <ListChecks className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Non-Functional Requirements ({nonFunctionalRequirements.length})</h3>
              </div>
              <div className="space-y-3">
                {nonFunctionalRequirements.map((req, idx) => (
                  <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                    {editingNFR === idx ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase">Category</label>
                            <input
                              value={tempNFR?.category || ''}
                              onChange={(e) => setTempNFR(prev => prev ? {...prev, category: e.target.value} : null)}
                              className="input w-full mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase">Priority</label>
                            <select
                              value={tempNFR?.priority || 'Medium'}
                              onChange={(e) => setTempNFR(prev => prev ? {...prev, priority: e.target.value} : null)}
                              className="input w-full mt-1"
                            >
                              <option value="Critical">Critical</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase">Requirement</label>
                          <input
                            value={tempNFR?.requirement || ''}
                            onChange={(e) => setTempNFR(prev => prev ? {...prev, requirement: e.target.value} : null)}
                            className="input w-full mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase">Description</label>
                          <textarea
                            value={tempNFR?.description || ''}
                            onChange={(e) => setTempNFR(prev => prev ? {...prev, description: e.target.value} : null)}
                            className="input w-full mt-1"
                            rows={2}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={handleSaveNFR} className="btn-primary flex items-center space-x-1 text-sm">
                            <Save className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                          <button onClick={() => {setEditingNFR(null); setTempNFR(null)}} className="btn-secondary flex items-center space-x-1 text-sm">
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded">{req.category}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              req.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                              req.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                              req.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {req.priority}
                            </span>
                            <button onClick={() => handleEditNFR(req, idx)} className="text-purple-600 hover:text-purple-800">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteNFR(idx)} className="text-red-600 hover:text-red-800">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-900 font-medium mb-2">{req.requirement}</p>
                        <p className="text-gray-600 text-sm">{req.description}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {/* Add NFR inline form or button */}
              {!addingNFR ? (
                <div className="mt-4">
                  <button onClick={startAddNFR} className="btn-secondary flex items-center space-x-2">
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Non-Functional Requirement</span>
                  </button>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Category</label>
                      <input
                        value={newNFR?.category || ''}
                        onChange={(e) => setNewNFR(prev => prev ? { ...prev, category: e.target.value } : null)}
                        className="input w-full mt-1"
                        placeholder="e.g., Performance, Security"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Priority</label>
                      <select
                        value={newNFR?.priority || 'Medium'}
                        onChange={(e) => setNewNFR(prev => prev ? { ...prev, priority: e.target.value } as any : null)}
                        className="input w-full mt-1"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Requirement</label>
                    <input
                      value={newNFR?.requirement || ''}
                      onChange={(e) => setNewNFR(prev => prev ? { ...prev, requirement: e.target.value } : null)}
                      className="input w-full mt-1"
                      placeholder="State the requirement"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Description</label>
                    <textarea
                      value={newNFR?.description || ''}
                      onChange={(e) => setNewNFR(prev => prev ? { ...prev, description: e.target.value } : null)}
                      className="input w-full mt-1"
                      rows={2}
                      placeholder="Add details"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={saveNewNFR} className="btn-primary flex items-center space-x-1 text-sm">
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    <button onClick={() => { setAddingNFR(false); setNewNFR(null) }} className="btn-secondary flex items-center space-x-1 text-sm">
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: AI-Derived Stakeholders */}
      {extractedStakeholders.length > 0 && (
        <div className="card bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Stakeholders</h2>
              <p className="text-sm text-gray-600">Key people involved in the project</p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extractedStakeholders.map((stakeholder, idx) => (
                <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                  {editingStakeholder === idx ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <input 
                          type="text" 
                          value={tempStakeholder?.Role || tempStakeholder?.role || ''} 
                          onChange={(e) => setTempStakeholder({...tempStakeholder!, Role: e.target.value, role: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="e.g., Project Manager"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Responsibility</label>
                        <textarea 
                          value={tempStakeholder?.Responsibility || tempStakeholder?.responsibility || ''} 
                          onChange={(e) => setTempStakeholder({...tempStakeholder!, Responsibility: e.target.value, responsibility: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          rows={2}
                          placeholder="Describe responsibilities..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                        <textarea 
                          value={tempStakeholder?.Notes || tempStakeholder?.notes || ''} 
                          onChange={(e) => setTempStakeholder({...tempStakeholder!, Notes: e.target.value, notes: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          rows={2}
                          placeholder="Additional notes..."
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-2">
                        <button onClick={handleSaveStakeholder} className="btn-primary flex items-center space-x-1 text-sm">
                          <Check className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                        <button onClick={() => {setEditingStakeholder(null); setTempStakeholder(null)}} className="btn-secondary flex items-center space-x-1 text-sm">
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-green-700" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-bold text-gray-900">{stakeholder.Role || stakeholder.role}</h4>
                          <div className="flex items-center space-x-1">
                            <button onClick={() => handleEditStakeholder(stakeholder, idx)} className="text-green-600 hover:text-green-800">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteStakeholder(idx)} className="text-red-600 hover:text-red-800">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{stakeholder.Responsibility || stakeholder.responsibility}</p>
                        {(stakeholder.Notes || stakeholder.notes) && (
                          <p className="text-xs text-gray-600 italic">{stakeholder.Notes || stakeholder.notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: AI-Derived Risks */}
      {extractedRisks && Object.keys(extractedRisks).length > 0 && (
        <div className="card bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Risk Analysis</h2>
              <p className="text-sm text-gray-600">Identified risks and categorization</p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6">
            <div className="space-y-3">
              {Object.entries(extractedRisks).map(([category, description], idx) => (
                <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">{category.replace(/([A-Z])/g, ' $1').trim()}</h4>
                      <p className="text-gray-700 text-sm">{description as string}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Constraints / AI Notes */}
      {aiNotes && (
        <div className="card bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-600 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Constraints & Assumptions</h2>
                <p className="text-sm text-gray-600">AI-inferred notes and considerations</p>
              </div>
            </div>
            {!editingNotes ? (
              <button onClick={handleEditNotes} className="btn-primary flex items-center space-x-2">
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button onClick={handleSaveNotes} className="btn-primary flex items-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button onClick={() => {setEditingNotes(false); setTempNotes('')}} className="btn-secondary flex items-center space-x-2">
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg p-6">
            {editingNotes ? (
              <textarea 
                value={tempNotes} 
                onChange={(e) => setTempNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                rows={10}
                placeholder="Enter notes, constraints, and assumptions..."
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{aiNotes}</p>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
