import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Boxes, Loader2, Sparkles, GitBranch, Code, Database as DbIcon, Server, Lock, Zap, Edit2, Save, CheckCircle, Clock } from 'lucide-react'
import { getProjectPhases, generateContent, updatePhase, getProject } from '../services/api'
import toast from 'react-hot-toast'
import mermaid from 'mermaid'
import RequirementUploader from '../components/DocumentUpload/RequirementUploader'
import SwaggerViewer from '../components/API/SwaggerViewer'

const Phase3Page = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  
  const [projectName, setProjectName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase3, setPhase3] = useState<any>(null)
  const [phase2Data, setPhase2Data] = useState<any>(null)
  const [phase1Data, setPhase1Data] = useState<any>(null)
  
  // Approval state
  const [phaseStatus, setPhaseStatus] = useState<string>('in_progress')
  const [approvalHistory, setApprovalHistory] = useState<any[]>([])
  const isApproved = phaseStatus === 'approved'
  const isPendingApproval = phaseStatus === 'pending_approval'
  
  // Edit mode states
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  
  // API Specification state
  const [apiSpecData, setApiSpecData] = useState<any>(null)
  const [apiSummary, setApiSummary] = useState<string>('')
  const [showAPIView, setShowAPIView] = useState(false)
  
  // Monitor phase3 state changes for debugging
  useEffect(() => {
    if (phase3?.id) {
      console.log('[Phase3 StateMonitor] phase3 updated:')
      console.log('[Phase3 StateMonitor]   - id:', phase3.id)
      console.log('[Phase3 StateMonitor]   - has data:', !!phase3.data)
      console.log('[Phase3 StateMonitor]   - data keys:', phase3.data ? Object.keys(phase3.data) : 'NULL')
      console.log('[Phase3 StateMonitor]   - has architecture:', !!phase3.data?.architecture)
      if (phase3.data?.architecture) {
        console.log('[Phase3 StateMonitor]   - architecture keys:', Object.keys(phase3.data.architecture))
        console.log('[Phase3 StateMonitor]   - system_components count:', phase3.data.architecture.system_components?.length || 0)
      }
    }
  }, [phase3])

  // Re-render Mermaid when E2E diagram updates
  useEffect(() => {
    const arch = (phase3?.data as any)?.architecture
    const code = extractMermaid(arch?.e2e_flow_diagram || '')
    if (code) {
      setTimeout(() => {
        mermaid.initialize({ startOnLoad: true, theme: 'default' })
        mermaid.contentLoaded()
      }, 50)
    }
  }, [phase3?.data?.architecture?.e2e_flow_diagram])

  // Load API spec from phase3.data if present
  useEffect(() => {
    if (phase3?.data?.apiSpecData) {
      setApiSpecData(phase3.data.apiSpecData)
      setApiSummary(phase3.data.apiSummary || '')
      setShowAPIView(true)
    }
  }, [phase3?.data?.apiSpecData])

  // Handler for API spec upload
  const handleAPIExtractComplete = (apiData: any, summary: string) => {
    setApiSpecData(apiData)
    setApiSummary(summary)
    setShowAPIView(true)
    // Save to phase3
    if (phase3?.id) {
      updatePhase(phase3.id, {
        data: {
          ...phase3.data,
          apiSpecData: apiData,
          apiSummary: summary
        }
      })
    }
  }

  // Handler for API spec delete
  const handleDeleteAPISpec = async () => {
    setApiSpecData(null)
    setApiSummary('')
    setShowAPIView(false)
    if (phase3?.id) {
      await updatePhase(phase3.id, {
        data: {
          ...phase3.data,
          apiSpecData: null,
          apiSummary: null
        }
      })
    }
  }

  const extractMermaid = (str: string) => {
    if (!str) return ''
    const m = str.match(/```mermaid([\s\S]*?)```/i)
    return m ? m[1].trim() : str.trim()
  }

  const getComponentIcon = (type: string) => {
    const t = (type || '').toLowerCase()
    if (t.includes('front') || t === 'ui') return <Code className="w-5 h-5 text-primary-600" />
    if (t.includes('back') || t.includes('api')) return <Server className="w-5 h-5 text-primary-600" />
    if (t.includes('data') || t.includes('db')) return <DbIcon className="w-5 h-5 text-primary-600" />
    if (t.includes('security') || t.includes('auth')) return <Lock className="w-5 h-5 text-primary-600" />
    if (t.includes('cache') || t.includes('queue')) return <Zap className="w-5 h-5 text-primary-600" />
    return <Boxes className="w-5 h-5 text-primary-600" />
  }
  
  useEffect(() => {
    if (projectId) {
      loadPhaseData()
    }
  }, [projectId])
  
  const loadPhaseData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('[Phase3 Load] Starting to load phase data for project:', projectId)
      
      // Fetch project details using API service
      try {
        const projectResponse = await getProject(Number(projectId))
        setProjectName(projectResponse.data.name || 'Unknown Project')
        console.log('[Phase3 Load] Project loaded:', projectResponse.data.name)
      } catch (error) {
        console.error('[Phase3 Load] Error loading project:', error)
      }
      
      const response = await getProjectPhases(parseInt(projectId!))
      const phases = response.data
      console.log('[Phase3 Load] Total phases from backend:', phases.length)
      
      const phase1 = phases.find((p: any) => p.phase_number === 1)
      if (phase1?.data) {
        console.log('[Phase3 Load] Phase 1 data loaded')
        setPhase1Data(phase1.data)
      } else {
        console.warn('[Phase3 Load] Phase 1 data not found')
      }
      
      const phase2 = phases.find((p: any) => p.phase_number === 2)
      if (phase2?.data) {
        console.log('[Phase3 Load] Phase 2 data loaded. Epics:', phase2.data.epics?.length || 0, 'Stories:', phase2.data.userStories?.length || 0)
        setPhase2Data(phase2.data)
      } else {
        console.warn('[Phase3 Load] Phase 2 data not found')
      }
      
      const phase3 = phases.find((p: any) => p.phase_number === 3)
      if (phase3) {
        console.log('[Phase3 Load] Phase 3 found - ID:', phase3.id, 'Status:', phase3.status)
        console.log('[Phase3 Load] Phase 3 data type:', typeof phase3.data)
        console.log('[Phase3 Load] Phase 3 data keys:', phase3.data ? Object.keys(phase3.data) : 'null')
        console.log('[Phase3 Load] Phase 3 full data:', phase3.data)
        
        if (phase3.data?.architecture) {
          console.log('[Phase3 Load] ✅ Architecture data exists!')
          console.log('[Phase3 Load] Architecture keys:', Object.keys(phase3.data.architecture))
          console.log('[Phase3 Load] system_components count:', phase3.data.architecture.system_components?.length || 0)
          console.log('[Phase3 Load] high_level_design exists:', !!phase3.data.architecture.high_level_design)
          console.log('[Phase3 Load] e2e_flow_diagram exists:', !!phase3.data.architecture.e2e_flow_diagram)
        } else {
          console.log('[Phase3 Load] No architecture data yet')
        }
        
        setPhase3(phase3)
        setPhaseStatus(phase3.status || 'in_progress')
        
        // Load approval history
        if (phase3.data?.approvalHistory) {
          console.log('[Phase3 Load] Approval history loaded, count:', phase3.data.approvalHistory.length)
          setApprovalHistory(phase3.data.approvalHistory)
        }
        
        console.log('[Phase3 Load] ✅ Phase 3 state updated with id:', phase3.id)
        console.log('[Phase3 Load] Setting phase3 state with full object:', { id: phase3.id, status: phase3.status, hasData: !!phase3.data, dataKeys: phase3.data ? Object.keys(phase3.data) : [] })
      } else {
        console.error('[Phase3 Load] Phase 3 not found in phases')
      }
    } catch (error) {
      console.error('[Phase3 Load] Error loading phase data:', error)
      setError('Failed to load phase data: ' + String(error))
      toast.error('Failed to load phase data')
    } finally {
      setLoading(false)
      console.log('[Phase3 Load] ✅ Loading complete, current phase3:', phase3)
    }
  }
  
  const handleGenerateArchitecture = async () => {
    try {
      setGenerating(true)
      
      // Use phase3.id, not projectId - generateContent expects phaseId as first parameter
      if (!phase3?.id) {
        toast.error('Phase 3 not initialized')
        return
      }
      
      console.log('[Phase3 Gen] Starting architecture generation')
      console.log('[Phase3 Gen] Current phase3.data.architecture exists:', !!phase3?.data?.architecture)
      console.log('[Phase3 Gen] Will OVERRIDE existing architecture:', !!phase3?.data?.architecture)
      
      // 🔴 VALIDATE Phase 2 data is complete
      if (!phase2Data) {
        console.error('[Phase3 Gen] ❌ ERROR: phase2Data is NULL')
        toast.error('⚠️ Phase 2 data not loaded. Please refresh and try again.')
        setGenerating(false)
        return
      }
      
      if (!phase2Data.epics || phase2Data.epics.length === 0) {
        console.error('[Phase3 Gen] ❌ ERROR: No epics in phase2Data')
        toast.error('⚠️ Phase 2 epics not found. Please ensure Phase 2 is completed.')
        setGenerating(false)
        return
      }
      
      if (!phase2Data.userStories || phase2Data.userStories.length === 0) {
        console.error('[Phase3 Gen] ❌ ERROR: No user stories in phase2Data')
        toast.error('⚠️ Phase 2 user stories not found. Please ensure Phase 2 is completed.')
        setGenerating(false)
        return
      }
      
      // 🔴 VALIDATE executionOrder is populated
      if (!phase2Data.executionOrder || phase2Data.executionOrder.length === 0) {
        console.warn('[Phase3 Gen] ⚠️ WARNING: executionOrder is empty or missing')
        console.warn('[Phase3 Gen]   This may cause incomplete E2E flow generation')
        console.warn('[Phase3 Gen]   Epics count:', phase2Data.epics.length)
        // Continue anyway - use epic order as fallback
      } else {
        console.log('[Phase3 Gen] ✅ executionOrder is populated:', phase2Data.executionOrder.length, 'items')
      }
      
      // Prepare comprehensive data from Phase 1 and Phase 2 in the format backend expects
      const contextData = {
        content_type: 'architecture',
        // Phase 1 data
        requirements: phase1Data?.requirements || [],
        gherkinRequirements: phase1Data?.gherkinRequirements || [],
        functionalRequirements: phase1Data?.functionalRequirements || [],
        nonFunctionalRequirements: phase1Data?.nonFunctionalRequirements || [],
        businessProposal: phase1Data?.businessProposal || {},
        extractedStakeholders: phase1Data?.extractedStakeholders || [],
        extractedRisks: phase1Data?.extractedRisks || {},
        aiNotes: phase1Data?.aiNotes || '',
        // Phase 2 data - ENSURE these are populated
        epics: phase2Data.epics || [],
        userStories: phase2Data.userStories || [],
        executionOrder: phase2Data.executionOrder || [],
        // Additional context
        prd: phase1Data?.prd,
        brd: phase1Data?.brd
      }
      
      console.log('[Phase3 Gen] Prepared context data:')
      console.log('[Phase3 Gen]   - Epics count:', contextData.epics.length)
      console.log('[Phase3 Gen]   - User stories count:', contextData.userStories.length)
      console.log('[Phase3 Gen]   - Execution order:', contextData.executionOrder.length, 'items')
      console.log('[Phase3 Gen]   - Functional requirements:', contextData.functionalRequirements.length)
      console.log('[Phase3 Gen]   - Non-functional requirements:', contextData.nonFunctionalRequirements.length)
      console.log('[Phase3 Gen]   - E2E Flow generation will use executionOrder to sequence components')
      
      const response = await generateContent(phase3.id, 'architecture', contextData)

      console.log('[Phase3 Gen] Generation response received:', response.data)

      // Backend returns { content: <architecture>, confidence_score: number }
      const generated = response.data?.content || response.data
      console.log('[Phase3 Gen] Generated architecture object:', generated)
      console.log('[Phase3 Gen] Has system_components?', !!generated?.system_components, 'count:', generated?.system_components?.length)
      console.log('[Phase3 Gen] Has high_level_design?', !!generated?.high_level_design)
      console.log('[Phase3 Gen] Has e2e_flow_diagram?', !!generated?.e2e_flow_diagram)
      console.log('[Phase3 Gen] E2E flow diagram length:', generated?.e2e_flow_diagram?.length || 0, 'chars')
      
      // 🔴 DETAILED E2E FLOW DEBUGGING
      if (!generated?.e2e_flow_diagram) {
        console.error('[Phase3 Gen] ❌ CRITICAL: e2e_flow_diagram is missing!')
        console.error('[Phase3 Gen]   - Value:', generated?.e2e_flow_diagram)
        console.error('[Phase3 Gen]   - Type:', typeof generated?.e2e_flow_diagram)
        console.error('[Phase3 Gen]   - Keys in generated:', Object.keys(generated || {}))
        console.error('[Phase3 Gen]   - Has e2e_flow_diagrams (array)?', !!generated?.e2e_flow_diagrams, 'count:', generated?.e2e_flow_diagrams?.length)
      } else {
        console.log('[Phase3 Gen] ✅ e2e_flow_diagram populated:', generated.e2e_flow_diagram.substring(0, 100) + '...')
      }

      if (generated && (generated.system_components || generated.high_level_design)) {
        console.log('[Phase3 Gen] ✅ Valid architecture generated, saving to database...')
        
        // Create new phase data with OVERRIDDEN architecture (complete replacement)
        const newPhaseData = {
          ...(phase3.data || {}),
          architecture: generated  // This completely replaces existing architecture
        }
        
        console.log('[Phase3 Gen] New phase data keys:', Object.keys(newPhaseData))
        console.log('[Phase3 Gen] Architecture keys to save:', Object.keys(generated))
        console.log('[Phase3 Gen] Payload being sent to backend:', {
          dataKeys: Object.keys(newPhaseData),
          hasArchitecture: !!newPhaseData.architecture,
          architectureKeys: Object.keys(newPhaseData.architecture || {})
        })
        
        // Persist to Phase 3 database with override
        const updateResponse = await updatePhase(phase3.id, {
          data: newPhaseData
        })
        
        console.log('[Phase3 Gen] ✅ Database update response received')
        console.log('[Phase3 Gen] Response structure:', {
          hasData: !!updateResponse.data,
          dataKeys: Object.keys(updateResponse.data || {}),
          hasDataField: !!updateResponse.data?.data,
          dataFieldKeys: updateResponse.data?.data ? Object.keys(updateResponse.data.data) : 'NULL',
          hasArchitecture: !!updateResponse.data?.data?.architecture,
        })

        // CRITICAL: Verify the response has the data before updating state
        if (!updateResponse.data?.data?.architecture) {
          console.error('[Phase3 Gen] ❌ ERROR: Response does NOT contain architecture!')
          console.error('[Phase3 Gen] Full updateResponse.data:', updateResponse.data)
          console.error('[Phase3 Gen] updateResponse.data.data:', updateResponse.data?.data)
          toast.error('⚠️ Architecture generated but not saved properly. Please refresh and try again.')
          setGenerating(false)
          return
        }

        // Create fresh object from response
        const responseData = updateResponse.data
        const updatedPhase3 = {
          id: responseData.id,
          project_id: responseData.project_id,
          phase_number: responseData.phase_number,
          phase_name: responseData.phase_name,
          status: responseData.status,
          data: responseData.data || {},
          ai_confidence_score: responseData.ai_confidence_score,
          created_at: responseData.created_at,
        }
        
        console.log('[Phase3 Gen] ✅ About to set phase3 state:', {
          hasArchitecture: !!updatedPhase3.data?.architecture,
          systemComponentsCount: updatedPhase3.data?.architecture?.system_components?.length || 0,
        })
        
        setPhase3(updatedPhase3)
        toast.success('✅ Architecture generated and saved successfully!')
      } else {
        console.error('[Phase3] Invalid response format, missing required fields:', generated)
        toast.error(response.data?.error || 'Failed to generate architecture')
      }
    } catch (error) {
      console.error('Error generating architecture:', error)
      toast.error('Failed to generate architecture')
    } finally {
      setGenerating(false)
    }
  }
  
  const handleSubmitForApproval = async () => {
    if (!phase3?.id) return
    try {
      await updatePhase(phase3.id, { status: 'pending_approval' })
      setPhaseStatus('pending_approval')
      toast.success('Phase 3 submitted for approval')
      await loadPhaseData()
      // Navigate to approvals page after a short delay (same as Phase 1/2)
      setTimeout(() => {
        navigate('/approvals')
      }, 800)
    } catch (error) {
      console.error('Error submitting for approval:', error)
      toast.error('Failed to submit for approval')
    }
  }
  
  const toggleEditMode = (section: string) => {
    if (isApproved) {
      toast.error('Phase 3 is approved and locked. Cannot edit.')
      return
    }
    
    const newMode = !editMode[section]
    setEditMode({ ...editMode, [section]: newMode })
    
    // Initialize edit values when entering edit mode
    if (newMode && phase3?.data?.architecture) {
      setEditValues({ ...editValues, [section]: phase3.data.architecture[section] })
    }
  }
  
  const saveEdit = async (section: string) => {
    if (!phase3?.id || !editValues[section]) return
    
    try {
      console.log(`[Phase3 Edit] ============ SAVE STARTED ============`)
      console.log(`[Phase3 Edit] Saving edit for section: ${section}`)
      console.log(`[Phase3 Edit] Phase3 ID:`, phase3.id)
      console.log(`[Phase3 Edit] Current phase3.data keys BEFORE save:`, Object.keys(phase3.data || {}))
      console.log(`[Phase3 Edit] Current value to save:`, editValues[section])
      
      const updatedArchitecture = {
        ...phase3.data.architecture,
        [section]: editValues[section]
      }
      
      console.log(`[Phase3 Edit] Updated architecture keys:`, Object.keys(updatedArchitecture))
      
      const payloadToSend = {
        data: { ...phase3.data, architecture: updatedArchitecture }
      }
      console.log(`[Phase3 Edit] Payload keys to send:`, Object.keys(payloadToSend.data))
      console.log(`[Phase3 Edit] Payload.data.architecture keys:`, Object.keys(payloadToSend.data.architecture || {}))
      console.log(`[Phase3 Edit] Full payload:`, JSON.stringify(payloadToSend, null, 2).substring(0, 500))
      
      const response = await updatePhase(phase3.id, payloadToSend)
      
      console.log(`[Phase3 Edit] ✅ Save response received`)
      console.log(`[Phase3 Edit] Response HTTP status: 200`)
      console.log(`[Phase3 Edit] Response object type:`, typeof response.data)
      console.log(`[Phase3 Edit] Response keys:`, Object.keys(response.data))
      console.log(`[Phase3 Edit] Response.data.id:`, response.data.id)
      console.log(`[Phase3 Edit] Response.data.data type:`, typeof response.data.data)
      console.log(`[Phase3 Edit] Response.data.data keys:`, response.data.data ? Object.keys(response.data.data) : 'NULL')
      console.log(`[Phase3 Edit] Response.data.data.architecture keys:`, response.data.data?.architecture ? Object.keys(response.data.data.architecture) : 'NULL')
      console.log(`[Phase3 Edit] Response.data.data.architecture[${section}] exists?`, !!response.data.data?.architecture?.[section])
      
      // Update local state immediately with full Phase object
      const updatedPhase3 = response.data
      console.log(`[Phase3 Edit] ✅ About to set phase3 with:`)
      console.log(`[Phase3 Edit]   - id: ${updatedPhase3.id}`)
      console.log(`[Phase3 Edit]   - has data: ${!!updatedPhase3.data}`)
      console.log(`[Phase3 Edit]   - data keys: ${updatedPhase3.data ? Object.keys(updatedPhase3.data) : 'NULL'}`)
      console.log(`[Phase3 Edit]   - has architecture: ${!!updatedPhase3.data?.architecture}`)
      
      setPhase3(updatedPhase3)
      console.log(`[Phase3 Edit] ✅ setPhase3 called`)
      
      setEditMode({ ...editMode, [section]: false })
      setEditValues({ ...editValues, [section]: undefined })
      
      console.log(`[Phase3 Edit] ============ SAVE COMPLETED ============`)
      toast.success(`✅ ${section.replace(/_/g, ' ')} updated and saved`)
    } catch (error) {
      console.error(`[Phase3 Edit] ❌ Error saving ${section}:`, error)
      toast.error('Failed to save changes')
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="mt-4">{error}</p>
        <button onClick={() => loadPhaseData()} className="mt-4 btn-primary">
          Retry
        </button>
      </div>
    )
  }
  
  return (
    <div>
      <div className="mb-8">
        {projectName && (
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-500">Project:</span>
            <h2 className="text-3xl font-bold text-primary-600">{projectName}</h2>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Phase 3: Architecture & High-Level Design (HLD)</h1>
            <p className="text-gray-500 mt-2">System components, high-level architecture, and end-to-end flow design</p>
            {phase2Data && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Phase 2 data loaded: {phase2Data.epics?.length || 0} epics, {phase2Data.userStories?.length || 0} stories
              </p>
            )}
          </div>
          
          {/* Status Badge */}
          {phase3?.data?.architecture && (
            <div className="flex items-center space-x-3">
              {isApproved && (
                <span className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-lg flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Approved</span>
                </span>
              )}
              {isPendingApproval && (
                <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-lg flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Pending Approval</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Generate/Regenerate Architecture Button */}
        <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                <span>{phase3?.data?.architecture ? 'Regenerate' : 'Generate'} Architecture with AI</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {phase3?.data?.architecture ? 'Override existing' : 'Create comprehensive'} system architecture based on your requirements and epics
              </p>
            </div>
            <button
              onClick={handleGenerateArchitecture}
              disabled={generating || !phase1Data || !phase2Data}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{phase3?.data?.architecture ? 'Regenerate' : 'Generate'} Architecture</span>
                </>
              )}
            </button>
          </div>
          {(!phase1Data || !phase2Data) && (
            <p className="text-xs text-red-600 mt-2">
              ⚠️ Please complete Phase 1 and Phase 2 before generating architecture
            </p>
          )}
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Boxes className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-semibold text-gray-900">1. System Architecture Components</h2>
            </div>
            {phase3?.data?.architecture?.system_components?.length > 0 && (
              <button
                onClick={() => {
                  if (editMode.system_components) {
                    saveEdit('system_components')
                  } else {
                    toggleEditMode('system_components')
                  }
                }}
                className="btn-secondary flex items-center space-x-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>{editMode.system_components ? 'Save' : 'Edit'}</span>
              </button>
            )}
          </div>
          {phase3?.data?.architecture?.system_components?.length ? (
            editMode.system_components ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">System Components (JSON format)</label>
                  <textarea
                    value={JSON.stringify(editValues.system_components || [], null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        setEditValues({
                          ...editValues,
                          system_components: parsed
                        })
                      } catch (err) {
                        setEditValues({
                          ...editValues,
                          system_components: e.target.value
                        })
                      }
                    }}
                    rows={15}
                    className="input-field w-full font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Edit components in JSON format. Each component should have: name, type, description, technologies</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => saveEdit('system_components')}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={() => setEditMode({ ...editMode, system_components: false })}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
            <div className="space-y-6">
              {/* Group components by category */}
              {(() => {
                const components = phase3.data.architecture.system_components
                const categories = [
                  { key: 'frontend', label: 'Frontend', icon: '🖥️', color: 'text-blue-700' },
                  { key: 'backend', label: 'Backend Component', icon: '⚙️', color: 'text-green-700' },
                  { key: 'api', label: 'API Component', icon: '🔌', color: 'text-purple-700' },
                  { key: 'database', label: 'Database', icon: '🗄️', color: 'text-orange-700' },
                  { key: 'cache', label: 'Cache', icon: '⚡', color: 'text-yellow-700' },
                  { key: 'queue', label: 'Queue', icon: '📬', color: 'text-pink-700' },
                  { key: 'service', label: 'Service', icon: '🔧', color: 'text-indigo-700' },
                  { key: 'integration', label: 'Integration', icon: '🔗', color: 'text-teal-700' },
                  { key: 'security', label: 'Security', icon: '🔒', color: 'text-red-700' },
                  { key: 'monitoring', label: 'Monitoring', icon: '📊', color: 'text-cyan-700' },
                  { key: 'infrastructure', label: 'Infrastructure', icon: '☁️', color: 'text-gray-700' }
                ]
                
                return categories.map(category => {
                  const categoryComponents = components.filter((c: any) => c.type === category.key)
                  if (categoryComponents.length === 0) return null
                  
                  return (
                    <div key={category.key} className="space-y-2">
                      {/* Category Header */}
                      <div className="flex items-center space-x-2 pb-2 border-b border-gray-300">
                        <span className="text-xl">{category.icon}</span>
                        <h3 className={`text-lg font-bold ${category.color}`}>
                          {category.label}:
                        </h3>
                      </div>
                      
                      {/* Component List with Bullet Points and Edit Buttons */}
                      <div className="pl-8 space-y-3">
                        {categoryComponents.map((comp: any, idx: number) => {
                          const compKey = `component_${comp.id ?? comp.name}`
                          const isEditing = editMode[compKey]
                          
                          return (
                            <div key={comp.id ?? comp.name} className="space-y-1">
                              {/* Component Name as Bullet Point with Edit Button */}
                              <div className="flex items-start space-x-2 group">
                                <span className="text-gray-600 mt-1">•</span>
                                {isEditing ? (
                                  <div className="flex-1">
                                    <textarea
                                      value={JSON.stringify(editValues[compKey] || comp, null, 2)}
                                      onChange={(e) => {
                                        try {
                                          const parsed = JSON.parse(e.target.value)
                                          setEditValues({
                                            ...editValues,
                                            [compKey]: parsed
                                          })
                                        } catch (err) {
                                          setEditValues({
                                            ...editValues,
                                            [compKey]: e.target.value
                                          })
                                        }
                                      }}
                                      rows={8}
                                      className="input-field w-full font-mono text-sm"
                                    />
                                    <div className="flex space-x-2 mt-2">
                                      <button
                                        onClick={() => {
                                          const updatedComp = editValues[compKey]
                                          if (updatedComp && typeof updatedComp === 'object') {
                                            const updatedComponents = phase3.data.architecture.system_components.map((c: any) =>
                                              (c.id === comp.id || c.name === comp.name) ? updatedComp : c
                                            )
                                            saveEdit('system_components')
                                            setEditMode({ ...editMode, [compKey]: false })
                                          }
                                        }}
                                        className="btn-primary text-xs flex items-center space-x-1 px-2 py-1"
                                      >
                                        <Save className="w-3 h-3" />
                                        <span>Save</span>
                                      </button>
                                      <button
                                        onClick={() => setEditMode({ ...editMode, [compKey]: false })}
                                        className="btn-secondary text-xs px-2 py-1"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-gray-900">{comp.name}</span>
                                      <button
                                        onClick={() => {
                                          setEditValues({ ...editValues, [compKey]: comp })
                                          setEditMode({ ...editMode, [compKey]: true })
                                        }}
                                        className="btn-secondary text-xs flex items-center space-x-1 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Edit</span>
                                      </button>
                                    </div>
                                    {comp.description && (
                                      <p className="text-sm text-gray-600 mt-0.5 ml-2">{comp.description}</p>
                                    )}
                                    {comp.technologies?.length > 0 && (
                                      <div className="mt-1 ml-2">
                                        <span className="text-xs text-gray-500">Technologies: </span>
                                        <span className="text-xs text-gray-700">{comp.technologies.join(', ')}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Boxes className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Architecture generation coming soon...</p>
              <p className="text-sm mt-2">Phase 3 functionality is being updated</p>
            </div>
          )}
        </div>

        {/* Section 2: High Level Design */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <GitBranch className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-semibold text-gray-900">2. High Level Design</h2>
            </div>
            {phase3?.data?.architecture?.high_level_design && (
              <button
                onClick={() => toggleEditMode('high_level_design')}
                className="btn-secondary flex items-center space-x-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>{editMode.high_level_design ? 'Cancel Edit' : 'Edit'}</span>
              </button>
            )}
          </div>
          {phase3?.data?.architecture?.high_level_design ? (
            editMode.high_level_design ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Architecture Style</label>
                  <input
                    type="text"
                    value={editValues.high_level_design?.architecture_style || ''}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      high_level_design: {
                        ...editValues.high_level_design,
                        architecture_style: e.target.value
                      }
                    })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Overview</label>
                  <textarea
                    value={editValues.high_level_design?.overview || ''}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      high_level_design: {
                        ...editValues.high_level_design,
                        overview: e.target.value
                      }
                    })}
                    rows={4}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Component Interactions</label>
                  <textarea
                    value={editValues.high_level_design?.component_interactions || ''}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      high_level_design: {
                        ...editValues.high_level_design,
                        component_interactions: e.target.value
                      }
                    })}
                    rows={3}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Scalability Strategy</label>
                  <textarea
                    value={editValues.high_level_design?.scalability_strategy || ''}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      high_level_design: {
                        ...editValues.high_level_design,
                        scalability_strategy: e.target.value
                      }
                    })}
                    rows={3}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Security Overview</label>
                  <textarea
                    value={editValues.high_level_design?.security_overview || ''}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      high_level_design: {
                        ...editValues.high_level_design,
                        security_overview: e.target.value
                      }
                    })}
                    rows={3}
                    className="input-field w-full"
                  />
                </div>
                <button
                  onClick={() => saveEdit('high_level_design')}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Architecture Style */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 group">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-bold text-blue-900 flex items-center">
                      <span className="mr-2">🏗️</span>
                      Architecture Style
                    </h3>
                    <button
                      onClick={() => {
                        setEditValues({
                          ...editValues,
                          hld_architecture_style: phase3.data.architecture.high_level_design.architecture_style
                        })
                        setEditMode({ ...editMode, hld_architecture_style: true })
                      }}
                      className="btn-secondary text-xs flex items-center space-x-1 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  {editMode.hld_architecture_style ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValues.hld_architecture_style || ''}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          hld_architecture_style: e.target.value
                        })}
                        rows={3}
                        className="input-field w-full text-sm"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const updatedHLD = {
                              ...phase3.data.architecture.high_level_design,
                              architecture_style: editValues.hld_architecture_style
                            }
                            saveEdit('high_level_design')
                            setEditMode({ ...editMode, hld_architecture_style: false })
                          }}
                          className="btn-primary text-xs flex items-center space-x-1 px-2 py-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setEditMode({ ...editMode, hld_architecture_style: false })}
                          className="btn-secondary text-xs px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-900 font-semibold">{phase3.data.architecture.high_level_design.architecture_style}</p>
                      {phase3.data.architecture.high_level_design.architecture_rationale && (
                        <ul className="mt-2 space-y-1 text-sm text-gray-700">
                          {phase3.data.architecture.high_level_design.architecture_rationale.map((reason: string, i: number) => (
                            <li key={i} className="flex items-start">
                              <span className="text-blue-600 mr-2">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
                
                {/* Overview */}
                <div className="group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center">
                      <span className="mr-2">📋</span>
                      System Overview
                    </h3>
                    <button
                      onClick={() => {
                        setEditValues({
                          ...editValues,
                          hld_overview: phase3.data.architecture.high_level_design.overview
                        })
                        setEditMode({ ...editMode, hld_overview: true })
                      }}
                      className="btn-secondary text-xs flex items-center space-x-1 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  {editMode.hld_overview ? (
                    <div className="space-y-2">
                      <textarea
                        value={typeof editValues.hld_overview === 'string' ? editValues.hld_overview : JSON.stringify(editValues.hld_overview, null, 2)}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          hld_overview: e.target.value
                        })}
                        rows={5}
                        className="input-field w-full text-sm font-mono"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            saveEdit('high_level_design')
                            setEditMode({ ...editMode, hld_overview: false })
                          }}
                          className="btn-primary text-xs flex items-center space-x-1 px-2 py-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setEditMode({ ...editMode, hld_overview: false })}
                          className="btn-secondary text-xs px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {Array.isArray(phase3.data.architecture.high_level_design.overview) ? (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          {phase3.data.architecture.high_level_design.overview.map((line: string, i: number) => {
                            if (!line.trim()) return <div key={i} className="h-2" />
                            
                            // Check if it's a header (ends with colon)
                            if (line.trim().endsWith(':')) {
                              return (
                                <div key={i} className="font-semibold text-gray-900 mt-3 mb-1">
                                  {line}
                                </div>
                              )
                            }
                            
                            // Regular bullet point
                            return (
                              <div key={i} className="flex items-start text-gray-700 py-0.5">
                                {line.trim().startsWith('•') ? (
                                  <>
                                    <span className="text-primary-600 mr-2 mt-0.5">•</span>
                                    <span>{line.replace(/^•\s*/, '')}</span>
                                  </>
                                ) : (
                                  <span className="ml-4">{line}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">{phase3.data.architecture.high_level_design.overview}</p>
                      )}
                    </>
                  )}
                </div>
                
                {/* Key Decisions */}
                {phase3.data.architecture.high_level_design.key_decisions?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                      <span className="mr-2">🎯</span>
                      Key Architectural Decisions
                    </h3>
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <ul className="space-y-2">
                        {phase3.data.architecture.high_level_design.key_decisions.map((decision: string, i: number) => {
                          // Parse decision format: "Technology → Story/Epic → Justification"
                          const parts = decision.split('→').map(p => p.trim())
                          return (
                            <li key={i} className="flex items-start">
                              <span className="text-amber-600 font-bold mr-2 mt-0.5">{i + 1}.</span>
                              <div className="flex-1">
                                {parts.length >= 3 ? (
                                  <>
                                    <span className="font-semibold text-gray-900">{parts[0]}</span>
                                    <span className="text-primary-700 font-medium mx-2">({parts[1]})</span>
                                    <span className="text-gray-700">→ {parts.slice(2).join(' → ')}</span>
                                  </>
                                ) : (
                                  <span className="text-gray-700">{decision}</span>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* Component Interactions */}
                <div className="group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center">
                      <span className="mr-2">🔄</span>
                      Component Interactions
                    </h3>
                    <button
                      onClick={() => {
                        setEditValues({
                          ...editValues,
                          hld_component_interactions: phase3.data.architecture.high_level_design.component_interactions
                        })
                        setEditMode({ ...editMode, hld_component_interactions: true })
                      }}
                      className="btn-secondary text-xs flex items-center space-x-1 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  {editMode.hld_component_interactions ? (
                    <div className="space-y-2">
                      <textarea
                        value={typeof editValues.hld_component_interactions === 'string' ? editValues.hld_component_interactions : JSON.stringify(editValues.hld_component_interactions, null, 2)}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          hld_component_interactions: e.target.value
                        })}
                        rows={6}
                        className="input-field w-full text-sm font-mono"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            saveEdit('high_level_design')
                            setEditMode({ ...editMode, hld_component_interactions: false })
                          }}
                          className="btn-primary text-xs flex items-center space-x-1 px-2 py-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setEditMode({ ...editMode, hld_component_interactions: false })}
                          className="btn-secondary text-xs px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {Array.isArray(phase3.data.architecture.high_level_design.component_interactions) ? (
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          {phase3.data.architecture.high_level_design.component_interactions.map((line: string, i: number) => {
                            if (!line.trim()) return <div key={i} className="h-2" />
                            
                            if (line.trim().endsWith(':')) {
                              return (
                                <div key={i} className="font-semibold text-purple-900 mt-2 mb-1">
                                  {line}
                                </div>
                              )
                            }
                            
                            return (
                              <div key={i} className="flex items-start text-gray-700 py-0.5">
                                {line.trim().startsWith('•') ? (
                                  <>
                                    <span className="text-purple-600 mr-2 mt-0.5">→</span>
                                    <span>{line.replace(/^•\s*/, '')}</span>
                                  </>
                                ) : (
                                  <span className="ml-4">{line}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-600 bg-purple-50 p-4 rounded-lg border border-purple-200">
                          {phase3.data.architecture.high_level_design.component_interactions}
                        </p>
                      )}
                    </>
                  )}
                </div>
                
                {/* Scalability & Security in Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Scalability Strategy */}
                  <div className="group">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center">
                        <span className="mr-2">📈</span>
                        Scalability Strategy
                      </h3>
                      <button
                        onClick={() => {
                          setEditValues({
                            ...editValues,
                            hld_scalability_strategy: phase3.data.architecture.high_level_design.scalability_strategy
                          })
                          setEditMode({ ...editMode, hld_scalability_strategy: true })
                        }}
                        className="btn-secondary text-xs flex items-center space-x-1 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    {editMode.hld_scalability_strategy ? (
                      <div className="space-y-2">
                        <textarea
                          value={typeof editValues.hld_scalability_strategy === 'string' ? editValues.hld_scalability_strategy : JSON.stringify(editValues.hld_scalability_strategy, null, 2)}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            hld_scalability_strategy: e.target.value
                          })}
                          rows={6}
                          className="input-field w-full text-sm font-mono"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              saveEdit('high_level_design')
                              setEditMode({ ...editMode, hld_scalability_strategy: false })
                            }}
                            className="btn-primary text-xs flex items-center space-x-1 px-2 py-1"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditMode({ ...editMode, hld_scalability_strategy: false })}
                            className="btn-secondary text-xs px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {Array.isArray(phase3.data.architecture.high_level_design.scalability_strategy) ? (
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200 h-full">
                            {phase3.data.architecture.high_level_design.scalability_strategy.map((line: string, i: number) => {
                              if (!line.trim()) return <div key={i} className="h-2" />
                              
                              if (line.trim().endsWith(':')) {
                                return (
                                  <div key={i} className="font-semibold text-green-900 mt-2 mb-1">
                                    {line}
                                  </div>
                                )
                              }
                              
                              return (
                                <div key={i} className="flex items-start text-gray-700 text-sm py-0.5">
                                  {line.trim().startsWith('•') ? (
                                    <>
                                      <span className="text-green-600 mr-2 mt-0.5">•</span>
                                      <span>{line.replace(/^•\s*/, '')}</span>
                                    </>
                                  ) : (
                                    <span className="ml-4">{line}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-600 bg-green-50 p-4 rounded-lg border border-green-200">
                            {phase3.data.architecture.high_level_design.scalability_strategy}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Security Overview */}
                  <div className="group">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center">
                        <span className="mr-2">🔒</span>
                        Security Overview
                      </h3>
                      <button
                        onClick={() => {
                          setEditValues({
                            ...editValues,
                            hld_security_overview: phase3.data.architecture.high_level_design.security_overview
                          })
                          setEditMode({ ...editMode, hld_security_overview: true })
                        }}
                        className="btn-secondary text-xs flex items-center space-x-1 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    {editMode.hld_security_overview ? (
                      <div className="space-y-2">
                        <textarea
                          value={typeof editValues.hld_security_overview === 'string' ? editValues.hld_security_overview : JSON.stringify(editValues.hld_security_overview, null, 2)}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            hld_security_overview: e.target.value
                          })}
                          rows={6}
                          className="input-field w-full text-sm font-mono"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              saveEdit('high_level_design')
                              setEditMode({ ...editMode, hld_security_overview: false })
                            }}
                            className="btn-primary text-xs flex items-center space-x-1 px-2 py-1"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditMode({ ...editMode, hld_security_overview: false })}
                            className="btn-secondary text-xs px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {Array.isArray(phase3.data.architecture.high_level_design.security_overview) ? (
                          <div className="bg-red-50 p-4 rounded-lg border border-red-200 h-full">
                            {phase3.data.architecture.high_level_design.security_overview.map((line: string, i: number) => {
                              if (!line.trim()) return <div key={i} className="h-2" />
                              
                              if (line.trim().endsWith(':')) {
                                return (
                                  <div key={i} className="font-semibold text-red-900 mt-2 mb-1">
                                    {line}
                                  </div>
                                )
                              }
                              
                              return (
                                <div key={i} className="flex items-start text-gray-700 text-sm py-0.5">
                                  {line.trim().startsWith('•') ? (
                                    <>
                                      <span className="text-red-600 mr-2 mt-0.5">•</span>
                                      <span>{line.replace(/^•\s*/, '')}</span>
                                    </>
                                  ) : (
                                    <span className="ml-4">{line}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-600 bg-red-50 p-4 rounded-lg border border-red-200">
                            {phase3.data.architecture.high_level_design.security_overview}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>High level design will appear here after generation.</p>
            </div>
          )}
        </div>

        {/* Section 3: End-to-End Flow Diagram */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <GitBranch className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-semibold text-gray-900">3. End-to-End Flow Diagram</h2>
            </div>
            {phase3?.data?.architecture?.e2e_flow_diagram && (
              <button
                onClick={() => {
                  if (editMode.e2e_flow_diagram) {
                    saveEdit('e2e_flow_diagram')
                  } else {
                    toggleEditMode('e2e_flow_diagram')
                  }
                }}
                className="btn-secondary flex items-center space-x-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>{editMode.e2e_flow_diagram ? 'Save' : 'Edit'}</span>
              </button>
            )}
          </div>
          {/* DEBUG LOGGING */}
          {(() => {
            const e2eData = phase3?.data?.architecture?.e2e_flow_diagram
            console.log('[Phase3 Render E2E]', {
              hasData: !!e2eData,
              dataLength: e2eData?.length || 0,
              dataType: typeof e2eData,
              isTruthy: !!e2eData,
              preview: e2eData?.substring(0, 50)
            })
            return null
          })()}
          {phase3?.data?.architecture?.e2e_flow_diagram ? (
            editMode.e2e_flow_diagram ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mermaid Diagram Code</label>
                  <textarea
                    value={editValues.e2e_flow_diagram || ''}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      e2e_flow_diagram: e.target.value
                    })}
                    rows={12}
                    className="input-field w-full font-mono text-sm"
                    placeholder="graph TD\n  A[Start] --> B[Process]\n  B --> C[End]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use Mermaid syntax for flow diagrams</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => saveEdit('e2e_flow_diagram')}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={() => setEditMode({ ...editMode, e2e_flow_diagram: false })}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg overflow-x-auto">
                <div className="mermaid">
                  {extractMermaid(phase3.data.architecture.e2e_flow_diagram)}
                </div>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Flow diagram not generated yet.</p>
            </div>
          )}
        </div>

        {/* Submit for Approval Button - At the bottom */}
        {phase3?.data?.architecture && !isApproved && !isPendingApproval && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleSubmitForApproval}
              className="btn-primary flex items-center space-x-2 px-8 py-3 text-lg"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Submit for Approval</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Phase3Page
