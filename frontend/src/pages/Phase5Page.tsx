import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getProject, getProjectPhases, updatePhase, generateContent, getPersistedDeliverable } from '../services/api'
import api from '../services/api'
import { toast } from 'react-hot-toast'
import { Code, FileCode, GitBranch, Lightbulb, Download, Copy, Play, RefreshCw, Sparkles, Edit3, Github, ArrowDown, ArrowUp, Filter, Lock, Unlock, Folder, FolderOpen, File, ChevronRight, ChevronDown, Eye, FileText, Search, AlertTriangle, CheckCircle, Layers, Trash2 } from 'lucide-react'
import { EpicStorySelector, GitHubOperationsDialog } from '../components/GitHub'

type Deliverables = {
  code: { file: string; language?: string; content: string }[]
  tests: { file: string; language?: string; content: string }[]
  api: { endpoints: { method: string; path: string; description?: string }[] }
  readme: string
  metadata?: {
    story_id?: string | number
    story_title?: string
    components_used?: string[]
    generated_for?: string
    [key: string]: any
  }
  repository_info?: any
}

const Phase5Page = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [projectName, setProjectName] = useState('')

  const [phase2, setPhase2] = useState<any>(null)
  const [phase3, setPhase3] = useState<any>(null)
  const [phase5, setPhase5] = useState<any>(null)

  const [selectedEpic, setSelectedEpic] = useState<string>('')
  const [selectedStory, setSelectedStory] = useState<string>('')
  const [selectedComponents, setSelectedComponents] = useState<string[]>([])
  const [preferences, setPreferences] = useState<any>({ language: 'python', tests: 'pytest', auth: 'jwt' })

  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'code' | 'tests' | 'api' | 'readme'>('code')
  const [deliverables, setDeliverables] = useState<Record<string, Deliverables>>({})
  const [aiEnhancing, setAiEnhancing] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [currentFile, setCurrentFile] = useState('')
  const [isCodeModifyOpen, setIsCodeModifyOpen] = useState(false)

  // GitHub Operations Dialog State
  const [showGitHubOperationsDialog, setShowGitHubOperationsDialog] = useState(false)

  // GitHub Integration State
  const [githubAuth, setGithubAuth] = useState<{ token: string; username: string } | null>(null)
  const [repositories, setRepositories] = useState<any[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('main')
  const [commits, setCommits] = useState<any[]>([])
  const [githubLoading, setGithubLoading] = useState(false)
  const [showGithubAuth, setShowGithubAuth] = useState(false)
  const [showRepoFilters, setShowRepoFilters] = useState(false)
  const [showPushFilters, setShowPushFilters] = useState(false)
  const [newRepoName, setNewRepoName] = useState<string>('')
  const [newBranchName, setNewBranchName] = useState<string>('')
  const [pushStatus, setPushStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })
  const [repoFilters, setRepoFilters] = useState({
    visibility: 'all', // public, private, all
    type: 'all', // owner, member, all
    sort: 'updated', // created, updated, pushed, full_name
    direction: 'desc' // asc, desc
  })
  const [pushFilters, setPushFilters] = useState({
    visibility: 'all', // public, private, all
    type: 'all', // owner, member, all
    sort: 'updated', // created, updated, pushed, full_name
    direction: 'desc' // asc, desc
  })
  
  // Repository File Tree State
  const [repoContents, setRepoContents] = useState<any[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [folderContents, setFolderContents] = useState<Record<string, any[]>>({}) // Store contents of each folder
  const [openFile, setOpenFile] = useState<{ name: string; content: string; path: string } | null>(null)
  const [loadingFile, setLoadingFile] = useState<string>('')
  const [loadingFolder, setLoadingFolder] = useState<string>('')
  const [repoExpanded, setRepoExpanded] = useState(false) // Track if main repo is expanded

  // AI Code Review State
  const [aiCodeReview, setAiCodeReview] = useState<any>(null)
  const [loadingAiReview, setLoadingAiReview] = useState(false)
  const [activeReviewTab, setActiveReviewTab] = useState<'documentation' | 'quality' | 'bugs' | 'tests' | 'architecture'>('documentation')
  
  // Force update trigger
  const [forceUpdate, setForceUpdate] = useState(0)

  useEffect(() => {
    if (projectId) load()
  }, [projectId])

  useEffect(() => {
    // Load saved GitHub auth from sessionStorage
    const savedAuth = sessionStorage.getItem('github_auth')
    if (savedAuth) {
      try {
        const auth = JSON.parse(savedAuth)
        console.log('Loaded GitHub auth from storage:', auth)
        setGithubAuth(auth)
        // Load repositories immediately after setting auth
        loadRepositories(auth.token)
      } catch (e) {
        console.error('Failed to parse saved GitHub auth:', e)
        sessionStorage.removeItem('github_auth')
      }
    } else {
      console.log('No saved GitHub auth found - user must connect manually')
      // Do NOT set a test token - require user to authenticate
    }
  }, [])

  useEffect(() => {
    // Reload repositories when filters change
    if (githubAuth) {
      loadRepositories()
    }
  }, [repoFilters])

  useEffect(() => {
    // Load repositories with push filters when push filters change
    if (githubAuth) {
      console.log('Push filters changed:', pushFilters)
      loadRepositories(undefined, pushFilters)
    }
  }, [pushFilters])

  useEffect(() => {
    // Save GitHub auth to sessionStorage
    if (githubAuth) {
      console.log('Saving GitHub auth to storage:', githubAuth)
      sessionStorage.setItem('github_auth', JSON.stringify(githubAuth))
      // Load repositories when auth is set
      loadRepositories(githubAuth.token)
    } else {
      console.log('Removing GitHub auth from storage')
      sessionStorage.removeItem('github_auth')
    }
  }, [githubAuth])

  const load = async () => {
    try {
      const proj = await getProject(Number(projectId))
      setProjectName(proj.data.name || 'Project')

      const resp = await getProjectPhases(Number(projectId))
      const phases = resp.data
      const p2 = phases.find((p: any) => p.phase_number === 2)
      const p3 = phases.find((p: any) => p.phase_number === 3)
      const p5 = phases.find((p: any) => p.phase_number === 5)
      setPhase2(p2)
      setPhase3(p3)
      setPhase5(p5)

      // Load previously saved deliverables from all possible keys
      console.log('[PHASE5_LOAD] Phase 5 data keys:', Object.keys(p5?.data || {}))
      
      let saved: Record<string, any> = {}
      
      // Try multiple possible keys where deliverables might be stored
      if (p5?.data?.user_story_development) {
        console.log('[PHASE5_LOAD] Found user_story_development')
        saved = p5.data.user_story_development
      } else if (p5?.data?.user_story_dev_delivery) {
        console.log('[PHASE5_LOAD] Found user_story_dev_delivery')
        // Normalize single delivery to multiple
        const delivery = p5.data.user_story_dev_delivery
        if (delivery && typeof delivery === 'object' && 'code' in delivery) {
          // This is a single delivery response, need to extract story context
          console.log('[PHASE5_LOAD] Converting single delivery to deliverables map')
          saved = delivery
        } else if (typeof delivery === 'object') {
          saved = delivery
        }
      }
      
      console.log('[PHASE5_LOAD] Loaded deliverables count:', Object.keys(saved).length)
      console.log('[PHASE5_LOAD] Deliverables keys:', Object.keys(saved).slice(0, 5))
      
      setDeliverables(saved)
    } catch (e) {
      console.error('[PHASE5_LOAD] Error:', e)
      toast.error('Failed to load phase data')
    }
  }

  // Load persisted deliverables from database when story is selected
  useEffect(() => {
    const loadPersistedDeliverable = async () => {
      if (!selectedStory || !projectId) {
        console.log('[PHASE5_PERSIST] No story or project selected')
        return
      }

      try {
        console.log(`[PHASE5_PERSIST] 📥 Loading persisted deliverable for story ${selectedStory}`)
        
        const response = await getPersistedDeliverable(Number(projectId), String(selectedStory))
        
        if (response?.data?.found && response.data.deliverable) {
          console.log(`[PHASE5_PERSIST] ✅ Found persisted deliverable for story ${selectedStory}`)
          console.log(`[PHASE5_PERSIST] Code files: ${response.data.deliverable.code?.length || 0}`)
          
          // Add to deliverables if not already there
          const storyKey = String(selectedStory)
          setDeliverables(prev => ({
            ...prev,
            [storyKey]: response.data.deliverable
          }))
          
          // Show success indicator
          toast.success(`📥 Loaded existing deliverable for story ${selectedStory}`, { duration: 2000 })
        } else {
          console.log(`[PHASE5_PERSIST] No persisted deliverable found for story ${selectedStory}`)
        }
      } catch (error) {
        console.error('[PHASE5_PERSIST] Error loading persisted deliverable:', error)
        // Don't show error toast - this is expected if no deliverable exists yet
      }
    }

    // Load persisted deliverable when story changes
    loadPersistedDeliverable()
  }, [selectedStory, projectId])

  const epics = phase2?.data?.epics || []
  const stories = useMemo(() => {
    if (!selectedEpic) return phase2?.data?.userStories || []
    // Convert both to strings for comparison to handle type mismatches
    return (phase2?.data?.userStories || []).filter((s: any) => {
      const storyEpicId = String(s.epic_id || s.epicId || '')
      return storyEpicId === String(selectedEpic)
    })
  }, [phase2, selectedEpic])

  const components = phase3?.data?.architecture?.system_components || []

  const currentStory = useMemo(() => {
    return (phase2?.data?.userStories || []).find((s: any) => String(s.id) === String(selectedStory))
  }, [phase2, selectedStory])

  const currentEpic = useMemo(() => {
    return (phase2?.data?.epics || []).find((e: any) => String(e.id) === String(selectedEpic))
  }, [phase2, selectedEpic])

  const currentDeliverable = useMemo(() => {
    // Prioritize repository-based deliverables if available
    if (selectedRepo && selectedBranch) {
      const repoKey = `repo_${selectedRepo}_${selectedBranch}`
      if (deliverables[repoKey]) {
        return deliverables[repoKey]
      }
    }
    
    // Fall back to story-based deliverables
    return deliverables[String(currentStory?.id || '')]
  }, [deliverables, selectedRepo, selectedBranch, currentStory])

  // Enhanced cursor and selection detection
  useEffect(() => {
    const updateContext = () => {
      try {
        const activeFile = sessionStorage.getItem('phase5_active_file') || ''
        const selectedText = sessionStorage.getItem('phase5_selected_text') || ''
        
        setCurrentFile(activeFile)
        setSelectedText(selectedText)
        
        // Update context for AI chat
        if (currentStory && currentDeliverable) {
          const contextData = {
            id: currentStory.id,
            title: currentStory.title,
            description: currentStory.description,
            deliverable: currentDeliverable,
            language: preferences.language,
            components: selectedComponents,
            currentFile: activeFile,
            selectedText: selectedText,
            cursor: {
              file: activeFile,
              hasSelection: selectedText.length > 0,
              selectionLength: selectedText.length
            }
          }
          sessionStorage.setItem('phase5_current_story', JSON.stringify(contextData))
        }
      } catch (e) {
        console.error('Error updating context:', e)
      }
    }

    const interval = setInterval(updateContext, 200)
    return () => clearInterval(interval)
  }, [currentStory, currentDeliverable, preferences.language, selectedComponents])

  useEffect(() => {
    // Auto-map components based on story title keywords
    if (!currentStory || !components?.length) return
    const title = (currentStory.title || '').toLowerCase()
    const auto: string[] = components.filter((c: any) => {
      const n = (c.name || '').toLowerCase()
      const t = (c.type || '').toLowerCase()
      return n && (title.includes(n.split(' ')[0]) || t.includes('service') || t.includes('api'))
    }).map((c: any) => c.name)
    const unique = Array.from(new Set<string>(auto))
    setSelectedComponents(unique.slice(0, 3))
  }, [currentStory, components])

  const handleGenerate = async () => {
    if (!phase5?.id) {
      toast.error('Phase 5 not initialized')
      return
    }
    if (!currentStory) {
      toast.error('Please select a user story')
      return
    }

    try {
      setGenerating(true)

      const storyKey = String(currentStory.id)
      const storyTitle = currentStory.title || ''
      const componentsStr = selectedComponents.join(',')

      // Show loading toast with unique ID to dismiss later
      const loadingToastId = toast.loading(`🔄 Generating code for "${storyTitle}"...`)
      console.log(`[PHASE5] 📝 Generating code for Story: ${storyTitle}`)
      console.log(`[PHASE5] 🔧 Components: ${componentsStr}`)
      console.log(`[PHASE5] 📦 Selected from: ${selectedComponents.length} component(s)`)

      const selectedComponentsData = components.filter((c: any) => selectedComponents.includes(c.name))
      const epicData = epics.find((e: any) => String(e.id) === String(selectedEpic)) || {}

      const ctx = {
        content_type: 'user_story_dev_delivery',
        user_story: {
          id: currentStory.id,
          story_id: currentStory.id,
          title: currentStory.title,
          description: currentStory.description,
          acceptanceCriteria: currentStory.acceptanceCriteria || currentStory.acceptance_criteria
        },
        epic: epicData,
        selected_components: selectedComponentsData,
        selected_component_names: selectedComponents,
        tech_stack: phase3?.data?.architecture?.technology_stack || {},
        architecture: phase3?.data?.architecture || {},
        preferences,
        system_components: components,
        generation_tracking: {
          story_id: currentStory.id,
          story_title: storyTitle,
          components: selectedComponents,
          timestamp: new Date().toISOString()
        }
      }

      console.log('[PHASE5] 📤 Sending request with:')
      console.log(`   - Story ID: ${ctx.user_story.id}`)
      console.log(`   - Story Title: ${ctx.user_story.title}`)
      console.log(`   - Components: ${JSON.stringify(ctx.selected_component_names)}`)
      console.log(`   - Epic: ${ctx.epic?.title || 'none'}`)

      // Actually wait for the API response
      const startTime = Date.now()
      const res = await generateContent(phase5.id, 'user_story_dev_delivery', ctx)
      const elapsedMs = Date.now() - startTime
      console.log(`[PHASE5] ⏱️ Generation took ${elapsedMs}ms`)
      
      // DEBUG: Log full response structure
      console.log('[PHASE5] 📥 FULL RESPONSE FROM SERVER:')
      console.log(`   res type: ${typeof res}`)
      console.log(`   res keys: ${res ? Object.keys(res).join(', ') : 'N/A'}`)
      console.log(`   res.data type: ${typeof res?.data}`)
      console.log(`   res.data keys: ${res?.data ? Object.keys(res.data).join(', ') : 'N/A'}`)
      if (res?.data?.content) {
        console.log(`   res.data.content type: ${typeof res.data.content}`)
        console.log(`   res.data.content keys: ${typeof res.data.content === 'object' ? Object.keys(res.data.content).join(', ') : 'N/A'}`)
      }
      
      // Validate we got actual content back
      let content: Deliverables
      if (res?.data?.content && typeof res.data.content === 'object' && 'code' in res.data.content) {
        console.log('[PHASE5] ✅ Using wrapped response: res.data.content')
        content = res.data.content
      } else if (res?.data && typeof res.data === 'object' && 'code' in res.data) {
        console.log('[PHASE5] ✅ Using direct response: res.data')
        content = res.data
      } else {
        console.error('[PHASE5] ❌ Invalid response format:', res)
        console.log('[PHASE5] Expected either:')
        console.log('  1. res.data.content with { code, tests, api, readme, metadata }')
        console.log('  2. res.data with { code, tests, api, readme, metadata }')
        toast.error(`Invalid response from server - no code generated`)
        setGenerating(false)
        return
      }

      // Validate content has required fields
      console.log('[PHASE5] 🔍 VALIDATING CONTENT STRUCTURE:')
      console.log(`   content type: ${typeof content}`)
      console.log(`   content keys: ${typeof content === 'object' ? Object.keys(content).join(', ') : 'N/A'}`)
      console.log(`   content.code: ${Array.isArray(content?.code) ? `Array(${content.code.length})` : typeof content?.code}`)
      console.log(`   content.tests: ${Array.isArray(content?.tests) ? `Array(${content.tests.length})` : typeof content?.tests}`)
      console.log(`   content.api: ${typeof content?.api}`)
      console.log(`   content.api.endpoints: ${Array.isArray(content?.api?.endpoints) ? `Array(${content.api.endpoints.length})` : typeof content?.api?.endpoints}`)
      console.log(`   content.readme: ${typeof content?.readme}, length=${(content?.readme || '').length}`)
      console.log(`   content.metadata: ${typeof content?.metadata}`)
      
      if (!content.code || !Array.isArray(content.code) || content.code.length === 0) {
        console.error('[PHASE5] ❌ VALIDATION FAILED - No code files:', content)
        toast.error(`No code generated - response incomplete`)
        setGenerating(false)
        return
      }
      
      // Add tracking metadata to generated content
      if (!content.metadata) content.metadata = {}
      content.metadata.story_id = currentStory.id
      content.metadata.story_title = storyTitle
      content.metadata.components_used = selectedComponents
      content.metadata.generated_for = `${storyTitle} (${selectedComponents.length} components)`

      console.log(`[PHASE5] ✅ Generated code for "${storyTitle}"`)
      console.log(`[PHASE5] 📦 Code files: ${content?.code?.length || 0}`)
      console.log(`[PHASE5] 🧪 Test files: ${content?.tests?.length || 0}`)
      console.log(`[PHASE5] 🔌 API endpoints: ${content?.api?.endpoints?.length || 0}`)

      // Store per story ID - CRITICAL for multi-story generation
      const updated = { ...deliverables, [storyKey]: content }
      setDeliverables(updated)
      
      console.log(`[PHASE5] 💾 STORED IN STATE:`)
      console.log(`   storyKey: ${storyKey}`)
      console.log(`   updated keys: ${Object.keys(updated).join(', ')}`)
      console.log(`   updated[${storyKey}]: ${typeof updated[storyKey]}`)
      console.log(`   updated[${storyKey}].code: ${Array.isArray(updated[storyKey]?.code) ? `Array(${updated[storyKey].code.length})` : 'N/A'}`)
      
      // Check what currentDeliverable will be
      const expectedCurrentDeliverable = updated[String(currentStory.id || '')]
      console.log(`[PHASE5] 🔍 EXPECTED CURRENT_DELIVERABLE:`)
      console.log(`   currentStory.id: ${currentStory.id}`)
      console.log(`   String(currentStory.id): ${String(currentStory.id)}`)
      console.log(`   expectedCurrentDeliverable exists: ${!!expectedCurrentDeliverable}`)
      if (expectedCurrentDeliverable) {
        console.log(`   expectedCurrentDeliverable.code length: ${expectedCurrentDeliverable.code?.length || 0}`)
        console.log(`   expectedCurrentDeliverable.tests length: ${expectedCurrentDeliverable.tests?.length || 0}`)
        console.log(`   expectedCurrentDeliverable.api.endpoints length: ${expectedCurrentDeliverable.api?.endpoints?.length || 0}`)
        console.log(`   expectedCurrentDeliverable.readme length: ${expectedCurrentDeliverable.readme?.length || 0}`)
      }

      // Persist to database with story tracking
      const persistStart = Date.now()
      await updatePhase(phase5.id, { 
        data: { 
          ...(phase5.data || {}), 
          user_story_development: updated,
          last_generated_story_id: currentStory.id,
          last_generated_at: new Date().toISOString()
        } 
      })
      const persistElapsedMs = Date.now() - persistStart
      console.log(`[PHASE5] 💾 Persisted to database in ${persistElapsedMs}ms`)

      // ONLY NOW show success after everything is confirmed
      toast.dismiss(loadingToastId)
      toast.success(() => (
        <div>
          <strong>✅ Generated!</strong><br/>
          {content.code.length} code file(s), {content.tests.length} test(s) for <strong>{storyTitle}</strong>
        </div>
      ), { duration: 4000 })
    } catch (e: any) {
      console.error('[PHASE5_ERROR]', e)
      toast.error(`Failed: ${e?.message || 'Generation error'}`)
    } finally {
      setGenerating(false)
    }
  }

  // Listen for reload signal from AI chat after code modifications
  useEffect(() => {
    const checkReload = () => {
      const shouldReload = sessionStorage.getItem('phase5_reload_deliverables')
      if (shouldReload === 'true') {
        sessionStorage.removeItem('phase5_reload_deliverables')
        // Reload deliverables from backend
        load()
      }
    }
    
    const interval = setInterval(checkReload, 500)
    return () => clearInterval(interval)
  }, [])

  // Log when story changes to help debug same-content issue
  useEffect(() => {
    if (currentStory) {
      const storyKey = String(currentStory.id)
      const deliverable = deliverables[storyKey]
      console.log('[PHASE5_DEBUG] Story changed:')
      console.log(`  Story ID: ${currentStory.id}`)
      console.log(`  Story Title: ${currentStory.title}`)
      console.log(`  Story Key: ${storyKey}`)
      console.log(`  Has Deliverable: ${!!deliverable}`)
      if (deliverable) {
        console.log(`  Code Files: ${deliverable.code?.length || 0}`)
        if (deliverable.code?.length > 0) {
          console.log(`  First File: ${deliverable.code[0].file}`)
          console.log(`  Content Length: ${deliverable.code[0].content?.length || 0}`)
          console.log(`  Content Preview: ${deliverable.code[0].content?.substring(0, 100)}...`)
        }
        console.log(`  Metadata: ${JSON.stringify(deliverable.metadata)}`)
      } else {
        console.log('  → No deliverable found, will generate new')
      }
    }
  }, [currentStory, deliverables])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${filename}`)
  }

  const handleRegenerateWithAI = async () => {
    if (!currentStory) return
    setAiEnhancing(true)
    toast.loading('AI is enhancing the code...')
    
    try {
      // Re-generate with current preferences
      await handleGenerate()
      toast.dismiss()
      toast.success('Code regenerated with updated preferences!')
    } finally {
      setAiEnhancing(false)
    }
  }

  const handleSubmitForApproval = async () => {
    if (!phase5?.id) {
      toast.error('Phase not found')
      return
    }

    if (!currentDeliverable?.code || currentDeliverable.code.length === 0) {
      toast.error('Please generate deliverables before submitting for approval')
      return
    }

    try {
      // Update phase status to pending_approval
      await updatePhase(phase5.id, {
        status: 'pending_approval',
        data: phase5?.data || {}
      })

      toast.success('Phase 5 submitted for approval!')
      
      // Navigate to approvals page after a short delay
      setTimeout(() => {
        navigate('/approvals')
      }, 1500)
    } catch (error) {
      console.error('Error submitting for approval:', error)
      toast.error('Failed to submit for approval. Please try again.')
    }
  }

  const handleCodeModify = async () => {
    // Get the most current file from sessionStorage to avoid stale state
    const activeFile = sessionStorage.getItem('phase5_active_file') || ''
    if (!activeFile) {
      toast.error('Please select a code file first')
      return
    }
    
    // Update current file state to match sessionStorage before opening modal
    setCurrentFile(activeFile)
    setIsCodeModifyOpen(true)
  }

  const executeCodeModification = async (instruction: string) => {
    if (!currentStory || !currentFile) return
    
    try {
      const requestData = {
        project_id: Number(projectId),
        phase_id: 5, // Use phase NUMBER (5), not phase database ID
        story_id: String(currentStory.id), // Ensure string format
        file_name: currentFile,
        instruction: instruction,
        selected_text: selectedText || "", // Ensure not null
        context: {
          language: preferences.language,
          current_code: getCurrentFileContent() || "", // Ensure not null
          story: {
            id: String(currentStory.id),
            title: currentStory.title || "",
            description: currentStory.description || ""
          }
        }
      }
      
      console.log('Sending code modification request:', requestData)
      
      const response = await fetch('/api/ai-chat/modify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
      
      const result = await response.json()
      console.log('Code modification response:', result)
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      console.log('Result success:', result.success)
      console.log('Result message:', result.message)
      console.log('Modified code length:', result.modified_code ? result.modified_code.length : 'No modified code')
      
      if (response.ok && result.success) {
        toast.success('Code modified successfully!')
        console.log('Code modification successful')
        console.log('Modified code received:', result.modified_code ? 'Yes' : 'No')
        console.log('File modified:', result.file_name)
        console.log('Current story ID:', String(currentStory.id))
        console.log('Current deliverables before update:', deliverables)
        
        // Immediately update the deliverables state with the modified code
        if (result.modified_code && result.file_name) {
          const updatedDeliverables = { ...deliverables }
          const storyKey = String(currentStory.id)
          
          console.log('Story key:', storyKey)
          console.log('Deliverable exists:', !!updatedDeliverables[storyKey])
          console.log('Code files exist:', !!updatedDeliverables[storyKey]?.code)
          
          if (updatedDeliverables[storyKey] && updatedDeliverables[storyKey].code) {
            // Find and update the specific file
            const oldCodeFiles = [...updatedDeliverables[storyKey].code]
            updatedDeliverables[storyKey].code = updatedDeliverables[storyKey].code.map(codeFile => {
              if (codeFile.file === result.file_name) {
                console.log('Updating file:', codeFile.file)
                console.log('Old content length:', codeFile.content.length)
                console.log('New content length:', result.modified_code.length)
                return {
                  ...codeFile,
                  content: result.modified_code
                }
              }
              return codeFile
            })
            
            // Update the state immediately
            setDeliverables(updatedDeliverables)
            console.log('Updated deliverables state immediately')
            console.log('New deliverables:', updatedDeliverables)
            
            // Force a re-render by updating a timestamp
            setTimeout(() => {
              console.log('Force re-render triggered')
              setDeliverables({...updatedDeliverables})
              setForceUpdate(prev => prev + 1)
            }, 100)
          } else {
            console.log('ERROR: No deliverable or code files found for story', storyKey)
          }
        } else {
          console.log('ERROR: No modified code or file name in response')
        }
        
        // Also reload from database after a short delay to ensure consistency
        setTimeout(async () => {
          console.log('Reloading data after delay...')
          await load()
          console.log('Data reloaded from database')
        }, 1000)
        
        setIsCodeModifyOpen(false)
      } else {
        console.error('Code modification failed:', result)
        toast.error(result.message || `Failed to modify code: ${response.status}`)
      }
    } catch (error) {
      console.error('Code modification error:', error)
      toast.error('Failed to modify code')
    }
  }

  const getCurrentFileContent = () => {
    if (!currentFile || !currentDeliverable?.code) return ''
    
    const codeFile = currentDeliverable.code.find(f => f.file === currentFile)
    return codeFile?.content || ''
  }

  // GitHub Authentication
  const handleGithubAuth = async (token: string) => {
    try {
      setGithubLoading(true)
      const response = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${token}` }
      })
      
      if (response.ok) {
        const user = await response.json()
        setGithubAuth({ token, username: user.login })
        setShowGithubAuth(false)
        toast.success(`Connected to GitHub as ${user.login}`)
        await loadRepositories(token)
      } else {
        toast.error('Invalid GitHub token')
      }
    } catch (error) {
      toast.error('Failed to authenticate with GitHub')
    } finally {
      setGithubLoading(false)
    }
  }

  // Load Repositories
  const loadRepositories = async (token?: string, filters?: any) => {
    try {
      setGithubLoading(true)
      const authToken = token || githubAuth?.token
      if (!authToken) {
        console.error('No GitHub token available for loading repositories')
        toast.error('No GitHub token available')
        return
      }

      console.log('Loading repositories with token:', authToken.substring(0, 20) + '...')

      // Use provided filters or fall back to current repoFilters
      const activeFilters = filters || repoFilters
      console.log('Active filters:', activeFilters)

      // Build query parameters
      const params = new URLSearchParams()
      params.append('per_page', '50')
      params.append('sort', activeFilters.sort || 'updated')
      params.append('direction', activeFilters.direction || 'desc')
      
      // Note: Affiliation (type) parameter: 'owner', 'member', 'collaborator' or 'all' (default)
      if (activeFilters.type && activeFilters.type !== 'all') {
        params.append('affiliation', activeFilters.type)
      }

      const baseUrl = 'https://api.github.com/user/repos'
      const url = `${baseUrl}?${params.toString()}`
      console.log('GitHub API URL:', url)

      const response = await fetch(url, {
        headers: { 
          'Authorization': `token ${authToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TAO-SDLC-App'
        }
      })
      
      console.log('GitHub API response status:', response.status)
      
      if (response.ok) {
        let repos = await response.json()
        console.log('Raw repositories response count:', Array.isArray(repos) ? repos.length : 'Not an array')
        
        if (Array.isArray(repos)) {
          // Apply visibility filter (client-side since GitHub API filters are limited)
          if (activeFilters.visibility && activeFilters.visibility !== 'all') {
            const isPrivate = activeFilters.visibility === 'private'
            repos = repos.filter((r: any) => r.private === isPrivate)
            console.log(`After visibility filter (${activeFilters.visibility}):`, repos.length)
          }

          setRepositories(repos)
          console.log('Repositories set successfully:', repos.map(r => ({ name: r.name, private: r.private, language: r.language })))
          
          if (repos.length === 0) {
            toast('No repositories found matching filters', { icon: '📝' })
          } else {
            toast.success(`Loaded ${repos.length} repositories`)
          }
        } else {
          console.error('Response is not an array:', repos)
          toast.error('Invalid response format from GitHub API')
        }
      } else {
        const errorData = await response.json()
        console.error('GitHub API error:', errorData)
        
        if (response.status === 401) {
          toast.error('Invalid or expired GitHub token. Please reconnect.')
          setGithubAuth(null)
          sessionStorage.removeItem('github_auth')
        } else if (response.status === 403) {
          toast.error('GitHub API rate limit exceeded. Please try again later.')
        } else {
          toast.error(`Failed to load repositories: ${errorData.message || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Repository loading error:', error)
      toast.error('Network error while loading repositories')
    } finally {
      setGithubLoading(false)
    }
  }

  // Load Branches
  const loadBranches = async (repoName: string) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${githubAuth?.username}/${repoName}/branches`, {
        headers: { 'Authorization': `token ${githubAuth?.token}` }
      })
      
      if (response.ok) {
        const branchData = await response.json()
        const branchNames = branchData.map((b: any) => b.name)
        setBranches(branchNames)
        setSelectedBranch(branchNames.includes('main') ? 'main' : branchNames[0] || 'main')
      }
    } catch (error) {
      toast.error('Failed to load branches')
    }
  }

  // Load Commits
  const loadCommits = async (repoName: string, branch: string) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${githubAuth?.username}/${repoName}/commits?sha=${branch}&per_page=10`, {
        headers: { 'Authorization': `token ${githubAuth?.token}` }
      })
      
      if (response.ok) {
        const commitsData = await response.json()
        setCommits(commitsData)
      }
    } catch (error) {
      toast.error('Failed to load commits')
    }
  }

  // Load Repository Contents for File Tree
  const loadRepositoryContents = async (repoName: string, branch: string, path: string = '') => {
    try {
      const pathParam = path ? `/${path}` : ''
      const url = `https://api.github.com/repos/${githubAuth?.username}/${repoName}/contents${pathParam}?ref=${branch}`
      
      console.log(`Loading contents for path: "${path}" from ${url}`)
      
      const response = await fetch(url, {
        headers: { 
          'Authorization': `token ${githubAuth?.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      
      if (response.ok) {
        const contents = await response.json()
        console.log(`Loaded ${contents.length} items for path "${path}"`)
        
        // Ensure contents is an array
        const contentsArray = Array.isArray(contents) ? contents : [contents]
        
        if (path === '') {
          // Root level contents - only show folders and files at root level
          setRepoContents(contentsArray)
          // Clear folder contents and expanded state when loading root
          setFolderContents({})
          setExpandedFolders(new Set())
          console.log('Loaded root contents:', contentsArray.map(item => `${item.name} (${item.type})`))
        } else {
          // Nested folder contents
          setFolderContents(prev => ({
            ...prev,
            [path]: contentsArray
          }))
          console.log(`Stored contents for folder "${path}":`, contentsArray.map(item => `${item.name} (${item.type})`))
        }
        
        return contentsArray
      } else {
        console.error(`Failed to load contents for path "${path}":`, response.status)
        toast.error(`Failed to load repository contents: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to load repository contents:', error)
      toast.error('Failed to load repository contents')
    }
    return []
  }

  // Toggle repository expansion
  const toggleRepositoryExpansion = async () => {
    if (!selectedRepo) return
    
    if (!repoExpanded) {
      // Expand repository - load root contents
      setRepoExpanded(true)
      setLoadingFolder('root')
      try {
        await loadRepositoryContents(selectedRepo, selectedBranch)
      } finally {
        setLoadingFolder('')
      }
    } else {
      // Collapse repository
      setRepoExpanded(false)
      setRepoContents([])
      setFolderContents({})
      setExpandedFolders(new Set())
      setOpenFile(null)
    }
  }

  // Toggle folder expansion
  const toggleFolder = async (folderPath: string) => {
    const newExpanded = new Set(expandedFolders)
    
    if (newExpanded.has(folderPath)) {
      // Collapse folder
      newExpanded.delete(folderPath)
      console.log(`Collapsed folder: ${folderPath}`)
    } else {
      // Expand folder
      newExpanded.add(folderPath)
      console.log(`Expanding folder: ${folderPath}`)
      
      // Load folder contents if not already loaded
      if (!folderContents[folderPath]) {
        setLoadingFolder(folderPath)
        try {
          await loadRepositoryContents(selectedRepo, selectedBranch, folderPath)
          console.log(`Loaded contents for folder: ${folderPath}`)
        } catch (error) {
          console.error(`Failed to load folder contents: ${folderPath}`, error)
        } finally {
          setLoadingFolder('')
        }
      }
    }
    
    setExpandedFolders(newExpanded)
  }

  // Open file content
  const openFileContent = async (file: any) => {
    if (file.type !== 'file') return
    
    setLoadingFile(file.path)
    
    try {
      const response = await fetch(file.download_url)
      if (response.ok) {
        const content = await response.text()
        setOpenFile({
          name: file.name,
          content: content,
          path: file.path
        })
      }
    } catch (error) {
      console.error('Failed to load file content:', error)
      toast.error('Failed to load file content')
    } finally {
      setLoadingFile('')
    }
  }

  // Get file icon based on extension
  const getFileIcon = (fileName: string, isFolder: boolean = false) => {
    if (isFolder) {
      return <Folder className="w-4 h-4 text-blue-500" />
    }
    
    const ext = fileName.toLowerCase().split('.').pop()
    const iconProps = { className: "w-4 h-4" }
    
    switch (ext) {
      case 'py':
        return <FileCode {...iconProps} className="w-4 h-4 text-yellow-600" />
      case 'js':
      case 'ts':
        return <FileCode {...iconProps} className="w-4 h-4 text-yellow-500" />
      case 'md':
        return <File {...iconProps} className="w-4 h-4 text-gray-600" />
      case 'json':
        return <File {...iconProps} className="w-4 h-4 text-green-600" />
      default:
        return <File {...iconProps} className="w-4 h-4 text-gray-500" />
    }
  }

  // Recursive component to render file tree items
  const renderFileTreeItem = (item: any, depth: number = 0) => {
    const isExpanded = expandedFolders.has(item.path)
    const isLoading = loadingFolder === item.path
    const childItems = folderContents[item.path] || []
    
    return (
      <div key={item.path}>
        <div
          className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-100 cursor-pointer group transition-colors ${
            item.type === 'dir' ? 'hover:bg-blue-50' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (item.type === 'dir') {
              toggleFolder(item.path)
            } else {
              openFileContent(item)
            }
          }}
        >
          <div className="flex items-center space-x-2 flex-1">
            {/* Folder/File Icon and Expansion Arrow */}
            {item.type === 'dir' ? (
              <div className="flex items-center space-x-1">
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <div className="flex items-center">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                    {isExpanded ? (
                      <FolderOpen className="w-4 h-4 text-blue-500 ml-1" />
                    ) : (
                      <Folder className="w-4 h-4 text-blue-500 ml-1" />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <span className="w-4 h-4"></span> {/* Spacer for alignment */}
                {getFileIcon(item.name)}
              </div>
            )}
            
            {/* File/Folder Name */}
            <span className={`text-sm group-hover:text-gray-900 flex-1 ${
              item.type === 'dir' ? 'text-gray-800 font-medium' : 'text-gray-700'
            }`}>
              {item.name}
            </span>
            
            {/* Loading indicator for files */}
            {loadingFile === item.path && item.type === 'file' && (
              <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
            )}
            
            {/* Hover indicators */}
            {item.type === 'file' && (
              <Eye className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
            {item.type === 'dir' && !isLoading && (
              <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {isExpanded ? 'Collapse' : 'Expand'}
              </span>
            )}
          </div>
        </div>
        
        {/* Render child items if folder is expanded */}
        {item.type === 'dir' && isExpanded && childItems.length > 0 && (
          <div>
            {childItems
              .sort((a, b) => {
                // Folders first, then files
                if (a.type === 'dir' && b.type === 'file') return -1
                if (a.type === 'file' && b.type === 'dir') return 1
                return a.name.localeCompare(b.name)
              })
              .map((childItem) => renderFileTreeItem(childItem, depth + 1))
            }
          </div>
        )}
      </div>
    )
  }

  // AI Code Review Function
  const performAiCodeReview = async () => {
    if (!openFile) {
      toast.error('No file selected for review')
      return
    }

    setLoadingAiReview(true)
    setAiCodeReview(null)
    
    try {
      const analysisPrompt = `
You are an advanced code analysis AI. The following input will be a codebase.
Perform all tasks listed below on top of the given code. Provide structured,
clear, and actionable results.

=== TASKS TO PERFORM ===

1. CODE UNDERSTANDING & DOCUMENTATION
   - Summarize the project structure, key modules, and workflows.
   - Explain the purpose of major files and directories.
   - Generate or improve documentation (README, inline comments, API docs).

2. CODE QUALITY REVIEW & REFACTORING
   - Identify code smells, anti-patterns, and readability issues.
   - Suggest improvements with optional refactored code snippets.
   - Highlight unnecessary complexity and propose cleaner alternatives.

3. BUG, ERROR & SECURITY ANALYSIS
   - Detect logical issues, risky patterns, or runtime bugs.
   - Identify security vulnerabilities or unsafe dependencies.
   - Provide fixes and recommended secure coding adjustments.

4. TEST GENERATION
   - Generate unit tests and integration tests for key functions/modules.
   - Include mocks, stubs, and expected outputs for each test case.

5. ARCHITECTURE & OPTIMIZATION SUGGESTIONS
   - Suggest improvements to architecture and folder structure.
   - Recommend performance and scalability optimizations.
   - Offer modernization or migration paths if beneficial.

=== RESPONSE FORMAT ===
Provide output using clear sections:
- Summary & Documentation
- Code Review
- Bug & Security Findings
- Test Cases
- Architecture & Optimization
- Final Recommendations

Here is the code to analyze:

File: ${openFile.name}
Path: ${openFile.path}
Content:
\`\`\`
${openFile.content}
\`\`\`
`

      const response = await fetch('/api/ai-chat/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: analysisPrompt,
          file_name: openFile.name,
          file_path: openFile.path,
          code_content: openFile.content
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze code')
      }

      const result = await response.json()
      
      // Parse the AI response into structured sections
      const sections = parseAiResponse(result.analysis || result.response || '')
      
      // Save to sessionStorage for persistence
      const reviewKey = `ai_review_${projectId}_${selectedStory}_${openFile.path || openFile.name}`
      const reviewData = {
        ...sections,
        timestamp: new Date().toISOString(),
        fileName: openFile.name,
        filePath: openFile.path,
        isFromCache: false
      }
      sessionStorage.setItem(reviewKey, JSON.stringify(reviewData))
      
      setAiCodeReview(reviewData)
      setActiveReviewTab('documentation')
      
      toast.success('Code analysis completed!')
      
    } catch (error) {
      console.error('AI Code Review Error:', error)
      toast.error('Failed to perform AI code review')
    } finally {
      setLoadingAiReview(false)
    }
  }

  // Load saved AI review from sessionStorage
  const loadSavedAiReview = () => {
    if (!selectedStory || !openFile) return null
    
    try {
      const reviewKey = `ai_review_${projectId}_${selectedStory}_${openFile.path || openFile.name}`
      const savedReview = sessionStorage.getItem(reviewKey)
      
      if (savedReview) {
        const reviewData = JSON.parse(savedReview)
        console.log('Loaded AI review from cache:', reviewKey)
        return { ...reviewData, isFromCache: true }
      }
    } catch (error) {
      console.error('Error loading saved AI review:', error)
    }
    
    return null
  }

  // Load AI review when file is opened
  useEffect(() => {
    if (openFile && selectedStory) {
      const savedReview = loadSavedAiReview()
      if (savedReview) {
        setAiCodeReview(savedReview)
        setActiveReviewTab('documentation')
      }
    }
  }, [openFile, selectedStory])

  // Parse AI response into structured sections
  const parseAiResponse = (response: string) => {
    const sections = {
      documentation: '',
      quality: '',
      bugs: '',
      tests: '',
      architecture: '',
      recommendations: ''
    }

    // Split by common section headers
    const lines = response.split('\n')
    let currentSection = ''
    let content = []

    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      
      if (lowerLine.includes('summary') && lowerLine.includes('documentation')) {
        currentSection = 'documentation'
        content = []
      } else if (lowerLine.includes('code review') || lowerLine.includes('quality')) {
        currentSection = 'quality'
        content = []
      } else if (lowerLine.includes('bug') || lowerLine.includes('security')) {
        currentSection = 'bugs'
        content = []
      } else if (lowerLine.includes('test')) {
        currentSection = 'tests'
        content = []
      } else if (lowerLine.includes('architecture') || lowerLine.includes('optimization')) {
        currentSection = 'architecture'
        content = []
      } else if (lowerLine.includes('recommendation') || lowerLine.includes('final')) {
        currentSection = 'recommendations'
        content = []
      } else if (currentSection) {
        content.push(line)
      }

      if (currentSection && sections[currentSection as keyof typeof sections] !== undefined) {
        sections[currentSection as keyof typeof sections] = content.join('\n')
      }
    }

    // If parsing failed, put everything in documentation section
    if (!sections.documentation && !sections.quality && !sections.bugs && !sections.tests && !sections.architecture) {
      sections.documentation = response
    }

    return sections
  }

  // Push Code to Repository
  const pushToGitHub = async () => {
    if (!selectedRepo || !githubAuth) {
      toast.error('Please select a repository first')
      return
    }

    // Get deliverables to push
    let filesToPush: any[] = []
    
    // Check if we have current deliverable (user story based)
    if (currentDeliverable?.code) {
      filesToPush = currentDeliverable.code
    } else {
      // Check if we have repository-based deliverables
      const repoKey = `repo_${selectedRepo}_${selectedBranch}`
      if (deliverables[repoKey]?.code) {
        filesToPush = deliverables[repoKey].code
      }
    }

    if (filesToPush.length === 0) {
      toast.error('No code files to push. Please generate deliverables or pull code first.')
      return
    }

    try {
      setGithubLoading(true)
      toast(`Pushing ${filesToPush.length} files to ${selectedRepo}...`, { icon: '⬆️' })
      
      let successCount = 0
      let errorCount = 0
      
      // Create/Update files in the repository
      for (const file of filesToPush) {
        try {
          const content = btoa(unescape(encodeURIComponent(file.content))) // Base64 encode
          
          // Check if file exists to get SHA
          let sha = undefined
          try {
            const existingFile = await fetch(`https://api.github.com/repos/${githubAuth.username}/${selectedRepo}/contents/${file.file}?ref=${selectedBranch}`, {
              headers: { 
                'Authorization': `token ${githubAuth.token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            })
            
            if (existingFile.ok) {
              const existingData = await existingFile.json()
              sha = existingData.sha
              console.log(`Found existing file ${file.file} with SHA: ${sha}`)
            }
          } catch (e) {
            console.log(`File ${file.file} doesn't exist, will create new`)
          }

          const updateData = {
            message: `${sha ? 'Update' : 'Create'} ${file.file} - TAO SDLC ${new Date().toISOString()}`,
            content,
            branch: selectedBranch,
            ...(sha && { sha })
          }

          const response = await fetch(`https://api.github.com/repos/${githubAuth.username}/${selectedRepo}/contents/${file.file}`, {
            method: 'PUT',
            headers: {
              'Authorization': `token ${githubAuth.token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(updateData)
          })

          if (response.ok) {
            const result = await response.json()
            console.log(`Successfully ${sha ? 'updated' : 'created'} ${file.file}`)
            successCount++
          } else {
            const error = await response.json()
            console.error(`Failed to push ${file.file}:`, error)
            errorCount++
          }
        } catch (fileError) {
          console.error(`Error pushing ${file.file}:`, fileError)
          errorCount++
        }
      }

      // Show results
      if (successCount > 0 && errorCount === 0) {
        toast.success(`✅ Successfully pushed ${successCount} files to ${selectedRepo}!`)
      } else if (successCount > 0 && errorCount > 0) {
        toast(`⚠️ Pushed ${successCount} files, failed ${errorCount} files to ${selectedRepo}`, { icon: '⚠️' })
      } else {
        toast.error(`❌ Failed to push files to ${selectedRepo}`)
      }

      // Reload commits to show the latest changes
      if (successCount > 0) {
        await loadCommits(selectedRepo, selectedBranch)
      }

    } catch (error) {
      console.error('Push error:', error)
      toast.error(`Failed to push to ${selectedRepo}: ${(error as Error).message}`)
    } finally {
      setGithubLoading(false)
    }
  }

  // Pull from Repository
  const pullFromGitHub = async () => {
    if (!selectedRepo || !githubAuth) {
      toast.error('Please select a repository first')
      return
    }

    try {
      setGithubLoading(true)
      toast(`Pulling code from ${selectedRepo}...`, { icon: '⬇️' })
      
      // Get repository information first
      const repoInfoResponse = await fetch(`https://api.github.com/repos/${githubAuth.username}/${selectedRepo}`, {
        headers: {
          'Authorization': `token ${githubAuth.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!repoInfoResponse.ok) {
        throw new Error(`Failed to fetch repository info: ${repoInfoResponse.status}`)
      }

      const repoInfo = await repoInfoResponse.json()
      console.log('Repository info:', repoInfo)

      // Get the repository contents from the selected branch
      const contentsUrl = `https://api.github.com/repos/${githubAuth.username}/${selectedRepo}/contents?ref=${selectedBranch}`
      const response = await fetch(contentsUrl, {
        headers: {
          'Authorization': `token ${githubAuth.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch repository contents: ${response.status}`)
      }

      const contents = await response.json()
      console.log(`Repository contents from ${selectedRepo} (${selectedBranch}):`, contents)

      // Filter for code files and common project files
      const codeExtensions = ['.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.html', '.css', '.scss', '.sql', '.md']
      const codeFiles = contents.filter((item: any) => 
        item.type === 'file' && 
        (codeExtensions.some(ext => item.name.toLowerCase().endsWith(ext)) || 
         ['README.md', 'package.json', 'requirements.txt', 'Dockerfile', '.gitignore'].includes(item.name))
      )

      console.log(`Found ${codeFiles.length} files in ${selectedRepo}:`, codeFiles.map((f: any) => f.name))

      if (codeFiles.length === 0) {
        toast(`No code files found in ${selectedRepo}`, { icon: '📝' })
        return
      }

      // Fetch content of each code file
      const pulledCodeFiles = []
      let fetchedCount = 0
      
      for (const file of codeFiles.slice(0, 20) as any[]) { // Limit to first 20 files to avoid rate limits
        try {
          const fileResponse = await fetch(file.download_url)
          if (fileResponse.ok) {
            const content = await fileResponse.text()
            pulledCodeFiles.push({
              file: file.name,
              content: content,
              language: getLanguageFromExtension(file.name),
              size: file.size,
              path: file.path
            })
            fetchedCount++
            console.log(`Fetched: ${file.name} (${file.size} bytes)`)
          }
        } catch (e) {
          console.error(`Failed to fetch ${file.name}:`, e)
        }
      }

      if (pulledCodeFiles.length === 0) {
        toast.error(`Failed to fetch any files from ${selectedRepo}`)
        return
      }

      // Create a repository-specific deliverable entry
      const currentTime = new Date().toISOString()
      const repoDeliverable = {
        code: pulledCodeFiles,
        tests: [],
        api: { endpoints: [] },
        readme: pulledCodeFiles.find((f: any) => f.file.toLowerCase().includes('readme'))?.content || '',
        repository_info: {
          name: selectedRepo,
          full_name: repoInfo.full_name,
          description: repoInfo.description,
          language: repoInfo.language,
          branch: selectedBranch,
          pulled_at: currentTime,
          stars: repoInfo.stargazers_count,
          forks: repoInfo.forks_count,
          url: repoInfo.html_url
        }
      }

      // Update deliverables with repository-specific key
      const repoKey = `repo_${selectedRepo}_${selectedBranch}`
      const updatedDeliverables = { ...deliverables }
      updatedDeliverables[repoKey] = repoDeliverable

      // Save to backend (optional, works even if backend is not available)
      try {
        const saveResponse = await fetch(`http://localhost:8000/api/projects/${projectId}/phases/5/deliverables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            story_id: repoKey,
            deliverables: repoDeliverable
          })
        })

        if (saveResponse.ok) {
          setDeliverables(updatedDeliverables)
          toast.success(`✅ Successfully pulled ${pulledCodeFiles.length} files from ${selectedRepo}!`)
        } else {
          setDeliverables(updatedDeliverables)
          toast.success(`✅ Pulled ${pulledCodeFiles.length} files from ${selectedRepo} (local storage)`)
        }
      } catch (saveError) {
        setDeliverables(updatedDeliverables)
        toast.success(`✅ Pulled ${pulledCodeFiles.length} files from ${selectedRepo} (local storage)`)
      }

      // Show detailed summary
      console.log(`\n=== PULL SUMMARY for ${selectedRepo} ===`)
      console.log(`Repository: ${repoInfo.full_name}`)
      console.log(`Description: ${repoInfo.description}`)
      console.log(`Language: ${repoInfo.language}`)
      console.log(`Branch: ${selectedBranch}`)
      console.log(`Files pulled: ${pulledCodeFiles.length}`)
      console.log('Files:', pulledCodeFiles.map(f => `${f.file} (${f.language})`))

    } catch (error) {
      console.error('Pull error:', error)
      toast.error(`Failed to pull from ${selectedRepo}: ${(error as Error).message}`)
    } finally {
      setGithubLoading(false)
    }
  }

  // Helper function to determine language from file extension
  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop()
    const languageMap: { [key: string]: string } = {
      'py': 'python',
      'js': 'javascript', 
      'ts': 'typescript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin'
    }
    return languageMap[ext || ''] || 'text'
  }

  return (
    <div>
      <div className="mb-6">
        {projectName && (
          <div className="mb-1">
            <span className="text-sm font-medium text-gray-500">Project:</span>
            <h2 className="text-3xl font-bold text-primary-600">{projectName}</h2>
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900">Phase 5: Development</h1>
        <p className="text-gray-500 mt-1">User story–driven AI-assisted implementation</p>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-gray-600">Epic</label>
            <select className="input mt-1 w-full" value={selectedEpic} onChange={e => setSelectedEpic(e.target.value)}>
              <option value="">All epics</option>
              {epics.map((e: any) => (
                <option key={e.id} value={e.id}>{e.id}: {e.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">User Story</label>
            <select className="input mt-1 w-full" value={selectedStory} onChange={e => setSelectedStory(e.target.value)}>
              <option value="">Select story</option>
              {stories.map((s: any) => (
                <option key={s.id} value={s.id}>{s.id}: {s.title}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Mapped Components</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {components.map((c: any) => (
                <label key={c.name} className={`text-xs px-2 py-1 rounded border cursor-pointer ${selectedComponents.includes(c.name) ? 'bg-primary-100 border-primary-300' : 'bg-white border-gray-300'}`}>
                  <input type="checkbox" className="mr-1" checked={selectedComponents.includes(c.name)} onChange={() => {
                    setSelectedComponents(prev => prev.includes(c.name) ? prev.filter(n => n !== c.name) : [...prev, c.name])
                  }} />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="text-sm text-gray-600">Language</label>
            <select className="input mt-1 w-full" value={preferences.language} onChange={e => setPreferences({ ...preferences, language: e.target.value })}>
              <option value="python">Python (FastAPI)</option>
              <option value="nodejs">Node.js (Express)</option>
              <option value="typescript">TypeScript (NestJS)</option>
              <option value="java">Java (Spring Boot)</option>
              <option value="go">Go (Gin)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Tests</label>
            <select className="input mt-1 w-full" value={preferences.tests} onChange={e => setPreferences({ ...preferences, tests: e.target.value })}>
              <option value="pytest">pytest</option>
              <option value="jest">Jest</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Auth</label>
            <select className="input mt-1 w-full" value={preferences.auth} onChange={e => setPreferences({ ...preferences, auth: e.target.value })}>
              <option value="jwt">JWT</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            {currentDeliverable?.code && currentDeliverable.code.length > 0 ? (
              <>
                <button 
                  disabled 
                  className="btn-primary w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-600 cursor-default"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>✓ Code Generated ({currentDeliverable.code.length} files)</span>
                </button>
                <button 
                  onClick={handleGenerate} 
                  disabled={generating || !selectedStory}
                  className="btn-secondary px-4 flex items-center justify-center space-x-1 disabled:opacity-50"
                  title="Regenerate code for this story"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Regenerating…</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Regenerate</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button 
                onClick={handleGenerate} 
                disabled={generating || !selectedStory} 
                className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating…</span>
                  </>
                ) : (
                  <>
                    <FileCode className="w-4 h-4" />
                    <span>Generate Deliverables</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Output Tabs */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold">Generated Deliverables</h3>
            {currentDeliverable?.code && currentDeliverable.code.length > 0 ? (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Persisted</span>
              </span>
            ) : (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                Not generated
              </span>
            )}
            {currentDeliverable && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                {preferences.language === 'nodejs' ? 'Node.js' : 
                 preferences.language === 'typescript' ? 'TypeScript' :
                 preferences.language === 'java' ? 'Java' :
                 preferences.language === 'go' ? 'Go' : 'Python'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* Repository Information Display */}
            {(() => {
              const repoKey = `repo_${selectedRepo}_${selectedBranch}`
              const repoDeliverable = deliverables[repoKey]
              const repoInfo = repoDeliverable?.repository_info
              
              if (repoInfo) {
                return (
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-lg">
                      <Github className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-800 font-medium">{repoInfo.name}</span>
                      <span className="text-blue-600">({repoInfo.branch})</span>
                    </div>
                    {repoInfo.language && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {repoInfo.language}
                      </span>
                    )}
                    {repoInfo.pulled_at && (
                      <span className="text-xs text-gray-500">
                        Pulled: {new Date(repoInfo.pulled_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )
              }
              
              if (currentStory) {
                return (
                  <div className="text-sm text-gray-600">
                    Story: <span className="font-medium">{currentStory.id}: {currentStory.title}</span>
                  </div>
                )
              }
              
              return null
            })()}
            {currentFile && (
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-500">
                  Active: <span className="font-medium">{currentFile}</span>
                  {selectedText && <span className="ml-2 text-blue-600">({selectedText.length} chars selected)</span>}
                </div>
                <button
                  onClick={handleCodeModify}
                  className="text-xs px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 flex items-center space-x-1"
                  title="Modify selected code or file"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Code Modify</span>
                </button>
              </div>
            )}
            {currentDeliverable && (
              <button
                onClick={handleRegenerateWithAI}
                disabled={aiEnhancing}
                className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700 flex items-center space-x-1 disabled:opacity-50"
              >
                {aiEnhancing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Regenerate with AI</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {!currentDeliverable ? (
          <div className="text-center py-8 text-gray-500 text-sm">Select a user story and click Generate to see code, tests, API and README here.</div>
        ) : (
          <>
            <div className="flex border-b mb-4">
              {(['code','tests','api','readme'] as const).map(tab => (
                <button 
                  key={tab} 
                  className={`px-4 py-2 text-sm -mb-px border-b-2 ${activeTab===tab? 'border-primary-600 text-primary-700':'border-transparent text-gray-600'}`} 
                  onClick={() => {
                    setActiveTab(tab)
                    // Refresh data when switching to code tab to ensure latest content
                    if (tab === 'code') {
                      setTimeout(() => load(), 100)
                    }
                  }}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {activeTab === 'code' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Generated Code Files</h3>
                  <button
                    onClick={() => load()}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    title="Refresh to see latest changes"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>
                {currentDeliverable.code?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No code files generated yet</div>
                )}
                {currentDeliverable.code?.map((f, idx) => (
                  <div
                    key={`${idx}-${f.file}-${forceUpdate}`}
                    className="border rounded overflow-hidden"
                    onClick={() => {
                      try {
                        sessionStorage.setItem('phase5_active_file', f.file)
                        // Also immediately update the state to avoid delays
                        setCurrentFile(f.file)
                      } catch {}
                    }}
                  >
                    <div className="bg-gray-100 px-3 py-2 border-b flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <FileCode className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <span className="text-xs font-mono truncate" title={f.file}>{f.file}</span>
                        {f.language && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded flex-shrink-0">{f.language}</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => copyToClipboard(f.content)}
                          className="text-xs px-2 py-1 hover:bg-gray-200 rounded flex items-center space-x-1"
                          title="Copy code"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <button 
                          onClick={() => downloadFile(f.file, f.content)}
                          className="text-xs px-2 py-1 hover:bg-gray-200 rounded flex items-center space-x-1"
                          title="Download file"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() => {
                            // Force refresh this specific file
                            load()
                            toast.success('Content refreshed')
                          }}
                          className="text-xs px-2 py-1 hover:bg-gray-200 rounded flex items-center space-x-1"
                          title="Refresh this file"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Refresh</span>
                        </button>
                      </div>
                    </div>
                    <pre
                      key={`${f.file}-content-${forceUpdate}`}
                      className="bg-gray-900 text-gray-100 p-4 text-xs overflow-x-auto max-h-96 hover:max-h-full transition-all"
                      onMouseUp={() => {
                        try {
                          const sel = window.getSelection?.()
                          const text = sel ? sel.toString() : ''
                          if (text && text.trim().length > 0) {
                            sessionStorage.setItem('phase5_selected_text', text)
                            setSelectedText(text)
                          } else {
                            sessionStorage.removeItem('phase5_selected_text')
                            setSelectedText('')
                          }
                          // Always keep active file in sync when selecting
                          sessionStorage.setItem('phase5_active_file', f.file)
                          setCurrentFile(f.file)
                        } catch {}
                      }}
                    >
                      <code key={`${f.file}-code-${forceUpdate}-${f.content.length}`}>{f.content}</code>
                    </pre>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'tests' && (
              <div className="space-y-3">
                {currentDeliverable.tests?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No test files generated yet</div>
                )}
                {currentDeliverable.tests?.map((f, idx) => (
                  <div key={idx} className="border rounded overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 text-sm font-mono border-b flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileCode className="w-4 h-4 text-green-600" />
                        <span>{f.file}</span>
                        {f.language && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{f.language}</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => copyToClipboard(f.content)}
                          className="text-xs px-2 py-1 hover:bg-gray-200 rounded flex items-center space-x-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <button 
                          onClick={() => downloadFile(f.file, f.content)}
                          className="text-xs px-2 py-1 hover:bg-gray-200 rounded flex items-center space-x-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                        <button 
                          className="text-xs px-2 py-1 bg-green-600 text-white hover:bg-green-700 rounded flex items-center space-x-1"
                          title="Run tests (coming soon)"
                        >
                          <Play className="w-3 h-3" />
                          <span>Run</span>
                        </button>
                      </div>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 text-xs overflow-x-auto max-h-96 hover:max-h-full transition-all">
                      <code>{f.content}</code>
                    </pre>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'api' && (
              <div className="space-y-2">
                {!currentDeliverable.api?.endpoints || currentDeliverable.api.endpoints.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 bg-gray-50 rounded border">
                    <span className="text-sm">N/A - No API component selected for this story</span>
                  </div>
                ) : (
                  currentDeliverable.api.endpoints.map((e, idx) => (
                    <div key={idx} className="p-3 bg-white rounded border">
                      <span className="font-mono text-sm mr-2"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">{e.method}</span> {e.path}</span>
                      {e.description && <p className="text-sm text-gray-600 mt-1">{e.description}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
            {activeTab === 'readme' && (
              <div className="prose max-w-none">
                <pre className="bg-gray-50 p-3 border rounded text-sm whitespace-pre-wrap">{currentDeliverable.readme}</pre>
              </div>
            )}
          </>
        )}
      </div>

      {/* Epic and Story Selection for GitHub Push */}
      <div className="card mt-6">
        <EpicStorySelector
          epics={epics}
          stories={stories}
          selectedEpic={selectedEpic}
          onEpicChange={(e) => setSelectedEpic(String(e))}
          selectedStory={selectedStory}
          onStoryChange={(s) => setSelectedStory(String(s))}
        />
      </div>

      {/* GitHub Operations Section - Push/Pull/Create */}
      {githubAuth && selectedEpic && selectedStory && (
        <div className="card mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Github className="w-5 h-5 text-blue-600" />
            <span>Push/Pull Code & Create Repository</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Push Code Section */}
            <div className="p-4 bg-white border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-700 mb-3 flex items-center space-x-2">
                <ArrowUp className="w-4 h-4" />
                <span>Push Code to GitHub</span>
              </h4>
              
              {!githubAuth && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3 space-y-2">
                  <p className="text-sm text-yellow-800">
                    ⚠️ GitHub account not connected
                  </p>
                  <button
                    onClick={() => setShowGithubAuth(true)}
                    className="w-full px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 font-medium"
                  >
                    <Github className="w-4 h-4 inline mr-2" />
                    Connect GitHub Account
                  </button>
                  <p className="text-xs text-yellow-700">
                    You can also connect in the <strong>GitHub Integration</strong> section below
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Select or Create Repository</label>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => loadRepositories()}
                        disabled={!currentDeliverable || !githubAuth}
                        className="text-xs text-green-600 hover:text-green-800 flex items-center space-x-1 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3`} />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={() => setShowPushFilters(!showPushFilters)}
                        disabled={!currentDeliverable || !githubAuth}
                        className="text-xs text-green-600 hover:text-green-800 flex items-center space-x-1 disabled:opacity-50"
                      >
                        <Filter className="w-3 h-3" />
                        <span>Filters</span>
                      </button>
                    </div>
                  </div>
                  <select
                    value={selectedRepo}
                    onChange={(e) => {
                      setSelectedRepo(e.target.value)
                      if (e.target.value && e.target.value !== 'new') loadBranches(e.target.value)
                    }}
                    disabled={!currentDeliverable || !githubAuth}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Repository</option>
                    {repositories.map((repo: any) => (
                      <option key={repo.id} value={repo.name}>
                        {repo.name}
                      </option>
                    ))}
                    <option value="new">+ Create New Repository</option>
                  </select>
                </div>

                {selectedRepo === 'new' && currentDeliverable && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">New Repository Name</label>
                    <input
                      type="text"
                      placeholder={`${currentEpic?.title}-${currentStory?.title}`.replace(/\s+/g, '-').toLowerCase()}
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Select or Create Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value)
                    }}
                    disabled={!selectedRepo || !currentDeliverable || !githubAuth}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch: string) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                    <option value="new">+ Create New Branch</option>
                  </select>
                </div>

                {selectedBranch === 'new' && currentDeliverable && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">New Branch Name</label>
                    <input
                      type="text"
                      placeholder={`feature/${currentStory?.title}`.replace(/\s+/g, '-').toLowerCase()}
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}

                {/* Push Filters */}
                {showPushFilters && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Repository Filters</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600">Visibility</label>
                        <select 
                          className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-xs" 
                          value={pushFilters.visibility}
                          onChange={(e) => setPushFilters({...pushFilters, visibility: e.target.value})}
                        >
                          <option value="all">All</option>
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Type</label>
                        <select 
                          className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-xs" 
                          value={pushFilters.type}
                          onChange={(e) => setPushFilters({...pushFilters, type: e.target.value})}
                        >
                          <option value="all">All</option>
                          <option value="owner">Owner</option>
                          <option value="member">Member</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Sort</label>
                        <select 
                          className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-xs" 
                          value={pushFilters.sort}
                          onChange={(e) => setPushFilters({...pushFilters, sort: e.target.value})}
                        >
                          <option value="updated">Updated</option>
                          <option value="created">Created</option>
                          <option value="pushed">Pushed</option>
                          <option value="full_name">Name</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Direction</label>
                        <select 
                          className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-xs" 
                          value={pushFilters.direction}
                          onChange={(e) => setPushFilters({...pushFilters, direction: e.target.value})}
                        >
                          <option value="desc">Descending</option>
                          <option value="asc">Ascending</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={async () => {
                    try {
                      // Check if GitHub is connected
                      if (!githubAuth || !githubAuth.token) {
                        setPushStatus({ type: 'error', message: '❌ Not connected to GitHub. Click the "Connect GitHub Account" button above.' })
                        toast.error('GitHub not connected')
                        return
                      }

                      // Verify token is still valid by making a test API call
                      console.log('Verifying GitHub token...')
                      const authCheckResponse = await fetch('https://api.github.com/user', {
                        headers: { 'Authorization': `token ${githubAuth.token}` }
                      })

                      if (authCheckResponse.status === 401) {
                        console.error('GitHub token is invalid or expired')
                        setPushStatus({ type: 'error', message: '❌ GitHub token expired. Please reconnect your account.' })
                        setGithubAuth(null)
                        sessionStorage.removeItem('github_auth')
                        toast.error('GitHub token expired - please reconnect')
                        return
                      }

                      if (!authCheckResponse.ok) {
                        console.error('GitHub auth check failed:', authCheckResponse.status)
                        setPushStatus({ type: 'error', message: `❌ GitHub authentication failed (${authCheckResponse.status})` })
                        toast.error('Failed to verify GitHub credentials')
                        return
                      }

                      console.log('GitHub token verified successfully')
                      setGithubLoading(true)
                      setPushStatus({ type: null, message: '' })
                      let repoToUse = selectedRepo
                      let branchToUse = selectedBranch

                      // Create repo if needed
                      if (selectedRepo === 'new') {
                        const createRepoResponse = await api.post(`/github/create-repository/${projectId}`, {
                          repo_name: newRepoName || `${currentEpic?.title}-${currentStory?.title}`.replace(/\s+/g, '-').toLowerCase(),
                          description: `Code for ${currentEpic?.title} - ${currentStory?.title}`,
                          is_private: false,
                          epic_id: selectedEpic,
                          epic_title: currentEpic?.title,
                          story_id: selectedStory,
                          story_title: currentStory?.title
                        })
                        repoToUse = createRepoResponse.data.repo_name
                        setSelectedRepo(repoToUse)
                        setNewRepoName('')
                        setPushStatus({ type: 'success', message: `✅ Repository "${repoToUse}" created!` })
                        toast.success(`✅ Repository "${repoToUse}" created!`)
                        await loadRepositories()
                      }

                      // Create branch if needed
                      if (selectedBranch === 'new') {
                        const createBranchResponse = await api.post(`/github/create-branch/${projectId}`, {
                          owner: githubAuth.username,
                          repo: repoToUse,
                          branch_name: newBranchName || `feature/${currentStory?.title}`.replace(/\s+/g, '-').toLowerCase(),
                          base_branch: 'main',
                          epic_id: selectedEpic,
                          epic_title: currentEpic?.title,
                          story_id: selectedStory,
                          story_title: currentStory?.title
                        })
                        branchToUse = createBranchResponse.data.branch_name
                        setSelectedBranch(branchToUse)
                        setNewBranchName('')
                        setPushStatus({ type: 'success', message: `✅ Branch "${branchToUse}" created!` })
                        toast.success(`✅ Branch "${branchToUse}" created!`)
                        await loadBranches(repoToUse)
                      }

                      // Push code
                      const codeFiles = (currentDeliverable.code || []).map((f: any) => ({
                        file: f.file || f.name || '',
                        content: f.content || ''
                      }))

                      await api.post(`/github/push-code-with-context/${projectId}`, {
                        owner: githubAuth.username,
                        repo: repoToUse,
                        branch: branchToUse,
                        code_files: codeFiles,
                        epic_id: selectedEpic,
                        epic_title: currentEpic?.title,
                        story_id: selectedStory,
                        story_title: currentStory?.title,
                        commit_message: `Add ${currentStory?.title} implementation for ${currentEpic?.title}`
                      })

                      const successMsg = `✅ Successfully pushed ${codeFiles.length} files to ${repoToUse}/${branchToUse}!`
                      setPushStatus({ type: 'success', message: successMsg })
                      toast.success(successMsg)
                      await loadCommits(repoToUse, branchToUse)
                    } catch (error) {
                      console.error('Push error:', error)
                      const errorMsg = `❌ Push failed: ${(error as any).response?.data?.detail || (error as Error).message}`
                      setPushStatus({ type: 'error', message: errorMsg })
                      toast.error(errorMsg)
                    } finally {
                      setGithubLoading(false)
                    }
                  }}
                  disabled={!selectedRepo || !selectedBranch || !currentDeliverable || githubLoading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center space-x-2 font-medium"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>{githubLoading ? 'Pushing...' : 'Push Code'}</span>
                </button>

                {!currentDeliverable && (
                  <p className="text-xs text-gray-500 text-center mt-2">Generate code first to enable Push</p>
                )}
              </div>
            </div>

            {/* Push Status Display Column */}
            <div className="p-4 bg-gradient-to-b from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg flex flex-col justify-center min-h-[300px]">
              {!pushStatus.type && !githubLoading && (
                <div className="text-center">
                  <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-gray-600">Push status messages will appear here</p>
                  <p className="text-xs text-gray-500 mt-1">Select repo & branch, then click Push Code</p>
                </div>
              )}

              {githubLoading && (
                <div className="text-center">
                  <div className="animate-spin inline-block">
                    <RefreshCw className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-green-700 mt-2">Pushing code to GitHub...</p>
                </div>
              )}

              {pushStatus.type === 'success' && (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium break-words">{pushStatus.message}</p>
                  </div>
                  <button
                    onClick={() => setPushStatus({ type: null, message: '' })}
                    className="w-full px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 border border-green-300"
                  >
                    Clear Message
                  </button>
                </div>
              )}

              {pushStatus.type === 'error' && (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <AlertTriangle className="w-12 h-12 text-red-600" />
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium break-words">{pushStatus.message}</p>
                  </div>
                  <button
                    onClick={() => setPushStatus({ type: null, message: '' })}
                    className="w-full px-3 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-300"
                  >
                    Dismiss Error
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {(!githubAuth || !selectedEpic || !selectedStory) && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-800">
          <p className="text-sm">
            {!githubAuth ? '👉 Connect to GitHub first' : '👉 Select an epic and user story to see Push/Pull options'}
          </p>
        </div>
      )}

      {/* GitHub Operations Dialog */}
      {currentDeliverable && (
        <GitHubOperationsDialog
          isOpen={showGitHubOperationsDialog}
          onClose={() => setShowGitHubOperationsDialog(false)}
          projectId={Number(projectId)}
          epicId={String(selectedEpic)}
          epicTitle={currentEpic?.title || 'Unknown'}
          storyId={String(selectedStory)}
          storyTitle={currentStory?.title || 'Unknown'}
          codeFiles={(currentDeliverable.code || []).map((f: any) => ({
            name: f.file || f.name || '',
            content: f.content || ''
          }))}
          onSuccess={() => {
            // Reload data after successful push
            setTimeout(() => load(), 1000)
          }}
        />
      )}

      {/* GitHub Integration Section */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Github className="w-5 h-5 text-gray-800" />
            <h3 className="text-lg font-semibold">GitHub Integration</h3>
            {githubAuth ? (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center space-x-1">
                <Unlock className="w-3 h-3" />
                <span>Connected as {githubAuth.username}</span>
              </span>
            ) : (
              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Not Connected</span>
              </span>
            )}
          </div>
          {/* Only show header button when connected */}
          {githubAuth && (
            <button
              onClick={() => setShowGithubAuth(true)}
              className="btn-primary text-sm"
            >
              <Github className="w-4 h-4 mr-1" />
              Reconnect
            </button>
          )}
        </div>

        {/* Only show connected UI if authenticated */}
        {githubAuth ? (
          <>
            {/* Repository Selection and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-600">Repository</label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => loadRepositories()}
                      disabled={githubLoading}
                      className="text-xs text-green-600 hover:text-green-800 flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${githubLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                    <button
                      onClick={async () => {
                        console.log('=== GitHub Debug Info ===')
                        console.log('GitHub Auth:', githubAuth)
                        console.log('Repositories:', repositories)
                        console.log('Loading state:', githubLoading)
                        
                        if (githubAuth?.token) {
                          try {
                            const response = await fetch('https://api.github.com/user', {
                              headers: { 'Authorization': `token ${githubAuth.token}` }
                            })
                            console.log('Auth test response:', response.status)
                            if (response.ok) {
                              const user = await response.json()
                              console.log('User info:', user.login)
                            }
                          } catch (e) {
                            console.error('Auth test error:', e)
                          }
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Debug
                    </button>
                    <button
                      onClick={() => setShowRepoFilters(!showRepoFilters)}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <Filter className="w-3 h-3" />
                      <span>Filters</span>
                    </button>
                  </div>
                </div>
                <select 
                  className="input w-full" 
                  value={selectedRepo} 
                  onChange={(e) => {
                    setSelectedRepo(e.target.value)
                    if (e.target.value) {
                      loadBranches(e.target.value)
                      loadCommits(e.target.value, selectedBranch)
                      // DON'T automatically load repository contents
                    } else {
                      setRepoContents([])
                      setFolderContents({})
                      setExpandedFolders(new Set())
                      setOpenFile(null)
                    }
                    // Reset repository expansion state
                    setRepoExpanded(false)
                  }}
                  disabled={githubLoading}
                >
                  <option value="">{githubLoading ? 'Loading repositories...' : 'Select Repository'}</option>
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.name}>
                      {repo.name} {repo.private ? '(Private)' : '(Public)'} • {repo.language || 'No language'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-600">Branch</label>
                <select 
                  className="input mt-1 w-full" 
                  value={selectedBranch} 
                  onChange={(e) => {
                    setSelectedBranch(e.target.value)
                    if (selectedRepo) {
                      loadCommits(selectedRepo, e.target.value)
                      // Only reload repository contents if already expanded
                      if (repoExpanded) {
                        loadRepositoryContents(selectedRepo, e.target.value)
                      }
                      setFolderContents({}) // Reset folder contents
                      setExpandedFolders(new Set()) // Reset expanded folders
                      setOpenFile(null) // Clear open file
                    }
                  }}
                >
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end space-x-2">
                <button
                  onClick={pullFromGitHub}
                  disabled={!selectedRepo || githubLoading}
                  className="btn-secondary flex items-center space-x-1 disabled:opacity-50"
                >
                  <ArrowDown className="w-4 h-4" />
                  <span>Pull</span>
                </button>
              </div>
            </div>

            {/* Repository Filters */}
            {showRepoFilters && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Visibility</label>
                    <select 
                      className="input mt-1 w-full text-sm" 
                      value={repoFilters.visibility}
                      onChange={(e) => setRepoFilters({...repoFilters, visibility: e.target.value})}
                    >
                      <option value="all">All</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Type</label>
                    <select 
                      className="input mt-1 w-full text-sm" 
                      value={repoFilters.type}
                      onChange={(e) => setRepoFilters({...repoFilters, type: e.target.value})}
                    >
                      <option value="all">All</option>
                      <option value="owner">Owner</option>
                      <option value="member">Member</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Sort By</label>
                    <select 
                      className="input mt-1 w-full text-sm" 
                      value={repoFilters.sort}
                      onChange={(e) => setRepoFilters({...repoFilters, sort: e.target.value})}
                    >
                      <option value="updated">Last Updated</option>
                      <option value="created">Created</option>
                      <option value="pushed">Last Push</option>
                      <option value="full_name">Name</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Order</label>
                    <select 
                      className="input mt-1 w-full text-sm" 
                      value={repoFilters.direction}
                      onChange={(e) => setRepoFilters({...repoFilters, direction: e.target.value})}
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => loadRepositories()}
                    className="btn-primary text-xs"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}

            {/* Recent Commits */}
            {commits.length > 0 && selectedRepo && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Commits ({selectedBranch})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {commits.slice(0, 5).map((commit) => (
                    <div key={commit.sha} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {commit.commit.message.split('\n')[0]}
                        </p>
                        <p className="text-xs text-gray-500">
                          {commit.commit.author.name} • {new Date(commit.commit.author.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        {commit.sha.substring(0, 7)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repository File Tree */}
            {selectedRepo && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                    <Folder className="w-4 h-4" />
                    <span>Repository Files ({selectedBranch})</span>
                  </h4>
                </div>
                
                {/* Repository Tree - Interactive */}
                <div className="border rounded-lg bg-white shadow-sm">
                  <div className="max-h-96 overflow-y-auto">
                    {/* Repository Root */}
                    <div className="py-1">
                      <div
                        className="flex items-center space-x-2 p-3 rounded hover:bg-blue-50 cursor-pointer group transition-colors"
                        onClick={toggleRepositoryExpansion}
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          {/* Repository Icon and Expansion Arrow */}
                          <div className="flex items-center space-x-1">
                            {githubLoading || loadingFolder === 'root' ? (
                              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                            ) : (
                              <div className="flex items-center">
                                {repoExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-600" />
                                )}
                                <GitBranch className="w-4 h-4 text-blue-500 ml-1" />
                              </div>
                            )}
                          </div>
                          
                          {/* Repository Name */}
                          <span className="text-sm text-gray-800 font-medium flex-1">
                            {selectedRepo}
                          </span>
                          
                          {/* Hover indicator */}
                          <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            {repoExpanded ? 'Collapse' : 'Expand'}
                          </span>
                        </div>
                      </div>

                      {/* Repository Contents - shown when expanded */}
                      {repoExpanded && (
                        <div className="ml-6">
                          {repoContents.length > 0 ? (
                            <div>
                              <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-600 font-medium">
                                📁 {repoContents.filter(item => item.type === 'dir').length} folders, 
                                📄 {repoContents.filter(item => item.type === 'file').length} files
                              </div>
                              {repoContents
                                .sort((a, b) => {
                                  // Folders first, then files
                                  if (a.type === 'dir' && b.type === 'file') return -1
                                  if (a.type === 'file' && b.type === 'dir') return 1
                                  return a.name.localeCompare(b.name)
                                })
                                .map((item) => renderFileTreeItem(item, 0))
                              }
                            </div>
                          ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              {githubLoading || loadingFolder === 'root' ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Loading repository contents...</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center space-y-2">
                                  <Folder className="w-8 h-8 text-gray-300" />
                                  <span>No files found in this repository</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* File Content Display */}
                {openFile && (
                  <div className="mt-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(openFile.name)}
                        <span className="text-sm font-medium text-gray-900">{openFile.name}</span>
                        <span className="text-xs text-gray-500">({openFile.path})</span>
                      </div>
                      <button
                        onClick={() => setOpenFile(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm bg-gray-50 p-3 rounded border overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {openFile.content}
                      </pre>
                      
                      {/* AI Code Review Button */}
                      <div className="mt-4 flex justify-center gap-2">
                        <button
                          onClick={performAiCodeReview}
                          disabled={loadingAiReview}
                          className="btn-primary flex items-center space-x-2 px-6 py-2"
                        >
                          {loadingAiReview ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Analyzing Code...</span>
                            </>
                          ) : (
                            <>
                              <FileCode className="w-4 h-4" />
                              <span>Perform AI Code Review</span>
                            </>
                          )}
                        </button>
                        
                        {aiCodeReview && aiCodeReview.isFromCache && (
                          <button
                            onClick={() => {
                              const reviewKey = `ai_review_${projectId}_${selectedStory}_${openFile.path || openFile.name}`
                              sessionStorage.removeItem(reviewKey)
                              setAiCodeReview(null)
                              toast.success('Cache cleared. Click "Perform AI Code Review" to regenerate.')
                            }}
                            className="btn-secondary flex items-center space-x-2 px-4 py-2 text-xs"
                            title="Clear cached review and start fresh"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Clear Cache</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Code Review Results or Empty State */}
                {aiCodeReview ? (
                  <div className="mt-6 border rounded-lg bg-white shadow-sm">
                    <div className="border-b px-4 py-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                          <FileCode className="w-5 h-5 text-blue-500" />
                          <span>AI Code Review Results</span>
                        </h3>
                        {aiCodeReview.isFromCache && aiCodeReview.timestamp && (
                          <div className="flex items-center space-x-2 text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                            <span>📦 Cached</span>
                            <span className="text-blue-600">
                              {new Date(aiCodeReview.timestamp).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Review Tabs */}
                    <div className="border-b">
                      <div className="flex overflow-x-auto">
                        {[
                          { key: 'documentation', label: 'Documentation', icon: FileText },
                          { key: 'quality', label: 'Code Quality', icon: Search },
                          { key: 'bugs', label: 'Bug & Security', icon: AlertTriangle },
                          { key: 'tests', label: 'Test Cases', icon: CheckCircle },
                          { key: 'architecture', label: 'Architecture', icon: Layers }
                        ].map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            onClick={() => setActiveReviewTab(key as any)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap flex items-center space-x-2 ${
                              activeReviewTab === key
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Review Content */}
                    <div className="p-4">
                      <div className="max-h-96 overflow-y-auto">
                        <div className="prose prose-sm max-w-none">
                          {activeReviewTab === 'documentation' && (
                            <div>
                              <h4 className="text-md font-semibold text-gray-900 mb-3">Summary & Documentation</h4>
                              <pre className="text-sm bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                                {aiCodeReview.documentation || 'No documentation analysis available.'}
                              </pre>
                            </div>
                          )}
                          
                          {activeReviewTab === 'quality' && (
                            <div>
                              <h4 className="text-md font-semibold text-gray-900 mb-3">Code Quality Review</h4>
                              <pre className="text-sm bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                                {aiCodeReview.quality || 'No code quality analysis available.'}
                              </pre>
                            </div>
                          )}
                          
                          {activeReviewTab === 'bugs' && (
                            <div>
                              <h4 className="text-md font-semibold text-gray-900 mb-3">Bug & Security Findings</h4>
                              <pre className="text-sm bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                                {aiCodeReview.bugs || 'No bug or security issues detected.'}
                              </pre>
                            </div>
                          )}
                          
                          {activeReviewTab === 'tests' && (
                            <div>
                              <h4 className="text-md font-semibold text-gray-900 mb-3">Test Generation</h4>
                              <pre className="text-sm bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                                {aiCodeReview.tests || 'No test cases generated.'}
                              </pre>
                            </div>
                          )}
                          
                          {activeReviewTab === 'architecture' && (
                            <div>
                              <h4 className="text-md font-semibold text-gray-900 mb-3">Architecture & Optimization</h4>
                              <pre className="text-sm bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                                {aiCodeReview.architecture || 'No architecture suggestions available.'}
                              </pre>
                              {aiCodeReview.recommendations && (
                                <div className="mt-4">
                                  <h5 className="text-sm font-semibold text-gray-800 mb-2">Final Recommendations</h5>
                                  <pre className="text-sm bg-blue-50 p-3 rounded border whitespace-pre-wrap">
                                    {aiCodeReview.recommendations}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  currentFile && (
                    <div className="mt-6 border rounded-lg bg-gray-50 p-6 text-center">
                      <FileCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-sm font-medium text-gray-600 mb-2">No Code Review Yet</h3>
                      <p className="text-xs text-gray-500 mb-4">
                        Click "Perform AI Code Review" above to analyze this file
                      </p>
                      <button
                        onClick={performAiCodeReview}
                        disabled={loadingAiReview}
                        className="btn-primary text-xs px-4 py-2 inline-flex items-center space-x-1"
                      >
                        {loadingAiReview ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            <span>Perform AI Code Review</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          /* Only show not-connected UI if not authenticated */
          <div className="text-center py-8 text-gray-500">
            <Github className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Connect to GitHub to push/pull your generated code</p>
            <button
              onClick={() => setShowGithubAuth(true)}
              className="btn-primary mt-3"
            >
              Connect GitHub Account
            </button>
          </div>
        )}
      </div>

      {/* Code Modify Modal */}
      {isCodeModifyOpen && (
        <CodeModifyModal
          isOpen={isCodeModifyOpen}
          onClose={() => setIsCodeModifyOpen(false)}
          onExecute={executeCodeModification}
          currentFile={currentFile}
          selectedText={selectedText}
          storyTitle={currentStory?.title || ''}
        />
      )}

      {/* GitHub Authentication Modal */}
      {showGithubAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Github className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Connect to GitHub</h3>
              </div>
              <button
                onClick={() => setShowGithubAuth(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Enter your GitHub Personal Access Token to enable repository integration.
              </p>
              <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-4">
                <p className="font-medium">How to create a token:</p>
                <ol className="list-decimal list-inside space-y-1 mt-2 text-xs">
                  <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                  <li>Click "Generate new token (classic)"</li>
                  <li>Select scopes: repo, user:email</li>
                  <li>Copy the generated token</li>
                </ol>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault()
                const token = (e.target as any).token.value
                if (token) handleGithubAuth(token)
              }}>
                <input
                  name="token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="input w-full mb-4"
                  required
                />
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowGithubAuth(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={githubLoading}
                    className="btn-primary flex items-center space-x-2"
                  >
                    {githubLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>Connect</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Submit for Approval - Bottom of Page */}
      <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
        <button className="btn-secondary flex items-center space-x-2" onClick={() => toast.success('Progress saved')}>
          <Lightbulb className="w-4 h-4" />
          <span>Save Progress</span>
        </button>
        <button 
          className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" 
          onClick={handleSubmitForApproval}
          disabled={!currentDeliverable?.code || currentDeliverable.code.length === 0}
          title={!currentDeliverable?.code || currentDeliverable.code.length === 0 ? 'Please generate deliverables first' : 'Submit for approval'}
        >
          <GitBranch className="w-4 h-4" />
          <span>Submit for Approval</span>
        </button>
      </div>
    </div>
  )
}

// Code Modify Modal Component
interface CodeModifyModalProps {
  isOpen: boolean
  onClose: () => void
  onExecute: (instruction: string) => void
  currentFile: string
  selectedText: string
  storyTitle: string
}

const CodeModifyModal = ({ isOpen, onClose, onExecute, currentFile, selectedText, storyTitle }: CodeModifyModalProps) => {
  const [instruction, setInstruction] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

  const handleExecute = async () => {
    if (!instruction.trim()) return
    
    setIsExecuting(true)
    try {
      await onExecute(instruction)
    } finally {
      setIsExecuting(false)
    }
  }

  const suggestedInstructions = [
    selectedText ? `Refactor the selected code to be more efficient` : `Add error handling to this file`,
    selectedText ? `Add comments explaining the selected code` : `Add input validation`,
    selectedText ? `Optimize the selected code for better performance` : `Add unit tests for the main functions`,
    `Add logging statements`,
    `Implement proper exception handling`
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Edit3 className="w-5 h-5" />
                <span>Code Modify Assistant</span>
              </h3>
              <p className="text-sm text-green-100 mt-1">
                Story: {storyTitle}
              </p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
              <span className="text-xl">&times;</span>
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Context Information */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>File:</strong> {currentFile}</div>
              {selectedText && (
                <div><strong>Selected:</strong> {selectedText.length} characters</div>
              )}
              {selectedText && selectedText.length < 200 && (
                <div className="mt-2">
                  <strong>Selection:</strong>
                  <pre className="bg-gray-900 text-gray-100 p-2 rounded text-xs mt-1 overflow-x-auto">
                    {selectedText}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions:</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedInstructions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInstruction(suggestion)}
                  className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded hover:bg-green-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Instruction Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modification Instructions:
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={selectedText 
                ? "Describe how you want to modify the selected code..."
                : "Describe what you want to add or change in the file..."
              }
              className="w-full h-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              disabled={isExecuting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={!instruction.trim() || isExecuting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isExecuting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Modifying...</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>Modify Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Phase5Page

