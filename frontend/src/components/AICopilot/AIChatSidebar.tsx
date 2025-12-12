import { useState, useEffect, useRef } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Send, Loader2, Sparkles, Lightbulb, Code } from 'lucide-react'
import { chatWithAI, getProjectPhases, generateContent, updatePhase } from '../../services/api'
import toast from 'react-hot-toast'

interface ChatMessage {
  sender: 'user' | 'ai'
  message: string
  timestamp: string
  confidence?: number
  suggestedQuestions?: string[]
}

const AIChatSidebar = () => {
  const location = useLocation()
  const params = useParams<{ projectId?: string }>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [projectName, setProjectName] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [phaseContext, setPhaseContext] = useState<{ prd?: string; brd?: string; versionHistory?: any } | null>(null)
  
  // Phase 5 specific state for code modification
  const [phase5Data, setPhase5Data] = useState<any>(null)
  const [selectedStory, setSelectedStory] = useState<any>(null)

  // Determine context based on current route
  const projectId = params.projectId ? Number(params.projectId) : undefined
  const contextType = projectId ? 'project' : 'dashboard'
  
  // Extract phase ID from route if present
  const phaseMatch = location.pathname.match(/\/phase(\d+)/)
  const phaseNumber = phaseMatch ? Number(phaseMatch[1]) : undefined
  
  // Get phase ID from URL or state if available
  const phaseId = phaseNumber
  
  // Load project name when projectId changes
  useEffect(() => {
    const loadProjectName = async () => {
      if (projectId) {
        try {
          const { getProject } = await import('../../services/api')
          const response = await getProject(projectId)
          setProjectName(response.data.name)
          // Load phase 1 (or current phase) data for chat context
          try {
            const phases = await getProjectPhases(projectId)
            const target = phaseNumber ? (phases.data || []).find((p: any) => p.phase_number === phaseNumber) : (phases.data || [])[0]
            console.log('[AI Chat] Loaded phase data:', {
              phaseNumber,
              hasTarget: !!target,
              hasData: !!target?.data,
              hasVersionHistory: !!target?.data?.versionHistory,
              versionHistory: target?.data?.versionHistory
            });
            if (target?.data) {
              setPhaseContext({
                prd: target.data.prd,
                brd: target.data.brd,
                versionHistory: target.data.versionHistory,
              })
              
              // Load Phase 5 specific data for code modification
              if (phaseNumber === 5) {
                setPhase5Data(target)
              }
            } else {
              setPhaseContext(null)
            }
          } catch (e) {
            console.error('[AI Chat] Error loading phase data:', e);
            // Non-blocking for chat
          }
        } catch (error) {
          console.error('Error loading project name:', error)
          setProjectName(`Project ${projectId}`)
        }
      } else {
        setProjectName('')
        setPhaseContext(null)
      }
    }
    loadProjectName()
  }, [projectId])
  
  const contextLabel = projectId 
    ? `${projectName || `Project ${projectId}`}${phaseNumber ? ` / Phase ${phaseNumber}` : ''}`
    : 'Dashboard'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Clear messages when context changes
  useEffect(() => {
    setMessages([])
  }, [location.pathname])

  // Load Phase 5 current story from sessionStorage
  useEffect(() => {
    if (phaseNumber === 5) {
      const checkStory = () => {
        const stored = sessionStorage.getItem('phase5_current_story')
        if (stored) {
          try {
            const data = JSON.parse(stored)
            setSelectedStory(data)
          } catch (e) {
            console.error('Error parsing phase5_current_story:', e)
          }
        } else {
          setSelectedStory(null)
        }
      }
      
      // Check initially
      checkStory()
      
      // Check periodically for updates
      const interval = setInterval(checkStory, 1000)
      return () => clearInterval(interval)
    } else {
      setSelectedStory(null)
    }
  }, [phaseNumber])

  // Helper to detect if message is a Phase 5 code modification request
  const isCodeModificationRequest = (message: string): boolean => {
    if (phaseNumber !== 5) return false
    
    const codeKeywords = [
      'add', 'modify', 'change', 'update', 'fix', 'improve', 'optimize',
      'refactor', 'implement', 'create', 'write', 'generate',
      'error handling', 'validation', 'test', 'comment', 'documentation',
      'performance', 'security', 'logging', 'async', 'function'
    ]
    
    const lowerMessage = message.toLowerCase()
    return codeKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  const handleSendMessage = async () => {
    if (input.trim() === '') return

    const userMessage: ChatMessage = {
      sender: 'user',
      message: input,
      timestamp: new Date().toLocaleTimeString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Check if this is a Phase 5 code modification request
      if (phaseNumber === 5 && isCodeModificationRequest(input) && phase5Data && selectedStory) {
        console.log('[AI Chat] Detected Phase 5 code modification request', {
          hasDeliverable: !!selectedStory.deliverable,
          storyId: selectedStory.id
        })
        
        if (!selectedStory.deliverable) {
          const aiMessage: ChatMessage = {
            sender: 'ai',
            message: '⚠️ Please generate code for a user story first, then I can help you modify it!',
            timestamp: new Date().toLocaleTimeString(),
          }
          setMessages((prev) => [...prev, aiMessage])
          setIsLoading(false)
          return
        }
        
        // Pull Phase 5 file/selection context if available
        let targetFile = ''
        let selectedText = ''
        try {
          targetFile = sessionStorage.getItem('phase5_active_file') || ''
          selectedText = sessionStorage.getItem('phase5_selected_text') || ''
        } catch {}

        const ctx = {
          content_type: 'code_modification',
          user_message: input,
          current_code: selectedStory.deliverable,
          user_story: { id: selectedStory.id, title: selectedStory.title, description: selectedStory.description, components: selectedStory.components || [] },
          language: selectedStory.language || 'python',
          chat_history: messages.slice(-5).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.message })),
          // New targeting info so backend modifies only the intended file or selection
          target_file: targetFile,
          selected_text: selectedText
        }
        
        const res = await generateContent(phase5Data.id, 'code_modification', ctx)
        const responseData = res?.data || {}
        const aiResponse = responseData.ai_response || responseData.response || 'Code modified successfully!'
        const modifiedCode = responseData.modified_code
        const changesSummary = responseData.changes_summary || []
        
        let fullResponse = aiResponse
        if (changesSummary.length > 0) {
          fullResponse += '\n\n**Changes Made:**\n' + changesSummary.map((c: string) => `• ${c}`).join('\n')
        }
        
        const aiMessage: ChatMessage = {
          sender: 'ai',
          message: fullResponse,
          timestamp: new Date().toLocaleTimeString(),
        }
        setMessages((prev) => [...prev, aiMessage])
        
        // Update the code in backend if modified
        if (modifiedCode && phase5Data.data) {
          const updatedDevelopment = {
            ...(phase5Data.data.user_story_development || {}),
            [selectedStory.id]: modifiedCode
          }
          await updatePhase(phase5Data.id, {
            data: { ...phase5Data.data, user_story_development: updatedDevelopment }
          })
          
          // Update local state and sessionStorage, then trigger page reload event
          const updatedStory = { ...selectedStory, deliverable: modifiedCode }
          setSelectedStory(updatedStory)
          sessionStorage.setItem('phase5_current_story', JSON.stringify(updatedStory))
          
          // Signal Phase5Page to reload deliverables by setting a flag
          sessionStorage.setItem('phase5_reload_deliverables', 'true')
          
          toast.success('✅ Code updated! Changes visible in CODE tab.')
        }
      } else {
        // Regular chat interaction
        const chatPayload = {
          query: input,
          context_type: contextType,
          project_id: projectId,
          phase_id: phaseId,
          // Extra rich context for version-aware answers
          version_context: {
            prd: phaseContext?.prd,
            brd: phaseContext?.brd,
            versionHistory: phaseContext?.versionHistory,
          },
        };
        
        // Debug: Log what we're sending
        console.log('Sending chat with version context:', {
          hasVersionHistory: !!phaseContext?.versionHistory,
          versionHistory: phaseContext?.versionHistory
        });
        
        const response = await chatWithAI(chatPayload);

        const aiMessage: ChatMessage = {
          sender: 'ai',
          message: response.data.response,
          timestamp: new Date().toLocaleTimeString(),
          confidence: response.data.confidence_score,
          suggestedQuestions: response.data.alternatives,
        }
        setMessages((prev) => [...prev, aiMessage])
      }
      } catch (error: any) {
      console.error('Error sending chat message:', error)
        console.error('Error response:', error.response?.data)
      
        let errorMessage = 'Sorry, I encountered an error. Please try again.'
        if (error.response?.data?.detail) {
          errorMessage = `Error: ${error.response.data.detail}`
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`
        }
      
      toast.error('Failed to get AI response')
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
            message: errorMessage,
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedQuestionClick = (question: string) => {
    setInput(question)
  }

  const getSuggestedQuestions = () => {
    if (contextType === 'dashboard') {
      return [
        'How many projects are there?',
        'What approvals are pending?',
        'Show me active projects',
      ]
    } else if (phaseNumber === 1) {
      return [
        'What should I do in Phase 1?',
        'How do I upload requirements?',
        'Generate PRD for this project',
      ]
    } else if (phaseNumber === 2) {
      return [
        'How do I create effective epics?',
        'What is story point estimation?',
        'Help me with sprint planning',
      ]
    } else if (phaseNumber === 3) {
      return [
        'What is system architecture design?',
        'How do I create a high-level design?',
        'What are architecture best practices?',
      ]
    } else if (phaseNumber === 4) {
      return [
        'How do I design database schemas?',
        'What is detailed design specification?',
        'Help me with API design',
      ]
    } else if (phaseNumber === 5) {
      return [
        'Add error handling to the code',
        'Add input validation',
        'Optimize the performance',
        'Add comprehensive comments',
        'Add more test cases',
      ]
    } else if (phaseNumber === 6) {
      return [
        'How do I deploy to production?',
        'What is CI/CD pipeline?',
        'Help me with monitoring setup',
      ]
    } else if (projectId) {
      return [
        'What is the current phase?',
        'Show me project insights',
        'What are the next steps?',
      ]
    } else {
      return [
        'How can you help me?',
        'What features do you have?',
        'Guide me through SDLC',
      ]
    }
  }

  return (
    <aside className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-96 bg-white border-l border-gray-200 flex flex-col shadow-lg z-40">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-lg font-semibold">AI Copilot</h3>
          </div>
          {phaseNumber === 5 && (
            <span className="px-2 py-0.5 text-xs bg-green-400 text-green-900 rounded-full font-medium flex items-center space-x-1">
              <Code className="w-3 h-3" />
              <span>Code Modify</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-primary-100">{contextLabel}</span>
        </div>
        {phaseNumber === 5 && (
          <div className="mt-2 text-xs text-primary-100 bg-white/10 rounded px-2 py-1">
            {selectedStory ? (
              <>
                <div className="flex items-center space-x-1">
                  <Code className="w-3 h-3" />
                  <span className="font-medium">Story #{selectedStory.id}</span>
                </div>
                <div className="mt-0.5">💡 Ask me to modify this code!</div>
              </>
            ) : (
              <span>💡 Generate code first, then ask me to modify it!</span>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
        {messages.length === 0 && !isLoading && (
          <div className="text-center mt-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary-300" />
            <p className="text-lg font-medium text-gray-700">
              {projectName && phaseNumber 
                ? `${projectName} - Phase ${phaseNumber}` 
                : phaseNumber 
                ? `Phase ${phaseNumber} Assistant` 
                : projectName 
                ? `${projectName} Assistant`
                : 'Ask me anything!'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {phaseNumber === 1 && 'I can help with requirements gathering, PRD creation, and business analysis.'}
              {phaseNumber === 2 && 'I can help with sprint planning, epics, user stories, and effort estimation.'}
              {phaseNumber === 3 && 'I can help with architecture, high-level design (HLD), system components, and E2E flow design.'}
              {phaseNumber === 4 && 'I can help with detailed technical design (LLD), database schemas, API specs, and integration patterns.'}
              {phaseNumber === 5 && 'I can help you modify code interactively! Just ask me to add features, fix issues, optimize, or improve your code.'}
              {phaseNumber === 6 && 'I can help with testing, QA, test automation, and quality assurance.'}
              {phaseNumber === 7 && 'I can help with deployment, CI/CD, monitoring, and operations.'}
              {!phaseNumber && projectId && `I can help you with ${projectName || 'this project'} and guide you through the SDLC phases.`}
              {!phaseNumber && !projectId && 'I can help you with project management, SDLC guidance, and more.'}
            </p>
            
            {/* Suggested Questions */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 mb-3">
                <Lightbulb className="w-3 h-3" />
                <span>Try asking:</span>
              </div>
              {getSuggestedQuestions().map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuestionClick(question)}
                  className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-lg shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-100' : 'text-gray-500'}`}>
                {msg.timestamp}
              </p>
              {msg.sender === 'ai' && msg.confidence && (
                <p className="text-xs text-gray-600 mt-1">Confidence: {msg.confidence}%</p>
              )}
              {msg.sender === 'ai' && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Related questions:</p>
                  <div className="space-y-1">
                    {msg.suggestedQuestions.map((q, qIndex) => (
                      <button
                        key={qIndex}
                        onClick={() => handleSuggestedQuestionClick(q)}
                        className="w-full text-left text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-3 rounded-lg shadow-sm bg-white border border-gray-200 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              <p className="text-sm text-gray-600">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Ask AI Copilot..."
            className="flex-1 input resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            className="btn-primary p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || input.trim() === ''}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </aside>
  )
}

export default AIChatSidebar
