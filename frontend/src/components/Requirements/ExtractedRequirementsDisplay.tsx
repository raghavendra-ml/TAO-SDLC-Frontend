import { useState, useEffect } from 'react'
import { FileText, Target, ListChecks, AlertTriangle, Edit2, Save, X, Trash2, Check, ChevronDown, ChevronUp, Code } from 'lucide-react'
import toast from 'react-hot-toast'

interface BusinessProposal {
  Title?: string
  ProblemToSolve?: string
  Vision?: string
  Stakeholders?: Array<{
    Role?: string
    Responsibility?: string
    Notes?: string
  }>
  Scope?: {
    InScope?: string[]
    OutOfScope?: string[]
  }
  SuccessMetrics?: string[]
}

interface FunctionalRequirement {
  ID: string
  Service: string
  Requirement: string
  Priority: string
  Category: string
  type?: string
}

interface NonFunctionalRequirement {
  category: string
  requirement: string
  description: string
  priority: string
  type?: string
}

interface ExtractedRequirementsDisplayProps {
  input?: string
  businessProposal?: BusinessProposal | null
  functionalRequirements: FunctionalRequirement[]
  nonFunctionalRequirements: NonFunctionalRequirement[]
  stakeholders?: any[]
  technologiesAndTools?: Record<string, any>
  riskAnalysis?: Record<string, string[]>
  additionalNotes?: string
  onUpdate?: (data: any) => void
}

