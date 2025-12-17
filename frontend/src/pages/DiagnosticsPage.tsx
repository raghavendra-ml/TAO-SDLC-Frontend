import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { healthCheck } from '../services/api'

interface DiagnosticCheck {
  name: string
  status: 'pending' | 'pass' | 'fail'
  message?: string
  details?: string
}

export default function DiagnosticsPage() {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([
    { name: 'Frontend Environment', status: 'pending' },
    { name: 'Backend Connectivity', status: 'pending' },
    { name: 'Auth Token', status: 'pending' },
    { name: 'API Health', status: 'pending' },
  ])

  const runDiagnostics = async () => {
    setChecks(checks.map(c => ({ ...c, status: 'pending' })))

    // Check 1: Frontend Environment
    const envCheck: DiagnosticCheck = {
      name: 'Frontend Environment',
      status: 'pass',
      message: 'Environment loaded',
      details: `API URL: ${import.meta.env.VITE_API_URL || '(using /api proxy)'}`
    }
    setChecks(prev => [...prev.slice(1), envCheck])

    // Check 2: Backend Connectivity
    const apiUrl = import.meta.env.VITE_API_URL
    try {
      const response = await fetch(
        apiUrl ? `${apiUrl}/api/health/` : '/api/health/',
        { method: 'GET' }
      )
      const backendCheck: DiagnosticCheck = {
        name: 'Backend Connectivity',
        status: response.ok ? 'pass' : 'fail',
        message: response.ok ? `Backend responding (${response.status})` : `Backend error (${response.status})`,
        details: `URL: ${apiUrl || 'localhost:8000 (via proxy)'}`
      }
      setChecks(prev => [prev[0], backendCheck, ...prev.slice(2)])
    } catch (error: any) {
      const backendCheck: DiagnosticCheck = {
        name: 'Backend Connectivity',
        status: 'fail',
        message: 'Cannot reach backend',
        details: `Error: ${error.message}`
      }
      setChecks(prev => [prev[0], backendCheck, ...prev.slice(2)])
    }

    // Check 3: Auth Token
    const token = localStorage.getItem('token')
    const tokenCheck: DiagnosticCheck = {
      name: 'Auth Token',
      status: token ? 'pass' : 'fail',
      message: token ? 'Token present in storage' : 'No token (not logged in)',
      details: token ? `Token length: ${token.length} chars` : 'Click "Try Demo Account" to log in'
    }
    setChecks(prev => [prev[0], prev[1], tokenCheck, prev[3]])

    // Check 4: API Health
    const healthCheckResult = await healthCheck()
    const apiCheck: DiagnosticCheck = {
      name: 'API Health',
      status: healthCheckResult.ok ? 'pass' : 'fail',
      message: healthCheckResult.ok ? 'API responding' : 'API not responding',
      details: healthCheckResult.error
        ? `Error: ${healthCheckResult.error.message}`
        : 'All systems nominal'
    }
    setChecks(prev => [prev[0], prev[1], prev[2], apiCheck])
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Diagnostics</h1>
          <p className="text-gray-600">Check your frontend and backend configuration</p>
        </div>

        {/* Diagnostics Cards */}
        <div className="space-y-4 mb-8">
          {checks.map((check, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-2 ${
                check.status === 'pass'
                  ? 'bg-green-50 border-green-300'
                  : check.status === 'fail'
                  ? 'bg-red-50 border-red-300'
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {check.status === 'pass' && (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                {check.status === 'fail' && (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                {check.status === 'pending' && (
                  <AlertCircle className="w-6 h-6 text-gray-600 flex-shrink-0 mt-0.5 animate-pulse" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{check.name}</h3>
                  {check.message && <p className="text-sm text-gray-700 mt-1">{check.message}</p>}
                  {check.details && <p className="text-xs text-gray-600 mt-2 font-mono">{check.details}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={runDiagnostics}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Run Diagnostics Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400"
          >
            Back to App
          </button>
        </div>

        {/* Info Panel */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-300 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">🔧 Troubleshooting Tips</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>✓ Make sure backend server is running on port 8000</li>
            <li>✓ If using ngrok, make sure tunnel is active and URL is updated in .env.local</li>
            <li>✓ Check FRONTEND_SETUP_QUICK_START.md for detailed setup instructions</li>
            <li>✓ Open browser console (F12) to see detailed error logs</li>
          </ul>
        </div>

        {/* Environment Info */}
        <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded-lg text-xs font-mono">
          <p className="font-bold mb-2 text-gray-900">Environment Info:</p>
          <p className="text-gray-700">
            API URL: {import.meta.env.VITE_API_URL || '(using /api proxy)'}
          </p>
          <p className="text-gray-700">
            Hostname: {window.location.hostname}
          </p>
          <p className="text-gray-700">
            Token: {localStorage.getItem('token') ? 'Present' : 'Missing'}
          </p>
        </div>
      </div>
    </div>
  )
}
