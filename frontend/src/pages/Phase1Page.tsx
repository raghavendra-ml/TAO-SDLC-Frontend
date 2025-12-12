import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, Users, CheckCircle, Edit3, AlertTriangle, Target, Loader2, UserPlus, Download, Save, ArrowLeftRight, ListChecks, ChevronDown, ChevronUp } from 'lucide-react'
import { getProjectPhases, generateContent, updatePhase, analyzeRisks, getProject } from '../services/api'
import toast from 'react-hot-toast'
import SelectStakeholderModal from '../components/modals/SelectStakeholderModal'
import RequirementUploader from '../components/DocumentUpload/RequirementUploader'
import GherkinViewer, { GherkinRequirement as ViewerGherkinRequirement } from '../components/Requirements/GherkinViewer'
import AIChatPanel from '../components/AICopilot/AIChatPanel'
// import SwaggerViewer from '../components/API/SwaggerViewer'
import EditRequirementModal from '../components/modals/EditRequirementModal'
import AIExtractedData from '../components/Requirements/AIExtractedData'
import ExtractedRequirementsDisplay from '../components/Requirements/ExtractedRequirementsDisplay'

interface Requirement {
  id: number
  title: string
  priority: string
  status: string
}

interface GherkinRequirement {
  id: string
  feature: string
  as_a: string
  i_want: string
  so_that: string
  scenarios: GherkinScenario[]
  priority: 'High' | 'Medium' | 'Low'
  status: 'draft' | 'review' | 'approved'
}

interface GherkinScenario {
  title: string
  given: string[]
  when: string[]
  then: string[]
}

interface Risk {
  id: number
  risk: string
  severity: string
  mitigation: string
}

interface Stakeholder {
  role: string
  name: string
  status: string
}

interface FunctionalRequirement {
  id: string;
  requirement: string;
  derived_from: string;
  stakeholder_actor: string;
  priority: string;
  category: string;
}

interface NonFunctionalRequirement {
  category: string;
  requirement: string;
  description: string;
  priority: string;
}

interface VersionEntry {
  version: number
  editedAt: string
  editedBy?: string
  changeType: 'create' | 'edit' | 'ai-generate' | 'manual' | 'upload'
  summary?: string
  // Store content snapshot for PRD/BRD; keep requirements lightweight
  content?: string
}

interface VersionHistory {
  prd: VersionEntry[]
  brd: VersionEntry[]
  requirements: VersionEntry[]
}

