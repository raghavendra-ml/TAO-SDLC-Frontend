import React, { useState } from 'react';
import api from '../../services/api';
import GitHubConnectionDialog from './GitHubConnectionDialog';
import RepositoryBrowser from './RepositoryBrowser';
import CodePullDialog from './CodePullDialog';

interface Phase5GitHubActionsProps {
  projectId: number;
  epicId: string;
  userStoryId: string;
  userStoryTitle: string;
  onPushSuccess?: () => void;
}

export const Phase5GitHubActions: React.FC<Phase5GitHubActionsProps> = ({
  projectId,
  epicId,
  userStoryId,
  userStoryTitle,
  onPushSuccess
}) => {
  const [githubConnected, setGithubConnected] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showRepositoryBrowser, setShowRepositoryBrowser] = useState(false);
  const [showCodePullDialog, setShowCodePullDialog] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const [pushError, setPushError] = useState('');

  const checkGitHubConnection = async () => {
    try {
      const response = await api.get(`/github/integration/${projectId}`);
      const data = response.data;
      setGithubConnected(data.connected || false);
    } catch (err) {
      setGithubConnected(false);
    }
  };

  React.useEffect(() => {
    checkGitHubConnection();
  }, [projectId]);

  const handlePushCode = async () => {
    if (!selectedRepo || !selectedBranch) {
      setPushError('Please select a repository and branch');
      return;
    }

    const commitMessage = pushMessage || `Generated code for Epic #${epicId} Story #${userStoryId}: ${userStoryTitle}`;

    setPushing(true);
    setPushError('');

    try {
      // Extract owner and repo name
      const parts = selectedRepo.url.split('/');
      const repoOwner = parts[parts.length - 2];
      const repoName = parts[parts.length - 1];

      const response = await api.post('/github/push-code', {
        epic_id: epicId,
        user_story_id: userStoryId,
        repo_owner: repoOwner,
        repo_name: repoName,
        branch_name: selectedBranch,
        commit_message: commitMessage,
        create_pr: true
      });

      if (response.data.success) {
        setPushMessage('');
        setSelectedRepo(null);
        setSelectedBranch('');
        onPushSuccess?.();
        alert(
          `✅ Code pushed successfully!\n\nCommit: ${response.data.commit_sha}\nURL: ${response.data.commit_url}`
        );
      } else {
        setPushError(response.data.error || 'Failed to push code');
      }
    } catch (err: any) {
      setPushError(err.message || 'Push failed');
    } finally {
      setPushing(false);
    }
  };

  const handleRepositorySelect = (repo: any, branch: string) => {
    setSelectedRepo(repo);
    setSelectedBranch(branch);
  };

  if (!githubConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-yellow-900">GitHub Not Connected</h4>
            <p className="text-sm text-yellow-800 mt-1">
              Connect your GitHub account to push generated code to repositories
            </p>
          </div>
          <button
            onClick={() => setShowConnectionDialog(true)}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Connect GitHub
          </button>
        </div>

        <GitHubConnectionDialog
          projectId={projectId}
          isOpen={showConnectionDialog}
          onClose={() => setShowConnectionDialog(false)}
          onSuccess={() => {
            checkGitHubConnection();
            setShowConnectionDialog(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Push Section */}
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>📤</span> Push to GitHub
        </h4>

        {pushError && (
          <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
            {pushError}
          </div>
        )}

        <div className="space-y-3">
          {/* Repository Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repository & Branch
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white">
                {selectedRepo ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono">
                      {selectedRepo.name} / {selectedBranch}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedRepo(null);
                        setSelectedBranch('');
                      }}
                      className="text-xs text-gray-500 hover:text-red-600"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">No repository selected</span>
                )}
              </div>
              <button
                onClick={() => setShowRepositoryBrowser(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Browse
              </button>
            </div>
          </div>

          {/* Commit Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commit Message (Optional)
            </label>
            <textarea
              value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
              placeholder={`Generated code for Epic #${epicId} Story #${userStoryId}: ${userStoryTitle}`}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Push Button */}
          <button
            onClick={handlePushCode}
            disabled={pushing || !selectedRepo || !selectedBranch}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
          >
            {pushing ? 'Pushing...' : '📤 Push Code'}
          </button>
        </div>
      </div>

      {/* Pull Section */}
      <div className="border border-gray-300 rounded-lg p-4 bg-blue-50">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>📥</span> Pull Existing Code
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          View what code already exists in your repository before pushing
        </p>
        <button
          onClick={() => setShowCodePullDialog(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          📥 View Repository Structure
        </button>
      </div>

      {/* Dialogs */}
      <RepositoryBrowser
        projectId={projectId}
        epicId={epicId}
        userStoryId={userStoryId}
        isOpen={showRepositoryBrowser}
        onClose={() => setShowRepositoryBrowser(false)}
        onSelect={handleRepositorySelect}
      />

      <CodePullDialog
        projectId={projectId}
        epicId={epicId}
        userStoryId={userStoryId}
        isOpen={showCodePullDialog}
        onClose={() => setShowCodePullDialog(false)}
      />
    </div>
  );
};

export default Phase5GitHubActions;
