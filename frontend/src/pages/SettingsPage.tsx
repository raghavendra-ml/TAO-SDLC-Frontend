import { useState } from 'react'
import { Settings, Save, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { getFullApiUrl } from '../services/api'
import { getJiraConfig, saveJiraConfig } from '../services/jiraConfig'
import toast from 'react-hot-toast'

interface JiraConfig {
  url: string
  email: string
  apiToken: string
  apiToken2?: string
}

const SettingsPage = () => {
  // Load from centralized config with fallback to env vars
  const centralizedConfig = getJiraConfig()
  const [jiraConfig, setJiraConfig] = useState<JiraConfig>({
    url: centralizedConfig.url || import.meta.env.VITE_JIRA_URL || '',
    email: centralizedConfig.email || import.meta.env.VITE_JIRA_EMAIL || '',
    apiToken: centralizedConfig.apiToken || import.meta.env.VITE_JIRA_API_TOKEN_1 || '',
    apiToken2: import.meta.env.VITE_JIRA_API_TOKEN_2 || '',
  })

  const [showToken, setShowToken] = useState(false)
  const [showToken2, setShowToken2] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  const handleSave = async () => {
    if (!jiraConfig.url || !jiraConfig.email || !jiraConfig.apiToken) {
      toast.error('Please fill in all required JIRA fields')
      return
    }

    setIsSaving(true)
    try {
      // Use centralized config save function
      saveJiraConfig({
        url: jiraConfig.url,
        email: jiraConfig.email,
        apiToken: jiraConfig.apiToken,
        projectKey: 'SCRUM',
      })
      toast.success('JIRA settings saved successfully!')
    } catch (error) {
      toast.error('Failed to save settings')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!jiraConfig.url || !jiraConfig.email || !jiraConfig.apiToken) {
      toast.error('Please fill in all required fields first')
      return
    }

    setTestingConnection(true)
    try {
      const response = await fetch(getFullApiUrl('/api/jira/test-connection'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: jiraConfig.url,
          email: jiraConfig.email,
          api_token: jiraConfig.apiToken,
        }),
      })

      if (response.ok) {
        toast.success('✅ JIRA connection successful!')
      } else {
        toast.error('❌ JIRA connection failed. Check your credentials.')
      }
    } catch (error) {
      toast.error('Connection test failed')
      console.error(error)
    } finally {
      setTestingConnection(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings?')) {
      localStorage.removeItem('jira_url')
      localStorage.removeItem('jira_email')
      localStorage.removeItem('jira_api_token')
      localStorage.removeItem('jira_api_token_2')
      setJiraConfig({
        url: '',
        email: '',
        apiToken: '',
        apiToken2: '',
      })
      toast.success('Settings reset to defaults')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Development Mode</p>
            <p>Settings saved here will override environment variables. For production, use Vercel environment variables.</p>
          </div>
        </div>

        {/* JIRA Configuration Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">JIRA Configuration</h2>

          <div className="space-y-6">
            {/* JIRA URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                JIRA Instance URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                placeholder="https://your-domain.atlassian.net"
                value={jiraConfig.url}
                onChange={(e) => setJiraConfig({ ...jiraConfig, url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Your Atlassian instance URL without trailing slash</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={jiraConfig.email}
                onChange={(e) => setJiraConfig({ ...jiraConfig, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Email associated with your JIRA account</p>
            </div>

            {/* API Token 1 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                API Token 1 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Enter your JIRA API token"
                  value={jiraConfig.apiToken}
                  onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Get your token from{' '}
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Atlassian API Tokens
                </a>
              </p>
            </div>

            {/* API Token 2 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                API Token 2 <span className="text-gray-400">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  type={showToken2 ? 'text' : 'password'}
                  placeholder="Enter second API token (if needed)"
                  value={jiraConfig.apiToken2 || ''}
                  onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken2: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowToken2(!showToken2)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showToken2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">For multiple JIRA projects or accounts</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>

            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {testingConnection ? 'Testing...' : '🔗 Test Connection'}
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 bg-red-100 text-red-700 px-6 py-2 rounded-lg hover:bg-red-200 transition-colors"
            >
              ↻ Reset
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Need Help?</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-medium mb-1">📌 Where to find your JIRA URL:</p>
              <p className="ml-4">Your JIRA instance URL is the domain you use to access JIRA (e.g., your-company.atlassian.net)</p>
            </div>
            <div>
              <p className="font-medium mb-1">🔑 How to generate API Token:</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">id.atlassian.com/manage-profile/security/api-tokens</a></li>
                <li>Click "Create API token"</li>
                <li>Copy the generated token</li>
                <li>Paste it above</li>
              </ol>
            </div>
            <div>
              <p className="font-medium mb-1">⚠️ Security Note:</p>
              <p className="ml-4">These credentials are stored in your browser's local storage. For production, use Vercel environment variables.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