export default function Phase1Page() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [projectName, setProjectName] = useState<string>('')
  const [prdContent, setPrdContent] = useState('')
  const [brdContent, setBrdContent] = useState('')
  const [phaseId, setPhaseId] = useState<number | null>(null)
  const [isGeneratingPRD, setIsGeneratingPRD] = useState(false)
  const [isGeneratingBRD, setIsGeneratingBRD] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isAnalyzingRisks, setIsAnalyzingRisks] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingPhase, setIsLoadingPhase] = useState(true)
  // Start with empty arrays - will load from database
  const [risks, setRisks] = useState<Risk[]>([])
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [businessProposal, setBusinessProposal] = useState<any>(null)
  const [extractedRisks, setExtractedRisks] = useState<any>(null) // Comprehensive risks output
  const [extractedTechStack, setExtractedTechStack] = useState<Record<string, string[]>>({}) // Technology & Tools extracted
  const [extractedStakeholders, setExtractedStakeholders] = useState<any[]>([]) // Comprehensive stakeholders output
  const [aiNotes, setAiNotes] = useState<string>('') // AI Notes
  const [additionalNotes, setAdditionalNotes] = useState<string>('') // Additional notes/requirements
  const [functionalRequirements, setFunctionalRequirements] = useState<FunctionalRequirement[]>([])
  const [nonFunctionalRequirements, setNonFunctionalRequirements] = useState<NonFunctionalRequirement[]>([])
  const [showAddStakeholder, setShowAddStakeholder] = useState(false)
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [newStakeholder, setNewStakeholder] = useState({ role: '', name: '' })
  const [gherkinRequirements, setGherkinRequirements] = useState<GherkinRequirement[]>([])
  const [showManualInput, setShowManualInput] = useState(true)  // Show manual input by default
  const [manualRequirement, setManualRequirement] = useState('')
  const [savedInput, setSavedInput] = useState('')  // Store the last successful extraction input for display
  const [requirementsSectionExpanded, setRequirementsSectionExpanded] = useState(false)  // Collapse Requirements Input section
  // const [apiSpecData, setApiSpecData] = useState<any>(null)
  // const [apiSummary, setApiSummary] = useState<string>('')
  // const [showAPIView, setShowAPIView] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState<GherkinRequirement | null>(null)
  const [phaseStatus, setPhaseStatus] = useState<string>('draft')
  const [showEditModal, setShowEditModal] = useState(false)
  const [versionHistory, setVersionHistory] = useState<VersionHistory>({ prd: [], brd: [], requirements: [] })
  const [showPRDHistory, setShowPRDHistory] = useState(false)
  const [showBRDHistory, setShowBRDHistory] = useState(false)
  const [prdExportSelection, setPrdExportSelection] = useState<'current' | number>('current')
  const [brdExportSelection, setBrdExportSelection] = useState<'current' | number>('current')
  const [approvalHistory, setApprovalHistory] = useState<any[]>([])
  const isApproved = phaseStatus === 'approved'
  const isPendingApproval = phaseStatus === 'pending_approval'
  
  // Helper function to reset approval status when content is edited after approval
  const resetApprovalIfNeeded = async () => {
    if ((isApproved || isPendingApproval) && phaseId) {
      try {
        await updatePhase(phaseId, {
          status: 'in_progress'
        })
        setPhaseStatus('in_progress')
        toast.success('📝 Content edited. Phase moved back to "In Progress" - please resubmit for approval when ready.')
      } catch (error) {
        console.error('Error resetting approval status:', error)
      }
    }
  }
  
  useEffect(() => {
    if (projectId) {
      loadPhase()
    }
  }, [projectId])
  
  const loadPhase = async () => {
    if (!projectId || isNaN(Number(projectId))) {
      console.error('Invalid project ID:', projectId)
      toast.error('Invalid project ID')
      navigate('/')
      return
    }
    
    setIsLoadingPhase(true)
    try {
      // Fetch project details using API service
      try {
        const projectResponse = await getProject(Number(projectId))
        setProjectName(projectResponse.data.name || 'Unknown Project')
        console.log('Phase 1 - Project loaded:', projectResponse.data.name)
      } catch (error) {
        console.error('Phase 1 - Error loading project:', error)
      }
      
      const response = await getProjectPhases(Number(projectId))
      const phase1 = response.data.find((p: any) => p.phase_number === 1)
      if (phase1) {
        setPhaseId(phase1.id)
        setPhaseStatus(phase1.status || 'draft')
        
        // Load existing phase data
        if (phase1.data) {
          if (phase1.data.prd) setPrdContent(phase1.data.prd)
          if (phase1.data.brd) setBrdContent(phase1.data.brd)
          
          // Load risks from saved data
          if (phase1.data.risks && Array.isArray(phase1.data.risks)) {
            setRisks(phase1.data.risks)
          } else {
            setRisks([])
          }
          
          // Load stakeholders from saved data
          if (phase1.data.stakeholders && Array.isArray(phase1.data.stakeholders)) {
            setStakeholders(phase1.data.stakeholders)
          } else {
            setStakeholders([])
          }
          
          // Load Gherkin requirements from saved data (only legacy Gherkin format)
          if (phase1.data.gherkinRequirements && Array.isArray(phase1.data.gherkinRequirements)) {
            // Separate different types of requirements
            const functional: any[] = []
            const nonFunctional: any[] = []
            const legacyGherkin: any[] = []
            
            phase1.data.gherkinRequirements.forEach((req: any) => {
              if (req.type === 'Functional') {
                functional.push(req)
              } else if (req.type === 'Non-Functional') {
                nonFunctional.push(req)
              } else if (req.feature) {
                // Legacy Gherkin format (has 'feature' but no 'type')
                legacyGherkin.push(req)
              }
            })
            
            // Set the appropriate state for each type
            if (functional.length > 0 && !phase1.data.functionalRequirements) {
              setFunctionalRequirements(functional)
            }
            if (nonFunctional.length > 0 && !phase1.data.nonFunctionalRequirements) {
              setNonFunctionalRequirements(nonFunctional)
            }
            setGherkinRequirements(legacyGherkin)
          } else {
            setGherkinRequirements([])
          }
          
          // Load new comprehensive fields
          if (phase1.data.businessProposal) setBusinessProposal(phase1.data.businessProposal)
          if (phase1.data.risksCategorized) setExtractedRisks(phase1.data.risksCategorized)
          if (phase1.data.technologyAndTools) setExtractedTechStack(phase1.data.technologyAndTools)
          if (phase1.data.stakeholdersExtracted) setExtractedStakeholders(phase1.data.stakeholdersExtracted)
          if (phase1.data.aiNotes) setAiNotes(phase1.data.aiNotes)
          if (phase1.data.additionalNotes) setAdditionalNotes(phase1.data.additionalNotes)
          if (phase1.data.functionalRequirements) setFunctionalRequirements(phase1.data.functionalRequirements)
          if (phase1.data.nonFunctionalRequirements) setNonFunctionalRequirements(phase1.data.nonFunctionalRequirements)
          // Load user input (check both userInput and savedInput field names for backward compatibility)
          if (phase1.data.userInput) setSavedInput(phase1.data.userInput)
          else if (phase1.data.savedInput) setSavedInput(phase1.data.savedInput)
          
          // Load API specifications if they exist
          // API Specification is now handled in Phase 3

          // Load version history if present
          if (phase1.data.versionHistory) {
            setVersionHistory({
              prd: phase1.data.versionHistory.prd || [],
              brd: phase1.data.versionHistory.brd || [],
              requirements: phase1.data.versionHistory.requirements || []
            })
          }
          
          // Load approval history if present
          if (phase1.data.approvalHistory) {
            setApprovalHistory(phase1.data.approvalHistory)
            console.log(`✅ Loaded approval history with ${phase1.data.approvalHistory.length} submission(s):`, phase1.data.approvalHistory)
          } else {
            console.log('ℹ️ No approval history found in phase data')
          }
        } else {
          // No phase data exists yet, start with empty arrays
          setRisks([])
          setStakeholders([])
          setBusinessProposal(null)
          setExtractedRisks(null)
          setExtractedTechStack({})
          setExtractedStakeholders([])
          setAiNotes('')
          setSavedInput('')
          setGherkinRequirements([])
          setFunctionalRequirements([])
          setNonFunctionalRequirements([])
          setVersionHistory({ prd: [], brd: [], requirements: [] })
        }
      }
    } catch (error) {
      console.error('Error loading phase:', error)
      toast.error('Failed to load phase data')
    } finally {
      setIsLoadingPhase(false)
    }
  }
  
  const handleExtractRequirements = async () => {
    if (isApproved) {
      toast.error('Phase is approved. AI extraction is locked. Please edit content manually.')
      return
    }
    if (!manualRequirement.trim()) {
      toast.error('Please enter requirement text')
      return
    }
    
    if (!phaseId) {
      toast.error('Phase not found')
      return
    }
    
    setIsExtracting(true)
    try {
      const formData = new FormData()
      formData.append('text', manualRequirement)
      formData.append('project_id', projectId!.toString())
      formData.append('phase_id', phaseId.toString())
      
      const response = await fetch('http://localhost:8000/api/ai/extract-manual-requirements', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to extract requirements')
      }
      
      const data = await response.json()
      
      if (data.status === 'success' && data.requirements && data.requirements.length > 0) {
        const allExtractedRequirements = data.requirements || []
        const bp = data.business_proposal || null
        const r = data.risks_categorized || null
        // Extract stakeholders from business_proposal (they're now inside it)
        const sh = bp?.Stakeholders || data.stakeholders_extracted || []
        const tech = data.technology_and_tools || {}
        const notes = data.ai_notes || '';

        // Filter into functional, non-functional, and legacy Gherkin
        const newFunctional: FunctionalRequirement[] = allExtractedRequirements.filter((req: any) => req.type === 'Functional')
        const newNonFunctional: NonFunctionalRequirement[] = allExtractedRequirements.filter((req: any) => req.type === 'Non-Functional')
        const newLegacyGherkin: GherkinRequirement[] = allExtractedRequirements.filter((req: any) => !req.type)

        // Calculate updated arrays BEFORE setting state (don't rely on stale state)
        const updatedFunctional = [...functionalRequirements, ...newFunctional]
        const updatedNonFunctional = [...nonFunctionalRequirements, ...newNonFunctional]
        const updatedLegacyGherkin = [...gherkinRequirements, ...newLegacyGherkin]

        setFunctionalRequirements(updatedFunctional)
        setNonFunctionalRequirements(updatedNonFunctional)
        setGherkinRequirements(updatedLegacyGherkin)
        setBusinessProposal(bp)
        setExtractedRisks(r)
        setExtractedTechStack(tech)
        setExtractedStakeholders(sh)
        setAiNotes(notes)
        setSavedInput(manualRequirement)  // Save input for display in requirements section - will be persisted to database immediately
        console.log('📝 User input saved to state:', manualRequirement.substring(0, 100) + '...')
        setManualRequirement('')
        setShowManualInput(false)
        toast.success(`Successfully extracted ${allExtractedRequirements.length} requirement(s) with additional project details! `)
      
        // Record requirements version entry
        const entry: VersionEntry = {
          version: (versionHistory.requirements?.length || 0) + 1,
          editedAt: new Date().toISOString(),
          editedBy: 'User',
          changeType: 'manual',
          summary: `Manual extract added ${newFunctional.length} FR, ${newNonFunctional.length} NFR, ${newLegacyGherkin.length} legacy`
        }
        const newVH: VersionHistory = { ...versionHistory, requirements: [...versionHistory.requirements, entry] }
        setVersionHistory(newVH)

        try {
          await updatePhase(phaseId, {
            data: {
              gherkinRequirements: updatedLegacyGherkin,
              functionalRequirements: updatedFunctional,
              nonFunctionalRequirements: updatedNonFunctional,
              versionHistory: newVH,
              risks,
              stakeholders,
              businessProposal: bp,
              risksCategorized: r,
              technologyAndTools: tech,
              stakeholdersExtracted: sh,
              aiNotes: notes,
              prd: prdContent,
              brd: brdContent,
              userInput: manualRequirement
            }
          })
          console.log('✅ Manual requirement & comprehensive data auto-saved to database with userInput field')
        } catch (error) {
          console.error('Failed to auto-save comprehensive data:', error)
        }
      } else {
        toast.error(data.message || 'Could not extract requirements from the provided text')
      }
    } catch (error) {
      console.error('Error extracting requirements:', error)
      toast.error('Failed to extract requirements. Please try again.')
    } finally {
      setIsExtracting(false)
    }
  }
  
  const handleDocumentExtractComplete = async (extractedData: any) => {
    if (isApproved) {
      toast.error('Phase is approved. Upload-based extraction is locked.')
      return
    }
    const allExtractedRequirements = extractedData.requirements || []
    const bp = extractedData.business_proposal || null
    const r = extractedData.risks_categorized || null
    const tech = extractedData.technology_and_tools || {}
    // Extract stakeholders from business_proposal (they're now inside it)
    const sh = bp?.Stakeholders || extractedData.stakeholders_extracted || []
    const notes = extractedData.ai_notes || '';

    // Filter into functional, non-functional, and legacy Gherkin
    const newFunctional: FunctionalRequirement[] = allExtractedRequirements.filter((req: any) => req.type === 'Functional')
    const newNonFunctional: NonFunctionalRequirement[] = allExtractedRequirements.filter((req: any) => req.type === 'Non-Functional')
    const newLegacyGherkin: GherkinRequirement[] = allExtractedRequirements.filter((req: any) => !req.type)

    // Compute the updated arrays BEFORE setting state
    const updatedFunctional = [...functionalRequirements, ...newFunctional]
    const updatedNonFunctional = [...nonFunctionalRequirements, ...newNonFunctional]
    const updatedLegacyGherkin = [...gherkinRequirements, ...newLegacyGherkin]

    setFunctionalRequirements(updatedFunctional)
    setNonFunctionalRequirements(updatedNonFunctional)
    setGherkinRequirements(updatedLegacyGherkin)
    setBusinessProposal(bp)
    setExtractedRisks(r)
    setExtractedTechStack(tech)
    setExtractedStakeholders(sh)
    setAiNotes(notes)
    setSavedInput(extractedData.filename || 'Uploaded Document')  // Save file info for display - will be persisted to database immediately
    console.log('📄 Document extracted, user input saved to state:', extractedData.filename || 'Uploaded Document')
    // Record requirements version entry
    const entry: VersionEntry = {
      version: (versionHistory.requirements?.length || 0) + 1,
      editedAt: new Date().toISOString(),
      editedBy: 'User',
      changeType: 'upload',
      summary: `Added ${newFunctional.length} FR, ${newNonFunctional.length} NFR, ${newLegacyGherkin.length} legacy`
    }
    const newVH: VersionHistory = { ...versionHistory, requirements: [...versionHistory.requirements, entry] }
    setVersionHistory(newVH)
    
    if (phaseId) {
      try {
        await updatePhase(phaseId, {
          data: {
            gherkinRequirements: updatedLegacyGherkin,
            functionalRequirements: updatedFunctional,
            nonFunctionalRequirements: updatedNonFunctional,
            versionHistory: newVH,
            risks,
            stakeholders,
            businessProposal: bp,
            risksCategorized: r,
            technologyAndTools: tech,
            stakeholdersExtracted: sh,
            aiNotes: notes,
            prd: prdContent,
            brd: brdContent,
            userInput: extractedData.filename || 'Uploaded Document'
          }
        })
        console.log('✅ Requirements & comprehensive data auto-saved to database with userInput field')
        toast.success('✅ Requirements extracted and saved successfully!')
      } catch (error) {
        console.error('Failed to auto-save comprehensive data:', error)
        toast.error('Failed to save extracted data')
      }
    }
  }

  const handleSaveRequirements = async () => {
    if (!phaseId) {
      toast.error('Phase not found')
      return
    }

    try {
      await updatePhase(phaseId, {
          data: {
            gherkinRequirements,
            functionalRequirements,
            nonFunctionalRequirements,
            versionHistory,
            risks,
            stakeholders,
            businessProposal,
            risksCategorized: extractedRisks,
            stakeholdersExtracted: extractedStakeholders,
            aiNotes,
            prd: prdContent,
            brd: brdContent
          }
      })
      toast.success('Requirements and related data saved successfully!')
      console.log('✅ Requirements and related data auto-saved to database')
    } catch (error) {
      console.error('Failed to save requirements:', error)
      toast.error('Failed to save requirements. Please try again.')
    }
  }
  
  // API Specification is now handled in Phase 3
  
  const handleGeneratePRD = async () => {
    if (!phaseId) {
      toast.error('Phase not found')
      return
    }
    
    // Validate that requirements or API specs exist
    const hasRequirements = 
      functionalRequirements.length > 0 || 
      nonFunctionalRequirements.length > 0 || 
      gherkinRequirements.length > 0 ||
      (businessProposal && Object.keys(businessProposal).length > 0)
    
    if (!hasRequirements) {
      toast.error('Please add requirements before generating PRD')
      return
    }
    
    setIsGeneratingPRD(true)
    try {
      // Version entry will be added AFTER successful generation (not before)
      const nextVersionNumber = (versionHistory.prd?.length || 0) + 1
      
      // STEP 1: Save current requirements to database FIRST (including all updates and additional notes)
      await updatePhase(phaseId, {
        data: {
          gherkinRequirements,
          functionalRequirements,
          nonFunctionalRequirements,
          versionHistory: versionHistory,
          risks,
          stakeholders,
          businessProposal,
          risksCategorized: extractedRisks,
          stakeholdersExtracted: extractedStakeholders,
          technologyAndTools: extractedTechStack,
          additionalNotes,
          aiNotes,
          userInput: savedInput,
          prd: prdContent,
          brd: brdContent
        }
      })
      console.log('✅ Requirements saved before PRD generation')
      
      // STEP 2: Fetch project details
      const projectResponse = await import('../services/api').then(api => api.getProject(Number(projectId)))
      const projectData = projectResponse.data
      
      console.log('🔍 Generating PRD with extracted data:', {
        functionalRequirements: functionalRequirements.length,
        nonFunctionalRequirements: nonFunctionalRequirements.length,
        gherkinRequirements: gherkinRequirements.length,
        hasBusinessProposal: !!businessProposal,
        stakeholders: extractedStakeholders.length,
        hasRisks: !!extractedRisks,
        hasAdditionalNotes: !!additionalNotes,
        hasAiNotes: !!aiNotes,
        projectName: projectData.name
      })
      
      // Pass requirements and project data for context-aware generation
      const response = await generateContent(phaseId, 'prd', {
        gherkinRequirements,
        functionalRequirements,
        nonFunctionalRequirements,
        businessProposal,
        extractedStakeholders,
        extractedRisks,
        technologyAndTools: extractedTechStack,
        additionalNotes,  // Include additional notes in PRD generation
        aiNotes,
        risks,
        userInput: savedInput,  // User's original input or uploaded document info
        project: {
          id: projectId,
          name: projectData.name,
          description: projectData.description
        }
      })
      setPrdContent(response.data.content || response.data)
      // Add version entry ONLY after successful generation
      const prdVersion: VersionEntry = {
        version: nextVersionNumber,
        editedAt: new Date().toISOString(),
        editedBy: 'User',
        changeType: 'ai-generate',
        summary: 'PRD generated with AI',
        content: response.data.content || response.data
      }
      const updatedPrdHistory = [...(versionHistory.prd || []), prdVersion]
      const vhAfter = { ...versionHistory, prd: updatedPrdHistory }
      setVersionHistory(vhAfter)
      
      // Save confidence score and updated content with version history
      const confidenceScore = response.data.confidence_score || 88
      await updatePhase(phaseId, {
        data: {
          gherkinRequirements,
          functionalRequirements,
          nonFunctionalRequirements,
          versionHistory: vhAfter,
          risks,
          stakeholders,
          businessProposal,
          risksCategorized: extractedRisks,
          stakeholdersExtracted: extractedStakeholders,
          technologyAndTools: extractedTechStack,
          aiNotes,
          prd: response.data.content || response.data,
          brd: brdContent
        },
        ai_confidence_score: confidenceScore
      })
      
      toast.success(`PRD generated successfully!`)
    } catch (error) {
      console.error('Error generating PRD:', error)
      toast.error('Failed to generate PRD. Please try again.')
    } finally {
      setIsGeneratingPRD(false)
    }
  }
  
  const handleGenerateBRD = async () => {
    if (!phaseId) {
      toast.error('Phase not found')
      return
    }
    
    // Validate that requirements or API specs exist
    const hasRequirements = 
      functionalRequirements.length > 0 || 
      nonFunctionalRequirements.length > 0 || 
      gherkinRequirements.length > 0 ||
      (businessProposal && Object.keys(businessProposal).length > 0)

    if (!hasRequirements) {
      toast.error('Please add requirements before generating BRD')
      return
    }
    
    setIsGeneratingBRD(true)
    try {
      // Version entry will be added AFTER successful generation (not before)
      const nextVersionNumber = (versionHistory.brd?.length || 0) + 1
      
      // STEP 1: Save current requirements to database FIRST (including all updates and additional notes)
      await updatePhase(phaseId, {
        data: {
          gherkinRequirements,
          functionalRequirements,
          nonFunctionalRequirements,
          versionHistory: versionHistory,
          risks,
          stakeholders,
          businessProposal,
          risksCategorized: extractedRisks,
          stakeholdersExtracted: extractedStakeholders,
          technologyAndTools: extractedTechStack,
          additionalNotes,
          aiNotes,
          userInput: savedInput,
          prd: prdContent,
          brd: brdContent
        }
      })
      console.log('✅ Requirements and API specs saved before BRD generation')
      
      // STEP 2: Fetch project details
      const projectResponse = await import('../services/api').then(api => api.getProject(Number(projectId)))
      const projectData = projectResponse.data
      
      console.log('🔍 Generating BRD with extracted data:', {
        functionalRequirements: functionalRequirements.length,
        nonFunctionalRequirements: nonFunctionalRequirements.length,
        gherkinRequirements: gherkinRequirements.length,
        hasBusinessProposal: !!businessProposal,
        stakeholders: extractedStakeholders.length,
        hasRisks: !!extractedRisks,
        hasAdditionalNotes: !!additionalNotes,
        hasAiNotes: !!aiNotes,
        projectName: projectData.name
      })
      
      // Pass requirements and project data for context-aware generation
      const response = await generateContent(phaseId, 'brd', {
        gherkinRequirements,
        functionalRequirements,
        nonFunctionalRequirements,
        businessProposal,
        extractedStakeholders,
        extractedRisks,
        additionalNotes,  // Include additional notes in BRD generation
        aiNotes,
        risks,
        userInput: savedInput,
        technologyAndTools: extractedTechStack,
        project: {
          id: projectId,
          name: projectData.name,
          description: projectData.description
        }
      })
      setBrdContent(response.data.content || response.data)
      // Add version entry ONLY after successful generation
      const brdVersion: VersionEntry = {
        version: nextVersionNumber,
        editedAt: new Date().toISOString(),
        editedBy: 'User',
        changeType: 'ai-generate',
        summary: 'BRD generated with AI',
        content: response.data.content || response.data
      }
      const updatedBrdHistory = [...(versionHistory.brd || []), brdVersion]
      const vhAfter = { ...versionHistory, brd: updatedBrdHistory }
      setVersionHistory(vhAfter)
      
      // Save confidence score and updated content with version history
      const confidenceScore = response.data.confidence_score || 88
      await updatePhase(phaseId, {
        data: {
          gherkinRequirements,
          functionalRequirements,
          nonFunctionalRequirements,
          versionHistory: vhAfter,
          risks,
          stakeholders,
          businessProposal,
          risksCategorized: extractedRisks,
          stakeholdersExtracted: extractedStakeholders,
          technologyAndTools: extractedTechStack,
          aiNotes,
          prd: prdContent,
          brd: response.data.content || response.data
        },
        ai_confidence_score: confidenceScore
      })
      
      toast.success(`BRD generated successfully!`)
    } catch (error) {
      console.error('Error generating BRD:', error)
      toast.error('Failed to generate BRD. Please try again.')
    } finally {
      setIsGeneratingBRD(false)
    }
  }
  
  const handleAnalyzeRisks = async () => {
    if (!phaseId) {
      toast.error('Phase not found')
      return
    }
    
    if (!gherkinRequirements.length) {
      toast.error('Please add requirements before analyzing risks')
      return
    }
    
    setIsAnalyzingRisks(true)
    try {
      // Call the new AI-powered risk analysis endpoint
      const response = await analyzeRisks(phaseId)
      
      console.log('🔍 Risk Analysis Response:', response.data)
      
      // Parse risk analysis response from the new endpoint
      if (response.data.status === 'success' && response.data.risks) {
        const aiRisks = response.data.risks.map((risk: any) => ({
          id: risk.id || `risk-${Date.now()}-${Math.random()}`,
          risk: risk.risk,
          severity: risk.priority, // Map priority to severity for display
          mitigation: risk.mitigation,
          impact: risk.impact,
          likelihood: risk.likelihood,
          category: risk.category,
          contingency: risk.contingency
        }))
        
        setRisks(aiRisks)
        
        // Auto-save risks to phase data (including API specs)
        await updatePhase(phaseId, {
          data: {
            gherkinRequirements,
            functionalRequirements,
            nonFunctionalRequirements,
            risks: aiRisks,
            stakeholders,
            businessProposal,
            risksCategorized: extractedRisks,
            stakeholdersExtracted: extractedStakeholders,
            technologyAndTools: extractedTechStack,
            aiNotes,
            prd: prdContent,
            brd: brdContent
          }
        })
        
        toast.success(`✅ ${aiRisks.length} risks identified and analyzed!`)
        console.log('✅ Risks saved to database:', aiRisks.length)
      } else {
        toast.error('No risks found in response')
      }
    } catch (error) {
      console.error('Error analyzing risks:', error)
      toast.error('Failed to analyze risks. Please try again.')
    } finally {
      setIsAnalyzingRisks(false)
    }
  }
  
  const handleSaveDraft = async (documentType: 'prd' | 'brd') => {
    if (!phaseId) {
      toast.error('Phase not found')
      return
    }
    
    try {
      const content = documentType === 'prd' ? prdContent : brdContent
      
      if (!content || content.trim() === '') {
        toast.error(`Please generate or add ${documentType.toUpperCase()} content first`)
        return
      }
      
      // Record version entry for manual save
      const entry: VersionEntry = {
        version: (documentType === 'prd' ? versionHistory.prd.length : versionHistory.brd.length) + 1,
        editedAt: new Date().toISOString(),
        editedBy: 'User',
        changeType: 'edit',
        summary: `${documentType.toUpperCase()} draft saved`,
        content: content
      }
      const newVH: VersionHistory = documentType === 'prd'
        ? { ...versionHistory, prd: [...versionHistory.prd, entry] }
        : { ...versionHistory, brd: [...versionHistory.brd, entry] }
      setVersionHistory(newVH)

      // Reset approval status if content was edited after approval
      await resetApprovalIfNeeded()

      await updatePhase(phaseId, {
        data: {
          gherkinRequirements,
          functionalRequirements,
          nonFunctionalRequirements,
          versionHistory: newVH,
          risks,
          stakeholders,
          businessProposal,
          risksCategorized: extractedRisks,
          stakeholdersExtracted: extractedStakeholders,
          technologyAndTools: extractedTechStack,
          aiNotes,
          // Always save both PRD and BRD to prevent data loss
          prd: prdContent,
          brd: brdContent
        }
      })
      
      toast.success(`✅ ${documentType.toUpperCase()} draft saved successfully!`)
    } catch (error) {
      console.error(`Error saving ${documentType}:`, error)
      toast.error(`Failed to save ${documentType.toUpperCase()} draft`)
    }
  }
  
  const handleExportPDF = (documentType: 'prd' | 'brd', opts?: { version?: 'current' | number }) => {
    let content = documentType === 'prd' ? prdContent : brdContent
    let selectedVersion = 'current'
    const v = opts?.version
    if (v !== undefined && v !== 'current') {
      const list = documentType === 'prd' ? versionHistory.prd : versionHistory.brd
      const found = list.find(e => e.version === v)
      if (found?.content) {
        content = found.content
        selectedVersion = `v${found.version}`
      }
    } else if (v === 'current') {
      selectedVersion = 'current'
    }
    
    if (!content || content.trim() === '') {
      toast.error(`Please generate or add ${documentType.toUpperCase()} content first`)
      return
    }
    
    try {
      // Convert markdown to HTML with basic formatting
      const htmlContent = convertMarkdownToHTML(content)
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('Please allow popups to export PDF')
        return
      }
      
      // Write formatted HTML content
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${businessProposal?.Title || 'Project'} - ${documentType.toUpperCase()} ${selectedVersion}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 40px auto;
                padding: 20px;
              }
              h1 {
                color: #2563eb;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 10px;
                margin-top: 30px;
              }
              h2 {
                color: #1e40af;
                margin-top: 25px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
              }
              h3 {
                color: #1e3a8a;
                margin-top: 20px;
              }
              ul, ol {
                margin: 10px 0;
                padding-left: 30px;
              }
              li {
                margin: 5px 0;
              }
              p {
                margin: 10px 0;
              }
              strong {
                color: #1f2937;
              }
              code {
                background: #f3f4f6;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 15px 0;
              }
              th, td {
                border: 1px solid #d1d5db;
                padding: 8px 12px;
                text-align: left;
              }
              th {
                background: #f3f4f6;
                font-weight: 600;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 15px;
                }
                h1 {
                  page-break-after: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
              <h1 style="margin: 0 0 10px 0;">${documentType.toUpperCase()}</h1>
              <p style="margin: 5px 0; color: #666;"><strong>Project:</strong> ${businessProposal?.Title || 'Project'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Version:</strong> ${selectedVersion}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</p>
            </div>
            ${htmlContent}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 100);
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
      
      toast.success(`✅ ${documentType.toUpperCase()} ready for PDF export! Use "Save as PDF" in print dialog.`)
    } catch (error) {
      console.error(`Error exporting ${documentType}:`, error)
      toast.error(`Failed to export ${documentType.toUpperCase()}`)
    }
  }
  
  const convertMarkdownToHTML = (markdown: string): string => {
    let html = markdown
    
    // Convert headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Convert bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Convert bullet lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>')
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>')
    
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    
    // Convert numbered lists
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>\n?){2,}/g, (match) => {
      if (!match.includes('<ul>')) {
        return `<ol>${match}</ol>`
      }
      return match
    })
    
    // Convert line breaks to paragraphs
    html = html.replace(/\n\n/g, '</p><p>')
    html = '<p>' + html + '</p>'
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '')
    html = html.replace(/<p>\s*<\/p>/g, '')
    
    return html
  }
  
  const handleAddStakeholder = () => {
    if (!newStakeholder.role || !newStakeholder.name) {
      toast.error('Please enter both role and name')
      return
    }
    
    setStakeholders([...stakeholders, { ...newStakeholder, status: 'pending' }])
    setNewStakeholder({ role: '', name: '' })
    setShowAddStakeholder(false)
    toast.success('Stakeholder added successfully!')
  }
  
  const handleSelectStakeholder = (stakeholder: { role: string; name: string; email: string; userId: number }) => {
    // Check if stakeholder already exists
    const exists = stakeholders.some(s => s.name === stakeholder.name && s.role === stakeholder.role)
    if (exists) {
      toast.error('This stakeholder is already added')
      return
    }
    
    setStakeholders([...stakeholders, { 
      role: stakeholder.role, 
      name: stakeholder.name, 
      status: 'pending' 
    }])
    setShowSelectModal(false)
  }
  
  const handleSubmitForApproval = async () => {
    if (!phaseId) {
      toast.error('Phase not found')
      return
    }
    
    if (!prdContent || !brdContent) {
      toast.error('Please generate PRD and BRD before submitting for approval')
      return
    }
    
    if (stakeholders.length === 0) {
      toast.error('Please add at least one stakeholder before submitting for approval')
      return
    }
    
    setIsSubmitting(true)
    try {
      // Update stakeholder statuses to pending_approval when submitting
      const updatedStakeholdersForApproval = stakeholders.map(s => ({
        ...s,
        status: 'pending_approval'
      }))
      
      // Create approval history entry
      const approvalEntry = {
        submittedAt: new Date().toISOString(),
        submittedBy: 'User',
        stakeholders: updatedStakeholdersForApproval.map(s => ({ role: s.role, name: s.name })),
        prdVersion: versionHistory.prd.length,
        brdVersion: versionHistory.brd.length,
        requirementsVersion: versionHistory.requirements.length
      }
      
      // Step 1: Update phase status to pending_approval and update stakeholder statuses
      await updatePhase(phaseId, {
        status: 'pending_approval',
        data: {
          prd: prdContent,
          brd: brdContent,
          risks,
          stakeholders: updatedStakeholdersForApproval,
          gherkinRequirements,
          functionalRequirements,
          nonFunctionalRequirements,
          businessProposal,
          risksCategorized: extractedRisks,
          stakeholdersExtracted: extractedStakeholders,
          technologyAndTools: extractedTechStack,
          additionalNotes,
          aiNotes,
          userInput: savedInput,
          versionHistory,
          approvalHistory: [...approvalHistory, approvalEntry]
        }
      })
      console.log('✅ Updated stakeholder statuses to pending_approval:', updatedStakeholdersForApproval.map(s => s.name))
      
      // Step 2: Create approval records for each stakeholder
      // TODO: This needs backend endpoint to create approvals
      // For now, the phase is marked as pending_approval
      
      // Update local phase status and stakeholders
      setPhaseStatus('pending_approval')
      setStakeholders(updatedStakeholdersForApproval)
      const updatedHistory = [...approvalHistory, approvalEntry]
      setApprovalHistory(updatedHistory)
      console.log(`✅ Submitted for approval. Approval history now has ${updatedHistory.length} submission(s):`, updatedHistory)
      console.log(`✅ Stakeholder statuses updated to pending_approval`)
      
      toast.success(`Phase 1 submitted for approval! ${stakeholders.length} stakeholder(s) will be notified.`)
      
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
  
  const handleEditRequirement = (requirementToEdit: GherkinRequirement) => {
    setEditingRequirement(requirementToEdit)
    setShowEditModal(true)
  }

  const handleUpdateEditedRequirement = (updatedRequirement: GherkinRequirement) => {
    const updatedRequirements = gherkinRequirements.map(req =>
      req.id === updatedRequirement.id ? updatedRequirement : req
    )
    setGherkinRequirements(updatedRequirements)
    setEditingRequirement(null)
    setShowEditModal(false)
    
    // Record manual edit in version history
    const entry: VersionEntry = {
      version: (versionHistory.requirements?.length || 0) + 1,
      editedAt: new Date().toISOString(),
      editedBy: 'User',
      changeType: 'edit',
      summary: `Manually edited requirement: ${updatedRequirement.feature?.substring(0, 50) || 'Untitled'}`
    }
    const newVH: VersionHistory = { ...versionHistory, requirements: [...versionHistory.requirements, entry] }
    setVersionHistory(newVH)
    
    toast.success('Requirement updated successfully!')
    // Auto-save after edit with version history
    handleSaveRequirements()
  }

  const handleCloseEditModal = () => {
    setEditingRequirement(null)
    setShowEditModal(false)
  }

  const handleGherkinRequirementsUpdate = (updatedRequirements: GherkinRequirement[]) => {
    setGherkinRequirements(updatedRequirements)
    toast.success('Requirements updated successfully!')
  }

  const exportAllAsGherkin = () => {
    if (gherkinRequirements.length === 0) {
      toast.error('No requirements to export')
      return
    }
    
    let exportContent = ''
    gherkinRequirements.forEach((req, index) => {
      exportContent += `Feature: ${req.feature}\n`
      exportContent += `  As a ${req.as_a}\n`
      exportContent += `  I want ${req.i_want}\n`
      exportContent += `  So that ${req.so_that}\n\n`
      
      req.scenarios.forEach((scenario, scenarioIndex) => {
        exportContent += `  Scenario: ${scenario.title}\n`
        scenario.given.forEach(given => {
          exportContent += `    Given ${given}\n`
        })
        scenario.when.forEach(when => {
          exportContent += `    When ${when}\n`
        })
        scenario.then.forEach(then => {
          exportContent += `    Then ${then}\n`
        })
        exportContent += '\n'
      })
    })
    
    const blob = new Blob([exportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requirements-export-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Requirements exported successfully!')
  }
  
  if (isLoadingPhase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading Phase 1...</p>
        </div>
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
        <h1 className="text-3xl font-bold text-gray-900">Phase 1: Requirements & Business Analysis</h1>
        <p className="text-gray-500 mt-2">Define what needs to be built - PRD & BRD creation</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Requirements Input Section - Combined Manual & Upload */}
          <div className="card bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">Requirements Input</h2>
                <p className="text-sm text-gray-600">Provide requirements manually or upload documents</p>
                {isApproved && (
                  <p className="text-xs text-amber-700 bg-amber-100 inline-block px-2 py-1 rounded mt-2">
                    Phase approved: AI extraction and uploads are locked. You can still edit content manually below.
                  </p>
                )}
              </div>
              <button
                onClick={() => setRequirementsSectionExpanded(!requirementsSectionExpanded)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title={requirementsSectionExpanded ? 'Collapse' : 'Expand'}
              >
                {requirementsSectionExpanded ? (
                  <ChevronUp className="w-6 h-6" />
                ) : (
                  <ChevronDown className="w-6 h-6" />
                )}
              </button>
            </div>

            {requirementsSectionExpanded && (
            <div className="bg-white rounded-lg p-6 space-y-6">
              {/* Input Method Tabs - Manual Input and Upload Document */}
              <div className="flex space-x-2 border-b border-gray-200">
                <button
                  onClick={() => setShowManualInput(true)}
                  className={`px-4 py-2 font-medium transition-colors ${
                    showManualInput 
                      ? 'text-indigo-600 border-b-2 border-indigo-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  disabled={isApproved}
                >
                  <div className="flex items-center space-x-2">
                    <Edit3 className="w-4 h-4" />
                    <span>Manual Input</span>
                  </div>
                </button>
                <button
                  onClick={() => setShowManualInput(false)}
                  className={`px-4 py-2 font-medium transition-colors ${
                    !showManualInput 
                      ? 'text-indigo-600 border-b-2 border-indigo-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  disabled={isApproved || !phaseId}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Upload Document</span>
                  </div>
                </button>
              </div>

              {/* Manual Input Section */}
              {showManualInput && !isApproved && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Describe your requirements, business goals, or project vision:
                    </label>
                    <textarea
                      value={manualRequirement}
                      onChange={(e) => setManualRequirement(e.target.value)}
                      placeholder="Example:

Build a User Authentication System
- The system should allow users to register and login securely
- Support role-based access control
- Include password reset functionality
- Must be highly available and respond within 2 seconds

AI will automatically extract:
✓ Business Proposal & Vision
✓ Functional Requirements
✓ Non-Functional Requirements
✓ Stakeholders
✓ Risks & Constraints"
                      className="input w-full min-h-40"
                    />
                  </div>
                  <button 
                    onClick={handleExtractRequirements}
                    disabled={isExtracting || !manualRequirement.trim()}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing & Extracting...</span>
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4" />
                        <span>Extract Requirements with AI</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Upload Document Section - No extra tabs, clean upload */}
              {!showManualInput && !isApproved && phaseId && (
                <div className="space-y-4">
                  <RequirementUploader
                    projectId={Number(projectId)}
                    phaseId={phaseId}
                    onExtractComplete={handleDocumentExtractComplete}
                  />
                </div>
              )}
            </div>
            )}
          </div>
          
          {/* New Extracted Requirements Display Component - Shows all extracted data */}
          <ExtractedRequirementsDisplay
            input={savedInput || ''}
            businessProposal={businessProposal}
            functionalRequirements={functionalRequirements as any[]}
            nonFunctionalRequirements={nonFunctionalRequirements}
            stakeholders={extractedStakeholders}
            technologiesAndTools={extractedTechStack}
            riskAnalysis={extractedRisks}
            additionalNotes={additionalNotes}
            onUpdate={async (updatedData) => {
              // Update local state
              setFunctionalRequirements(updatedData.functionalRequirements)
              setNonFunctionalRequirements(updatedData.nonFunctionalRequirements)
              setExtractedStakeholders(updatedData.stakeholders || [])
              setBusinessProposal(updatedData.businessProposal || null)
              setExtractedRisks(updatedData.riskAnalysis || null)
              setExtractedTechStack(updatedData.technologiesAndTools || {})
              if (updatedData.additionalNotes !== undefined) {
                setAdditionalNotes(updatedData.additionalNotes)
              }
              
              // Record requirements history entry
              const entry: VersionEntry = {
                version: (versionHistory.requirements?.length || 0) + 1,
                editedAt: new Date().toISOString(),
                editedBy: 'User',
                changeType: 'edit',
                summary: 'Requirements updated'
              }
              const newVH: VersionHistory = { ...versionHistory, requirements: [...versionHistory.requirements, entry] }
              setVersionHistory(newVH)
              
              // Reset approval status if content was edited after approval
              await resetApprovalIfNeeded()
              
              // Auto-save to database
              if (phaseId) {
                try {
                  await updatePhase(phaseId, {
                    data: {
                      gherkinRequirements,
                      functionalRequirements: updatedData.functionalRequirements,
                      nonFunctionalRequirements: updatedData.nonFunctionalRequirements,
                      versionHistory: newVH,
                      risks,
                      stakeholders,
                      businessProposal: updatedData.businessProposal,
                      risksCategorized: updatedData.riskAnalysis,
                      technologyAndTools: updatedData.technologiesAndTools,
                      stakeholdersExtracted: updatedData.stakeholders || [],
                      additionalNotes: updatedData.additionalNotes || '',
                      aiNotes,
                      prd: prdContent,
                      brd: brdContent
                    }
                  })
                  toast.success('Requirements updated and saved!')
                } catch (error) {
                  console.error('Auto-save failed:', error)
                  toast.error('Failed to save changes')
                }
              }
            }}
          />
          
          {/* Original AIExtractedData - kept for backward compatibility if needed 
          <AIExtractedData
            businessProposal={businessProposal}
            functionalRequirements={functionalRequirements}
            nonFunctionalRequirements={nonFunctionalRequirements}
            extractedStakeholders={extractedStakeholders}
            extractedRisks={extractedRisks}
            aiNotes={aiNotes}
            onUpdate={async (updatedData) => {
              // ... original handler code ...
            }}
          />
          */}

          {/* Requirements Collection (for legacy Gherkin only, or for displaying the new requirements as individual cards) */}
          {gherkinRequirements.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Requirements ({gherkinRequirements.length})
                  </h2>
                </div>
              </div>
              
              {/* GherkinViewer will now only show legacy Gherkin requirements */}
              <GherkinViewer
                requirements={gherkinRequirements as ViewerGherkinRequirement[]}
                onUpdate={(requirements: ViewerGherkinRequirement[]) => {
                  // Filter only legacy Gherkin requirements from the updated list
                  const legacyRequirements = requirements.filter(req => 'feature' in req) as GherkinRequirement[]
                  setGherkinRequirements(legacyRequirements)
                  toast.success('Requirements updated successfully!')
                }}
                onEdit={(requirement: ViewerGherkinRequirement) => {
                  // Only handle legacy Gherkin requirements for editing
                  if ('feature' in requirement) {
                    handleEditRequirement(requirement as GherkinRequirement)
                  }
                }}
              />
            </div>
          )}

          {/* Business Requirements Document (BRD) */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Business Requirements Document (BRD)</h2>
              </div>
              <button 
                onClick={handleGenerateBRD}
                disabled={isGeneratingBRD || !phaseId || isApproved}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingBRD ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>Generate with AI</span>
                  </>
                )}
              </button>
            </div>
            
            <textarea
              value={brdContent}
              onChange={(e) => setBrdContent(e.target.value)}
              placeholder="Enter BRD content or generate with AI...

Sections to include:
1. Document Overview
2. Executive Summary
3. Business Problem Statement
4. Business Objectives
5. Key Stakeholders
6. Scope Definition (In-Scope & Out-of-Scope)
7. Business Requirements (Functional)
8. Non-Functional / Business Quality Requirements
9. Process Flow / High-Level Workflow
10. Assumptions
11. Constraints & Dependencies
12. Business Risks & Mitigation
13. Success Metrics (Business KPIs)
14. Recommendations (Optional)"
              className="input min-h-64 font-mono text-sm"
            />
            
            <div className="mt-4 flex items-center justify-between">
              <div className="space-x-2">
                <button 
                  onClick={() => handleSaveDraft('brd')}
                  className="btn-secondary flex items-center space-x-2"
                  disabled={!brdContent}
                >
                  <FileText className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>
                <select
                  className="input inline-block w-auto text-sm"
                  value={brdExportSelection === 'current' ? 'current' : String(brdExportSelection)}
                  onChange={(e) => {
                    const val = e.target.value
                    setBrdExportSelection(val === 'current' ? 'current' : Number(val))
                  }}
                >
                  <option value={'current'}>Export: Current</option>
                  {versionHistory.brd.map(v => (
                    <option key={`brd-opt-${v.version}`} value={v.version}>Export: v{v.version}</option>
                  ))}
                </select>
                <button 
                  onClick={() => handleExportPDF('brd', { version: brdExportSelection })}
                  className="btn-primary flex items-center space-x-2"
                  disabled={!brdContent}
                >
                  <FileText className="w-4 h-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
            {/* BRD Version history */}
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">Versions: {versionHistory.brd.length} {versionHistory.brd.length > 0 && `(Last: ${new Date(versionHistory.brd[versionHistory.brd.length-1].editedAt).toLocaleString()})`}</div>
                <button className="text-xs text-primary-600" onClick={() => setShowBRDHistory(v => !v)}>{showBRDHistory ? 'Hide' : 'Show'} history</button>
              </div>
              {showBRDHistory && (
                <ul className="mt-2 space-y-1 max-h-40 overflow-auto text-xs">
                  {versionHistory.brd.map(v => (
                    <li key={`brd-v-${v.version}`} className="flex justify-between border rounded p-2">
                      <span>v{v.version} • {v.changeType}</span>
                      <span className="text-gray-500">{new Date(v.editedAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Product Requirements Document (PRD) */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Product Requirements Document (PRD)</h2>
              </div>
              <button 
                onClick={handleGeneratePRD}
                disabled={isGeneratingPRD || !phaseId || isApproved}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPRD ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>Generate with AI</span>
                  </>
                )}
              </button>
            </div>
            
            <textarea
              value={prdContent}
              onChange={(e) => setPrdContent(e.target.value)}
              placeholder="Enter PRD content or generate with AI...

Sections to include:
1. Product Overview
2. Problem Statement
3. Goals & Objectives
4. User Personas / Stakeholders
5. Scope (In-Scope & Out-of-Scope)
6. User Stories / Use Cases
7. Feature Requirements (Functional)
8. Non-Functional Requirements
9. Technical Dependencies & Constraints
10. Success Metrics (KPIs)
11. Assumptions
12. Risks & Mitigation
13. Release Plan / Milestones"
              className="input min-h-64 font-mono text-sm"
            />
            
              <div className="mt-4 flex items-center justify-between">
              <div className="space-x-2">
                <button 
                  onClick={() => handleSaveDraft('prd')}
                  className="btn-secondary flex items-center space-x-2"
                  disabled={!prdContent}
                >
                  <FileText className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>
                  <select
                    className="input inline-block w-auto text-sm"
                    value={prdExportSelection === 'current' ? 'current' : String(prdExportSelection)}
                    onChange={(e) => {
                      const val = e.target.value
                      setPrdExportSelection(val === 'current' ? 'current' : Number(val))
                    }}
                  >
                    <option value={'current'}>Export: Current</option>
                    {versionHistory.prd.map(v => (
                      <option key={`prd-opt-${v.version}`} value={v.version}>Export: v{v.version}</option>
                    ))}
                  </select>
                <button 
                  onClick={() => handleExportPDF('prd', { version: prdExportSelection })}
                  className="btn-primary flex items-center space-x-2"
                  disabled={!prdContent}
                >
                  <FileText className="w-4 h-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
            {/* PRD Version history */}
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">Versions: {versionHistory.prd.length} {versionHistory.prd.length > 0 && `(Last: ${new Date(versionHistory.prd[versionHistory.prd.length-1].editedAt).toLocaleString()})`}</div>
                <button className="text-xs text-primary-600" onClick={() => setShowPRDHistory(v => !v)}>{showPRDHistory ? 'Hide' : 'Show'} history</button>
              </div>
              {showPRDHistory && (
                <ul className="mt-2 space-y-1 max-h-40 overflow-auto text-xs">
                  {versionHistory.prd.map(v => (
                    <li key={`prd-v-${v.version}`} className="flex justify-between border rounded p-2">
                      <span>v{v.version} • {v.changeType}</span>
                      <span className="text-gray-500">{new Date(v.editedAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Risk Assessment - COMMENTED OUT: Risks are now covered in Extracted Requirements section */}
          {/* <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Risk Assessment</h2>
              </div>
              <button 
                onClick={handleAnalyzeRisks}
                disabled={isAnalyzingRisks || !phaseId}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzingRisks ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Analyze Risks with AI</span>
                )}
              </button>
            </div>
            
            <div className="space-y-3">
              {risks.map((risk) => (
                <div key={risk.id} className={`p-4 rounded-lg border-l-4 ${
                  risk.severity === 'High' ? 'border-red-500 bg-red-50' :
                  risk.severity === 'Medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-green-500 bg-green-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{risk.risk}</h3>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          risk.severity === 'High' ? 'bg-red-100 text-red-800' :
                          risk.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Mitigation:</strong> {risk.mitigation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-secondary w-full mt-4">Add Risk</button>
          </div> */}
        </div>
        
        {/* Stakeholders & Approval Section */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Stakeholders</h2>
            </div>
            
            <div className="space-y-3">
              {stakeholders.map((stakeholder, index) => {
                // Determine status badge based on phase status and stakeholder status
                let statusBgColor = 'bg-yellow-100'
                let statusTextColor = 'text-yellow-800'
                let statusLabel = 'Pending'
                
                if (isApproved) {
                  statusBgColor = 'bg-green-100'
                  statusTextColor = 'text-green-800'
                  statusLabel = 'Approved'
                } else if (isPendingApproval) {
                  statusBgColor = 'bg-blue-100'
                  statusTextColor = 'text-blue-800'
                  statusLabel = 'Awaiting Approval'
                }
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{stakeholder.role}</p>
                      <p className="text-xs text-gray-500">{stakeholder.name}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium ${statusBgColor} ${statusTextColor} rounded`}>
                      {statusLabel}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 space-y-2">
              <button 
                onClick={() => setShowSelectModal(true)} 
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>Select from Database</span>
              </button>
              
              {showAddStakeholder ? (
                <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                  <input
                    type="text"
                    placeholder="Role (e.g., Technical Lead)"
                    value={newStakeholder.role}
                    onChange={(e) => setNewStakeholder({ ...newStakeholder, role: e.target.value })}
                    className="input w-full"
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={newStakeholder.name}
                    onChange={(e) => setNewStakeholder({ ...newStakeholder, name: e.target.value })}
                    className="input w-full"
                  />
                  <div className="flex space-x-2">
                    <button onClick={handleAddStakeholder} className="btn-primary flex-1">
                      Add
                    </button>
                    <button 
                      onClick={() => {
                        setShowAddStakeholder(false)
                        setNewStakeholder({ role: '', name: '' })
                      }} 
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAddStakeholder(true)} 
                  className="btn-secondary w-full flex items-center justify-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Add Custom Stakeholder</span>
                </button>
              )}
            </div>
            
            <SelectStakeholderModal
              isOpen={showSelectModal}
              onClose={() => setShowSelectModal(false)}
              onSelect={handleSelectStakeholder}
            />
          </div>
          
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Workflow</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Requirements Collected</p>
                  <p className="text-xs text-gray-500">All key requirements documented</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">PRD & BRD Created</p>
                  <p className="text-xs text-gray-500">Documents ready for review</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600 font-bold">{stakeholders.length}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Awaiting Approvals</p>
                  <p className="text-xs text-gray-500">{stakeholders.length} stakeholder{stakeholders.length !== 1 ? 's' : ''} pending</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 opacity-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-600 font-bold">4</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Approved</p>
                  <p className="text-xs text-gray-500">Move to Phase 2</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleSubmitForApproval}
              disabled={isSubmitting || !phaseId || !prdContent || !brdContent || stakeholders.length === 0 || isApproved || isPendingApproval}
              className="w-full mt-6 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isApproved ? (
                <span>✅ Approved</span>
              ) : isPendingApproval ? (
                <span>⏳ Pending Approval</span>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit for Approval</span>
              )}
            </button>
            
            {/* Show validation message when stakeholders are missing */}
            {stakeholders.length === 0 && !isApproved && !isPendingApproval && (
              <p className="mt-2 text-xs text-red-600 text-center">
                ⚠️ Please select at least one stakeholder before submitting for approval
              </p>
            )}
            
            {/* Show message when phase was edited after approval */}
            {phaseStatus === 'in_progress' && versionHistory.prd.length > 0 && versionHistory.brd.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  📝 Content has been edited. Please review changes and resubmit for approval.
                </p>
              </div>
            )}
            
            {/* Approval History Timeline */}
            {approvalHistory.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Approval History
                </h3>
                <div className="space-y-3">
                  {approvalHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            Submission #{idx + 1}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(entry.submittedAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          Submitted by {entry.submittedBy || 'User'}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="inline-flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            PRD v{entry.versionSnapshot?.prdVersion || entry.prdVersion}
                          </span>
                          <span className="inline-flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            BRD v{entry.versionSnapshot?.brdVersion || entry.brdVersion}
                          </span>
                          <span className="inline-flex items-center">
                            <ListChecks className="w-3 h-3 mr-1" />
                            Req v{entry.versionSnapshot?.requirementsVersion || entry.requirementsVersion}
                          </span>
                        </div>
                        {entry.stakeholders && entry.stakeholders.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Stakeholders:</p>
                            <div className="flex flex-wrap gap-1">
                              {entry.stakeholders.map((sh: any, shIdx: number) => (
                                <span key={shIdx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                  <Users className="w-3 h-3 mr-1" />
                                  {sh.name} ({sh.role})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card bg-blue-50">
            <h3 className="font-semibold text-gray-900 mb-2">📝 Note</h3>
            <p className="text-sm text-gray-700">
              FSD (Functional Specification Document) will be created in Phase 4 (Detailed Design) after architecture is finalized.
            </p>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Key Deliverables</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Product Requirements Document (PRD)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Business Requirements Document (BRD)</span>
              </li>
              {/* <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Risk Assessment Report</span>
              </li> */}
              <li className="flex items-start">
                <span className="text-yellow-600 mr-2">⋯</span>
                <span>Feasibility Analysis</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
