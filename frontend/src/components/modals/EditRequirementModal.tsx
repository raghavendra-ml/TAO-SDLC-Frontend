import { useState, useEffect } from 'react'
import { X, Save, Target, FileText, ListChecks } from 'lucide-react'
import { GherkinRequirement } from '../Requirements/GherkinViewer'

interface EditRequirementModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (updatedRequirement: GherkinRequirement) => void
  requirement: GherkinRequirement | null
}

const EditRequirementModal = ({ isOpen, onClose, onSave, requirement }: EditRequirementModalProps) => {
  const [editedRequirementText, setEditedRequirementText] = useState('')
  const [editedDerivedFrom, setEditedDerivedFrom] = useState('')
  const [editedStakeholderActor, setEditedStakeholderActor] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedPriority, setEditedPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Medium')
  const [editedCategory, setEditedCategory] = useState('Functional')
  const [editedStatus, setEditedStatus] = useState<'draft' | 'review' | 'approved'>('draft')

  useEffect(() => {
    if (isOpen && requirement) {
      setEditedRequirementText(requirement.requirement || '')
      setEditedPriority(requirement.priority || 'Medium')
      setEditedCategory(requirement.category || 'Functional')
      setEditedStatus(requirement.status || 'draft')

      if (requirement.type === 'Functional') {
        setEditedDerivedFrom(requirement.derived_from || '')
        setEditedStakeholderActor(requirement.stakeholder_actor || '')
        setEditedDescription('') // Reset description for Functional
      } else if (requirement.type === 'Non-Functional') {
        setEditedDescription(requirement.description || '')
        setEditedDerivedFrom('') // Reset for Non-Functional
        setEditedStakeholderActor('') // Reset for Non-Functional
      } else {
        // Handle LegacyGherkinRequirement if needed, or set defaults
        setEditedDerivedFrom('')
        setEditedStakeholderActor('')
        setEditedDescription('')
      }
    } else {
      // Reset form when modal closes
      setEditedRequirementText('')
      setEditedDerivedFrom('')
      setEditedStakeholderActor('')
      setEditedDescription('')
      setEditedPriority('Medium')
      setEditedCategory('Functional')
      setEditedStatus('draft')
    }
  }, [isOpen, requirement])

  const handleSave = () => {
    if (requirement) {
      let updatedRequirement: GherkinRequirement

      if (requirement.type === 'Functional') {
        updatedRequirement = {
          ...requirement,
          requirement: editedRequirementText,
          derived_from: editedDerivedFrom,
          stakeholder_actor: editedStakeholderActor,
          priority: editedPriority,
          category: editedCategory,
          status: editedStatus,
        }
      } else if (requirement.type === 'Non-Functional') {
        updatedRequirement = {
          ...requirement,
          requirement: editedRequirementText,
          description: editedDescription,
          priority: editedPriority,
          category: editedCategory,
          status: editedStatus,
        }
      } else {
        // Handle LegacyGherkinRequirement if needed, for now just pass with common fields
        updatedRequirement = {
          ...requirement,
          priority: editedPriority,
          category: editedCategory,
          status: editedStatus,
        } as GherkinRequirement // Cast back to GherkinRequirement
      }
      onSave(updatedRequirement)
    }
  }

  if (!isOpen || !requirement) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Requirement</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Requirement Text / Objective / Feature */}
          <div>
            <label htmlFor="requirementText" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Target className="w-4 h-4 mr-2 text-primary-600" />
              {requirement.type === 'Functional' || requirement.type === 'Non-Functional' ? 'Requirement' : 'Feature / Objective'}
            </label>
            <textarea
              id="requirementText"
              value={editedRequirementText}
              onChange={(e) => setEditedRequirementText(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"
              rows={2}
              placeholder={requirement.type === 'Functional' || requirement.type === 'Non-Functional' ? 'Enter requirement' : 'Enter objective or feature'}
            />
          </div>

          {/* Functional Specific Fields */}
          {requirement.type === 'Functional' && (
            <>
              <div>
                <label htmlFor="derivedFrom" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-primary-600" />
                  Derived From
                </label>
                <input
                  type="text"
                  id="derivedFrom"
                  value={editedDerivedFrom}
                  onChange={(e) => setEditedDerivedFrom(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"
                  placeholder="e.g., Goal: User Management"
                />
              </div>
              <div>
                <label htmlFor="stakeholderActor" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <ListChecks className="w-4 h-4 mr-2 text-primary-600" />
                  Stakeholder / Actor
                </label>
                <input
                  type="text"
                  id="stakeholderActor"
                  value={editedStakeholderActor}
                  onChange={(e) => setEditedStakeholderActor(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"
                  placeholder="e.g., User, Admin, System"
                />
              </div>
            </>
          )}

          {/* Non-Functional Specific Fields */}
          {requirement.type === 'Non-Functional' && (
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-primary-600" />
                Description
              </label>
              <textarea
                id="description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"
                rows={2}
                placeholder="Enter detailed description for NFR"
              />
            </div>
          )}

          {/* Priority, Category, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                id="priority"
                value={editedPriority}
                onChange={(e) => setEditedPriority(e.target.value as 'Critical' | 'High' | 'Medium' | 'Low')}
                className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                id="category"
                value={editedCategory}
                onChange={(e) => setEditedCategory(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"
              >
                <option value="Functional">Functional</option>
                <option value="Integration">Integration</option>
                <option value="Security">Security</option>
                <option value="Performance">Performance</option>
                <option value="UI/UX">UI/UX</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="status"
                value={editedStatus}
                onChange={(e) => setEditedStatus(e.target.value as 'draft' | 'review' | 'approved')}
                className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2"
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex items-center space-x-2">
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditRequirementModal
