import { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { X, Plus, GitBranch, Github, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface GitHubOperationsDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: number
  epicId: string
  epicTitle: string
  storyId: string
  storyTitle: string
  codeFiles: Array<{ name: string; content: string }>
  onSuccess?: () => void
}

export const GitHubOperationsDialog = ({
  isOpen,
  onClose,
  projectId,
  epicId,
  epicTitle,
  storyId,
  storyTitle,
  codeFiles,
  onSuccess
}: GitHubOperationsDialogProps) => {
  const [activeTab, setActiveTab] = useState<'create-repo' | 'create-branch' | 'push-code'>('create-repo')
  const [loading, setLoading] = useState(false)
  
  // Create Repository State
  const [repoName, setRepoName] = useState(`${epicTitle.toLowerCase().replace(/\s+/g, '-')}-${storyTitle.toLowerCase().replace(/\s+/g, '-')}`)
  const [repoDescription, setRepoDescription] = useState(`Code for Epic #${epicId}: ${epicTitle} - Story #${storyId}: ${storyTitle}`)
  const [isPrivate, setIsPrivate] = useState(false)
  const [createRepoResult, setCreateRepoResult] = useState<any>(null)
  
  // Create Branch State
  const [branchRepoOwner, setBranchRepoOwner] = useState('')
  const [branchRepoName, setBranchRepoName] = useState('')
  const [baseBranch, setBaseBranch] = useState('main')
  const [branchName, setBranchName] = useState('feature')
  const [createBranchResult, setCreateBranchResult] = useState<any>(null)
  
  // Push Code State
  const [pushRepoOwner, setPushRepoOwner] = useState(createRepoResult?.repository?.owner || '')
  const [pushRepoName, setPushRepoName] = useState(createRepoResult?.repository?.name || '')
  const [pushBranch, setPushBranch] = useState(createBranchResult?.branch?.name || 'main')
  const [commitMessage, setCommitMessage] = useState(`Implement story #${storyId}: ${storyTitle}`)
  const [pushResult, setPushResult] = useState<any>(null)

  const handleCreateRepository = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/github/create-repository/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_name: repoName,
          description: repoDescription,
          is_private: isPrivate,
          epic_id: epicId,
          epic_title: epicTitle,
          story_id: storyId,
          story_title: storyTitle
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create repository: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setCreateRepoResult(result)
        setBranchRepoOwner(result.repository.full_name.split('/')[0])
        setBranchRepoName(result.repository.name)
        setPushRepoOwner(result.repository.full_name.split('/')[0])
        setPushRepoName(result.repository.name)
        
        toast.success(`✅ Repository created: ${result.repository.full_name}`)
        
        // Auto-move to branch creation
        setTimeout(() => setActiveTab('create-branch'), 1000)
      } else {
        toast.error(`Failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating repository:', error)
      toast.error(`Error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBranch = async () => {
    if (!branchRepoOwner || !branchRepoName) {
      toast.error('Please select or create a repository first')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(`/api/github/create-branch/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_owner: branchRepoOwner,
          repo_name: branchRepoName,
          branch_name: branchName,
          base_branch: baseBranch,
          epic_id: epicId,
          epic_title: epicTitle,
          story_id: storyId,
          story_title: storyTitle
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create branch: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setCreateBranchResult(result)
        setPushBranch(result.branch.name)
        
        toast.success(`✅ Branch created: ${result.branch.name}`)
        
        // Auto-move to push code
        setTimeout(() => setActiveTab('push-code'), 1000)
      } else {
        toast.error(`Failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating branch:', error)
      toast.error(`Error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePushCode = async () => {
    if (!pushRepoOwner || !pushRepoName || !pushBranch) {
      toast.error('Please create or select repository and branch first')
      return
    }

    if (codeFiles.length === 0) {
      toast.error('No code files to push')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(`/api/github/push-code-with-context/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_owner: pushRepoOwner,
          repo_name: pushRepoName,
          branch_name: pushBranch,
          epic_id: epicId,
          epic_title: epicTitle,
          story_id: storyId,
          story_title: storyTitle,
          code_files: codeFiles,
          commit_message: commitMessage
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to push code: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setPushResult(result)
        
        toast.success(
          <div>
            <strong>✅ Code pushed!</strong><br/>
            <small>Commit: {result.commit.sha.substring(0, 7)}</small><br/>
            <small>{result.commit.files_pushed} files pushed</small>
          </div>
        )
        
        if (onSuccess) {
          onSuccess()
        }
        
        // Close dialog after success
        setTimeout(onClose, 2000)
      } else {
        toast.error(`Failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error pushing code:', error)
      toast.error(`Error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-bold text-white flex items-center space-x-2">
                      <Github className="w-5 h-5" />
                      <span>GitHub Operations</span>
                    </Dialog.Title>
                    <p className="text-sm text-blue-100 mt-1">
                      Epic #{epicId}: {epicTitle} → Story #{storyId}: {storyTitle}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white hover:bg-white/20 rounded-lg p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50 px-6">
                  <button
                    onClick={() => setActiveTab('create-repo')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'create-repo'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Github className="w-4 h-4" />
                      <span>Create Repository</span>
                      {createRepoResult && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('create-branch')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'create-branch'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                    disabled={!createRepoResult && !branchRepoName}
                  >
                    <div className="flex items-center space-x-2">
                      <GitBranch className="w-4 h-4" />
                      <span>Create Branch</span>
                      {createBranchResult && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('push-code')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'push-code'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                    disabled={!createBranchResult && !pushBranch}
                  >
                    <div className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>Push Code</span>
                      {pushResult && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </div>
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                  {/* Create Repository Tab */}
                  {activeTab === 'create-repo' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Repository Name
                        </label>
                        <input
                          type="text"
                          value={repoName}
                          onChange={(e) => setRepoName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          placeholder="repository-name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={repoDescription}
                          onChange={(e) => setRepoDescription(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                          placeholder="Repository description"
                        />
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="isPrivate"
                          checked={isPrivate}
                          onChange={(e) => setIsPrivate(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                        <label htmlFor="isPrivate" className="text-sm text-gray-700">
                          Create as private repository
                        </label>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                          <strong>Epic Context:</strong><br/>
                          Epic #{epicId}: {epicTitle}<br/>
                          Story #{storyId}: {storyTitle}
                        </p>
                      </div>

                      {createRepoResult && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-green-800">Repository Created!</p>
                              <p className="text-sm text-green-700 mt-1">
                                <strong>{createRepoResult.repository.full_name}</strong><br/>
                                URL: {createRepoResult.repository.url}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Create Branch Tab */}
                  {activeTab === 'create-branch' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Repository Owner
                          </label>
                          <input
                            type="text"
                            value={branchRepoOwner}
                            onChange={(e) => setBranchRepoOwner(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="username"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Repository Name
                          </label>
                          <input
                            type="text"
                            value={branchRepoName}
                            onChange={(e) => setBranchRepoName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="repository-name"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Base Branch
                          </label>
                          <select
                            value={baseBranch}
                            onChange={(e) => setBaseBranch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          >
                            <option value="main">main</option>
                            <option value="develop">develop</option>
                            <option value="master">master</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Branch Name
                          </label>
                          <input
                            type="text"
                            value={branchName}
                            onChange={(e) => setBranchName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="feature"
                          />
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                          <strong>Automatic Branch Naming:</strong><br/>
                          Format: epic-{epicId}-{epicTitle.toLowerCase().substring(0, 10)}/story-{storyId}-{storyTitle.toLowerCase().substring(0, 10)}/{branchName}
                        </p>
                      </div>

                      {createBranchResult && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-green-800">Branch Created!</p>
                              <p className="text-sm text-green-700 mt-1">
                                <strong>{createBranchResult.branch.name}</strong><br/>
                                SHA: {createBranchResult.branch.sha.substring(0, 7)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Push Code Tab */}
                  {activeTab === 'push-code' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Repository Owner
                          </label>
                          <input
                            type="text"
                            value={pushRepoOwner}
                            onChange={(e) => setPushRepoOwner(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="username"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Repository Name
                          </label>
                          <input
                            type="text"
                            value={pushRepoName}
                            onChange={(e) => setPushRepoName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="repository-name"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Branch
                        </label>
                        <input
                          type="text"
                          value={pushBranch}
                          onChange={(e) => setPushBranch(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          placeholder="branch-name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Commit Message
                        </label>
                        <textarea
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                          placeholder="Describe your changes"
                        />
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                          <strong>Files to Push:</strong><br/>
                          {codeFiles.map((f, i) => (
                            <span key={i}>{f.name}{i < codeFiles.length - 1 ? ', ' : ''}</span>
                          ))}
                        </p>
                      </div>

                      {pushResult && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-green-800">Code Pushed!</p>
                              <p className="text-sm text-green-700 mt-1">
                                <strong>Commit:</strong> {pushResult.commit.sha.substring(0, 7)}<br/>
                                <strong>Files:</strong> {pushResult.commit.files_pushed}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (activeTab === 'create-repo') {
                        handleCreateRepository()
                      } else if (activeTab === 'create-branch') {
                        handleCreateBranch()
                      } else if (activeTab === 'push-code') {
                        handlePushCode()
                      }
                    }}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        {activeTab === 'create-repo' && <span>Create Repository</span>}
                        {activeTab === 'create-branch' && <span>Create Branch</span>}
                        {activeTab === 'push-code' && <span>Push Code</span>}
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
