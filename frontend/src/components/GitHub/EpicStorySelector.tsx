import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, BookOpen, FileText, Code } from 'lucide-react'

interface Epic {
  id: string | number
  title: string
  description?: string
}

interface UserStory {
  id: string | number
  epic_id?: string | number
  epicId?: string | number
  title: string
  description?: string
  acceptance_criteria?: string
  acceptanceCriteria?: string
}

interface EpicStorySelectorProps {
  epics: Epic[]
  stories: UserStory[]
  selectedEpic: string | number
  onEpicChange: (epicId: string | number) => void
  selectedStory: string | number
  onStoryChange: (storyId: string | number) => void
}

export const EpicStorySelector = ({
  epics,
  stories,
  selectedEpic,
  onEpicChange,
  selectedStory,
  onStoryChange
}: EpicStorySelectorProps) => {
  const [expandedEpic, setExpandedEpic] = useState<string | number | null>(selectedEpic)
  const [expandedStory, setExpandedStory] = useState<string | number | null>(selectedStory)

  // Get stories for selected epic
  const filteredStories = useMemo(() => {
    if (!selectedEpic) return stories
    return stories.filter(s => {
      const storyEpicId = String(s.epic_id || s.epicId || '')
      return storyEpicId === String(selectedEpic)
    })
  }, [stories, selectedEpic])

  // Get current selections
  const currentEpic = epics.find(e => String(e.id) === String(selectedEpic))
  const currentStory = stories.find(s => String(s.id) === String(selectedStory))

  const handleEpicSelect = (epicId: string | number) => {
    onEpicChange(epicId)
    setExpandedEpic(epicId)
    // Clear story selection when changing epic
    onStoryChange('')
    setExpandedStory(null)
  }

  const handleStorySelect = (storyId: string | number) => {
    onStoryChange(storyId)
    setExpandedStory(storyId)
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2 mb-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span>Select Epic and User Story for GitHub Push</span>
        </h2>
        <p className="text-sm text-gray-600">
          Choose an epic and user story to push their generated code to GitHub with full context tracking.
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Epics Column */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Epics</span>
            {currentEpic && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {currentEpic.title}
              </span>
            )}
          </h3>

          {epics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No epics available</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {epics.map(epic => (
                <div key={epic.id}>
                  {/* Epic Item */}
                  <div
                    onClick={() => handleEpicSelect(epic.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      String(selectedEpic) === String(epic.id)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedEpic(expandedEpic === epic.id ? null : epic.id)
                        }}
                        className="mt-0.5 text-gray-500 hover:text-gray-700"
                      >
                        {expandedEpic === epic.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          Epic {epic.id}: {epic.title}
                        </div>
                        {epic.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {epic.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Epic Details (expanded) */}
                  {expandedEpic === epic.id && epic.description && (
                    <div className="ml-3 mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700 text-sm">
                      {epic.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stories Column */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-green-600" />
            <span>User Stories</span>
            {currentStory && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                {currentStory.title}
              </span>
            )}
          </h3>

          {filteredStories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">
                {selectedEpic ? 'No stories for selected epic' : 'Select an epic first'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStories.map(story => (
                <div key={story.id}>
                  {/* Story Item */}
                  <div
                    onClick={() => handleStorySelect(story.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      String(selectedStory) === String(story.id)
                        ? 'border-green-600 bg-green-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedStory(expandedStory === story.id ? null : story.id)
                        }}
                        className="mt-0.5 text-gray-500 hover:text-gray-700"
                      >
                        {expandedStory === story.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Code className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="font-medium text-gray-900">
                            Story {story.id}: {story.title}
                          </span>
                        </div>
                        {story.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {story.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Story Details (expanded) */}
                  {expandedStory === story.id && (
                    <div className="ml-3 mt-2 space-y-2 text-sm">
                      {story.description && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded text-gray-700">
                          <strong>Description:</strong><br />
                          {story.description}
                        </div>
                      )}
                      {(story.acceptance_criteria || story.acceptanceCriteria) && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-gray-700">
                          <strong>Acceptance Criteria:</strong><br />
                          {story.acceptance_criteria || story.acceptanceCriteria}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedEpic && selectedStory && (
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">✅ Selection Ready for GitHub Push</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Epic:</span>
              <p className="font-medium text-gray-900">#{selectedEpic} - {currentEpic?.title}</p>
            </div>
            <div>
              <span className="text-gray-600">Story:</span>
              <p className="font-medium text-gray-900">#{selectedStory} - {currentStory?.title}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            When you push to GitHub, all commits will include this context for tracking and audit purposes.
          </p>
        </div>
      )}
    </div>
  )
}
