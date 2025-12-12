import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface RepositoryStructureItem {
  name: string;
  type: 'file' | 'dir';
  path: string;
  size?: number;
  url?: string;
}

interface CodePullDialogProps {
  projectId: number;
  epicId: string;
  userStoryId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CodePullDialog: React.FC<CodePullDialogProps> = ({
  projectId,
  epicId,
  userStoryId,
  isOpen,
  onClose
}) => {
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [branch, setBranch] = useState('main');
  const [structure, setStructure] = useState<RepositoryStructureItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  const handleLoadStructure = async () => {
    if (!repoOwner || !repoName) {
      setError('Please enter repository owner and name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.get(
        `/github/structure/${projectId}?repo_owner=${repoOwner}&repo_name=${repoName}&path=${currentPath}`
      );
      const data = response.data;

      if (data.success) {
        setStructure(data.items || []);
      } else {
        setError(data.error || 'Failed to load repository structure');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load structure');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateFolder = (folderPath: string) => {
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(folderPath);
    setStructure([]);
  };

  const handleGoBack = () => {
    if (pathHistory.length > 0) {
      const newHistory = [...pathHistory];
      const previousPath = newHistory.pop() || '';
      setPathHistory(newHistory);
      setCurrentPath(previousPath);
      setStructure([]);
    }
  };

  useEffect(() => {
    if (structure.length === 0 && currentPath !== '' || (currentPath === '' && pathHistory.length === 0)) {
      // Auto-load when we navigate
    }
  }, [currentPath, pathHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Pull Existing Code</h2>
            <p className="text-sm text-gray-600 mt-1">
              Epic #{epicId} • Story #{userStoryId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repository Owner
              </label>
              <input
                type="text"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                placeholder="owner"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repository Name
              </label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="repo-name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleLoadStructure}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Load Repository Structure'}
          </button>
        </div>

        {/* Path Navigation */}
        {currentPath && (
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={handleGoBack}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              ← Back
            </button>
            <span className="text-sm font-mono text-gray-600">{currentPath}</span>
          </div>
        )}

        {/* File Structure */}
        <div className="border border-gray-300 rounded-md p-4 max-h-96 overflow-y-auto">
          {structure.length === 0 && !loading ? (
            <div className="text-gray-500 text-center py-4">
              {repoOwner && repoName
                ? 'No items found. Load structure to see files.'
                : 'Enter repository details and load structure'}
            </div>
          ) : loading ? (
            <div className="text-gray-500 text-center py-4">Loading...</div>
          ) : (
            <div className="space-y-1">
              {structure.map((item) => (
                <div
                  key={item.path}
                  onClick={
                    item.type === 'dir'
                      ? () => handleNavigateFolder(item.path)
                      : undefined
                  }
                  className={`p-2 flex items-center gap-2 rounded ${
                    item.type === 'dir'
                      ? 'cursor-pointer hover:bg-blue-50'
                      : 'text-gray-700'
                  }`}
                >
                  <span className="text-lg">
                    {item.type === 'dir' ? '📁' : '📄'}
                  </span>
                  <span className="font-mono text-sm flex-1">{item.name}</span>
                  {item.size && (
                    <span className="text-xs text-gray-500">
                      {(item.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodePullDialog;
