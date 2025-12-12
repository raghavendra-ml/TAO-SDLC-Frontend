import React, { useState } from 'react'
import { X } from 'lucide-react'
import { createProject } from '../../services/api'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await createProject({ name, description })
      setName('')
      setDescription('')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error creating project:', err)
      
      if (err.response) {
        // Server responded with error
        const detail = err.response?.data?.detail || 'Failed to create project'
        setError(detail)
        console.error('Server error:', err.response.status, detail)
      } else if (err.request) {
        // Request was made but no response
        setError('No response from server. Please check if the backend is running.')
        console.error('No response from server')
      } else {
        // Something else happened
        setError('Failed to create project. Please try again.')
        console.error('Error:', err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Create New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g., Zero-Emission Trucking Platform"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input min-h-24"
                placeholder="A trucking project in the automobile industry focusing on modernizing logistics through zero-emission trucks and fleet management..."
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600">
            💡 <strong>Tip:</strong> After creating the project, the AI will guide you through all 6 phases interactively!
          </p>
        </div>
      </div>
    </div>
  )
}

export default CreateProjectModal