export default function ExtractedRequirementsDisplay({
  input = '',
  businessProposal: initialBP,
  functionalRequirements: initialFR,
  nonFunctionalRequirements: initialNFR,
  technologiesAndTools,
  riskAnalysis,
  additionalNotes: initialAdditionalNotes = '',
  onUpdate
}: ExtractedRequirementsDisplayProps) {
  // Editable state
  const [displayInput, setDisplayInput] = useState(input)
  const [businessProposal, setBusinessProposal] = useState(initialBP)
  const [functionalRequirements, setFunctionalRequirements] = useState(initialFR)
  const [nonFunctionalRequirements, setNonFunctionalRequirements] = useState(initialNFR)

  // Sync local state with prop changes (fix for requirements not displaying on first extraction)
  useEffect(() => {
    setDisplayInput(input)
    if (initialFR) setFunctionalRequirements(initialFR)
    if (initialNFR) setNonFunctionalRequirements(initialNFR)
    if (initialBP) setBusinessProposal(initialBP)
    if (initialAdditionalNotes) setAdditionalNotes(initialAdditionalNotes)
  }, [input, initialFR, initialNFR, initialBP, initialAdditionalNotes])

  // Edit mode states
  const [editingFRId, setEditingFRId] = useState<string | null>(null)
  const [editingNFRIdx, setEditingNFRIdx] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingProblem, setEditingProblem] = useState(false)
  const [editingVision, setEditingVision] = useState(false)
  const [editingScope, setEditingScope] = useState(false)
  const [editingMetrics, setEditingMetrics] = useState(false)
  const [editingStakeholders, setEditingStakeholders] = useState(false)
  const [editingRisks, setEditingRisks] = useState(false)

  // Temp edit values
  const [tempTitle, setTempTitle] = useState(businessProposal?.Title || '')
  const [tempProblem, setTempProblem] = useState(businessProposal?.ProblemToSolve || '')
  const [tempVision, setTempVision] = useState(businessProposal?.Vision || '')
  const [tempInScope, setTempInScope] = useState((businessProposal?.Scope?.InScope || []).join('\n'))
  const [tempOutScope, setTempOutScope] = useState((businessProposal?.Scope?.OutOfScope || []).join('\n'))
  const [tempMetrics, setTempMetrics] = useState((businessProposal?.SuccessMetrics || []).join('\n'))
  const [tempStakeholders, setTempStakeholders] = useState((businessProposal?.Stakeholders || []).join(', '))
  const [tempFR, setTempFR] = useState<FunctionalRequirement | null>(null)
  const [tempNFR, setTempNFR] = useState<NonFunctionalRequirement | null>(null)
  const [tempRisks, setTempRisks] = useState<Record<string, string[]>>({})

  // Manual input states
  const [showManualFRInput, setShowManualFRInput] = useState(false)
  const [showManualNFRInput, setShowManualNFRInput] = useState(false)
  const [showAdditionalNotes, setShowAdditionalNotes] = useState(false)
  
  // Manual FR input
  const [manualFRRequirement, setManualFRRequirement] = useState('')
  const [manualFRService, setManualFRService] = useState('')
  const [manualFRPriority, setManualFRPriority] = useState('High')
  const [manualFRCategory, setManualFRCategory] = useState('')
  
  // Manual NFR input
  const [manualNFRCategory, setManualNFRCategory] = useState('')
  const [manualNFRRequirement, setManualNFRRequirement] = useState('')
  const [manualNFRDescription, setManualNFRDescription] = useState('')
  const [manualNFRPriority, setManualNFRPriority] = useState('High')
  
  // Additional notes
  const [additionalNotes, setAdditionalNotes] = useState('')

  const [expandedSections, setExpandedSections] = useState({
    input: false,  // Start collapsed
    businessProposal: true,
    requirements: true,
    technologies: true,
    risks: true,
    additionalNotes: false
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleAutoSave = () => {
    if (onUpdate) {
      onUpdate({
        businessProposal,
        functionalRequirements,
        nonFunctionalRequirements,
        technologiesAndTools,
        riskAnalysis,
        additionalNotes
      })
    }
    toast.success('Changes saved!')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Performance': 'bg-blue-50 border-blue-200',
      'Scalability': 'bg-purple-50 border-purple-200',
      'Security': 'bg-red-50 border-red-200',
      'Reliability': 'bg-green-50 border-green-200',
      'Maintainability': 'bg-yellow-50 border-yellow-200',
      'Availability': 'bg-indigo-50 border-indigo-200',
      'Functional': 'bg-cyan-50 border-cyan-200'
    }
    return colors[category] || 'bg-gray-50 border-gray-200'
  }

  // Edit handlers for Business Proposal
  const handleEditTitle = () => {
    setEditingTitle(true)
    setTempTitle(businessProposal?.Title || '')
  }

  const handleSaveTitle = () => {
    if (businessProposal) {
      setBusinessProposal({ ...businessProposal, Title: tempTitle })
    }
    setEditingTitle(false)
    handleAutoSave()
  }

  const handleEditProblem = () => {
    setEditingProblem(true)
    setTempProblem(businessProposal?.ProblemToSolve || '')
  }

  const handleSaveProblem = () => {
    if (businessProposal) {
      setBusinessProposal({ ...businessProposal, ProblemToSolve: tempProblem })
    }
    setEditingProblem(false)
    handleAutoSave()
  }

  const handleEditVision = () => {
    setEditingVision(true)
    setTempVision(businessProposal?.Vision || '')
  }

  const handleSaveVision = () => {
    if (businessProposal) {
      setBusinessProposal({ ...businessProposal, Vision: tempVision })
    }
    setEditingVision(false)
    handleAutoSave()
  }

  const handleSaveScope = () => {
    if (businessProposal) {
      const inScope = tempInScope.split('\n').map(s => s.trim()).filter(s => s.length > 0)
      const outScope = tempOutScope.split('\n').map(s => s.trim()).filter(s => s.length > 0)
      setBusinessProposal({ 
        ...businessProposal, 
        Scope: { InScope: inScope, OutOfScope: outScope } 
      })
    }
    setEditingScope(false)
    handleAutoSave()
  }

  const handleSaveMetrics = () => {
    if (businessProposal) {
      const metrics = tempMetrics.split('\n').map(s => s.trim()).filter(s => s.length > 0)
      setBusinessProposal({ ...businessProposal, SuccessMetrics: metrics })
    }
    setEditingMetrics(false)
    handleAutoSave()
  }

  const handleSaveStakeholders = () => {
    if (businessProposal) {
      const stakeholders = tempStakeholders.split(',').map(s => s.trim()).filter(s => s.length > 0)
      setBusinessProposal({ ...businessProposal, Stakeholders: stakeholders as any })
    }
    setEditingStakeholders(false)
    handleAutoSave()
  }

  // FR edit handlers
  const handleEditFR = (fr: FunctionalRequirement) => {
    setEditingFRId(fr.ID)
    setTempFR({ ...fr })
  }

  const handleSaveFR = () => {
    if (tempFR && editingFRId) {
      setFunctionalRequirements(reqs => reqs.map(r => r.ID === editingFRId ? tempFR : r))
    }
    setEditingFRId(null)
    setTempFR(null)
    handleAutoSave()
  }

  const handleDeleteFR = (id: string) => {
    setFunctionalRequirements(reqs => reqs.filter(r => r.ID !== id))
    handleAutoSave()
    toast.success('Requirement deleted')
  }

  // NFR edit handlers
  const handleEditNFR = (idx: number, nfr: NonFunctionalRequirement) => {
    setEditingNFRIdx(idx)
    setTempNFR({ ...nfr })
  }

  const handleSaveNFR = () => {
    if (tempNFR !== null && editingNFRIdx !== null) {
      const newNFRs = [...nonFunctionalRequirements]
      newNFRs[editingNFRIdx] = tempNFR
      setNonFunctionalRequirements(newNFRs)
    }
    setEditingNFRIdx(null)
    setTempNFR(null)
    handleAutoSave()
  }

  const handleDeleteNFR = (idx: number) => {
    setNonFunctionalRequirements(reqs => reqs.filter((_, i) => i !== idx))
    handleAutoSave()
    toast.success('NFR deleted')
  }

  // Risk Analysis edit handlers
  const handleEditRisks = () => {
    setEditingRisks(true)
    setTempRisks({ ...riskAnalysis })
  }

  const handleSaveRisks = () => {
    if (onUpdate) {
      onUpdate({
        businessProposal,
        functionalRequirements,
        nonFunctionalRequirements,
        technologiesAndTools,
        riskAnalysis: tempRisks
      })
    }
    setEditingRisks(false)
    toast.success('Risk Analysis updated!')
  }

  const handleDeleteRiskCategory = (category: string) => {
    setTempRisks(prev => {
      const updated = { ...prev }
      delete updated[category]
      return updated
    })
    toast.success('Risk category deleted')
  }

  const handleAddRiskToCategory = (category: string, risk: string) => {
    setTempRisks(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), risk]
    }))
  }

  const handleDeleteRiskFromCategory = (category: string, riskIndex: number) => {
    setTempRisks(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== riskIndex)
    }))
  }

  // Manual FR handlers
  const handleAddManualFR = () => {
    if (!manualFRRequirement.trim() || !manualFRService.trim()) {
      toast.error('Please fill in Requirement and Service fields')
      return
    }
    
    const newFR: FunctionalRequirement = {
      ID: `FR-${Date.now()}`,
      Requirement: manualFRRequirement,
      Service: manualFRService,
      Priority: manualFRPriority,
      Category: manualFRCategory || 'General'
    }
    
    setFunctionalRequirements([...functionalRequirements, newFR])
    setManualFRRequirement('')
    setManualFRService('')
    setManualFRPriority('High')
    setManualFRCategory('')
    setShowManualFRInput(false)
    
    handleAutoSave()
    toast.success('Functional Requirement added!')
  }

  // Manual NFR handlers
  const handleAddManualNFR = () => {
    if (!manualNFRRequirement.trim() || !manualNFRCategory.trim()) {
      toast.error('Please fill in Category and Requirement fields')
      return
    }
    
    const newNFR: NonFunctionalRequirement = {
      category: manualNFRCategory,
      requirement: manualNFRRequirement,
      description: manualNFRDescription,
      priority: manualNFRPriority
    }
    
    setNonFunctionalRequirements([...nonFunctionalRequirements, newNFR])
    setManualNFRCategory('')
    setManualNFRRequirement('')
    setManualNFRDescription('')
    setManualNFRPriority('High')
    setShowManualNFRInput(false)
    
    handleAutoSave()
    toast.success('Non-Functional Requirement added!')
  }

  // Additional notes handler
  const handleSaveAdditionalNotes = () => {
    if (onUpdate) {
      onUpdate({
        businessProposal,
        functionalRequirements,
        nonFunctionalRequirements,
        technologiesAndTools,
        riskAnalysis,
        additionalNotes
      })
    }
    setShowAdditionalNotes(false)
    toast.success('Additional notes saved!')
  }

  // Group FR by service
  const groupedByService = functionalRequirements.reduce((acc, req) => {
    const service = req.Service || 'General'
    if (!acc[service]) acc[service] = []
    acc[service].push(req)
    return acc
  }, {} as Record<string, FunctionalRequirement[]>)

  return (
    <div className="space-y-4 mt-6">
      {/* INPUT SECTION - Show if there's input OR if there are any requirements extracted */}
      {(displayInput || functionalRequirements.length > 0 || nonFunctionalRequirements.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('input')}
            className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">📥 Input Provided</h3>
            </div>
            {expandedSections.input ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {expandedSections.input && (
            <div className="px-6 py-4 bg-white">
              {displayInput ? (
                <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm text-gray-700 max-h-40 overflow-y-auto">
                  {displayInput}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm text-gray-600 italic">
                  Input details not available (requirements extracted from uploaded document or previous session)
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* BUSINESS PROPOSAL / VISION SECTION */}
      {businessProposal && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('businessProposal')}
            className="w-full px-6 py-4 flex items-center justify-between bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Target size={20} className="text-blue-600" />
              <h3 className="font-semibold text-blue-900">🎯 Business Proposal & Vision</h3>
            </div>
            {expandedSections.businessProposal ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {expandedSections.businessProposal && (
            <div className="px-6 py-4 bg-white space-y-4">
              {!businessProposal ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600 italic">
                  No business proposal data. Extract requirements first.
                </div>
              ) : (
                <>
              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900">Title</h4>
                  {!editingTitle ? (
                    <button onClick={handleEditTitle} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                      <Edit2 size={16} /> Edit
                    </button>
                  ) : null}
                </div>
                {editingTitle ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      className="flex-1 px-3 py-2 border border-blue-300 rounded bg-white"
                    />
                    <button onClick={handleSaveTitle} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                      <Save size={16} /> Save
                    </button>
                    <button onClick={() => setEditingTitle(false)} className="px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-700 bg-blue-50 p-3 rounded">{businessProposal?.Title || 'No title'}</p>
                )}
              </div>

              {/* Problem to Solve */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900">🔴 Problem to Solve</h4>
                  {!editingProblem ? (
                    <button onClick={handleEditProblem} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                      <Edit2 size={16} /> Edit
                    </button>
                  ) : null}
                </div>
                {editingProblem ? (
                  <div className="flex gap-2">
                    <textarea
                      value={tempProblem}
                      onChange={(e) => setTempProblem(e.target.value)}
                      className="flex-1 px-3 py-2 border border-red-300 rounded bg-white min-h-24"
                    />
                    <div className="flex flex-col gap-2">
                      <button onClick={handleSaveProblem} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                        <Save size={16} />
                      </button>
                      <button onClick={() => setEditingProblem(false)} className="px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 bg-red-50 p-3 rounded">{businessProposal.ProblemToSolve}</p>
                )}
              </div>

              {/* Vision */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900">🌟 Vision</h4>
                  {!editingVision ? (
                    <button onClick={handleEditVision} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                      <Edit2 size={16} /> Edit
                    </button>
                  ) : null}
                </div>
                {editingVision ? (
                  <div className="flex gap-2">
                    <textarea
                      value={tempVision}
                      onChange={(e) => setTempVision(e.target.value)}
                      className="flex-1 px-3 py-2 border border-purple-300 rounded bg-white min-h-24"
                    />
                    <div className="flex flex-col gap-2">
                      <button onClick={handleSaveVision} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                        <Save size={16} />
                      </button>
                      <button onClick={() => setEditingVision(false)} className="px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 bg-purple-50 p-3 rounded">{businessProposal.Vision}</p>
                )}
              </div>

              {/* Scope */}
              {businessProposal.Scope && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">🎯 Scope</h4>
                    {!editingScope ? (
                      <button onClick={() => setEditingScope(true)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                        <Edit2 size={16} /> Edit
                      </button>
                    ) : null}
                  </div>
                  {editingScope ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-green-700 mb-1 block">In Scope (one per line):</label>
                        <textarea
                          value={tempInScope}
                          onChange={(e) => setTempInScope(e.target.value)}
                          className="w-full px-3 py-2 border border-green-300 rounded bg-white min-h-20 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-orange-700 mb-1 block">Out of Scope (one per line):</label>
                        <textarea
                          value={tempOutScope}
                          onChange={(e) => setTempOutScope(e.target.value)}
                          className="w-full px-3 py-2 border border-orange-300 rounded bg-white min-h-20 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveScope} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                          <Save size={16} /> Save
                        </button>
                        <button onClick={() => setEditingScope(false)} className="px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {businessProposal.Scope.InScope && businessProposal.Scope.InScope.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-green-900 mb-2">✅ In Scope</h5>
                          <ul className="space-y-1">
                            {businessProposal.Scope.InScope.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-green-50 p-2 rounded">
                                <Check size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {businessProposal.Scope.OutOfScope && businessProposal.Scope.OutOfScope.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-orange-900 mb-2">❌ Out of Scope</h5>
                          <ul className="space-y-1">
                            {businessProposal.Scope.OutOfScope.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-orange-50 p-2 rounded">
                                <X size={14} className="text-orange-600 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Success Metrics */}
              {businessProposal.SuccessMetrics && businessProposal.SuccessMetrics.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">📊 Success Metrics</h4>
                    {!editingMetrics ? (
                      <button onClick={() => setEditingMetrics(true)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                        <Edit2 size={16} /> Edit
                      </button>
                    ) : null}
                  </div>
                  {editingMetrics ? (
                    <div className="space-y-2">
                      <textarea
                        value={tempMetrics}
                        onChange={(e) => setTempMetrics(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded bg-white min-h-24 text-sm"
                        placeholder="Enter metrics (one per line)"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveMetrics} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                          <Save size={16} /> Save
                        </button>
                        <button onClick={() => setEditingMetrics(false)} className="px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {businessProposal.SuccessMetrics.map((metric, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-center gap-2 bg-blue-50 p-2 rounded">
                          <Check size={14} className="text-blue-600" />
                          {metric}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Stakeholders - Simple comma-separated, always editable */}
              {businessProposal.Stakeholders && Array.isArray(businessProposal.Stakeholders) && businessProposal.Stakeholders.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">👥 Stakeholders</h4>
                    {!editingStakeholders ? (
                      <button onClick={() => setEditingStakeholders(true)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                        <Edit2 size={16} /> Edit
                      </button>
                    ) : null}
                  </div>
                  {editingStakeholders ? (
                    <div className="space-y-2">
                      <textarea
                        value={tempStakeholders}
                        onChange={(e) => setTempStakeholders(e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 rounded bg-white min-h-16 text-sm"
                        placeholder="Enter stakeholders (comma-separated)"
                      />
                      <p className="text-xs text-gray-500">💡 Tip: Enter names separated by commas, e.g. "Product Manager, CTO, Frontend Lead, Backend Lead"</p>
                      <div className="flex gap-2">
                        <button onClick={handleSaveStakeholders} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                          <Save size={16} /> Save
                        </button>
                        <button onClick={() => setEditingStakeholders(false)} className="px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(businessProposal.Stakeholders as any[]).map((sh: any, idx: number) => {
                        const name = typeof sh === 'string' ? sh : (sh.Role || sh.name || sh.title || 'Unknown')
                        return (
                          <span key={idx} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                            {name}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* EXTRACTED REQUIREMENTS SECTION */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('requirements')}
          className="w-full px-6 py-4 flex items-center justify-between bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ListChecks size={20} className="text-indigo-600" />
            <h3 className="font-semibold text-indigo-900">
              📋 Extracted Requirements ({functionalRequirements.length + nonFunctionalRequirements.length})
            </h3>
          </div>
          {expandedSections.requirements ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.requirements && (
          <div className="px-6 py-4 bg-white space-y-6">
            {/* FUNCTIONAL REQUIREMENTS */}
            {functionalRequirements.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Check size={18} className="text-blue-600" />
                  Functional Requirements ({functionalRequirements.length})
                </h4>
                <div className="space-y-4">
                  {Object.entries(groupedByService).map(([service, reqs]) => (
                    <div key={service} className="border-l-4 border-blue-400 pl-4">
                      <h5 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <Code size={16} />
                        Service: {service}
                      </h5>
                      <div className="space-y-2">
                        {reqs.map((req) => (
                          <div key={req.ID} className="bg-blue-50 border border-blue-200 rounded p-3">
                            {editingFRId === req.ID && tempFR ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  placeholder="Requirement"
                                  value={tempFR.Requirement}
                                  onChange={(e) => setTempFR({ ...tempFR, Requirement: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                />
                                <input
                                  type="text"
                                  placeholder="Service"
                                  value={tempFR.Service}
                                  onChange={(e) => setTempFR({ ...tempFR, Service: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                />
                                <select
                                  value={tempFR.Priority}
                                  onChange={(e) => setTempFR({ ...tempFR, Priority: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                >
                                  <option>Critical</option>
                                  <option>High</option>
                                  <option>Medium</option>
                                  <option>Low</option>
                                </select>
                                <div className="flex gap-2">
                                  <button onClick={handleSaveFR} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium">Save</button>
                                  <button onClick={() => setEditingFRId(null)} className="flex-1 px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 text-xs font-medium">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{req.ID}: {req.Requirement}</p>
                                  <p className="text-xs text-gray-600 mt-1">Category: {req.Category}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded border ${getPriorityColor(req.Priority)}`}>
                                    {req.Priority}
                                  </span>
                                  <button
                                    onClick={() => handleEditFR(req)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFR(req.ID)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NON-FUNCTIONAL REQUIREMENTS */}
            {nonFunctionalRequirements.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Target size={18} className="text-purple-600" />
                  Non-Functional Requirements ({nonFunctionalRequirements.length})
                </h4>
                <div className="space-y-3">
                  {nonFunctionalRequirements.map((req, idx) => (
                    <div key={idx} className={`border rounded-lg p-4 ${getCategoryColor(req.category)}`}>
                      {editingNFRIdx === idx && tempNFR ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Category"
                            value={tempNFR.category}
                            onChange={(e) => setTempNFR({ ...tempNFR, category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Requirement"
                            value={tempNFR.requirement}
                            onChange={(e) => setTempNFR({ ...tempNFR, requirement: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                          <textarea
                            placeholder="Description"
                            value={tempNFR.description}
                            onChange={(e) => setTempNFR({ ...tempNFR, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm min-h-16"
                          />
                          <select
                            value={tempNFR.priority}
                            onChange={(e) => setTempNFR({ ...tempNFR, priority: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          >
                            <option>Critical</option>
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                          </select>
                          <div className="flex gap-2">
                            <button onClick={handleSaveNFR} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium">Save</button>
                            <button onClick={() => setEditingNFRIdx(null)} className="flex-1 px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 text-xs font-medium">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900 mb-1">{req.category}</h5>
                            <p className="text-sm font-medium text-gray-800 mb-1">{req.requirement}</p>
                            {req.description && (
                              <p className="text-sm text-gray-700 italic">{req.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0 flex-col">
                            <span className={`px-2 py-1 text-xs font-semibold rounded border whitespace-nowrap ${getPriorityColor(req.priority)}`}>
                              {req.priority}
                            </span>
                            <button
                              onClick={() => handleEditNFR(idx, req)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteNFR(idx)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {functionalRequirements.length === 0 && nonFunctionalRequirements.length === 0 && (
              <p className="text-center text-gray-500 py-4">No requirements extracted yet</p>
            )}

            {/* Manual Input Section */}
            <div className="mt-6 pt-6 border-t-2 border-indigo-100">
              <h4 className="font-semibold text-gray-900 mb-4 text-base">➕ Add Manual Requirements</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Manual FR Button */}
                <button
                  onClick={() => setShowManualFRInput(!showManualFRInput)}
                  className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="font-semibold text-blue-900">Add Functional Requirement</p>
                      <p className="text-xs text-blue-700">Manually add FR</p>
                    </div>
                    <Check size={20} className="text-blue-600" />
                  </div>
                </button>

                {/* Manual NFR Button */}
                <button
                  onClick={() => setShowManualNFRInput(!showManualNFRInput)}
                  className="p-4 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="font-semibold text-purple-900">Add Non-Functional Requirement</p>
                      <p className="text-xs text-purple-700">Manually add NFR</p>
                    </div>
                    <Target size={20} className="text-purple-600" />
                  </div>
                </button>
              </div>

              {/* Manual FR Input Form */}
              {showManualFRInput && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <h5 className="font-semibold text-blue-900 flex items-center gap-2">
                    <Check size={16} className="text-blue-600" />
                    Add Functional Requirement
                  </h5>
                  <input
                    type="text"
                    placeholder="Requirement (e.g., User must be able to login with email)"
                    value={manualFRRequirement}
                    onChange={(e) => setManualFRRequirement(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Service/Module (e.g., Authentication Service)"
                    value={manualFRService}
                    onChange={(e) => setManualFRService(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Category (e.g., User Management)"
                    value={manualFRCategory}
                    onChange={(e) => setManualFRCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded bg-white text-sm"
                  />
                  <select
                    value={manualFRPriority}
                    onChange={(e) => setManualFRPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded bg-white text-sm"
                  >
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddManualFR}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Save size={16} /> Add FR
                    </button>
                    <button
                      onClick={() => setShowManualFRInput(false)}
                      className="flex-1 px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Manual NFR Input Form */}
              {showManualNFRInput && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
                  <h5 className="font-semibold text-purple-900 flex items-center gap-2">
                    <Target size={16} className="text-purple-600" />
                    Add Non-Functional Requirement
                  </h5>
                  <select
                    value={manualNFRCategory}
                    onChange={(e) => setManualNFRCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded bg-white text-sm"
                  >
                    <option value="">Select Category</option>
                    <option>Performance</option>
                    <option>Scalability</option>
                    <option>Security</option>
                    <option>Reliability</option>
                    <option>Maintainability</option>
                    <option>Availability</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Requirement (e.g., System must respond within 200ms)"
                    value={manualNFRRequirement}
                    onChange={(e) => setManualNFRRequirement(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded bg-white text-sm"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={manualNFRDescription}
                    onChange={(e) => setManualNFRDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded bg-white text-sm min-h-16"
                  />
                  <select
                    value={manualNFRPriority}
                    onChange={(e) => setManualNFRPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded bg-white text-sm"
                  >
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddManualNFR}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Save size={16} /> Add NFR
                    </button>
                    <button
                      onClick={() => setShowManualNFRInput(false)}
                      className="flex-1 px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TECHNOLOGIES & TOOLS SECTION - WITH EXTRACTED VS SUGGESTED */}
      {technologiesAndTools && Object.keys(technologiesAndTools).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('technologies')}
            className="w-full px-6 py-4 flex items-center justify-between bg-green-50 hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Code size={20} className="text-green-600" />
              <h3 className="font-semibold text-green-900">🛠️ Technology & Tools</h3>
            </div>
            {expandedSections.technologies ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {expandedSections.technologies && (
            <div className="px-6 py-4 bg-white space-y-6">
              {/* EXTRACTED TECHNOLOGIES */}
              {technologiesAndTools.Extracted && Object.keys(technologiesAndTools.Extracted).length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2 text-base border-b-2 border-green-200 pb-2">
                    <Check size={18} className="text-green-600" />
                    Extracted Technologies (From Your Input)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(technologiesAndTools.Extracted).map(([category, tools]) => {
                      const toolsList = Array.isArray(tools) ? tools : [];
                      return (
                        toolsList.length > 0 && (
                          <div key={category} className="bg-green-50 p-4 rounded border-2 border-green-300">
                            <h5 className="font-semibold text-green-900 mb-2 text-sm">{category}</h5>
                            <ul className="space-y-1">
                              {toolsList.map((tool: any, idx: number) => (
                                tool && (
                                  <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                                    <Check size={14} className="text-green-600" />
                                    {typeof tool === 'string' ? tool : JSON.stringify(tool)}
                                  </li>
                                )
                              ))}
                            </ul>
                          </div>
                        )
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUGGESTED TECHNOLOGIES */}
              {technologiesAndTools.Suggested && Object.keys(technologiesAndTools.Suggested).length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2 text-base border-b-2 border-blue-200 pb-2">
                    <Target size={18} className="text-blue-600" />
                    Suggested Technologies (Recommendations)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(technologiesAndTools.Suggested).map(([category, tools]) => {
                      const toolsList = Array.isArray(tools) ? tools : [];
                      return (
                        toolsList.length > 0 && (
                          <div key={category} className="bg-blue-50 p-4 rounded border-2 border-blue-300">
                            <h5 className="font-semibold text-blue-900 mb-2 text-sm">{category}</h5>
                            <ul className="space-y-1">
                              {toolsList.map((tool: any, idx: number) => (
                                tool && (
                                  <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                                    <Target size={14} className="text-blue-600" />
                                    {typeof tool === 'string' ? tool : JSON.stringify(tool)}
                                  </li>
                                )
                              ))}
                            </ul>
                          </div>
                        )
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fallback for old format (single level categories) */}
              {(!technologiesAndTools.Extracted && !technologiesAndTools.Suggested) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(technologiesAndTools).map(([category, tools]) => (
                    tools && tools.length > 0 && (
                      <div key={category} className="bg-green-50 p-4 rounded border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-2 text-sm">{category}</h4>
                        <ul className="space-y-1">
                          {(Array.isArray(tools) ? tools : [tools]).map((tool, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                              <Check size={14} className="text-green-600" />
                              {tool}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RISK ANALYSIS SECTION */}
      {riskAnalysis && Object.keys(riskAnalysis).length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('risks')}
            className="w-full px-6 py-4 flex items-center justify-between bg-red-50 hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-600" />
              <h3 className="font-semibold text-red-900">⚠️ Risk Analysis</h3>
            </div>
            {expandedSections.risks ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {expandedSections.risks && (
            <div className="px-6 py-4 bg-white">
              {!editingRisks ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-red-900">Risk Categories</h4>
                    <button
                      onClick={handleEditRisks}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(riskAnalysis).map(([category, risks]) => (
                      risks && risks.length > 0 && (
                        <div key={category} className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="font-semibold text-red-900 mb-2">{category}</h4>
                          <ul className="space-y-2">
                            {(Array.isArray(risks) ? risks : [risks]).map((risk, idx) => (
                              <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-red-900">Edit Risk Analysis</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveRisks}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm"
                      >
                        <Save size={16} /> Save
                      </button>
                      <button
                        onClick={() => setEditingRisks(false)}
                        className="px-3 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Edit Risk Categories */}
                  <div className="space-y-4">
                    {Object.entries(tempRisks).map(([category, risks]) => (
                      <div key={category} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-red-900">{category}</h5>
                          <button
                            onClick={() => handleDeleteRiskCategory(category)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete category"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {risks.map((risk, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <textarea
                                value={risk}
                                onChange={(e) => {
                                  const updated = [...risks]
                                  updated[idx] = e.target.value
                                  setTempRisks(prev => ({
                                    ...prev,
                                    [category]: updated
                                  }))
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                                rows={2}
                              />
                              <button
                                onClick={() => handleDeleteRiskFromCategory(category, idx)}
                                className="text-red-600 hover:text-red-800 mt-2"
                                title="Delete risk"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => handleAddRiskToCategory(category, '')}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          + Add Risk
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Risk Category */}
                  <button
                    onClick={() => setTempRisks(prev => ({
                      ...prev,
                      'New Category': ['']
                    }))}
                    className="w-full px-3 py-2 border-2 border-dashed border-red-300 text-red-600 rounded hover:bg-red-50 text-sm font-medium"
                  >
                    + Add Risk Category
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ADDITIONAL NOTES SECTION */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('additionalNotes')}
          className="w-full px-6 py-4 flex items-center justify-between bg-amber-50 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-amber-600" />
            <h3 className="font-semibold text-amber-900">📝 Additional Notes & Requirements</h3>
          </div>
          {expandedSections.additionalNotes ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.additionalNotes && (
          <div className="px-6 py-4 bg-white">
            {!showAdditionalNotes ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Add any additional notes, requirements, constraints, or special considerations that should be included in the PRD/BRD and future documentation.
                </p>
                {additionalNotes ? (
                  <div className="bg-amber-50 p-4 rounded border border-amber-200 min-h-24 text-sm text-gray-700 whitespace-pre-wrap">
                    {additionalNotes}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded border border-dashed border-gray-300 min-h-24 flex items-center justify-center text-gray-500 italic">
                    No additional notes yet. Click "Edit" to add notes.
                  </div>
                )}
                <button
                  onClick={() => setShowAdditionalNotes(true)}
                  className="w-full px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Edit2 size={16} /> Edit Notes
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Add any additional notes, requirements, or considerations...

Examples:
- Specific compliance requirements (GDPR, HIPAA, etc.)
- Integration requirements with third-party services
- Data migration requirements
- Specific performance or scalability constraints
- Deployment and operational considerations
- Future enhancements or Phase 2+ items
- Known limitations or workarounds"
                  className="w-full px-4 py-3 border border-amber-300 rounded bg-white text-sm min-h-40 font-mono"
                />
                <p className="text-xs text-gray-500">These notes will be included in requirements documentation and PRD/BRD generation.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAdditionalNotes}
                    className="flex-1 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Save size={16} /> Save Notes
                  </button>
                  <button
                    onClick={() => setShowAdditionalNotes(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
