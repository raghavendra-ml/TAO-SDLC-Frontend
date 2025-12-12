import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Database as DbIcon, Database, Loader2, GitBranch, Server, Edit2, Save, CheckCircle, Clock, Code, Sparkles, FileText, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { getProjectPhases, updatePhase, getProject, generateContent } from '../services/api'
import toast from 'react-hot-toast'
import RequirementUploader from '../components/DocumentUpload/RequirementUploader'
import SwaggerViewer from '../components/API/SwaggerViewer'
import { getBusinessLogicForEndpoint } from '../utils/apiBusinessLogicMapping'

const Phase4Page = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  
  const [projectName, setProjectName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [phase4, setPhase4] = useState<any>(null)
  const [phase3Data, setPhase3Data] = useState<any>(null)
  
  // API Spec states
  const [apiSpecData, setApiSpecData] = useState<any>(null)
  const [apiSummary, setApiSummary] = useState<string>('')
  const [showAPIView, setShowAPIView] = useState(false)
  const [apiTab, setApiTab] = useState<'generated' | 'extracted'>('generated')
  const [editGeneratedAPI, setEditGeneratedAPI] = useState(false)
  const [generatedAPISwaggerFormat, setGeneratedAPISwaggerFormat] = useState<any>(null)
  
  // Approval state
  const [phaseStatus, setPhaseStatus] = useState<string>('in_progress')
  const [approvalHistory, setApprovalHistory] = useState<any[]>([])
  const isApproved = phaseStatus === 'approved'
  const isPendingApproval = phaseStatus === 'pending_approval'
  
  // Edit mode states
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [editingTable, setEditingTable] = useState<{service: string, tableIndex: number} | null>(null)
  const [tableEditMode, setTableEditMode] = useState<'sql' | 'text'>('text')
  const [tableEditValue, setTableEditValue] = useState<any>(null)
  
  // Component-Wise LLD state - now with proper generation status tracking
  const [componentWiseLLD, setComponentWiseLLD] = useState<string | null>(null)
  const [generatingComponentWiseLLD, setGeneratingComponentWiseLLD] = useState(false)
  
  // LLD Generation Status: 'idle' | 'generating' | 'completed' | 'approved'
  // This tracks whether LLD has been generated and/or approved
  const [lldGenerationStatus, setLldGenerationStatus] = useState<'idle' | 'generating' | 'completed' | 'approved'>('idle')
  const [lldApprovedAt, setLldApprovedAt] = useState<string | null>(null)
  const [lldCanBeEdited, setLldCanBeEdited] = useState(false)  // true after approval
  
  // Debug: Monitor componentWiseLLD state changes
  useEffect(() => {
    console.log('🔄 componentWiseLLD state changed:', {
      exists: !!componentWiseLLD,
      length: componentWiseLLD?.length || 0,
      preview: componentWiseLLD?.substring(0, 50) || 'null'
    })
  }, [componentWiseLLD])

  // Debug: Log component mount
  useEffect(() => {
    console.log('%c🎯 Phase4Page MOUNTED at ' + new Date().toLocaleTimeString(), 'color: blue; font-weight: bold; font-size: 12px')
    return () => {
      console.log('%c🎯 Phase4Page UNMOUNTED', 'color: purple; font-weight: bold; font-size: 12px')
    }
  }, [])
  
  // Edit state for Component-Wise LLD
  const [editingComponentLLD, setEditingComponentLLD] = useState<{componentIdx: number, sectionName: string} | null>(null)
  const [editedLLDContent, setEditedLLDContent] = useState<Record<string, Record<string, string>>>({}) // componentIdx -> sectionName -> content
  
  // Store generation timestamp for visual feedback
  const [lldGeneratedAt, setLldGeneratedAt] = useState<string | null>(null)
  
  // Expanded state for component accordion sections
  const [expandedComponents, setExpandedComponents] = useState<Record<number, boolean>>({})
  
  // Edit section state
  const [editingSection, setEditingSection] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState<string>('')
  
  useEffect(() => {
    if (projectId) {
      loadPhaseData()
    }
  }, [projectId])
  
  const loadPhaseData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch project details
      try {
        const projectResponse = await getProject(Number(projectId))
        setProjectName(projectResponse.data.name || 'Unknown Project')
        console.log('Phase 4 - Project loaded:', projectResponse.data.name)
      } catch (error) {
        console.error('Phase 4 - Error loading project:', error)
      }
      
      const response = await getProjectPhases(parseInt(projectId!))
      const phases = response.data
      
      const phase3 = phases.find((p: any) => p.phase_number === 3)
      if (phase3?.data) {
        setPhase3Data(phase3.data)
      }
      
      const phase4 = phases.find((p: any) => p.phase_number === 4)
      if (phase4) {
        setPhase4(phase4)
        setPhaseStatus(phase4.status || 'in_progress')
        
        // Load approval history
        if (phase4.data?.approvalHistory) {
          setApprovalHistory(phase4.data.approvalHistory)
        }
        
        // Load API spec data if exists
        if (phase4.data?.apiSpecData) {
          setApiSpecData(phase4.data.apiSpecData)
          setShowAPIView(true)
        }
        if (phase4.data?.apiSummary) {
          setApiSummary(phase4.data.apiSummary)
        }
        
        // 🔴 CRITICAL FIX: Load component-wise LLD from database if it exists
        // Previously this was clearing the data, now we load it properly
        console.log('🔍 DEBUG - Checking if Phase4 has component_wise_lld data in database')
        
        // Check for component_wise_lld in multiple possible locations
        if (phase4.data?.component_wise_lld) {
          console.log('✅ [LOAD_FROM_DB] Found component_wise_lld in phase4.data.component_wise_lld')
          const lldData = phase4.data.component_wise_lld
          
          // Extract document from nested structure
          // Backend saves it as: { component_wise_lld_document: "...", generated_at: "...", metadata: {...} }
          let lldContent = null
          if (typeof lldData === 'string') {
            lldContent = lldData
          } else if (lldData?.component_wise_lld_document) {
            // This is the correct key - it's the structure returned by _generate_component_wise_lld
            lldContent = lldData.component_wise_lld_document
            console.log('✅ [LOAD_FROM_DB] Extracted component_wise_lld_document from lldData')
          } else if (lldData?.document) {
            lldContent = lldData.document
          } else if (lldData?.content) {
            lldContent = lldData.content
          } else {
            // Try to use the whole object as markdown if it's a string-like structure
            lldContent = JSON.stringify(lldData)
          }
          
          if (lldContent) {
            console.log('✅ [LOAD_FROM_DB] Setting componentWiseLLD from database:', lldContent.substring(0, 100), '...')
            setComponentWiseLLD(lldContent)
            setLldGenerationStatus('completed')
            setLldGeneratedAt(lldData?.generated_at || null)
          } else {
            console.log('❌ [LOAD_FROM_DB] Could not extract content from lldData')
            setComponentWiseLLD(null)
            setLldGenerationStatus('idle')
          }
        } else if (phase4.data?.component_wise_lld_document) {
          // Alternative location where backend might store it
          console.log('✅ [LOAD_FROM_DB] Found component_wise_lld_document in phase4.data')
          setComponentWiseLLD(phase4.data.component_wise_lld_document)
          setLldGenerationStatus('completed')
        } else {
          console.log('🔍 [LOAD_FROM_DB] No component_wise_lld found, ready for fresh generation')
          setComponentWiseLLD(null)
          setLldGenerationStatus('idle')
          setLldGeneratedAt(null)
        }
      }
    } catch (error) {
      console.error('Error loading phase data:', error)
      setError('Failed to load phase data: ' + String(error))
      toast.error('Failed to load phase data')
    } finally {
      setLoading(false)
    }
  }
  
  // FUNCTION 1: Generate API Specification (keeping existing functionality)
  const handleGenerateAPISpecification = async () => {
    if (!phase4?.id) {
      toast.error('Phase 4 not initialized')
      return
    }
    try {
      setGenerating(true)
      toast.loading('Gathering requirements and architecture context...')

      // Fetch all phases to gather comprehensive context
      const phasesResp = await getProjectPhases(parseInt(projectId!))
      const phases = phasesResp.data

      // Phase 2: BRD/PRD content, Epics and User Stories (Phase 2 contains the planning output)
      const phase2 = phases.find((p: any) => p.phase_number === 2)
      const brdData = phase2?.data?.brd || {}
      const prdData = phase2?.data?.prd || {}
      const epics = phase2?.data?.epics || []
      const userStories = phase2?.data?.userStories || []

      // Phase 1: Extracted requirements (optional context)
      const phase1 = phases.find((p: any) => p.phase_number === 1)
      const extractedRequirements = phase1?.data?.requirements || []

      // Phase 3: Architecture and HLD
      const phase3 = phases.find((p: any) => p.phase_number === 3)
      const architecture = phase3?.data?.architecture || {}
      const systemComponents = architecture.system_components || []
      const highLevelDesign = architecture.high_level_design || ''
      const e2eFlow = architecture.e2e_flow_diagram || ''

      // Build comprehensive context for LLD generation
      const lldContext = {
        content_type: 'lld',
        // Requirements context
        epics: epics.map((epic: any) => ({
          id: epic.id,
          title: epic.title,
          description: epic.description,
          acceptanceCriteria: epic.acceptanceCriteria || epic.acceptance_criteria
        })),
        user_stories: userStories.map((story: any) => ({
          id: story.id,
          title: story.title,
          description: story.description,
          acceptanceCriteria: story.acceptanceCriteria || story.acceptance_criteria,
          gherkin: story.gherkin
        })),
        // BRD/PRD context
        business_requirements: {
          objectives: brdData.objectives || brdData.business_objectives,
          scope: brdData.scope,
          stakeholders: brdData.stakeholders,
          constraints: brdData.constraints
        },
        product_requirements: {
          features: prdData.features,
          functional_requirements: prdData.functional_requirements,
          non_functional_requirements: prdData.non_functional_requirements
        },
        // Architecture context (HLD from Phase 3)
        architecture: {
          system_components: systemComponents.map((comp: any) => ({
            name: comp.name,
            description: comp.description,
            type: comp.type,
            responsibilities: comp.responsibilities,
            technology: comp.technology
          })),
          high_level_design: highLevelDesign,
          e2e_flow_diagram: e2eFlow,
          existing_database_design: architecture.database_design,
          existing_integration_design: architecture.integration_design,
          existing_infrastructure_design: architecture.infrastructure_design
        },
        // Instructions for AI
        generation_goals: [
          'Generate detailed API specifications for each microservice/component',
          'Create database schemas for each service with tables, fields, relationships, indexes',
          'Design integration patterns between services (REST, events, messaging)',
          'Define infrastructure design (deployment, networking, CI/CD, monitoring, logging)',
          'Ensure designs support the epics and user stories',
          'Consider scalability, security, and performance requirements'
        ]
      }

      console.log('[Phase4] LLD Context prepared:', lldContext)
      toast.dismiss()
      toast.loading('Generating detailed technical design...')

      const response = await generateContent(phase4.id, 'lld', lldContext)
      const generated = response?.data?.content ?? response?.data ?? {}

      console.log('[Phase4] LLD Generated:', generated)
      toast.dismiss()

      // Update Phase 3 architecture with generated designs
      if (phase3?.id) {
        const currentArch = phase3.data?.architecture || {}
        const updatedArchitecture = {
          ...currentArch,
          database_design: generated.database_design || generated.database || currentArch.database_design,
          integration_design: generated.integration_design || generated.integration || currentArch.integration_design,
          infrastructure_design: generated.infrastructure_design || generated.infrastructure_details || generated.infrastructure || currentArch.infrastructure_design,
        }

        await updatePhase(phase3.id, {
          data: { ...phase3.data, architecture: updatedArchitecture }
        })
      }

      // Save generated API specifications (per service) under Phase 4
      const generatedApi = generated.api || generated.api_specifications || generated.api_endpoints || generated.apis || generated.endpoints || generated.services_apis
      if (generatedApi) {
        await updatePhase(phase4.id, {
          data: { 
            ...phase4.data, 
            generated_api: generatedApi,
            lld_metadata: {
              generated_at: new Date().toISOString(),
              context_summary: {
                epics_count: epics.length,
                stories_count: userStories.length,
                components_count: systemComponents.length
              }
            }
          },
        })
      }

      toast.success('API Specification generated successfully!')
      await loadPhaseData()
    } catch (err) {
      console.error('Error generating API Specification:', err)
      toast.dismiss()
      toast.error('Failed to generate API Specification: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGenerating(false)
    }
  }

  // FUNCTION 2: Generate Comprehensive LLD (new detailed prompt)
  // Generate Component-Wise LLD Generate Component-Wise LLD
  const handleGenerateComponentWiseLLD = async () => {
    const CALL_ID = Math.random().toString(36).slice(7)
    console.log('%c🔴 [CRITICAL] ========== FUNCTION CALLED ==========%c', 'color: red; font-weight: bold; font-size: 14px', 'color: red')
    console.log(`🔴 [${CALL_ID}] handleGenerateComponentWiseLLD called at ${new Date().toLocaleTimeString()}`)
    console.log(`🔴 [${CALL_ID}] phase4 object:`, phase4)
    console.log(`🔴 [${CALL_ID}] phase4.id = ${phase4?.id}`)
    
    if (!phase4?.id) {
      console.log(`🔴 [${CALL_ID}] Phase 4 not initialized, returning`)
      toast.error('Phase 4 not initialized')
      return
    }

    try {
      const CALL_ID = Math.random().toString(36).slice(7)
      console.log(`🟡 [${CALL_ID}] STEP 1: Starting generation process`)
      
      // Clear old content when regenerating
      console.log(`🟡 [${CALL_ID}] STEP 2: Clearing old componentWiseLLD state`)
      setComponentWiseLLD(null)
      
      console.log(`🟡 [${CALL_ID}] STEP 3: Setting generation flags`)
      setGeneratingComponentWiseLLD(true)
      setLldGenerationStatus('generating')
      
      console.log(`🟡 [${CALL_ID}] STEP 4: Showing loading toast`)
      toast.loading('Gathering context from Phase 2 (Epics & Stories) and Phase 3 (Architecture)...')

      // Fetch all phases
      const phasesResp = await getProjectPhases(parseInt(projectId!))
      const phases = phasesResp.data

      console.log('🔴 [CRITICAL] Fetched all phases:', phases.length, 'phases')
      phases.forEach((p: any, idx: number) => {
        console.log(`   Phase ${idx}: id=${p.id}, number=${p.phase_number}, has_data=${!!p.data}`)
      })

      // Phase 2: Epics and User Stories
      const phase2 = phases.find((p: any) => p.phase_number === 2)
      const epics = phase2?.data?.epics || []
      const userStories = phase2?.data?.userStories || []

      console.log('🔴 [CRITICAL] Phase 2 found:', !!phase2, 'epics:', epics.length, 'stories:', userStories.length)

      // Phase 3: Architecture components
      const phase3 = phases.find((p: any) => p.phase_number === 3)
      
      console.log('🔴 [CRITICAL] Phase 3 found:', !!phase3)
      if (!phase3) {
        console.log('🔴 [CRITICAL] ❌ PHASE 3 NOT FOUND IN PHASES ARRAY!')
        toast.error('Phase 3 not found. Cannot generate LLD.')
        setLldGenerationStatus('idle')
        setGeneratingComponentWiseLLD(false)
        return
      }
      
      if (!phase3.data) {
        console.log('🔴 [CRITICAL] ❌ PHASE 3.DATA IS NULL!')
        console.log('   phase3:', phase3)
        toast.error('Phase 3 has no data. Cannot generate LLD.')
        setLldGenerationStatus('idle')
        setGeneratingComponentWiseLLD(false)
        return
      }
      
      // Debug: Log Phase 3 data structure
      console.log('[Phase4] DEBUG - Phase 3 Data:', {
        hasPhase3: !!phase3,
        hasData: !!phase3?.data,
        dataKeys: phase3?.data ? Object.keys(phase3.data) : [],
        hasArchitecture: !!phase3?.data?.architecture,
        architectureKeys: phase3?.data?.architecture ? Object.keys(phase3.data.architecture) : [],
      })
      console.log('[Phase4] FULL Phase3.data (first 1500 chars):', JSON.stringify(phase3?.data, null, 2).substring(0, 1500))
      console.log('[Phase4] FULL Phase3.data.architecture (first 1500 chars):', JSON.stringify(phase3?.data?.architecture, null, 2).substring(0, 1500))
      
      const architecture = phase3?.data?.architecture || {}
      const systemComponents = architecture.system_components || []
      const highLevelDesign = architecture.high_level_design || architecture.hld || ''

      // ✅ MORE DIAGNOSTICS
      console.log('[Phase4] DIAGNOSTIC CHECK:')
      console.log('   - Type of systemComponents:', typeof systemComponents)
      console.log('   - Is array?', Array.isArray(systemComponents))
      console.log('   - Is object?', typeof systemComponents === 'object' && systemComponents !== null)
      console.log('   - systemComponents value:', systemComponents)
      console.log('   - Length:', systemComponents?.length || (typeof systemComponents === 'string' ? systemComponents.length : 'N/A'))
      
      // If it's a string or object that's not an array, convert it
      let systemComponentsArray: any[] = []
      if (Array.isArray(systemComponents)) {
        systemComponentsArray = systemComponents
        console.log('   ✅ Already an array')
      } else if (typeof systemComponents === 'string') {
        console.log('   ⚠️  systemComponents is a STRING, trying to parse')
        try {
          systemComponentsArray = JSON.parse(systemComponents)
          if (!Array.isArray(systemComponentsArray)) {
            console.log('   ❌ Parsed but not an array, got:', typeof systemComponentsArray)
            systemComponentsArray = []
          }
        } catch(e: any) {
          console.log('   ❌ Failed to parse as JSON:', (e as Error).message)
          systemComponentsArray = []
        }
      } else if (typeof systemComponents === 'object' && !Array.isArray(systemComponents)) {
        console.log('   ⚠️  systemComponents is an OBJECT not array, has keys:', Object.keys(systemComponents || {}))
        // Try to get array from known keys
        if (systemComponents?.components && Array.isArray(systemComponents.components)) {
          systemComponentsArray = systemComponents.components
          console.log('   ✅ Found .components array inside')
        }
      }

      console.log('[Phase4] Component-Wise LLD Context:', {
        epics: epics.length,
        userStories: userStories.length,
        systemComponents: systemComponentsArray.length,
        systemComponentsSample: systemComponentsArray.slice(0, 2),
        architectureKeys: Object.keys(architecture)
      })

      if (systemComponentsArray.length === 0) {
        console.log('🔴 [ERROR] systemComponentsArray is EMPTY! Cannot generate LLD')
        console.log('   Architecture object:', architecture)
        console.log('   systemComponents raw:', systemComponents)
        console.log('   systemComponentsArray:', systemComponentsArray)
        console.log('   All available keys in phase3.data:', Object.keys(phase3?.data || {}))
        toast.dismiss()
        toast.error('❌ Phase 3 Architecture not found. Cannot generate LLD. Please go to Phase 3 and generate the architecture first.')
        setLldGenerationStatus('idle')
        setGeneratingComponentWiseLLD(false)
        return
      }

      toast.dismiss()
      toast.loading(`Generating Component-Wise LLD for ${systemComponentsArray.length} components...`)

      console.log('🟡 [API] Calling backend...')
      const API_START_TIME = performance.now()
      console.log('🟡 [API] Request payload:', {
        phaseId: phase4.id,
        contentType: 'component_wise_lld',
        epics: epics.length,
        user_stories: userStories.length,
        hld_length: highLevelDesign.length,
        system_components: systemComponentsArray.length,
        system_components_sample: systemComponentsArray.slice(0, 2).map(c => c.name || c.type || 'unnamed')
      })
      
      // Call backend with component_wise_lld content type
      console.log('🔴 [CRITICAL] ABOUT TO CALL API WITH THIS DATA:')
      console.log('   epics:', epics)
      console.log('   userStories:', userStories)
      console.log('   highLevelDesign length:', highLevelDesign.length)
      console.log('   systemComponentsArray LENGTH:', systemComponentsArray.length)
      console.log('   systemComponentsArray FULL:', JSON.stringify(systemComponentsArray, null, 2))
      
      // FORCE: Add test components if empty
      let componentsToSend = systemComponentsArray
      if (systemComponentsArray.length === 0) {
        console.log('🟡 [WARNING] systemComponentsArray is EMPTY, but proceeding with backend defaults')
      }
      
      const response = await generateContent(phase4.id, 'component_wise_lld', {
        epics: epics,
        user_stories: userStories,
        hld: highLevelDesign,
        system_components: componentsToSend
      })
      
      const API_END_TIME = performance.now()
      const RESPONSE_TIME = API_END_TIME - API_START_TIME
      console.log(`🟢 [API] Response TIME: ${RESPONSE_TIME.toFixed(0)}ms`)

      console.log('🟢 [API] Response received:', response)
      console.log('🟢 [API] Response.data:', response.data)
      console.log('🟢 [API] Response.data keys:', Object.keys(response.data || {}))
      console.log('🟢 [API] component_wise_lld_document exists?', !!response.data?.component_wise_lld_document)
      console.log('🟢 [API] component_wise_lld_document length:', response.data?.component_wise_lld_document?.length || 0)
      console.log('🟢 [API] component_wise_lld_document preview:', response.data?.component_wise_lld_document?.substring(0, 200) || 'EMPTY/NULL')
      
      // ✅ CRITICAL FIX: Response structure is directly from _generate_component_wise_lld
      // Structure: { component_wise_lld_document: "...", generated_at: "...", metadata: {...} }
      const lldDocument = response?.data?.component_wise_lld_document || response?.data?.content?.component_wise_lld_document || ''
      const generated = response?.data || {}  // ✅ Get the full response data

      console.log('🟡 [PARSE] Extracted LLD Document:', {
        type: typeof lldDocument,
        length: typeof lldDocument === 'string' ? lldDocument.length : JSON.stringify(lldDocument).length,
        preview: typeof lldDocument === 'string' ? lldDocument.substring(0, 100) : 'not-a-string'
      })

      console.log('[Phase4] Component-Wise LLD Generated:', (typeof lldDocument === 'string' ? lldDocument.length : JSON.stringify(lldDocument).length), 'characters')

      // Save to Phase 4 data
      const saveData = {
        data: {
          ...phase4.data,
          component_wise_lld: {
            document: lldDocument,
            metadata: generated.metadata || {},
            generated_at: generated.generated_at || new Date().toISOString()
          }
        }
      }
      
      console.log('[Phase4] DEBUG - Saving data structure:', {
        hasComponentWiseLld: !!saveData.data.component_wise_lld,
        hasDocument: !!saveData.data.component_wise_lld.document,
        documentLength: (typeof saveData.data.component_wise_lld.document === 'string' ? 
          saveData.data.component_wise_lld.document.length : 
          JSON.stringify(saveData.data.component_wise_lld.document).length)
      })

      // ✅ DO NOT save LLD to database - always generate fresh from backend
      // This prevents caching old data and ensures users always get fresh generation
      // await updatePhase(phase4.id, saveData)
      console.log('[Phase4] DEBUG - LLD not saved to database (always generate fresh)')

      // Convert to string if needed
      const lldString = typeof lldDocument === 'string' ? lldDocument : JSON.stringify(lldDocument, null, 2)
      
      console.log('🟡 [STATE] About to set componentWiseLLD state with', lldString.length, 'characters')
      
      // ✅ FORCE RE-RENDER: Add timestamp marker to ensure content is always different
      // This forces React to detect the change and re-render, even if content is similar
      const lldWithTimestamp = `<!-- Generated at: ${new Date().toISOString()} -->\n${lldString}`
      
      // ✅ SET STATE DIRECTLY WITH GENERATED CONTENT
      console.log('🔴 BEFORE: setComponentWiseLLD - old value:', componentWiseLLD ? `${componentWiseLLD.substring(0, 50)}...` : 'null')
      setComponentWiseLLD(lldWithTimestamp)
      console.log('🟢 AFTER: setComponentWiseLLD - new value set:', lldWithTimestamp.substring(0, 50), '...')
      
      setLldGeneratedAt(new Date().toLocaleString())  // Set timestamp to show it's fresh
      console.log('🟢 [STATE] setComponentWiseLLD called')
      
      setLldGenerationStatus('completed')  // Mark as completed
      console.log('🟢 [STATE] setLldGenerationStatus set to completed')
      
      toast.dismiss()
      console.log('🟢 [TOAST] About to show success toast with', systemComponentsArray.length, 'components')
      toast.success(`Component-Wise LLD generated with ${systemComponentsArray.length} components!`)
      console.log('🟢 [SUCCESS] Toast shown, generation complete')

    } catch (err) {
      console.error('🔴 [ERROR] Error generating Component-Wise LLD:', err)
      console.error('🔴 [ERROR] Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      })
      toast.dismiss()
      toast.error('Failed to generate Component-Wise LLD: ' + (err instanceof Error ? err.message : String(err)))
      setLldGenerationStatus('idle')  // Reset status on error
    } finally {
      console.log('🟡 [FINALLY] Setting generatingComponentWiseLLD to false')
      setGeneratingComponentWiseLLD(false)
    }
  }
  
  // Approve and lock the Component-Wise LLD
  const handleApproveLLD = () => {
    setLldGenerationStatus('approved')
    setLldApprovedAt(new Date().toISOString())
    setLldCanBeEdited(true)  // Allow manual edits after approval
    toast.success('Component-Wise LLD approved and locked! You can now make manual edits.')
  }

  // Toggle component expansion
  const toggleComponentExpansion = (componentIdx: number) => {
    setExpandedComponents(prev => ({
      ...prev,
      [componentIdx]: !prev[componentIdx]
    }))
  }

  // Initialize all components as collapsed when componentWiseLLD changes
  useEffect(() => {
    if (componentWiseLLD) {
      // Parse components to count them and set all as collapsed by default
      const lines = componentWiseLLD.split('\n')
      let componentCount = 0
      lines.forEach(line => {
        const componentMatch = line.match(/^## Component (\d+): (.+)/)
        if (componentMatch) {
          componentCount++
        }
      })
      
      // Set all components as collapsed by default
      const initialExpanded: Record<number, boolean> = {}
      for (let i = 0; i < componentCount; i++) {
        initialExpanded[i] = false
      }
      setExpandedComponents(initialExpanded)
    }
  }, [componentWiseLLD])

  // Save edited Component-Wise LLD section
  const handleSaveComponentLLDSection = async (componentIdx: number, sectionName: string) => {
    if (!phase4?.id || !componentWiseLLD) {
      toast.error('No LLD document to update')
      return
    }

    try {
      // Parse the current markdown
      const lines = componentWiseLLD.split('\n')
      const updatedLines = [...lines]
      
      // Find the component and section in the markdown
      let currentComponentIdx = -1
      let inTargetSection = false
      let sectionStartLine = -1
      let sectionEndLine = -1
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // Track component number
        const componentMatch = line.match(/^## Component (\d+):/)
        if (componentMatch) {
          currentComponentIdx = parseInt(componentMatch[1]) - 1
          inTargetSection = false
        }
        
        // Track sections within the target component
        if (currentComponentIdx === componentIdx) {
          const sectionMatch = line.match(/^### (.+)/)
          if (sectionMatch) {
            if (sectionMatch[1] === sectionName) {
              inTargetSection = true
              sectionStartLine = i + 1 // Content starts after the heading
            } else if (inTargetSection) {
              // End of target section
              sectionEndLine = i
              break
            }
          }
        }
      }
      
      // If section found, replace its content
      if (sectionStartLine !== -1) {
        if (sectionEndLine === -1) {
          sectionEndLine = lines.length // Section goes to end of document
        }
        
        // Get the edited content
        const newContent = editedLLDContent[componentIdx]?.[sectionName] || ''
        const newLines = newContent.split('\n')
        
        // Replace the section content
        updatedLines.splice(sectionStartLine, sectionEndLine - sectionStartLine, ...newLines)
      }
      
      const updatedDocument = updatedLines.join('\n')
      
      // Save to backend
      await updatePhase(phase4.id, {
        data: {
          ...phase4.data,
          component_wise_lld: {
            ...phase4.data.component_wise_lld,
            document: updatedDocument,
            last_edited: new Date().toISOString()
          }
        }
      })
      
      setComponentWiseLLD(updatedDocument)
      setEditingComponentLLD(null)
      
      // Clear the edited content for this section
      const updatedEdits = { ...editedLLDContent }
      if (updatedEdits[componentIdx]) {
        delete updatedEdits[componentIdx][sectionName]
      }
      setEditedLLDContent(updatedEdits)
      
      toast.success('Section saved successfully')
      await loadPhaseData()
      
    } catch (err) {
      console.error('Error saving LLD section:', err)
      toast.error('Failed to save section: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleAPIExtractComplete = async (data: any, summary?: string) => {
    console.log('[Phase4] API Extract complete:', data)
    setApiSpecData(data)
    setShowAPIView(true)
    
    // Save to phase4 data
    if (phase4?.id) {
      try {
        await updatePhase(phase4.id, {
          data: {
            ...phase4.data,
            apiSpecData: data,
            apiSummary: summary || data?.info?.description || 'API Specification uploaded'
          }
        })
        setApiSummary(summary || data?.info?.description || 'API Specification uploaded')
        toast.success('API specification saved successfully')
      } catch (error) {
        console.error('Error saving API spec:', error)
        toast.error('Failed to save API specification')
      }
    }
  }
  
  const handleDeleteAPISpec = async () => {
    if (!phase4?.id) return
    
    try {
      await updatePhase(phase4.id, {
        data: {
          ...phase4.data,
          apiSpecData: null,
          apiSummary: ''
        }
      })
      
      setApiSpecData(null)
      setApiSummary('')
      setShowAPIView(false)
      toast.success('API specification deleted')
    } catch (error) {
      console.error('Error deleting API spec:', error)
      toast.error('Failed to delete API specification')
    }
  }

  // Convert Generated API to OpenAPI/Swagger format for SwaggerViewer
  const convertGeneratedAPIToSwagger = (generatedAPI: any): any => {
    const paths: any = {}
    
    // Handle service-grouped APIs
    if (typeof generatedAPI === 'object' && !Array.isArray(generatedAPI)) {
      Object.entries(generatedAPI).forEach(([serviceName, serviceApis]: [string, any]) => {
        if (Array.isArray(serviceApis)) {
          serviceApis.forEach((endpoint: any) => {
            const path = endpoint.path || endpoint.endpoint || '/unknown'
            const method = (endpoint.method || 'get').toLowerCase()
            
            if (!paths[path]) paths[path] = {}
            
            paths[path][method] = {
              summary: endpoint.description || `${serviceName} - ${method.toUpperCase()} ${path}`,
              description: endpoint.description || '',
              tags: [serviceName],
              requestBody: endpoint.request ? {
                required: true,
                content: {
                  'application/json': {
                    schema: typeof endpoint.request === 'object' ? endpoint.request : { type: 'object' },
                    example: endpoint.request
                  }
                }
              } : undefined,
              responses: {
                '200': {
                  description: 'Successful response',
                  content: {
                    'application/json': {
                      schema: typeof endpoint.response === 'object' ? endpoint.response : { type: 'object' },
                      example: endpoint.response
                    }
                  }
                },
                '400': {
                  description: 'Bad request - Invalid input'
                },
                '401': {
                  description: 'Unauthorized - Authentication required'
                },
                '500': {
                  description: 'Internal server error'
                }
              },
              security: endpoint.authentication && endpoint.authentication !== 'None' ? [{ bearerAuth: [] }] : []
            }
          })
        }
      })
    } 
    // Handle flat array of endpoints
    else if (Array.isArray(generatedAPI)) {
      generatedAPI.forEach((endpoint: any) => {
        if (typeof endpoint === 'object') {
          const path = endpoint.path || endpoint.endpoint || '/unknown'
          const method = (endpoint.method || 'get').toLowerCase()
          
          if (!paths[path]) paths[path] = {}
          
          paths[path][method] = {
            summary: endpoint.description || `${method.toUpperCase()} ${path}`,
            description: endpoint.description || '',
            requestBody: endpoint.request ? {
              required: true,
              content: {
                'application/json': {
                  schema: typeof endpoint.request === 'object' ? endpoint.request : { type: 'object' },
                  example: endpoint.request
                }
              }
            } : undefined,
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: typeof endpoint.response === 'object' ? endpoint.response : { type: 'object' },
                    example: endpoint.response
                  }
                }
              },
              '400': { description: 'Bad request' },
              '401': { description: 'Unauthorized' },
              '500': { description: 'Internal server error' }
            }
          }
        }
      })
    }
    
    return {
      openapi_spec: {
        openapi: '3.0.0',
        info: {
          title: `${projectName} - Generated API Specification`,
          version: '1.0.0',
          description: 'API specification generated from requirements and architecture'
        },
        servers: [
          {
            url: import.meta.env.VITE_API_URL,
            description: 'Development server'
          }
        ],
        paths,
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      },
      openapi_yaml: '# Generated API Specification\n# Convert to YAML format as needed'
    }
  }

  const handleEditGeneratedAPI = () => {
    if (phase4?.data?.generated_api) {
      const swaggerFormat = convertGeneratedAPIToSwagger(phase4.data.generated_api)
      setGeneratedAPISwaggerFormat(swaggerFormat)
      setEditGeneratedAPI(true)
    }
  }

  const handleSaveGeneratedAPI = async (updatedData: any) => {
    if (!phase4?.id) return
    
    try {
      // Convert back from Swagger format to our internal format
      // For now, just save the raw Swagger data
      await updatePhase(phase4.id, {
        data: {
          ...phase4.data,
          generated_api_swagger: updatedData
        }
      })
      
      setEditGeneratedAPI(false)
      toast.success('Generated API updated successfully')
      await loadPhaseData()
    } catch (error) {
      console.error('Error saving generated API:', error)
      toast.error('Failed to save generated API')
    }
  }
  
  const handleSubmitForApproval = async () => {
    if (!phase4?.id) return
    try {
      await updatePhase(phase4.id, { status: 'pending_approval' })
      setPhaseStatus('pending_approval')
      
      // Also mark LLD as approved and locked when submitting for approval
      setLldGenerationStatus('approved')
      setLldApprovedAt(new Date().toISOString())
      
      toast.success('Phase 4 submitted for approval - LLD locked!')
      await loadPhaseData()
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
      toast.error('Phase 4 is approved and locked. Cannot edit.')
      return
    }
    
    const newMode = !editMode[section]
    setEditMode({ ...editMode, [section]: newMode })
    
    if (newMode && phase3Data?.architecture) {
      setEditValues({ ...editValues, [section]: phase3Data.architecture[section] })
    }
  }
  
  const saveEdit = async (section: string) => {
    if (!phase4?.id || !editValues[section]) return
    
    try {
      // Original Phase 3 architecture update logic
      const response = await getProjectPhases(parseInt(projectId!))
      const phases = response.data
      const phase3 = phases.find((p: any) => p.phase_number === 3)
      
      if (!phase3?.id) {
        toast.error('Phase 3 not found')
        return
      }
      
      const updatedArchitecture = {
        ...phase3.data?.architecture,
        [section]: editValues[section]
      }
      
      await updatePhase(phase3.id, {
        data: { ...phase3.data, architecture: updatedArchitecture }
      })
      
      setEditMode({ ...editMode, [section]: false })
      toast.success(`${section.replace(/_/g, ' ')} updated successfully`)
      await loadPhaseData()
    } catch (error) {
      console.error('Error saving edit:', error)
      toast.error('Failed to save changes')
    }
  }

  // Convert table data to SQL CREATE TABLE statement
  const tableToSQL = (table: any): string => {
    if (!table.name) return '-- No table name defined'
    
    let sql = `CREATE TABLE ${table.name} (\n`
    
    if (table.fields && table.fields.length > 0) {
      const fieldDefs = table.fields.map((field: any) => {
        return `  ${field.name} ${field.type}${field.constraints ? ' ' + field.constraints : ''}`
      }).join(',\n')
      sql += fieldDefs
    }
    
    sql += '\n);'
    
    if (table.indexes && table.indexes.length > 0) {
      sql += '\n\n-- Indexes\n'
      table.indexes.forEach((index: string) => {
        sql += `-- ${index}\n`
      })
    }
    
    if (table.relationships && table.relationships.length > 0) {
      sql += '\n\n-- Relationships\n'
      table.relationships.forEach((rel: string) => {
        sql += `-- ${rel}\n`
      })
    }
    
    return sql
  }

  // Parse SQL back to table object (simple parser)
  const sqlToTable = (sql: string, originalTable: any): any => {
    // This is a simple parser - in production, you might want a more robust solution
    const lines = sql.split('\n').filter(line => line.trim() && !line.trim().startsWith('--'))
    const tableName = lines[0].match(/CREATE TABLE (\w+)/i)?.[1] || originalTable.name
    
    const fields: any[] = []
    const fieldLines = lines.slice(1, -1).filter(line => !line.includes(');'))
    
    fieldLines.forEach(line => {
      const trimmed = line.trim().replace(/,$/, '')
      const parts = trimmed.split(/\s+/)
      if (parts.length >= 2) {
        const name = parts[0]
        const type = parts[1]
        const constraints = parts.slice(2).join(' ')
        fields.push({ name, type, constraints: constraints || '' })
      }
    })
    
    return {
      ...originalTable,
      name: tableName,
      fields: fields.length > 0 ? fields : originalTable.fields
    }
  }

  const handleEditTable = (service: string, tableIndex: number, table: any) => {
    setEditingTable({ service, tableIndex })
    setTableEditValue(table)
  }

  const handleSaveTable = async () => {
    if (!editingTable || !phase3Data?.architecture?.database_design) return
    
    try {
      const dbDesign = { ...phase3Data.architecture.database_design }
      
      if (dbDesign.services || dbDesign.microservices) {
        const servicesKey = dbDesign.services ? 'services' : 'microservices'
        const services = { ...dbDesign[servicesKey] }
        const serviceDb = { ...services[editingTable.service] }
        const tables = [...serviceDb.tables]
        
        // Update the specific table
        if (tableEditMode === 'sql') {
          // Convert SQL back to table object
          const sqlText = typeof tableEditValue === 'string' ? tableEditValue : tableToSQL(tableEditValue)
          tables[editingTable.tableIndex] = sqlToTable(sqlText, tables[editingTable.tableIndex])
        } else {
          // Direct JSON edit
          tables[editingTable.tableIndex] = tableEditValue
        }
        
        serviceDb.tables = tables
        services[editingTable.service] = serviceDb
        dbDesign[servicesKey] = services
      } else if (dbDesign.tables) {
        const tables = [...dbDesign.tables]
        
        if (tableEditMode === 'sql') {
          const sqlText = typeof tableEditValue === 'string' ? tableEditValue : tableToSQL(tableEditValue)
          tables[editingTable.tableIndex] = sqlToTable(sqlText, tables[editingTable.tableIndex])
        } else {
          tables[editingTable.tableIndex] = tableEditValue
        }
        
        dbDesign.tables = tables
      }
      
      // Find Phase 3 and update it
      const phasesResp = await getProjectPhases(parseInt(projectId!))
      const phases = phasesResp.data
      const phase3 = phases.find((p: any) => p.phase_number === 3)
      
      if (phase3?.id) {
        await updatePhase(phase3.id, {
          data: {
            ...phase3.data,
            architecture: {
              ...phase3.data.architecture,
              database_design: dbDesign
            }
          }
        })
        
        toast.success('Table updated successfully')
        setEditingTable(null)
        setTableEditValue(null)
        await loadPhaseData()
      }
    } catch (error) {
      console.error('Error saving table:', error)
      toast.error('Failed to save table')
    }
  }

  // Helper function to render tables from content
  const renderTable = (content: string) => {
    const lines = content.trim().split('\n').filter(line => line.trim())
    if (lines.length < 2) return null

    // Parse table structure
    const headerLine = lines[0]
    const headers = headerLine.split('|').map(h => h.trim()).filter(h => h)
    
    const dataRows = lines.slice(1).filter(line => !line.match(/^[\|\-\s:]+$/)).map(line => 
      line.split('|').map(cell => cell.trim()).filter(cell => cell)
    )

    if (dataRows.length === 0) return null

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gradient-to-r from-primary-50 to-primary-100">
            <tr>
              {headers.map((header, idx) => (
                <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-primary-900 uppercase tracking-wider border-r border-primary-200 last:border-r-0">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dataRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 last:border-r-0">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Edit handlers for individual sections
  const handleEditSection = (sectionIdx: number, originalContent: string) => {
    setEditingSection(sectionIdx)
    setEditingContent(originalContent)
  }

  const handleSaveSection = async (sectionIdx: number) => {
    if (!phase4?.id) return
    
    try {
      // Parse the current LLD content
      const currentContent = phase4.data?.lld_document || ''
      const lines = currentContent.split('\n')
      
      // Find section boundaries (simplified - you might need more robust logic)
      // For now, we'll replace the entire document with the edited content
      // In production, you'd want to update just the specific section
      
      const updatedData = {
        ...phase4.data,
        lld_document: editingContent
      }
      
      await updatePhase(phase4.id, { data: updatedData })
      
      // Reload phase data
      await loadPhaseData()
      
      setEditingSection(null)
      setEditingContent('')
      toast.success('Section updated successfully')
    } catch (error) {
      console.error('Error saving section:', error)
      toast.error('Failed to save section')
    }
  }

  const handleCancelEdit = () => {
    setEditingSection(null)
    setEditingContent('')
  }

  // Helper function to render LLD content in Phase 3 style (like System Architecture Components)
  const renderLLDContent = (content: any) => {
    if (!content) {
      return <p className="text-sm text-gray-500">No data available</p>
    }

    // If it's a string (markdown or plain text), render with proper formatting
    if (typeof content === 'string') {
      // Parse the content into structured sections - organized by categories like Phase 3
      const lines = content.split('\n')
      
      // Category definitions matching Phase 3 style + special diagram categories
      const categories = [
        { key: 'overview', label: 'Overview', icon: '📋', color: 'text-blue-700', keywords: ['overview', 'introduction', 'summary'] },
        { key: 'er_diagram', label: 'ER Diagram', icon: '🔷', color: 'text-purple-700', keywords: ['er structure', 'er diagram', 'entity relationship', 'erdiagram'] },
        { key: 'sequence', label: 'Sequence / Flow', icon: '🔄', color: 'text-cyan-700', keywords: ['sequence', 'flow description', 'sequencediagram', 'flow diagram'] },
        { key: 'database', label: 'Database', icon: '🗄️', color: 'text-orange-700', keywords: ['database', 'schema', 'table', 'entity'] },
        { key: 'api', label: 'API', icon: '🔌', color: 'text-purple-700', keywords: ['api', 'endpoint', 'service', 'rest'] },
        { key: 'class', label: 'Classes & Components', icon: '📦', color: 'text-green-700', keywords: ['class', 'component', 'model'] },
        { key: 'integration', label: 'Integration', icon: '🔗', color: 'text-teal-700', keywords: ['integration', 'external', 'third-party'] },
        { key: 'security', label: 'Security', icon: '🔒', color: 'text-red-700', keywords: ['security', 'authentication', 'authorization'] },
        { key: 'deployment', label: 'Deployment', icon: '🚀', color: 'text-indigo-700', keywords: ['deployment', 'infrastructure', 'ci/cd'] },
        { key: 'other', label: 'Other', icon: '📄', color: 'text-gray-700', keywords: [] }
      ]
      
      // Parse sections from markdown
      interface Section {
        category: string
        title: string
        level: number
        items: Array<{
          name: string
          description?: string
          details?: string[]
        }>
      }
      
      const sections: Section[] = []
      let currentSection: Section | null = null
      let currentItem: { name: string; description?: string; details?: string[] } | null = null
      
      lines.forEach((line) => {
        const trimmed = line.trim()
        if (!trimmed) return
        
  // Detect markdown headers (## to ######)
  const headerMatch = trimmed.match(/^(#{2,6})\s+(.+)$/)
        if (headerMatch) {
          // Save previous section and item
          if (currentItem && currentSection) {
            currentSection.items.push(currentItem)
            currentItem = null
          }
          if (currentSection) {
            sections.push(currentSection)
          }
          
          const level = headerMatch[1].length
          const title = headerMatch[2].replace(/\*/g, '').trim()
          
          // Determine category based on title keywords
          let category = 'other'
          const titleLower = title.toLowerCase()
          for (const cat of categories) {
            if (cat.keywords.some(kw => titleLower.includes(kw))) {
              category = cat.key
              break
            }
          }
          
          currentSection = {
            category,
            title,
            level,
            items: []
          }
          currentItem = null
          return
        }
        
        // Detect class/component definition (bold text with colon)
        const classMatch = trimmed.match(/^[\-\*]?\s*\*\*([^:]+):\*\*/)
        if (classMatch) {
          const matchedText = classMatch[1].trim().toLowerCase()
          
          // Check if it's a sub-section marker (Columns, Constraints, etc.) within current item
          if (currentItem && (matchedText === 'columns' || matchedText === 'constraints' || matchedText === 'attributes' || matchedText === 'methods')) {
            // Don't create new item, just mark we're in this subsection
            // Content will be added as details
            return
          }
          
          if (currentItem && currentSection) {
            currentSection.items.push(currentItem)
          }
          currentItem = {
            name: classMatch[1].trim(),
            description: trimmed.replace(/^[\-\*]?\s*\*\*[^:]+:\*\*\s*/, '').trim(),
            details: []
          }
          return
        }
        
        // Detect list items (bullet points)
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const itemText = trimmed.replace(/^[\-\*]\s*/, '').trim()
          
          // Check if it's a sub-detail or new item
          if (currentItem && (trimmed.startsWith('  ') || line.startsWith('  '))) {
            // It's a detail of the current item
            currentItem.details = currentItem.details || []
            currentItem.details.push(itemText)
          } else {
            // It's a new item
            if (currentItem && currentSection) {
              currentSection.items.push(currentItem)
            }
            currentItem = {
              name: itemText,
              details: []
            }
          }
          return
        }
        
        // Regular text - add to current section or item
        if (currentItem) {
          if (!currentItem.description) {
            currentItem.description = trimmed
          } else {
            currentItem.details = currentItem.details || []
            currentItem.details.push(trimmed)
          }
        } else if (currentSection) {
          // Text before any item - add as description
          currentSection.items.push({
            name: trimmed,
            details: []
          })
        }
      })
      
      // Save last item and section
      if (currentItem && currentSection) {
        (currentSection as Section).items.push(currentItem)
      }
      if (currentSection) {
        sections.push(currentSection as Section)
      }
      
      // If we have structured sections, render them in original order (not grouped)
      // Filter out sections not needed in Phase 4 UI
      const filteredSections = sections.filter(sec => {
        const t = (sec.title || '').toLowerCase().trim()
        // Remove the auto-generated meta sections (exact)
        if (t === 'generated at' || t === 'context summary') return false
        // Also remove variants appearing as single list item blocks
        if (t.startsWith('generated at ')) return false
        if (t.startsWith('context summary ')) return false
        // If the section only contains one item whose name matches these labels, skip
        if (sec.items.length === 1) {
          const n = sec.items[0].name.toLowerCase().trim()
          if (n === 'generated at' || n === 'context summary') return false
          if (n.startsWith('generated at ')) return false
          if (n.startsWith('context summary ')) return false
        }
        return true
      })

      if (filteredSections.length > 0) {
        return (
          <div className="space-y-6">
            {filteredSections.map((section, sectionIdx) => {
              // Find the category for this section
              const category = categories.find(cat => cat.key === section.category) || categories[categories.length - 1]
              
              return (
                <div key={sectionIdx} className="space-y-4">
                  {/* Category Header with Section Title */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-300">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{category.icon}</span>
                      <h3 className={`text-lg font-bold ${category.color}`}>
                        {section.title || category.label}
                      </h3>
                    </div>
                    {/* Edit button for this section */}
                    {editingSection === sectionIdx ? (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleSaveSection(sectionIdx)}
                          className="text-xs bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 flex items-center space-x-1"
                        >
                          <span>Save</span>
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="text-xs bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500 flex items-center space-x-1"
                        >
                          <span>Cancel</span>
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleEditSection(sectionIdx, content)}
                        className="text-xs text-gray-500 hover:text-primary-600 flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Section Content - Show editor if editing */}
                  {editingSection === sectionIdx ? (
                    <div className="pl-8">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm"
                        placeholder="Edit section content..."
                      />
                    </div>
                  ) : (
                    <div className="pl-8 space-y-4">{/* Section Content */}
                    {/* Special rendering for ER Diagrams */}
                    {section.category === 'er_diagram' ? (
                      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 rounded-lg p-8 border-2 border-purple-300 shadow-lg">
                        <div className="space-y-6">
                          {section.items.map((item, iIdx) => {
                            // Parse relationship notation: "EMPLOYEES |--o{ DEPARTMENTS : belongs_to"
                            // Also support variations like: ENTITY1 --> ENTITY2, ENTITY1 -- ENTITY2, etc.
                            const relationMatch = item.name.match(/^(\w+)\s*(\|--o\{|-->|--|\|--)\s*(\w+)(\s*:\s*(.+))?$/)
                            
                            if (relationMatch) {
                              const [, entity1, relationType, entity2, , relationLabel] = relationMatch
                              const label = relationLabel?.trim() || 'relates to'
                              
                              // Determine relationship type symbol
                              let relSymbol = '1:N'
                              let relColor = 'bg-purple-500'
                              if (relationType.includes('o{')) {
                                relSymbol = 'ONE-TO-MANY'
                                relColor = 'bg-purple-600'
                              } else if (relationType.includes('--')) {
                                relSymbol = 'RELATES'
                                relColor = 'bg-indigo-600'
                              }
                              
                              return (
                                <div key={iIdx} className="relative">
                                  <div className="flex items-center justify-between bg-white rounded-xl p-5 shadow-md border-2 border-purple-300 hover:shadow-xl transition-all">
                                    {/* Entity 1 */}
                                    <div className="flex-shrink-0">
                                      <div className="bg-gradient-to-br from-purple-100 to-purple-200 text-purple-900 px-6 py-4 rounded-lg border-2 border-purple-400 shadow-sm">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-2xl">🗂️</span>
                                          <div>
                                            <div className="font-mono font-bold text-lg">{entity1}</div>
                                            <div className="text-xs text-purple-600">Entity</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Relationship Arrow */}
                                    <div className="flex-1 flex items-center justify-center px-4">
                                      <div className="flex items-center space-x-2 w-full">
                                        <div className="h-1 flex-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded"></div>
                                        <div className={`${relColor} text-white px-4 py-2 rounded-full shadow-md text-xs font-bold whitespace-nowrap`}>
                                          {label.toUpperCase()}
                                        </div>
                                        <div className="h-1 flex-1 bg-gradient-to-r from-pink-400 to-purple-400 rounded"></div>
                                        <div className="text-pink-600 text-2xl font-bold">▶</div>
                                      </div>
                                    </div>
                                    
                                    {/* Entity 2 */}
                                    <div className="flex-shrink-0">
                                      <div className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-900 px-6 py-4 rounded-lg border-2 border-pink-400 shadow-sm">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-2xl">📋</span>
                                          <div>
                                            <div className="font-mono font-bold text-lg">{entity2}</div>
                                            <div className="text-xs text-pink-600">Entity</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Relationship type badge */}
                                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                      {relSymbol}
                                    </span>
                                  </div>
                                </div>
                              )
                            }
                            
                            // If it's not a relationship, render as entity definition
                            return (
                              <div key={iIdx} className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-sm">
                                <div className="flex items-center space-x-3">
                                  <span className="text-2xl">🗂️</span>
                                  <div className="flex-1">
                                    <span className="font-mono text-purple-900 font-bold text-lg">{item.name}</span>
                                    {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                                    {item.details && item.details.length > 0 && (
                                      <div className="mt-2 grid grid-cols-2 gap-2">
                                        {item.details.map((detail, dIdx) => (
                                          <div key={dIdx} className="text-xs text-gray-600 bg-purple-50 px-2 py-1 rounded">
                                            {detail}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : section.category === 'sequence' ? (
                      /* Special rendering for Sequence Diagrams */
                      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-6 border-2 border-cyan-200 space-y-4">
                        {section.items.map((item, iIdx) => {
                          const seqMatch = item.name.match(/^([^-]+)--?>([^:]+):\s*(.+)$/)
                          if (seqMatch) {
                            return (
                              <div key={iIdx} className="flex items-center space-x-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                  {iIdx + 1}
                                </div>
                                <div className="bg-cyan-100 text-cyan-800 px-3 py-2 rounded-lg font-mono text-sm font-semibold">
                                  {seqMatch[1].trim()}
                                </div>
                                <div className="flex items-center">
                                  <div className="h-0.5 w-8 bg-cyan-400"></div>
                                  <div className="text-cyan-600 font-bold">▶</div>
                                </div>
                                <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg font-mono text-sm font-semibold">
                                  {seqMatch[2].trim()}
                                </div>
                                <div className="flex-1 bg-white border-2 border-cyan-300 rounded-lg px-4 py-2">
                                  <code className="text-sm text-gray-800">{seqMatch[3].trim()}</code>
                                </div>
                              </div>
                            )
                          }
                          const stepMatch = item.name.match(/^(\d+)\.\s+(.+)$/)
                          if (stepMatch) {
                            const stepText = stepMatch[2]
                              .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-cyan-800">$1</strong>')
                              .replace(/'([^']+)'/g, '<code class="bg-cyan-100 text-cyan-900 px-1 rounded">$1</code>')
                            return (
                              <div key={iIdx} className="flex items-start space-x-3 bg-white rounded-lg p-4 border-l-4 border-cyan-500 shadow-sm">
                                <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                  {stepMatch[1]}
                                </div>
                                <div className="flex-1">
                                  <p dangerouslySetInnerHTML={{ __html: stepText }} className="text-gray-800 leading-relaxed" />
                                  {item.description && <p className="text-sm text-gray-600 mt-2">{item.description}</p>}
                                </div>
                              </div>
                            )
                          }
                          return (
                            <div key={iIdx} className="bg-white rounded-lg p-4 border-l-4 border-cyan-400">
                              <span className="text-gray-800">{item.name}</span>
                              {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                            </div>
                          )
                        })}
                      </div>
                    ) : section.category === 'database' ? (
                      /* Render each database section as a single table card if title matches */
                      (() => {
                        const titleMatch = section.title.match(/Table:\s*(.+)$/i)
                        const tableName = titleMatch ? titleMatch[1].trim() : null
                        // Collect columns/constraints from items
                        const columns: string[] = []
                        const constraints: string[] = []
                        const indexes: string[] = []
                        section.items.forEach(item => {
                          const lower = item.name.toLowerCase()
                          if (lower.includes('column')) {
                            if (item.details && item.details.length) {
                              columns.push(...item.details)
                            } else if (item.description) {
                              columns.push(item.description)
                            }
                          } else if (lower.includes('constraint')) {
                            if (item.details && item.details.length) {
                              constraints.push(...item.details)
                            } else if (item.description) {
                              constraints.push(item.description)
                            }
                          } else if (lower.includes('index')) {
                            if (item.details && item.details.length) {
                              indexes.push(...item.details)
                            } else if (item.description) {
                              indexes.push(item.description)
                            }
                          }
                        })
                        // If this section isn't a specific table and has no structured data, skip rendering
                        if (!tableName && columns.length === 0 && constraints.length === 0 && indexes.length === 0) {
                          return <></>
                        }
                        return (
                          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6 border-2 border-orange-200 shadow-md">
                            <div className="flex items-center space-x-3 mb-4 pb-3 border-b-2 border-orange-300">
                              <Database className="w-6 h-6 text-orange-600" />
                              <h4 className="font-bold text-xl text-orange-900">{tableName || section.title}</h4>
                            </div>
                            <div className="space-y-4">
                              {columns.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-orange-800 mb-2 flex items-center space-x-2">
                                    <span className="text-orange-600">📊</span>
                                    <span>Columns</span>
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {columns.map((col, cIdx) => (
                                      <div key={cIdx} className="text-sm text-gray-700 bg-white rounded px-3 py-2 border border-orange-200">
                                        <code className="text-orange-600">{col}</code>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {constraints.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-orange-800 mb-2 flex items-center space-x-2">
                                    <span className="text-orange-600">🔒</span>
                                    <span>Constraints</span>
                                  </h5>
                                  <div className="space-y-1">
                                    {constraints.map((constraint, cIdx) => (
                                      <div key={cIdx} className="text-sm text-gray-700 bg-white rounded px-3 py-2 border border-orange-200">
                                        {constraint}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {indexes.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-orange-800 mb-2 flex items-center space-x-2">
                                    <span className="text-orange-600">⚡</span>
                                    <span>Indexes</span>
                                  </h5>
                                  <div className="space-y-1">
                                    {indexes.map((index, iIdx) => (
                                      <div key={iIdx} className="text-sm text-gray-700 bg-white rounded px-3 py-2 border border-orange-200">
                                        {index}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      /* Default rendering for other categories - Bullet Points */
                      <div className="space-y-3">
                        {section.items.map((item, iIdx) => (
                          <div key={iIdx} className="flex items-start space-x-2">
                            <span className="text-gray-600 mt-1">•</span>
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900">{item.name}</span>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-0.5 ml-2">{item.description}</p>
                              )}
                              {item.details && item.details.length > 0 && (
                                <div className="mt-1 ml-2 space-y-1">
                                  {item.details.map((detail, dIdx) => (
                                    <p key={dIdx} className="text-xs text-gray-500">{detail}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      }
      
      // Fallback: render as simple text with basic formatting
      const textLines = content.split('\n').filter(line => line.trim())
      return (
        <div className="space-y-2 text-sm text-gray-700">
          {textLines.map((line, idx) => {
            if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
              const text = line.replace(/^[\-\*]\s*/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              return (
                <div key={idx} className="flex items-start ml-2">
                  <span className="text-primary-500 mr-2 mt-1">•</span>
                  <span dangerouslySetInnerHTML={{ __html: text }} />
                </div>
              )
            }
            const processedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            return <p key={idx} dangerouslySetInnerHTML={{ __html: processedLine }} className="leading-relaxed" />
          })}
        </div>
      )
    }

    // If it's an object, render it in a structured card-based way
    if (typeof content === 'object' && !Array.isArray(content)) {
      return (
        <div className="space-y-4">
          {Object.entries(content).map(([key, value], idx) => (
            <div key={idx} className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-lg border-l-4 border-primary-400 shadow-sm">
              <h5 className="text-base font-semibold text-gray-900 capitalize mb-3">
                {key.replace(/_/g, ' ')}
              </h5>
              <div className="ml-2">
                {renderLLDContent(value)}
              </div>
            </div>
          ))}
        </div>
      )
    }

    // If it's an array
    if (Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {content.map((item, idx) => (
            <div key={idx} className="flex items-start">
              <span className="inline-block w-2 h-2 bg-primary-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
              <div className="flex-1">
                {typeof item === 'string' ? (
                  <span className="text-gray-700">{item}</span>
                ) : (
                  renderLLDContent(item)
                )}
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Fallback for other types
    return <p className="text-sm text-gray-700">{String(content)}</p>
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
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
    <div className="max-w-7xl mx-auto pr-80">
      <div className="mb-8">
        {projectName && (
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-500">Project:</span>
            <h2 className="text-3xl font-bold text-primary-600">{projectName}</h2>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Phase 4: Detailed Technical Design (LLD)</h1>
            <p className="text-gray-500 mt-2">Low-level design: database schemas, API specifications, integration patterns, and infrastructure details</p>
            {phase3Data && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Phase 3 data loaded: Architecture and HLD available
              </p>
            )}
          </div>
          
          {/* Status Badge */}
          {phase4?.data?.lld && (
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
        {/* Info: Data from Phase 3 */}
        {!phase3Data?.architecture && (
          <div className="card bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Phase 3 Required</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Please complete Phase 3 (Architecture & HLD) to view and edit detailed technical design (LLD) sections here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Generate Comprehensive LLD with AI - Top of page */}
        <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                <span>Generate Low-Level Design with AI</span>
              </h3>
              <p className="text-sm text-gray-600">
                Generate component-wise LLD with user story mapping:
              </p>
            </div>

            {/* Component-Wise LLD Section */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <h4 className="font-semibold text-gray-900 mb-1 flex items-center space-x-2">
                    <span className="text-green-600">🆕</span>
                    <span>Component-Wise LLD</span>
                  </h4>
                  <p className="text-sm text-gray-600">
                    <strong>Generates separate LLD section for EACH system component</strong> with user story mapping.
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Structure: System Overview → Traceability Matrix → For each component (Frontend, Backend Services, API, Database): 
                    Purpose, Mapped User Stories, APIs, UI Modules, Class Diagram, DB Schema, Business Logic, Integrations, 
                    Security, Error Handling, Testing, Performance.
                  </p>
                  <p className="text-xs font-medium text-green-700 mt-1">
                    ✅ Deterministic output | ✅ User Story Traceability | ✅ Component-wise split
                  </p>
                </div>
                <button
                  onClick={handleGenerateComponentWiseLLD}
                  disabled={generatingComponentWiseLLD || !phase3Data || lldGenerationStatus === 'approved'}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingComponentWiseLLD ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : lldGenerationStatus === 'completed' ? (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Regenerate Component-Wise LLD</span>
                    </>
                  ) : lldGenerationStatus === 'approved' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Approved & Locked</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Generate Component-Wise LLD</span>
                    </>
                  )}
                </button>
                
                {/* Approved Status Badge */}
                {lldGenerationStatus === 'approved' && (
                  <div className="flex items-center space-x-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Approved & Locked</span>
                    {lldApprovedAt && <span className="text-xs text-green-600">({new Date(lldApprovedAt).toLocaleString()})</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs for Generated vs Extracted */}
            <div className="flex items-center space-x-2 mb-4">
              <button
                onClick={() => setApiTab('generated')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${apiTab === 'generated' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-700'}`}
              >
                Generated API
              </button>
              <button
                onClick={() => setApiTab('extracted')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${apiTab === 'extracted' ? 'bg-primary-600 text-white' : 'bg-white border text-gray-700'}`}
              >
                Extracted API Specification
              </button>
            </div>

            {apiTab === 'generated' ? (
              <div className="space-y-4">
                {/* Edit Button for Generated API */}
                {phase4?.data?.generated_api && !editGeneratedAPI && (
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={handleEditGeneratedAPI}
                      className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>View as Swagger / Edit API</span>
                    </button>
                  </div>
                )}

                {/* Swagger Viewer for Edit Mode */}
                {editGeneratedAPI && generatedAPISwaggerFormat ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">Generated API - Swagger View</h4>
                      <button
                        onClick={() => setEditGeneratedAPI(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                      >
                        Close Swagger View
                      </button>
                    </div>
                    <SwaggerViewer
                      apiData={generatedAPISwaggerFormat}
                      summary="AI-Generated API specification from requirements and architecture"
                      onDelete={() => setEditGeneratedAPI(false)}
                    />
                  </div>
                ) : phase4?.data?.generated_api ? (
                  // Check if it's an object with service-specific APIs
                  typeof phase4.data.generated_api === 'object' && !Array.isArray(phase4.data.generated_api) ? (
                    <div className="space-y-4">
                      {Object.entries(phase4.data.generated_api).map(([serviceName, serviceApis]: [string, any], idx: number) => (
                        <div key={idx} className="border rounded-lg overflow-hidden">
                          <div className="bg-primary-50 px-4 py-2 border-b">
                            <h4 className="font-semibold text-gray-900">{serviceName} Service</h4>
                          </div>
                          <div className="p-4 bg-white">
                            {Array.isArray(serviceApis) ? (
                              <div className="space-y-2">
                                {serviceApis.map((endpoint: any, eIdx: number) => (
                                  <div key={eIdx} className="p-3 bg-gray-50 rounded border-l-4 border-primary-500">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                        endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                        endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                                        endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                        endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {endpoint.method || 'N/A'}
                                      </span>
                                      <code className="text-sm font-mono text-gray-900">{endpoint.path || endpoint.endpoint}</code>
                                    </div>
                                    <p className="text-sm text-gray-600">{endpoint.description}</p>
                                    {endpoint.request && (
                                      <div className="mt-2 text-xs text-gray-500">
                                        <strong>Request:</strong> {typeof endpoint.request === 'string' ? endpoint.request : JSON.stringify(endpoint.request)}
                                      </div>
                                    )}
                                    {endpoint.response && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        <strong>Response:</strong> {typeof endpoint.response === 'string' ? endpoint.response : JSON.stringify(endpoint.response)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : typeof serviceApis === 'object' ? (
                              <div className="space-y-2">
                                {Object.entries(serviceApis).map(([key, value]: [string, any], kIdx: number) => (
                                  <div key={kIdx} className="text-sm">
                                    <strong className="text-gray-700">{key}:</strong>
                                    <span className="text-gray-600 ml-2">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">{String(serviceApis)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : Array.isArray(phase4.data.generated_api) ? (
                    // Fallback: flat list of endpoints
                    <div className="space-y-2">
                      {phase4.data.generated_api.map((endpoint: any, idx: number) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border-l-4 border-primary-500">
                          {typeof endpoint === 'object' ? (
                            <>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                  endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                  endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                                  endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                  endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {endpoint.method || 'N/A'}
                                </span>
                                <code className="text-sm font-mono text-gray-900">{endpoint.path || endpoint.endpoint}</code>
                              </div>
                              <p className="text-sm text-gray-600">{endpoint.description}</p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-700">{String(endpoint)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Fallback: raw text/JSON
                    <pre className="whitespace-pre-wrap text-sm bg-white p-4 rounded border">{typeof phase4.data.generated_api === 'string' ? phase4.data.generated_api : JSON.stringify(phase4.data.generated_api, null, 2)}</pre>
                  )
                ) : (
                  <p className="text-sm text-gray-600 p-4 bg-gray-50 rounded border">No generated API yet. Use "Generate LLD" at the top to create API details from your requirements and architecture.</p>
                )}
                
                {/* LLD Metadata */}
                {phase4?.data?.lld_metadata && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
                    <strong>Generation Context:</strong> {phase4.data.lld_metadata.context_summary?.epics_count || 0} epics, {phase4.data.lld_metadata.context_summary?.stories_count || 0} user stories, {phase4.data.lld_metadata.context_summary?.components_count || 0} system components
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <RequirementUploader
                    projectId={Number(projectId)}
                    phaseId={phase4?.id}
                    onExtractComplete={() => {}}
                    onAPIExtractComplete={handleAPIExtractComplete}
                    allowedModes={['api']}
                    defaultMode="api"
                  />
                </div>
                {showAPIView && apiSpecData && (
                  <SwaggerViewer
                    apiData={apiSpecData}
                    summary={apiSummary}
                    onDelete={handleDeleteAPISpec}
                  />
                )}
              </>
            )}
          </div>

          {/* Comprehensive LLD Data from "Generate from Full LLD" */}
          
          {/* Component-Wise LLD Display */}
          {componentWiseLLD && (
            <div className="mt-8">
              <div className="border-t-2 border-green-300 pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                      <Layers className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <span>Component-Wise Low-Level Design</span>
                        <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">NEW</span>
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">Detailed LLD for each component with user story traceability</p>
                      {lldGeneratedAt && <p className="text-xs text-gray-400 mt-1">🕐 Generated: {lldGeneratedAt}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const blob = new Blob([componentWiseLLD], { type: 'text/markdown' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `Component-Wise-LLD-${projectName}.md`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                      toast.success('Component-Wise LLD downloaded!')
                    }}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Download LLD</span>
                  </button>
                </div>

                {/* Beautiful Component-Wise LLD Display - Full Restore */}
                {componentWiseLLD && (() => {
                  try {
                    // Parse the componentWiseLLD markdown into structured components
                    if (!componentWiseLLD || typeof componentWiseLLD !== 'string') {
                      console.error('❌ [PARSE] componentWiseLLD is not a string:', typeof componentWiseLLD)
                      return <div className="text-center text-gray-500 py-8">No LLD document available</div>
                    }
                    
                    // Remove the timestamp comment we added for forcing re-render
                    let cleanDoc = componentWiseLLD.replace(/<!-- Generated at:.*?-->\n/, '')
                    
                    console.log('🟡 [PARSE] Starting parsing of', cleanDoc.length, 'characters')
                    console.log('🟡 [PARSE] First 200 chars:', cleanDoc.substring(0, 200))
                    
                    const lines = cleanDoc.split('\n')
                  const components: any[] = []
                  let currentComponent: any = null
                  let currentSection = ''
                  let currentTable: string[] = []
                  
                  lines.forEach((line: string) => {
                    // Match "## Component N: Name" - exact pattern from working backup
                    const componentMatch = line.match(/^## Component (\d+): (.+)/)
                    if (componentMatch) {
                      if (currentComponent) components.push(currentComponent)
                      currentComponent = {
                        id: componentMatch[1],
                        name: componentMatch[2],
                        type: '',
                        tech: '',
                        sections: {}
                      }
                      currentSection = ''
                      return
                    }
                    
                    // Match sections - simple format: ### SectionName (without numbers)
                    const sectionMatch = line.match(/^### (.+)/)
                    if (sectionMatch && currentComponent) {
                      currentSection = sectionMatch[1].replace(/[*:]/g, '').trim()
                      currentComponent.sections[currentSection] = { content: [] }
                      currentTable = []
                      return
                    }
                    
                    // Extract Type and Technology - exact patterns from working backup
                    if (line.match(/^\*\*Type\*\*:/) && currentComponent) {
                      currentComponent.type = line.replace(/^\*\*Type\*\*:/, '').trim()
                      return
                    }
                    if (line.match(/^\*\*Technology/) && currentComponent) {
                      currentComponent.tech = line.replace(/^\*\*Technology[^:]*:/, '').trim()
                      return
                    }
                    
                    // Handle tables
                    if (line.includes('|') && line.trim().startsWith('|') && currentComponent && currentSection) {
                      currentTable.push(line)
                      return
                    } else if (currentTable.length > 0 && currentComponent && currentSection) {
                      currentComponent.sections[currentSection].content.push({ type: 'table', rows: [...currentTable] })
                      currentTable = []
                    }
                    
                    // Regular content
                    if (currentComponent && currentSection && line.trim()) {
                      currentComponent.sections[currentSection].content.push({ type: 'text', text: line })
                    }
                  })
                  
                  if (currentComponent) components.push(currentComponent)
                  
                  // No section filtering - display all sections as parsed from backend
                  
                  console.log('🔍 DEBUG: Parsed components:', components.length, components.map(c => c.name))
                  console.log('🔍 DEBUG: Component details:', components.map(c => ({
                    name: c.name,
                    type: c.type,
                    sections: Object.keys(c.sections).length
                  })))
                  
                  // Component styling function
                  const getComponentStyle = (type: string, name: string) => {
                    const combined = (type + ' ' + name).toLowerCase()
                    if (combined.includes('frontend') || combined.includes('ui') || combined.includes('client') || combined.includes('react')) {
                      return { icon: '🖥️', color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700' }
                    }
                    if (combined.includes('api') || combined.includes('gateway') || combined.includes('service')) {
                      return { icon: '🔌', color: 'purple', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700' }
                    }
                    if (combined.includes('database') || combined.includes('data') || combined.includes('storage')) {
                      return { icon: '🗄️', color: 'orange', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700' }
                    }
                    if (combined.includes('auth') || combined.includes('security') || combined.includes('login')) {
                      return { icon: '🔐', color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700' }
                    }
                    if (combined.includes('analytics') || combined.includes('report') || combined.includes('dashboard')) {
                      return { icon: '📊', color: 'indigo', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-700' }
                    }
                    return { icon: '⚙️', color: 'gray', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', textColor: 'text-gray-700' }
                  }
                  
                  return (
                    <div className="space-y-6">
                      {components.length === 0 ? (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-yellow-800">
                          <p className="font-bold mb-2">⚠️ No components found in parsed LLD</p>
                          <p className="text-sm mb-4">The document was received but the parser couldn't find components in the expected format.</p>
                          <details className="text-xs">
                            <summary>Debug: LLD Content Preview</summary>
                            <pre className="mt-2 bg-yellow-100 p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap break-words">
                              {cleanDoc.substring(0, 300)}...
                            </pre>
                          </details>
                        </div>
                      ) : (
                      <div className="space-y-6">
                      {components.map((comp, idx) => {
                        const style = getComponentStyle(comp.type, comp.name)
                        const isExpanded = expandedComponents[idx] ?? false
                        return (
                          <div key={idx} className={`card ${style.bgColor} ${style.borderColor} border-2 shadow-sm hover:shadow-md transition-shadow`}>
                            {/* Beautiful Component Header */}
                            <div 
                              className="flex items-center justify-between cursor-pointer hover:bg-white hover:bg-opacity-60 transition-all duration-200 rounded-lg p-3 -m-1"
                              onClick={() => toggleComponentExpansion(idx)}
                            >
                              <div className="flex items-start space-x-4 flex-1">
                                <div className="flex-shrink-0">
                                  <span className="text-3xl">{style.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className={`text-xl font-bold ${style.textColor} break-words`}>
                                    {comp.name}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                                    {comp.type && (
                                      <span className="text-gray-600">
                                        <strong>Type:</strong> {comp.type}
                                      </span>
                                    )}
                                    {comp.tech && (
                                      <span className="text-gray-600">
                                        <strong>Tech:</strong> {comp.tech}
                                      </span>
                                    )}
                                    {!isExpanded && (
                                      <span className="text-xs bg-white bg-opacity-70 px-2 py-1 rounded-full text-gray-700 font-medium">
                                        {Math.min(Object.keys(comp.sections).length, 12)} core sections
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 px-2" title={isExpanded ? "Click to collapse" : "Click to expand"}>
                                {isExpanded ? (
                                  <ChevronUp className={`w-6 h-6 ${style.textColor}`} />
                                ) : (
                                  <ChevronDown className={`w-6 h-6 ${style.textColor}`} />
                                )}
                              </div>
                            </div>
                            
                            {/* Expandable Content Sections */}
                            <div 
                              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                                isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
                              }`}
                            >
                              {isExpanded && (
                                <div className="space-y-6 pl-4 pt-6 border-t-2 border-white border-opacity-50 mt-4">
                                  {Object.entries(comp.sections).map(([sectionName, sectionData]: [string, any], sIdx) => {
                                    const isEditing = editingComponentLLD?.componentIdx === idx && editingComponentLLD?.sectionName === sectionName
                                    const sectionContent = sectionData.content.map((item: any) => {
                                      if (item.type === 'text') return item.text
                                      if (item.type === 'table') return item.rows.join('\n')
                                      return ''
                                    }).join('\n')
                                    
                                    return (
                                      <div key={sIdx} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <h4 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                                            <span className={`w-3 h-3 rounded-full bg-${style.color}-400`}></span>
                                            <span>{sectionName}</span>
                                          </h4>
                                          {!isEditing ? (
                                            <button
                                              onClick={() => {
                                                setEditingComponentLLD({ componentIdx: idx, sectionName })
                                                setEditedLLDContent({
                                                  ...editedLLDContent,
                                                  [idx]: {
                                                    ...(editedLLDContent[idx] || {}),
                                                    [sectionName]: sectionContent
                                                  }
                                                })
                                              }}
                                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 px-2 py-1 rounded hover:bg-blue-50"
                                            >
                                              <Edit2 className="w-4 h-4" />
                                              <span>Edit</span>
                                            </button>
                                          ) : (
                                            <div className="flex items-center space-x-2">
                                              <button
                                                onClick={() => handleSaveComponentLLDSection(idx, sectionName)}
                                                className="text-sm text-green-600 hover:text-green-800 flex items-center space-x-1 px-2 py-1 rounded hover:bg-green-50"
                                              >
                                                <Save className="w-4 h-4" />
                                                <span>Save</span>
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setEditingComponentLLD(null)
                                                  const updatedEdits = { ...editedLLDContent }
                                                  if (updatedEdits[idx]) {
                                                    delete updatedEdits[idx][sectionName]
                                                  }
                                                  setEditedLLDContent(updatedEdits)
                                                }}
                                                className="text-sm text-red-600 hover:text-red-800 flex items-center space-x-1 px-2 py-1 rounded hover:bg-red-50"
                                              >
                                                <span>Cancel</span>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        <div className="pl-6 space-y-3">
                                          {isEditing ? (
                                            <textarea
                                              value={editedLLDContent[idx]?.[sectionName] || sectionContent}
                                              onChange={(e) => {
                                                setEditedLLDContent({
                                                  ...editedLLDContent,
                                                  [idx]: {
                                                    ...(editedLLDContent[idx] || {}),
                                                    [sectionName]: e.target.value
                                                  }
                                                })
                                              }}
                                              className="w-full p-4 border border-gray-300 rounded-lg font-mono text-sm resize-vertical"
                                              rows={12}
                                              placeholder="Enter section content..."
                                            />
                                          ) : (
                                            <div className="space-y-3">
                                              {sectionData.content.map((item: any, cIdx: number) => {
                                                if (item.type === 'text') {
                                                  const text = item.text.trim()
                                                  if (!text) return null
                                                  
                                                  // Handle different text formats
                                                  if (text.startsWith('- ') || text.startsWith('* ')) {
                                                    return (
                                                      <div key={cIdx} className="flex items-start space-x-2 text-gray-700">
                                                        <span className={`${style.textColor} mt-1.5 text-xs`}>●</span>
                                                        <span 
                                                          className="flex-1" 
                                                          dangerouslySetInnerHTML={{ 
                                                            __html: text.substring(2).replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>') 
                                                          }} 
                                                        />
                                                      </div>
                                                    )
                                                  } else if (text.startsWith('**') && text.endsWith('**')) {
                                                    return (
                                                      <h5 key={cIdx} className="text-base font-semibold text-gray-800 mt-4 mb-2">
                                                        {text.replace(/\*\*/g, '')}
                                                      </h5>
                                                    )
                                                  } else {
                                                    return (
                                                      <p 
                                                        key={cIdx} 
                                                        className="text-gray-700 leading-relaxed" 
                                                        dangerouslySetInnerHTML={{ 
                                                          __html: text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>') 
                                                        }} 
                                                      />
                                                    )
                                                  }
                                                } else if (item.type === 'table') {
                                                  return (
                                                    <div key={cIdx} className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                                                      <table className="min-w-full text-sm">
                                                        <thead className="bg-gray-50">
                                                          {item.rows.slice(0, 1).map((row: string, rIdx: number) => {
                                                            const headers = row.split('|').filter((c: string) => c.trim()).map((c: string) => c.trim())
                                                            return (
                                                              <tr key={rIdx}>
                                                                {headers.map((cell: string, cellIdx: number) => (
                                                                  <th key={cellIdx} className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">
                                                                    {cell}
                                                                  </th>
                                                                ))}
                                                              </tr>
                                                            )
                                                          })}
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                          {item.rows.slice(2).map((row: string, rIdx: number) => {
                                                            const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => c.trim())
                                                            return (
                                                              <tr key={rIdx} className="hover:bg-gray-50">
                                                                {cells.map((cell: string, cellIdx: number) => (
                                                                  <td key={cellIdx} className="px-4 py-3 text-gray-700">
                                                                    {cell}
                                                                  </td>
                                                                ))}
                                                              </tr>
                                                            )
                                                          })}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                  )
                                                }
                                                return null
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                      )}
                    </div>
                  )
                  } catch (error) {
                    console.error('❌ [PARSE ERROR] Failed to parse componentWiseLLD:', error)
                    console.error('❌ LLD Content (first 500 chars):', componentWiseLLD?.substring(0, 500))
                    return (
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-700">
                        <p className="font-bold">Error parsing LLD document</p>
                        <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
                        <details className="mt-2 text-xs">
                          <summary>Debug Info</summary>
                          <pre className="mt-2 bg-red-100 p-2 rounded overflow-auto max-h-40">
                            {componentWiseLLD?.substring(0, 500)}...
                          </pre>
                        </details>
                      </div>
                    )
                  }
                })()}
              </div>
            </div>
          )}

        </div>
        
        {/* Submit for Approval Button */}
        {phase3Data?.architecture && !isApproved && !isPendingApproval && (
          <div className="card bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Ready to Submit?</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Submit Phase 4 (LLD) for approval review
                </p>
              </div>
              <button
                onClick={handleSubmitForApproval}
                className="btn-primary flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Submit for Approval</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Phase4Page
