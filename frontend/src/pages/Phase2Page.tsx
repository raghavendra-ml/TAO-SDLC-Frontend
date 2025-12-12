import { useEffect, useState } from 'react'
import { Target, Plus, Loader2, Calendar, Users, Settings, Zap, GitBranch, ListChecks, CheckCircle, X } from 'lucide-react'
import { getProjectPhases, updatePhase, exportToJira } from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'

interface Epic {
  id: string
  title: string
  description: string
  why_separate?: string
  points: number
  priority: string
  dependencies?: string[]
  blockers?: string[]
  stories?: UserStory[]
}

interface UserStory {
  id: string
  title: string
  description?: string
  points: number
  priority: string
  epic_id?: string
  epic?: string
  functional_requirements?: string[]
  nonfunctional_requirements?: string[]
  acceptance_criteria?: string[]
  dependencies?: string[]
  blockers?: string[]
  status?: string
}

export default function Phase2Page() {
  const [epics, setEpics] = useState<Epic[]>([])
  const [userStories, setUserStories] = useState<UserStory[]>([])
  const [phase1Data, setPhase1Data] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [phaseId, setPhaseId] = useState<number | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [isPendingApproval, setIsPendingApproval] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [hasAIGeneratedEpics, setHasAIGeneratedEpics] = useState(false)
  const [showExecutionFlow, setShowExecutionFlow] = useState(false)
  const [showDependencyChart, setShowDependencyChart] = useState(false)
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set())
  const [totalSprints, setTotalSprints] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [teamSize, setTeamSize] = useState(5)
  const [sprintDuration, setSprintDuration] = useState('2 weeks')
  const [velocity, setVelocity] = useState<number | string>('')
  const [capacityCalculated, setCapacityCalculated] = useState(false)
  const [jiraConfig, setJiraConfig] = useState({
    url: import.meta.env.VITE_JIRA_URL || '',
    email: import.meta.env.VITE_JIRA_EMAIL || '',
    apiToken: import.meta.env.VITE_JIRA_API_TOKEN_1 || '',
    projectKey: 'SCRUM'
  })
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [isExportingToJira, setIsExportingToJira] = useState(false)
  const [showAddEpicModal, setShowAddEpicModal] = useState(false)
  const [showAddStoryModal, setShowAddStoryModal] = useState(false)
  const [selectedEpicForStory, setSelectedEpicForStory] = useState<string | null>(null)
  const [newEpic, setNewEpic] = useState({
    title: '',
    description: '',
    why_separate: '',
    points: 0,
    priority: 'Medium',
    dependencies: [] as string[],
    blockers: [] as string[]
  })
  const [newStory, setNewStory] = useState({
    title: '',
    description: '',
    points: 0,
    priority: 'Medium',
    acceptance_criteria: [] as string[],
    functional_requirements: [] as string[],
    nonfunctional_requirements: [] as string[],
    dependencies: [] as string[],
    blockers: [] as string[]
  })
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()

  useEffect(() => {
    if (projectId) {
      loadPhaseData()
    }
  }, [projectId])

  const loadPhaseData = async () => {
    try {
      if (!projectId) {
        console.log('❌ No projectId available')
        return
      }
      
      const response = await getProjectPhases(parseInt(projectId))
      const phases = response.data
      
      // Get project name from first phase's project_name field
      let projectName = `Project ${projectId}`
      if (phases && phases.length > 0 && (phases[0] as any).project_name) {
        projectName = (phases[0] as any).project_name
      }
      
      setProject({ name: projectName })
      console.log(`📌 Project Name: ${projectName}`)
      
      // Load Phase 1 data
      const phase1 = phases.find((p: any) => p.phase_number === 1)
      if (phase1) {
        setPhase1Data(phase1.data)
      }
      
      // Load Phase 2 data (epics and user stories)
      const phase2 = phases.find((p: any) => p.phase_number === 2)
      if (phase2) {
        console.log('📊 Phase 2 found:', phase2)
        
        // Store phase ID and approval status (ALWAYS, even if no data yet)
        setPhaseId(phase2.id)
        setIsApproved(phase2.status === 'approved')
        setIsPendingApproval(phase2.status === 'pending_approval')
        
        // Load epics and user stories from Phase 2 data
        if (phase2.data) {
          let epicsList = phase2.data.epics || []
          const storiesList = phase2.data.userStories || []
          
          // 🔧 Sanitize epics: ensure blockers array is always defined and never empty is displayed
          epicsList = epicsList.map((epic: any) => ({
            ...epic,
            blockers: (epic.blockers && epic.blockers.length > 0) ? epic.blockers : []
          }))
          
          if (epicsList.length > 0 || storiesList.length > 0) {
            console.log(`✅ Loaded ${epicsList.length} epics and ${storiesList.length} user stories from database`)
            setEpics(epicsList)
            setUserStories(storiesList)
            setHasAIGeneratedEpics(true)
            
            // Load resource allocation if it exists
            if (phase2.data.resourceAllocation) {
              console.log('💾 Loading resource allocation from database:', phase2.data.resourceAllocation)
              setTeamSize(phase2.data.resourceAllocation.teamSize || 5)
              setSprintDuration(phase2.data.resourceAllocation.sprintDuration || '2 weeks')
              if (phase2.data.resourceAllocation.velocity) {
                setVelocity(phase2.data.resourceAllocation.velocity)
              }
              if (phase2.data.resourceAllocation.totalSprints) {
                setTotalSprints(phase2.data.resourceAllocation.totalSprints)
                setTotalPoints(phase2.data.resourceAllocation.totalPoints || 0)
                setCapacityCalculated(true)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading phase data:', error)
    }
  }

  const handleGenerateEpicsAndStories = async (isManual: boolean) => {
    console.log('🚀 Generate button clicked!')
    setGenerating(true)
    try {
      if (!projectId) {
        alert('❌ Project ID not found')
        setGenerating(false)
        return
      }
      
      console.log('📋 Project ID:', projectId)

      console.log('🔄 Calling backend API...')
      // Call backend to generate epics and stories
      const response = await fetch(`/api/phases/generate/${projectId}/epics-and-stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || response.statusText)
      }

      const data = await response.json()
      console.log('✅ Response received:', data)
      
      // Parse and update state
      let epicsList = data.epics || []
      const storiesList = data.userStories || []
      const execOrder = data.executionOrder || []
      
      // 🔧 Sanitize epics: filter out empty blockers arrays to prevent "0" display
      epicsList = epicsList.map(epic => ({
        ...epic,
        blockers: (epic.blockers && Array.isArray(epic.blockers) && epic.blockers.length > 0) ? epic.blockers : []
      }))
      
      console.log(`📊 Parsed: ${epicsList.length} epics, ${storiesList.length} stories`)
      console.log(`🔗 Execution order: ${execOrder}`)
      
      // Set state
      setEpics(epicsList)
      setUserStories(storiesList)
      setHasAIGeneratedEpics(true)
      
      // Save to database immediately - update Phase 2 data to persist
      if (phaseId) {
        const phaseData = {
          ...((phase1Data as any) || {}),
          epics: epicsList,
          userStories: storiesList,
          executionOrder: execOrder,
          resourceAllocation: {
            teamSize,
            sprintDuration,
            velocity,
            totalSprints,
            totalPoints
          }
        }
        
        try {
          console.log('💾 Saving to database with phaseId:', phaseId)
          console.log('📦 Phase data to save:', phaseData)
          const response = await updatePhase(phaseId, {
            status: 'in_progress',
            data: phaseData
          })
          console.log('✅ Data saved successfully:', response.data)
          console.log('✅ Saved data in response:', response.data.data)
          
          // Verify the save worked by checking response
          if (response.data && response.data.data) {
            const savedData = response.data.data
            console.log('✅ Verification - epics in response:', savedData.epics?.length || 0)
            console.log('✅ Verification - stories in response:', savedData.userStories?.length || 0)
          }
        } catch (dbError) {
          console.error('❌ Error saving to database:', dbError)
        }
      } else {
        console.warn('⚠️ No phaseId available, cannot save to database')
      }
      
      // Show success
      const msg = `✅ Generated ${epicsList.length} epics and ${storiesList.length} stories!`
      console.log(msg)
      toast.success(msg)
      
    } catch (error) {
      console.error('❌ Error:', error)
      const msg = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error: ${msg}`)
    } finally {
      setGenerating(false)
    }
  }

  const calculateCapacity = async () => {
    // Validate velocity is set and is a valid number
    const velocityNum = typeof velocity === 'string' ? parseInt(velocity) : velocity
    if (!velocityNum || velocityNum <= 0) {
      toast.error('⚠️ Please enter a valid Team Velocity (story points per sprint)')
      return
    }

    // Validate stories exist
    if (userStories.length === 0) {
      toast.error('⚠️ Please generate user stories first')
      return
    }

    const totalStoryPoints = userStories.reduce((sum, s) => sum + (s.points || 0), 0)
    const sprintsNeeded = Math.ceil(totalStoryPoints / velocityNum)
    const monthsNeeded = Math.ceil((sprintsNeeded * 2) / 4.33)
    
    setTotalPoints(totalStoryPoints)
    setTotalSprints(sprintsNeeded)
    setCapacityCalculated(true)
    
    // Save capacity calculation to database
    if (phaseId) {
      try {
        const phaseData = {
          ...((phase1Data as any) || {}),
          epics,
          userStories,
          executionOrder: [],
          resourceAllocation: {
            teamSize,
            sprintDuration,
            velocity: velocityNum,
            totalSprints: sprintsNeeded,
            totalPoints: totalStoryPoints
          }
        }
        
        await updatePhase(phaseId, {
          status: 'in_progress',
          data: phaseData
        })
        console.log('💾 Capacity calculation saved to database')
      } catch (error) {
        console.error('Warning: Could not save capacity to database:', error)
      }
    }
    
    // Show success message with details
    toast.success(`✅ Calculated: ${sprintsNeeded} sprints needed (${totalStoryPoints} total points, ~${monthsNeeded} months)`)
  }

  const savePhaseData = async () => {
    if (!phaseId) {
      toast.error('❌ Phase ID not found')
      return
    }

    try {
      const phaseData = {
        ...((phase1Data as any) || {}),
        epics,
        userStories,
        executionOrder: [],
        resourceAllocation: {
          teamSize,
          sprintDuration,
          velocity,
          totalSprints,
          totalPoints
        }
      }

      await updatePhase(phaseId, {
        status: 'in_progress',
        data: phaseData
      })
      
      toast.success('✅ Changes saved to database')
      console.log('💾 Phase 2 data saved')
    } catch (error) {
      console.error('Error saving phase data:', error)
      toast.error('❌ Failed to save changes')
    }
  }

  const handleAddEpic = () => {
    if (!newEpic.title || !newEpic.description) {
      toast.error('⚠️ Please fill in title and description')
      return
    }

    const epicId = String(Math.max(...epics.map(e => parseInt(e.id) || 0), 0) + 1)
    const epic: Epic = {
      id: epicId,
      title: newEpic.title,
      description: newEpic.description,
      why_separate: newEpic.why_separate,
      points: newEpic.points || 0,
      priority: newEpic.priority,
      dependencies: newEpic.dependencies.filter(d => d.trim()),
      blockers: newEpic.blockers.filter(b => b.trim()),
      stories: []
    }

    setEpics([...epics, epic])
    setShowAddEpicModal(false)
    setNewEpic({
      title: '',
      description: '',
      why_separate: '',
      points: 0,
      priority: 'Medium',
      dependencies: [],
      blockers: []
    })
    
    toast.success(`✅ Epic "${epic.title}" added`)
    savePhaseData()
  }

  const handleAddStory = () => {
    if (!newStory.title || !selectedEpicForStory) {
      toast.error('⚠️ Please select an epic and fill in the story title')
      return
    }

    const storyId = String(Math.max(...userStories.map(s => parseInt(s.id) || 0), 0) + 1)
    const selectedEpic = epics.find(e => e.id === selectedEpicForStory)
    
    const story: UserStory = {
      id: storyId,
      epic_id: selectedEpicForStory,
      epic: selectedEpic?.title || '',
      title: newStory.title,
      description: newStory.description,
      points: newStory.points || 0,
      priority: newStory.priority,
      acceptance_criteria: newStory.acceptance_criteria.filter(ac => ac.trim()),
      functional_requirements: newStory.functional_requirements.filter(fr => fr.trim()),
      nonfunctional_requirements: newStory.nonfunctional_requirements.filter(nfr => nfr.trim()),
      dependencies: newStory.dependencies.filter(d => d.trim()),
      blockers: newStory.blockers.filter(b => b.trim()),
      status: 'backlog'
    }

    setUserStories([...userStories, story])
    setShowAddStoryModal(false)
    setSelectedEpicForStory(null)
    setNewStory({
      title: '',
      description: '',
      points: 0,
      priority: 'Medium',
      acceptance_criteria: [],
      functional_requirements: [],
      nonfunctional_requirements: [],
      dependencies: [],
      blockers: []
    })
    
    toast.success(`✅ Story "${story.title}" added to ${selectedEpic?.title}`)
    savePhaseData()
  }

  const handleSubmitForApproval = async () => {
    // Validate that epics and stories exist
    if (epics.length === 0 || userStories.length === 0) {
      toast.error('⚠️ Please generate epics and stories before submitting for approval')
      return
    }

    if (!phaseId) {
      toast.error('❌ Phase ID not found')
      return
    }

    setIsSubmitting(true)
    try {
      // Create approval history entry
      const approvalEntry = {
        submittedAt: new Date().toISOString(),
        submittedBy: 'Current User',
        status: 'pending',
        epicCount: epics.length,
        storyCount: userStories.length,
        totalPoints: totalPoints || userStories.reduce((sum, s) => sum + (s.points || 0), 0)
      }

      const phaseData = {
        ...((phase1Data as any) || {}),
        epics,
        userStories,
        executionOrder: [], // Keep existing execution order if available
        resourceAllocation: {
          teamSize,
          sprintDuration,
          velocity,
          totalSprints,
          totalPoints
        },
        approvalHistory: [approvalEntry]
      }

      // Update phase status to pending_approval
      await updatePhase(phaseId, {
        status: 'pending_approval',
        data: phaseData
      })

      setIsPendingApproval(true)
      toast.success('✅ Phase 2 submitted for approval!')
      
      // Redirect to approvals page after 1.5 seconds
      setTimeout(() => {
        navigate('/approvals')
      }, 1500)
    } catch (error) {
      console.error('Error submitting for approval:', error)
      toast.error('❌ Failed to submit for approval. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleEpicExpanded = (epicId: string) => {
    const newExpanded = new Set(expandedEpics)
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId)
    } else {
      newExpanded.add(epicId)
    }
    setExpandedEpics(newExpanded)
  }

  const getStoriesForEpic = (epicId: string) => {
    return userStories.filter(s => s.epic_id === epicId)
  }

  const getEpicDependencies = (epicId: string): string[] => {
    const epic = epics.find(e => e.id === epicId)
    return epic?.dependencies || []
  }

  const analyzeBlockingDependencies = () => {
    const blockingMap = new Map<string, { blockers: string[]; blockedBy: string[] }>()
    
    userStories.forEach(story => {
      if (!blockingMap.has(story.id)) {
        blockingMap.set(story.id, { blockers: [], blockedBy: [] })
      }
      
      if (story.dependencies && story.dependencies.length > 0) {
        story.dependencies.forEach(dep => {
          blockingMap.get(story.id)!.blockers.push(dep)
          if (!blockingMap.has(dep)) {
            blockingMap.set(dep, { blockers: [], blockedBy: [] })
          }
          blockingMap.get(dep)!.blockedBy.push(story.id)
        })
      }
    })
    
    return blockingMap
  }

  const getMicroserviceInsights = (epic: Epic) => {
    const insights = {
      hasDependencies: epic.dependencies && epic.dependencies.length > 0,
      reasonForSeparation: (epic as any).reasonForSeparation || [] as string[]
    }
    
    // If reasonForSeparation is already in the epic data, use it (from AI generation)
    if ((epic as any).reasonForSeparation && (epic as any).reasonForSeparation.length > 0) {
      return insights
    }
    
    // Otherwise, dynamically generate reasons based on stories
    const stories = userStories.filter(s => s.epic_id === epic.id)
    const reasons: string[] = []
    
    // Check for complexity factors
    const hasExternalDeps = epic.dependencies && epic.dependencies.length > 0
    const hasComplexLogic = stories.some(s => (s.description || '').length > 100)
    const hasMultipleStories = stories.length > 3
    const hasHighPriority = stories.some(s => s.priority === 'High')
    const largePoints = epic.points && epic.points > 13
    
    // Build dynamic reasons
    if (hasExternalDeps) reasons.push('🔗 Has external microservice dependencies')
    if (largePoints) reasons.push('📊 Large workload requiring dedicated team')
    if (hasComplexLogic) reasons.push('⚙️ Contains complex business logic')
    if (hasMultipleStories) reasons.push('👥 Requires parallel team execution')
    if (hasHighPriority) reasons.push('🎯 Critical priority requiring isolation')
    if (reasons.length === 0) reasons.push('📦 Logical domain separation')
    
    insights.reasonForSeparation = reasons
    return insights
  }

  const handleExportToJira = async () => {
    if (!phaseId) {
      toast.error('❌ Phase ID not found')
      return
    }

    if (epics.length === 0 || userStories.length === 0) {
      toast.error('⚠️ Please generate epics and stories first')
      return
    }

    if (!jiraConfig.url || !jiraConfig.email || !jiraConfig.apiToken) {
      toast.error('⚠️ Please configure JIRA credentials first')
      return
    }

    setIsExportingToJira(true)
    const loadingToast = toast.loading('🚀 Exporting to JIRA...')

    try {
      const response = await exportToJira(phaseId, {
        url: jiraConfig.url,
        email: jiraConfig.email,
        api_token: jiraConfig.apiToken,
        project_key: jiraConfig.projectKey
      })

      toast.dismiss(loadingToast)

      if (response.data.success) {
        toast.success(`✅ Exported ${response.data.exported_epics} epics and ${response.data.exported_stories} stories to JIRA!`)
        console.log('JIRA Links:', response.data.jira_links)
      } else {
        toast.error(`❌ Export failed: ${response.data.error || response.data.message}`)
      }
    } catch (error: any) {
      toast.dismiss(loadingToast)
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Failed to export to JIRA'
      toast.error(`❌ ${errorMsg}`)
      console.error('JIRA export error:', error)
    } finally {
      setIsExportingToJira(false)
    }
  }

  const getExecutionFlow = () => {
    return [...epics].sort((a, b) => {
      const aDeps = a.dependencies?.length || 0
      const bDeps = b.dependencies?.length || 0
      return aDeps - bDeps
    })
  }

  const getStoriesByDependencies = () => {
    return [...userStories].sort((a, b) => {
      const aDeps = a.dependencies?.length || 0
      const bDeps = b.dependencies?.length || 0
      return aDeps - bDeps
    })
  }

  return (
    <div>
      <div className="mb-8">
        {project?.name && (
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-500">Project:</span>
            <h2 className="text-3xl font-bold text-primary-600">{project.name}</h2>
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900">Phase 2: Planning & Product Backlog</h1>
        <p className="text-gray-500 mt-2">Plan effort, create backlog, and define sprint schedule</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* LEFT COLUMN CONTENT */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Epics & User Stories</h2>
              </div>
              {isApproved && hasAIGeneratedEpics ? (
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 bg-green-100 text-green-800 rounded-md font-medium flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approved
                  </div>
                  <button 
                    onClick={() => handleGenerateEpicsAndStories(false)}
                    disabled={generating || isApproved}
                    title="Generation is locked after approval"
                    className="px-4 py-2 bg-gray-400 text-white rounded-md font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Regenerate (Locked)
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => handleGenerateEpicsAndStories(false)}
                  disabled={generating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : epics.length > 0 ? (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Regenerate
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Generate Epics & User Stories Using AI
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-gray-600 text-sm">Total: {epics.length} epics, {userStories.length} stories</p>
            
            {/* Display Generated Epics */}
            {epics.length > 0 && (
              <div className="mt-6 space-y-4">
                {epics.map((epic, epicIndex) => {
                  const epicStories = userStories.filter(s => s.epic_id === epic.id);
                  const isExpanded = expandedEpics.has(epic.id);
                  const priorityColors = {
                    'High': 'bg-red-100 text-red-800 border-red-300',
                    'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                    'Low': 'bg-green-100 text-green-800 border-green-300',
                  };
                  const priorityColor = priorityColors[epic.priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800 border-gray-300';
                  
                  return (
                    <div key={epic.id} className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      {/* Epic Header - Clickable to Expand/Collapse */}
                      <div 
                        onClick={() => toggleEpicExpanded(epic.id)}
                        className="p-5 cursor-pointer hover:bg-blue-100/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 flex items-start gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              <button 
                                className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleEpicExpanded(epic.id);
                                }}
                              >
                                {isExpanded ? '−' : '+'}
                              </button>
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-200 text-blue-700 text-sm font-bold">
                                {epicIndex + 1}
                              </span>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">{epic.title}</h3>
                                <p className="text-sm text-gray-600 line-clamp-1">{epic.description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col gap-2 items-end flex-shrink-0">
                            {epic.points && (
                              <span className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-sm">
                                {epic.points} pts
                              </span>
                            )}
                            {epic.priority && (
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${priorityColor}`}>
                                {epic.priority} Priority
                              </span>
                            )}
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              📋 {epicStories.length} stories
                            </span>
                            {epic.dependencies && epic.dependencies.length > 0 && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                🔗 {epic.dependencies.length} deps
                              </span>
                            )}
                            {epic.blockers && Array.isArray(epic.blockers) && epic.blockers.length > 0 && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                ⚠️ {epic.blockers.length} blockers
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-blue-200 px-5 py-4 space-y-4 bg-white">
                          {/* Full Description */}
                          {epic.description && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">📝 FULL DESCRIPTION</p>
                              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{epic.description}</p>
                            </div>
                          )}

                          {/* Why Separate */}
                          {epic.why_separate && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">🏗️ WHY SEPARATE MICROSERVICE</p>
                              <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">{epic.why_separate}</p>
                            </div>
                          )}

                          {/* Dependencies */}
                          {epic.dependencies && epic.dependencies.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-2">🔗 DEPENDENCIES</p>
                              <div className="space-y-1">
                                {epic.dependencies.map((dep, idx) => (
                                  <div key={idx} className="text-sm text-gray-700 bg-orange-50 p-2 rounded border-l-2 border-orange-500 ml-1">
                                    → {typeof dep === 'string' ? dep : dep}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Blockers */}
                          {epic.blockers && Array.isArray(epic.blockers) && epic.blockers.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-2">⚠️ BLOCKERS</p>
                              <div className="space-y-1">
                                {epic.blockers.map((blocker, idx) => (
                                  <div key={idx} className="text-sm text-gray-700 bg-red-50 p-2 rounded border-l-2 border-red-500 ml-1">
                                    ⚠️ {blocker}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* User Stories */}
                          {epicStories.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center">
                                <ListChecks className="w-4 h-4 mr-2 text-blue-600" />
                                USER STORIES ({epicStories.length} total)
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-0">
                                {epicStories.map((story, storyIdx) => (
                                  <div key={story.id} className="bg-white border border-blue-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all">
                                    <div className="flex gap-3 items-start">
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex-shrink-0 mt-0.5">
                                        {storyIdx + 1}
                                      </span>
                                      <div className="flex-1 space-y-2">
                                        <p className="font-semibold text-gray-800 text-sm">{story.title}</p>
                                        
                                        {story.description && (
                                          <p className="text-gray-600 text-xs bg-gray-50 p-2 rounded line-clamp-2">{story.description}</p>
                                        )}
                                        
                                        <div className="flex flex-wrap gap-2">
                                          {story.points && (
                                            <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                              <Zap className="w-3 h-3" />
                                              {story.points} pts
                                            </span>
                                          )}
                                          {story.priority && (
                                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                              📊 {story.priority}
                                            </span>
                                          )}
                                          {story.status && (
                                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                              {story.status}
                                            </span>
                                          )}
                                        </div>

                                        {/* Story FR/NFR */}
                                        {story.functional_requirements && story.functional_requirements.length > 0 && (
                                          <div className="text-xs">
                                            <p className="font-semibold text-gray-600">FR:</p>
                                            <p className="text-gray-600">{story.functional_requirements.slice(0, 2).join(', ')}...</p>
                                          </div>
                                        )}

                                        {/* Story Acceptance Criteria */}
                                        {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
                                          <div className="text-xs">
                                            <p className="font-semibold text-gray-600">Acceptance:</p>
                                            <ul className="list-disc list-inside text-gray-600">
                                              {story.acceptance_criteria.slice(0, 2).map((ac, idx) => (
                                                <li key={idx} className="truncate">{ac}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Story Dependencies & Blockers */}
                                        <div className="text-xs space-y-1">
                                          {story.dependencies && story.dependencies.length > 0 && (
                                            <div className="text-blue-600 font-semibold">
                                              🔗 Dependencies: {story.dependencies.length}
                                            </div>
                                          )}
                                          {story.blockers && story.blockers.length > 0 && (
                                            <div className="text-red-600 font-semibold">
                                              ⚠️ Blockers: {story.blockers.length}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manual Add Buttons - At End of Epics Section */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button 
                onClick={() => setShowAddEpicModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium flex items-center transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Epic Manually
              </button>
              
              {epics.length > 0 && (
                <button 
                  onClick={() => setShowAddStoryModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium flex items-center transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add User Story
                </button>
              )}
            </div>
          </div>

          {/* Execution Flow Section - Visual Dependency Flow */}
          {epics.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <ListChecks className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Execution Flow - Dependency Analysis</h2>
                </div>
                <button 
                  onClick={() => setShowExecutionFlow(!showExecutionFlow)}
                  className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm font-medium"
                >
                  {showExecutionFlow ? 'Hide' : 'Show'} Flow
                </button>
              </div>
              
              {showExecutionFlow && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    ℹ️ Execution order based on dependencies - stories with fewer dependencies execute first
                  </p>
                  
                  {/* Flow Visualization */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                    {getExecutionFlow().map((epic, index) => {
                      const epicStories = userStories.filter(s => s.epic_id === epic.id)
                      const insights = getMicroserviceInsights(epic)
                      
                      return (
                        <div key={epic.id}>
                          {/* Epic Flow Node */}
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="bg-white border-l-4 border-green-500 p-4 rounded-lg hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-semibold text-gray-900">{epic.title}</h3>
                                  <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                    🏗️ Microservice
                                  </span>
                                </div>
                                
                                {/* Epic Metadata */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                    ⚡ {epic.points || 0} points
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                                    epic.priority === 'High' ? 'bg-red-100 text-red-700' :
                                    epic.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    🎯 {epic.priority} Priority
                                  </span>
                                  {epicStories.length > 0 && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                      📋 {epicStories.length} stories
                                    </span>
                                  )}
                                </div>
                                
                                {/* Microservice Reasoning */}
                                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3 text-xs">
                                  <p className="font-semibold text-blue-900 mb-2">🏗️ Microservice Design Rationale:</p>
                                  <ul className="list-disc list-inside text-blue-800 space-y-1">
                                    {insights.reasonForSeparation.map((reason: string, idx: number) => (
                                      <li key={idx}>{reason}</li>
                                    ))}
                                  </ul>
                                </div>
                                
                                {/* Dependencies */}
                                {epic.dependencies && epic.dependencies.length > 0 && (
                                  <div className="bg-orange-50 border border-orange-200 rounded p-3 text-xs">
                                    <p className="font-semibold text-orange-900 mb-2">🔗 Blocking Dependencies (Must Complete First):</p>
                                    <div className="text-orange-800 space-y-1">
                                      {epic.dependencies.map((dep, idx) => (
                                        <div key={idx} className="flex items-center gap-2 ml-2">
                                          <span className="text-orange-600">→</span>
                                          <span><strong>{dep}</strong> must be completed first</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Connection Line */}
                          {index < getExecutionFlow().length - 1 && (
                            <div className="ml-5 h-6 border-l-2 border-dashed border-green-300 flex items-center justify-center">
                              <span className="text-xs text-green-600 font-semibold">↓</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dependency Chart Section */}
          {/* Dependencies & Blocking Matrix */}
          {userStories.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-5 h-5 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Dependencies & Blocking Analysis</h2>
                </div>
                <button 
                  onClick={() => setShowDependencyChart(!showDependencyChart)}
                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-sm font-medium"
                >
                  {showDependencyChart ? 'Hide' : 'Show'} Matrix
                </button>
              </div>
              
              {showDependencyChart && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    🔍 Stories analyzed by execution dependencies - which user stories block others
                  </p>
                  
                  {/* Blocking Statistics */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {(() => {
                      const blockingMap = analyzeBlockingDependencies()
                      const storiesWithBlockers = Array.from(blockingMap.values()).filter(s => s.blockers.length > 0).length
                      const storiesBlocking = Array.from(blockingMap.values()).filter(s => s.blockedBy.length > 0).length
                      
                      return (
                        <>
                          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                            <p className="text-xs text-blue-600 font-semibold">Independent Stories</p>
                            <p className="text-2xl font-bold text-blue-900">{userStories.length - storiesWithBlockers}</p>
                          </div>
                          <div className="bg-orange-50 border border-orange-200 rounded p-3 text-center">
                            <p className="text-xs text-orange-600 font-semibold">Dependent Stories</p>
                            <p className="text-2xl font-bold text-orange-900">{storiesWithBlockers}</p>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
                            <p className="text-xs text-red-600 font-semibold">Critical Blockers</p>
                            <p className="text-2xl font-bold text-red-900">{storiesBlocking}</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  
                  {/* Stories with Dependencies */}
                  <div className="space-y-3 max-h-screen overflow-y-auto">
                    {getStoriesByDependencies().map((story, index) => {
                      const epicInfo = epics.find(e => e.id === story.epic_id)
                      const blockers = story.dependencies && story.dependencies.length > 0 ? story.dependencies : []
                      const blockingMap = analyzeBlockingDependencies()
                      const blockedStories = blockingMap.get(story.id)?.blockedBy || []
                      
                      return (
                        <div key={story.id} className="border-l-4 border-purple-400 bg-gradient-to-r from-purple-50 to-white rounded-lg p-4 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-bold">
                                {index + 1}
                              </span>
                              <h4 className="font-semibold text-gray-900">{story.title}</h4>
                            </div>
                            {blockedStories.length > 0 && (
                              <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                Blocks {blockedStories.length}
                              </span>
                            )}
                          </div>
                          
                          {story.description && (
                            <p className="text-sm text-gray-700 ml-11 mb-2">{story.description}</p>
                          )}
                          
                          {/* Metadata */}
                          <div className="flex flex-wrap gap-2 ml-11 mb-3">
                            {epicInfo && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {epicInfo.title}
                              </span>
                            )}
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                              {story.points || 0} pts
                            </span>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              story.priority === 'High' ? 'bg-red-100 text-red-700' :
                              story.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {story.priority}
                            </span>
                          </div>
                          
                          {/* Blocking Dependencies */}
                          {blockers.length > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded p-2 ml-11 mb-2 text-xs">
                              <p className="font-semibold text-orange-900 mb-1">Must Wait For:</p>
                              <div className="text-orange-800 space-y-1">
                                {blockers.map((blocker, idx) => {
                                  const blockerStory = userStories.find(s => s.id === blocker)
                                  return (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span>=&gt;</span>
                                      <span>{blockerStory?.title || blocker}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Stories Blocked by This */}
                          {blockedStories.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded p-2 ml-11 text-xs">
                              <p className="font-semibold text-red-900 mb-1">Blocks These Stories:</p>
                              <div className="text-red-800 space-y-1">
                                {blockedStories.slice(0, 3).map((blocked, idx) => {
                                  const blockedStory = userStories.find(s => s.id === blocked)
                                  return (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span>X</span>
                                      <span>{blockedStory?.title || blocked} waiting...</span>
                                    </div>
                                  )
                                })}
                                {blockedStories.length > 3 && (
                                  <div className="text-red-700 font-semibold">... and {blockedStories.length - 3} more</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="lg:col-span-1 space-y-4">
          {/* RIGHT COLUMN - SIDEBAR */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Zap className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Quick Planning Info</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Epics: {epics.length}</p>
              <p>Stories: {userStories.length}</p>
              <p>Total Points: {totalPoints}</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Resource Planning</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Team Size</label>
                <input 
                  type="number" 
                  className="input mt-1 w-full border border-gray-300 rounded px-3 py-2"
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value) || 0)}
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Sprint Duration</label>
                <select 
                  className="input mt-1 w-full border border-gray-300 rounded px-3 py-2"
                  value={sprintDuration}
                  onChange={(e) => setSprintDuration(e.target.value)}
                >
                  <option>2 weeks</option>
                  <option>3 weeks</option>
                  <option>4 weeks</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Team Velocity</label>
                <input 
                  type="number" 
                  className="input mt-1 w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Story points per sprint" 
                  value={velocity}
                  onChange={(e) => setVelocity(e.target.value)}
                  min="1"
                />
              </div>
              <button 
                disabled={!velocity || (typeof velocity === 'string' ? parseInt(velocity) : velocity) <= 0 || userStories.length === 0}
                className="w-full py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                onClick={calculateCapacity}
              >
                {!velocity || (typeof velocity === 'string' ? parseInt(velocity) : velocity) <= 0 ? '📊 Enter Velocity First' : userStories.length === 0 ? '📊 Generate Stories First' : '📊 Calculate Capacity'}
              </button>
              {(!velocity || (typeof velocity === 'string' ? parseInt(velocity) : velocity) <= 0) && (
                <p className="text-xs text-red-600 mt-2 text-center">⚠️ Please enter team velocity to calculate</p>
              )}
              
              {/* Sprint Planning - Under Resource Planning */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Sprint Planning</h3>
                </div>
                {capacityCalculated ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{totalSprints}</p>
                      <p className="text-xs text-gray-600 mt-1">Total Sprints</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{totalPoints}</p>
                      <p className="text-xs text-gray-600 mt-1">Total Points</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">{velocity}</p>
                      <p className="text-xs text-gray-600 mt-1">Points/Sprint</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">📊 Enter team velocity and click "Calculate Capacity" to see sprint planning</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900">JIRA Integration</h3>
              </div>
            </div>
            <button 
              onClick={() => setShowJiraModal(true)}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-2"
            >
              ⚙️ Configure JIRA
            </button>
            {jiraConfig.url && (
              <>
                <p className="text-xs text-gray-500 mb-2">✓ JIRA configured</p>
                <button
                  onClick={handleExportToJira}
                  disabled={isExportingToJira || epics.length === 0 || userStories.length === 0}
                  className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isExportingToJira ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    '📤 Export to JIRA'
                  )}
                </button>
              </>
            )}
          </div>

          {/* JIRA Configuration Modal */}
          {showJiraModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-xl font-semibold">Configure JIRA</h2>
                  <button
                    onClick={() => setShowJiraModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">JIRA URL</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="https://your-domain.atlassian.net"
                      value={jiraConfig.url}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="your-email@company.com"
                      value={jiraConfig.email}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
                    <input
                      type="password"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="Your JIRA API token"
                      value={jiraConfig.apiToken}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                        Generate API token →
                      </a>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Key <span className="text-gray-400">(Optional)</span></label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="SCRUM (just the key, not URL)"
                      value={jiraConfig.projectKey}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, projectKey: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowJiraModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!jiraConfig.url || !jiraConfig.email || !jiraConfig.apiToken) {
                          toast.error('Please fill in all required fields')
                          return
                        }
                        setShowJiraModal(false)
                        toast.success('✅ JIRA configuration saved')
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Approval</h3>
            </div>
            <button 
              onClick={handleSubmitForApproval}
              disabled={isSubmitting || !phaseId || epics.length === 0 || userStories.length === 0 || isApproved}
              className="w-full mt-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium"
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
            
            {/* Show validation message when epics/stories are missing */}
            {(epics.length === 0 || userStories.length === 0) && !isApproved && !isPendingApproval && (
              <p className="mt-2 text-xs text-red-600 text-center">
                ⚠️ Please generate epics and stories first
              </p>
            )}
          </div>

          {/* Add Epic Modal */}
          {showAddEpicModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Add New Epic</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={newEpic.title}
                      onChange={(e) => setNewEpic({...newEpic, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Epic title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea
                      value={newEpic.description}
                      onChange={(e) => setNewEpic({...newEpic, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Epic description"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Why Separate</label>
                    <input
                      type="text"
                      value={newEpic.why_separate}
                      onChange={(e) => setNewEpic({...newEpic, why_separate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Why this is a separate microservice"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                      <input
                        type="number"
                        value={newEpic.points}
                        onChange={(e) => setNewEpic({...newEpic, points: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={newEpic.priority}
                        onChange={(e) => setNewEpic({...newEpic, priority: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setShowAddEpicModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddEpic}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add Epic
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add User Story Modal */}
          {showAddStoryModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Add New User Story</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Epic *</label>
                    <select
                      value={selectedEpicForStory || ''}
                      onChange={(e) => setSelectedEpicForStory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Select an epic --</option>
                      {epics.map(epic => (
                        <option key={epic.id} value={epic.id}>{epic.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Story Title *</label>
                    <input
                      type="text"
                      value={newStory.title}
                      onChange={(e) => setNewStory({...newStory, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="As a ... I want ... so that ..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newStory.description}
                      onChange={(e) => setNewStory({...newStory, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Detailed description"
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                      <input
                        type="number"
                        value={newStory.points}
                        onChange={(e) => setNewStory({...newStory, points: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={newStory.priority}
                        onChange={(e) => setNewStory({...newStory, priority: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => {
                      setShowAddStoryModal(false)
                      setSelectedEpicForStory(null)
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStory}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Add Story
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
