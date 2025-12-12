import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Repository {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
}

interface RepositoryBrowserProps {
  projectId: number;
  epicId: string;
  userStoryId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (repo: Repository, branch: string) => void;
}

export const RepositoryBrowser: React.FC<RepositoryBrowserProps> = ({
  projectId,
  epicId,
  userStoryId,
  isOpen,
  onClose,
  onSelect
}) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRepositories();
    }
  }, [isOpen]);

  const loadRepositories = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/github/repos/${projectId}`);
      const data = response.data;
      if (data.success) {
        setRepositories(data.repositories || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepo = async (repo: Repository) => {
    setSelectedRepo(repo);
    setSelectedBranch('');
    setBranches([]);

    // Extract owner and repo name from URL
    const parts = repo.url.split('/');
    const owner = parts[parts.length - 2];
    const name = parts[parts.length - 1];

    // Load branches
    setLoading(true);
    try {
      const response = await api.get(
        `/github/branches/${projectId}?repo_owner=${owner}&repo_name=${name}`
      );
      const data = response.data;
      if (data.success) {
        setBranches(data.branches || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBranch = (branchName: string) => {
    setSelectedBranch(branchName);
  };

  const handleConfirm = () => {
    if (selectedRepo && selectedBranch) {
      onSelect(selectedRepo, selectedBranch);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Select Repository & Branch</h2>
        <p className="text-sm text-gray-600 mb-4">
          Epic #{epicId} • Story #{userStoryId}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Repositories */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Repositories</h3>
            {loading ? (
              <div className="text-gray-500">Loading repositories...</div>
            ) : repositories.length === 0 ? (
              <div className="text-gray-500">No repositories found</div>
            ) : (
              <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
                {repositories.map((repo) => (
                  <div
                    key={repo.url}
                    onClick={() => handleSelectRepo(repo)}
                    className={`p-3 cursor-pointer border-b hover:bg-blue-50 ${
                      selectedRepo?.url === repo.url ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-800">{repo.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {repo.language} • ⭐ {repo.stars}
                    </div>
                    {repo.description && (
                      <div className="text-xs text-gray-600 mt-1">{repo.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Branches */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Branches</h3>
            {!selectedRepo ? (
              <div className="text-gray-500">Select a repository first</div>
            ) : loading ? (
              <div className="text-gray-500">Loading branches...</div>
            ) : branches.length === 0 ? (
              <div className="text-gray-500">No branches found</div>
            ) : (
              <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
                {branches.map((branch) => (
                  <div
                    key={branch.name}
                    onClick={() => handleSelectBranch(branch.name)}
                    className={`p-3 cursor-pointer border-b hover:bg-green-50 ${
                      selectedBranch === branch.name ? 'bg-green-100' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-800">{branch.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {branch.is_default && '(default) '}
                          {branch.commit}
                        </div>
                      </div>
                      {branch.protected && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                          Protected
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            onClick={handleConfirm}
            disabled={loading || !selectedRepo || !selectedBranch}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepositoryBrowser;
