import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface GitHubIntegration {
  connected: boolean;
  username?: string;
  org_name?: string;
  default_repo?: string;
  default_branch?: string;
}

interface GitHubConnectionDialogProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GitHubConnectionDialog: React.FC<GitHubConnectionDialogProps> = ({
  projectId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [orgName, setOrgName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testingToken, setTestingToken] = useState(false);

  // Load default config on mount
  useEffect(() => {
    const loadDefaultConfig = async () => {
      try {
        const response = await api.get('/github/default-config');
        if (response.data.success && response.data.config) {
          const config = response.data.config;
          setToken(config.token || '');
          if (config.username) setUsername(config.username);
          if (config.org_name) setOrgName(config.org_name);
          if (config.repo_url) setRepoUrl(config.repo_url);
          if (config.branch) setDefaultBranch(config.branch);
        }
      } catch (err) {
        console.log('Could not load default config', err);
      }
    };

    if (isOpen) {
      loadDefaultConfig();
    }
  }, [isOpen]);

  const handleTestToken = async () => {
    if (!token) {
      setError('Please enter a token first');
      return;
    }

    setTestingToken(true);
    setError('');

    try {
      const response = await api.post('/github/test-token', null, {
        params: { token }
      });

      if (response.data.valid) {
        setSuccess(`✅ Token is valid! Logged in as: ${response.data.username}`);
        // Auto-populate username if not set
        if (!username) {
          setUsername(response.data.username);
        }
      } else {
        setError(response.data.message || 'Token is invalid');
      }
    } catch (err: any) {
      setError(`Failed to validate token: ${err.message}`);
    } finally {
      setTestingToken(false);
    }
  };

  const handleConnect = async () => {
    if (!token || !username || !repoUrl) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/github/connect/${projectId}`, {
        github_token: token,
        github_username: username,
        github_org_name: orgName || undefined,
        default_repo_url: repoUrl,
        default_branch: defaultBranch
      });

      if (response.data.success) {
        setSuccess('GitHub connected successfully!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(response.data.detail || 'Failed to connect GitHub');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Connect GitHub</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Personal Access Token *
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Create at: github.com/settings/tokens
            </p>
            <button
              onClick={handleTestToken}
              disabled={testingToken || !token}
              className="mt-2 w-full px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              {testingToken ? 'Testing...' : 'Test Token'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Username *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-github-username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name (Optional)
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="your-org-name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Repository URL *
            </label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Branch
            </label>
            <input
              type="text"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GitHubConnectionDialog;
