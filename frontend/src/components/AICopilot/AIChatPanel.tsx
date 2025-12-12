import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, X, Minimize2, Maximize2, Sparkles } from 'lucide-react'
import axios from 'axios'
import { useLocation } from 'react-router-dom'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  confidence?: number
  sources?: string[]
}

interface AIChatPanelProps {
  projectId?: number
  phaseId?: number
}

const AIChatPanel = ({ projectId, phaseId }: AIChatPanelProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  // Determine context type based on location
  const contextType = projectId ? 'project' : 'dashboard'

  // Welcome message based on context
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'ai',
        content: contextType === 'dashboard'
          ? "👋 Hi! I'm your AI Copilot. I can help you with project management, status updates, and SDLC guidance. Ask me anything about your projects!"
          : "👋 Hi! I'm your AI Copilot for this project. I can guide you through phases, answer questions about requirements, risks, stakeholders, and more. What would you like to know?",
        timestamp: new Date(),
        confidence: 100,
        sources: ['AI Copilot']
      }
      setMessages([welcomeMessage])
    }
  }, [contextType, messages.length])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Enhanced context gathering for Phase 5
      let enhancedContext = {}
      if (phaseId === 5) {
        const phase5Context = sessionStorage.getItem('phase5_current_story')
        if (phase5Context) {
          try {
            const parsedContext = JSON.parse(phase5Context)
            enhancedContext = {
              phase5_context: parsedContext,
              has_code_context: Boolean(parsedContext.currentFile),
              has_selection: Boolean(parsedContext.selectedText),
              cursor_info: parsedContext.cursor || {}
            }
          } catch (e) {
            console.error('Error parsing Phase 5 context:', e)
          }
        }
      }

      // Prepare conversation history (last 5 messages for context)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

      const response = await axios.post('/api/chat/query', {
        query: inputValue,
        context_type: contextType,
        project_id: projectId,
        phase_id: phaseId,
        conversation_history: conversationHistory,
        enhanced_context: enhancedContext
      })

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.data.response,
        timestamp: new Date(),
        confidence: response.data.confidence_score,
        sources: response.data.sources
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error: any) {
      console.error('Chat error:', error)
      console.error('Error details:', error.response?.data)
      
      let errorContent = "I'm sorry, I encountered an error. Please try again or rephrase your question."
      
      // Show more specific error if available
      if (error.response?.data?.detail) {
        errorContent = `Error: ${error.response.data.detail}`
      } else if (error.message) {
        errorContent = `Error: ${error.message}`
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: errorContent,
        timestamp: new Date(),
        confidence: 0,
        sources: ['Error']
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Suggested questions based on context
  const suggestedQuestions = contextType === 'dashboard'
    ? [
        "How many projects are there?",
        "Show me active projects",
        "What approvals are pending?",
        "How do I create a new project?"
      ]
    : phaseId === 5
    ? [
        "Explain this code section",
        "Find bugs in the current file",
        "Add error handling to selected code",
        "Optimize this implementation",
        "Generate unit tests for this function"
      ]
    : [
        "What should I do next?",
        "Show me the requirements",
        "What are the risks?",
        "What's the project status?"
      ]

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group z-50"
        title="AI Copilot"
      >
        <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></span>
          </div>
          <div>
            <h3 className="font-semibold">AI Copilot</h3>
            <p className="text-xs text-blue-100">
              {contextType === 'dashboard' ? 'Dashboard Assistant' : 'Project Assistant'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="h-[calc(100%-180px)] overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  } rounded-lg p-3 shadow-sm`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'ai' && <Bot className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      {message.type === 'ai' && message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                          <span className="font-semibold">Sources:</span> {message.sources.join(', ')}
                          {message.confidence && (
                            <span className="ml-2">
                              • Confidence: {message.confidence}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {message.type === 'user' && <User className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-500 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-end space-x-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AIChatPanel
