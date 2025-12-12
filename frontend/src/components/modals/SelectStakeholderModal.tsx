import { useState, useEffect } from 'react'
import { X, Search, UserPlus, Loader2 } from 'lucide-react'
import axios from 'axios'
import { getFullApiUrl } from '../../services/api'
import toast from 'react-hot-toast'

interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: string
}

interface SelectStakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (stakeholder: { role: string; name: string; email: string; userId: number }) => void
}

const SelectStakeholderModal = ({ isOpen, onClose, onSelect }: SelectStakeholderModalProps) => {
  const [roles, setRoles] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadRoles()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedRole) {
      loadUsers(selectedRole)
    } else {
      setUsers([])
    }
  }, [selectedRole])

  const loadRoles = async () => {
    setLoadingRoles(true)
    try {
      const response = await axios.get(getFullApiUrl('/api/users/roles/list'))
      setRoles(response.data)
    } catch (error) {
      console.error('Failed to load roles:', error)
      toast.error('Failed to load roles')
    } finally {
      setLoadingRoles(false)
    }
  }

  const loadUsers = async (role: string) => {
    setLoading(true)
    try {
      const response = await axios.get(getFullApiUrl('/api/users/'), {
        params: { role }
      })
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (user: User) => {
    onSelect({
      role: user.role,
      name: user.full_name,
      email: user.email,
      userId: user.id
    })
    onClose()
    setSelectedRole('')
    setSearchTerm('')
    toast.success(`${user.full_name} added as stakeholder`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold">Select Stakeholder from Database</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Role
            </label>
            {loadingRoles ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                <span className="ml-2 text-sm text-gray-500">Loading roles...</span>
              </div>
            ) : (
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="input w-full"
              >
                <option value="">Choose a role...</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Search - Only visible after role selection */}
          {selectedRole && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-10"
              />
            </div>
          )}
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <span className="ml-3 text-gray-500">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {selectedRole ? 'No users found' : 'Please select a role to see available users'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
              </p>
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 group-hover:text-primary-700">
                        {user.full_name}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                    </div>
                    <div className="ml-4 px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full">
                      {user.role}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button onClick={onClose} className="btn-secondary w-full">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default SelectStakeholderModal

