import React, { useState, useEffect } from 'react';
import { Github, RefreshCw, GitBranch, Plus, AlertCircle, CheckCircle, Code2 } from 'lucide-react';
import api from '../../services/api';

interface CodeFile {
  name: string;
  content: string;
  path: string;
}

interface Repository {
  id: string;
  name: string;
  url: string;
  description: string;
}

interface Branch {
  name: string;
  sha: string;
  protected: boolean;
}

interface EnhancedGitHubIntegrationProps {
  projectId: number;
  epicId: string;
  epicTitle: string;
  storyId: string;
  storyTitle: string;
  codeFiles: CodeFile[];
  onPullSuccess?: (files: CodeFile[]) => void;
}

export const EnhancedGitHubIntegration: React.FC<EnhancedGitHubIntegrationProps> = ({
  projectId,
  epicId,
  epicTitle,
  storyId,
  storyTitle,
  codeFiles,
  onPullSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'push' | 'pull' | 'manage'>('push');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedPushFiles, setSelectedPushFiles] = useState<Set<string>>(new Set());
  const [selectedPullFiles, setSelectedPullFiles] = useState<Set<string>>(new Set());
  const [pullFiles, setPullFiles] = useState<CodeFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [commitMessage, setCommitMessage] = useState(
    `Epic #${epicId} - ${epicTitle} | Story #${storyId} - ${storyTitle}`
  );
  const [newRepoName, setNewRepoName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [showCreateBranch, setShowCreateBranch] = useState(false);

  // Load repositories on mount
  useEffect(() => {
    loadRepositories();
  }, [projectId]);

  // Load branches when repo changes
  useEffect(() => {
    if (selectedRepo) {
      loadBranches();
    }
  }, [selectedRepo]);

  const loadRepositories = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/github/repos/${projectId}`);
      if (response.data.success && response.data.repositories) {
        setRepositories(response.data.repositories);
      }
    } catch (err: any) {
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    if (!selectedRepo) return;
    setLoading(true);
    try {
      const parts = selectedRepo.url.split('/');
      const owner = parts[parts.length - 2];
      const name = parts[parts.length - 1];
      const response = await api.get(
        `/github/branches/${projectId}?repo_owner=${owner}&repo_name=${name}`
      );
      if (response.data.success && response.data.branches) {
        setBranches(response.data.branches);
        if (response.data.branches.length > 0) {
          setSelectedBranch(response.data.branches[0].name);
        }
      }
    } catch (err: any) {
      setError('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo);
    setSelectedBranch('');
    setBranches([]);
  };

  const handlePushCode = async () => {
    if (!selectedRepo || !selectedBranch) {
      setError('Please select a repository and branch');
      return;
    }

    if (selectedPushFiles.size === 0) {
      setError('Please select at least one file to push');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const filesToPush = codeFiles.filter(f => selectedPushFiles.has(f.name));
      const parts = selectedRepo.url.split('/');
      const owner = parts[parts.length - 2];
      const name = parts[parts.length - 1];

      const response = await api.post(`/github/push-code-with-context/${projectId}`, {
        repo_owner: owner,
        repo_name: name,
        branch_name: selectedBranch,
        epic_id: epicId,
        epic_title: epicTitle,
        story_id: storyId,
        story_title: storyTitle,
        code_files: filesToPush,
        commit_message: commitMessage,
      });

      if (response.data.success) {
        setSuccess(`✅ Pushed ${response.data.files_pushed} files successfully!`);
        setSelectedPushFiles(new Set());
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.data.detail || 'Push failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Push failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePullCode = async () => {
    if (!selectedRepo || !selectedBranch) {
      setError('Please select a repository and branch');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const parts = selectedRepo.url.split('/');
      const owner = parts[parts.length - 2];
      const name = parts[parts.length - 1];
      const filePaths = selectedPullFiles.size > 0 ? Array.from(selectedPullFiles) : [];

      const response = await api.post(`/github/pull-code/${projectId}`, {
        repo_owner: owner,
        repo_name: name,
        branch_name: selectedBranch,
        file_paths: filePaths,
        epic_id: epicId,
        story_id: storyId,
      });

      if (response.data.success && response.data.files) {
        setPullFiles(response.data.files);
        onPullSuccess?.(response.data.files);
        setSuccess(`✅ Pulled ${response.data.count} file(s) successfully!`);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.data.detail || 'Pull failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Pull failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRepository = async () => {
    if (!newRepoName.trim()) {
      setError('Please enter a repository name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/github/create-repository/${projectId}`, {
        repo_name: newRepoName,
        description: `Epic #${epicId}: ${epicTitle} | Story #${storyId}: ${storyTitle}`,
        is_private: true,
        epic_id: epicId,
        epic_title: epicTitle,
        story_id: storyId,
        story_title: storyTitle,
      });

      if (response.data.success) {
        setSuccess(`✅ Repository created successfully!`);
        setNewRepoName('');
        setShowCreateRepo(false);
        setTimeout(() => {
          loadRepositories();
          setSuccess('');
        }, 2000);
      } else {
        setError(response.data.detail || 'Failed to create repository');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create repository');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!selectedRepo || !newBranchName.trim()) {
      setError('Please select a repository and enter a branch name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const parts = selectedRepo.url.split('/');
      const owner = parts[parts.length - 2];
      const name = parts[parts.length - 1];

      const response = await api.post(`/github/create-branch/${projectId}`, {
        repo_owner: owner,
        repo_name: name,
        branch_name: newBranchName,
        base_branch: selectedBranch || 'main',
        epic_id: epicId,
        epic_title: epicTitle,
        story_id: storyId,
        story_title: storyTitle,
      });

      if (response.data.success) {
        setSuccess(`✅ Branch created successfully!`);
        setNewBranchName('');
        setShowCreateBranch(false);
        setSelectedBranch(response.data.branch_name);
        setTimeout(() => {
          loadBranches();
          setSuccess('');
        }, 2000);
      } else {
        setError(response.data.detail || 'Failed to create branch');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  const togglePushFile = (fileName: string) => {
    const newSelected = new Set(selectedPushFiles);
    if (newSelected.has(fileName)) {
      newSelected.delete(fileName);
    } else {
      newSelected.add(fileName);
    }
    setSelectedPushFiles(newSelected);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Github className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">GitHub Integration</h2>
            <p className="text-sm text-gray-600 mt-1">
              Epic #{epicId} ({epicTitle}) | Story #{storyId} ({storyTitle})
            </p>
          </div>
        </div>
        <button
          onClick={loadRepositories}
          disabled={loading}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('push')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'push'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📤 Push Code ({selectedPushFiles.size}/{codeFiles.length})
        </button>
        <button
          onClick={() => setActiveTab('pull')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'pull'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📥 Pull Code
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'manage'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          ⚙️ Manage
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Common Selection */}
      <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
        {/* Repository Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Repository
          </label>
          <select
            value={selectedRepo?.id || ''}
            onChange={(e) => {
              const repo = repositories.find(r => r.id === e.target.value);
              if (repo) handleRepoSelect(repo);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a repository...</option>
            {repositories.map(repo => (
              <option key={repo.id} value={repo.id}>
                {repo.name}
              </option>
            ))}
          </select>
        </div>

        {/* Branch Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Branch
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={!selectedRepo || branches.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Select a branch...</option>
            {branches.map(branch => (
              <option key={branch.sha} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PUSH TAB */}
      {activeTab === 'push' && (
        <div className="space-y-6">
          {/* Files to Push */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Files to Push ({selectedPushFiles.size}/{codeFiles.length})
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
              {codeFiles.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No code files available</p>
              ) : (
                <div className="space-y-2">
                  {codeFiles.map(file => (
                    <label key={file.name} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPushFiles.has(file.name)}
                        onChange={() => togglePushFile(file.name)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <Code2 className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-800 font-medium flex-1">{file.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Commit Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Commit Message
            </label>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter commit message..."
            />
          </div>

          {/* Push Button */}
          <button
            onClick={handlePushCode}
            disabled={loading || !selectedRepo || !selectedBranch || selectedPushFiles.size === 0}
            className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            <Github className="w-5 h-5" />
            {loading ? 'Pushing...' : `Push ${selectedPushFiles.size} File(s) to GitHub`}
          </button>
        </div>
      )}

      {/* PULL TAB */}
      {activeTab === 'pull' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            💡 Select files to pull specific code, or leave empty to pull all files
          </p>

          {/* Pull Button */}
          <button
            onClick={handlePullCode}
            disabled={loading || !selectedRepo || !selectedBranch}
            className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            <Github className="w-5 h-5" />
            {loading ? 'Pulling...' : `Pull Code from ${selectedRepo?.name || 'GitHub'}`}
          </button>

          {/* Pulled Files Display */}
          {pullFiles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Pulled Files ({pullFiles.length})
              </h3>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {pullFiles.map(file => (
                    <div key={file.name} className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200">
                      <Code2 className="w-4 h-4 text-green-500" />
                      <span className="text-gray-800 font-medium flex-1">{file.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {(file.content?.length || 0)} bytes
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANAGE TAB */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          {/* Create New Repository */}
          <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Repository
              </h3>
              <button
                onClick={() => setShowCreateRepo(!showCreateRepo)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                {showCreateRepo ? 'Cancel' : 'Create'}
              </button>
            </div>
            {showCreateRepo && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="Repository name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreateRepository}
                  disabled={loading || !newRepoName.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
                >
                  {loading ? 'Creating...' : 'Create Repository'}
                </button>
              </div>
            )}
          </div>

          {/* Create New Branch */}
          <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Create New Branch
              </h3>
              <button
                onClick={() => setShowCreateBranch(!showCreateBranch)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                {showCreateBranch ? 'Cancel' : 'Create'}
              </button>
            </div>
            {showCreateBranch && (
              <div className="space-y-4">
                {!selectedRepo && (
                  <p className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                    ⚠️ Select a repository first
                  </p>
                )}
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Branch name (e.g., feature/epic-1-story-5)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreateBranch}
                  disabled={loading || !newBranchName.trim() || !selectedRepo}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
                >
                  {loading ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            )}
          </div>

          {/* Current Selection Summary */}
          {selectedRepo && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Current Selection</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <span className="font-semibold">Repository:</span>
                  <p className="text-gray-600">{selectedRepo.name}</p>
                </div>
                <div>
                  <span className="font-semibold">Branch:</span>
                  <p className="text-gray-600">{selectedBranch || 'Not selected'}</p>
                </div>
                <div>
                  <span className="font-semibold">Epic:</span>
                  <p className="text-gray-600">#{epicId} - {epicTitle}</p>
                </div>
                <div>
                  <span className="font-semibold">Story:</span>
                  <p className="text-gray-600">#{storyId} - {storyTitle}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedGitHubIntegration;
