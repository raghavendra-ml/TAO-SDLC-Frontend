import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface SwaggerViewerProps {
  apiData: any
  summary: string
  onDelete?: () => void
}

const SwaggerViewer = ({ apiData, summary, onDelete }: SwaggerViewerProps) => {
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set())
  const [copiedYAML, setCopiedYAML] = useState(false)
  const [activeTab, setActiveTab] = useState<'yaml' | 'json'>('yaml')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const openapi_spec = apiData.openapi_spec || {}
  const openapi_yaml = apiData.openapi_yaml || '# No YAML available'
  
  const toggleEndpoint = (key: string) => {
    const newExpanded = new Set(expandedEndpoints)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedEndpoints(newExpanded)
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedYAML(true)
      toast.success(`${type} copied to clipboard!`)
      setTimeout(() => setCopiedYAML(false), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${filename}`)
  }

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      get: 'bg-blue-500 text-white',
      post: 'bg-green-600 text-white',
      put: 'bg-orange-500 text-white',
      delete: 'bg-red-600 text-white',
      patch: 'bg-purple-600 text-white',
    }
    return colors[method.toLowerCase()] || 'bg-gray-600 text-white'
  }

  const renderSchema = (schema: any) => {
    if (!schema) return <span className="text-gray-400 italic">No schema defined</span>

    if (schema.properties) {
      return (
        <div className="space-y-1 font-mono text-xs">
          {Object.entries(schema.properties).map(([key, value]: [string, any]) => (
            <div key={key} className="flex items-start">
              <span className="text-blue-700 font-semibold min-w-[120px]">{key}</span>
              <span className="text-gray-600 ml-2">{value.type || 'string'}</span>
              {value.description && <span className="text-gray-500 ml-2 text-xs">- {value.description}</span>}
            </div>
          ))}
        </div>
      )
    } else if (schema.type === 'array' && schema.items?.properties) {
      return (
        <div className="font-mono text-xs">
          <div className="text-gray-700 mb-1">array of:</div>
          <div className="ml-4 space-y-1">
            {Object.entries(schema.items.properties).map(([key, value]: [string, any]) => (
              <div key={key} className="flex items-start">
                <span className="text-blue-700 font-semibold min-w-[120px]">{key}</span>
                <span className="text-gray-600 ml-2">{value.type || 'string'}</span>
              </div>
            ))}
          </div>
        </div>
      )
    } else {
      return <span className="text-gray-600 font-mono text-xs">{schema.type || 'object'}</span>
    }
  }

  const renderEndpoint = (path: string, method: string, spec: any) => {
    const endpointKey = `${method}-${path}`
    const isExpanded = expandedEndpoints.has(endpointKey)

    return (
      <div key={endpointKey} className="border border-gray-300 rounded-lg mb-2 overflow-hidden shadow-sm">
        {/* Endpoint Header */}
        <button
          onClick={() => toggleEndpoint(endpointKey)}
          className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3 flex-1 text-left">
            <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${getMethodColor(method)}`}>
              {method}
            </span>
            <span className="font-mono text-sm font-medium text-gray-900">{path}</span>
            {spec.summary && <span className="text-sm text-gray-600">{spec.summary}</span>}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {/* Endpoint Details */}
        {isExpanded && (
          <div className="border-t border-gray-200 bg-gray-50">
            <div className="px-6 py-4 space-y-6">
              {/* Description */}
              {spec.description && (
                <div>
                  <p className="text-sm text-gray-700">{spec.description}</p>
                </div>
              )}

              {/* Parameters - Always Show */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase mb-3">Parameters</h4>
                {spec.parameters && spec.parameters.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">In</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Required</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {spec.parameters.map((param: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs text-blue-700">{param.name}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{param.schema?.type || 'string'}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{param.in}</span>
                            </td>
                            <td className="px-3 py-2 text-xs">{param.required ? '✓' : '-'}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{param.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded p-4">
                    <p className="text-sm text-gray-500 italic">No parameters required</p>
                  </div>
                )}
              </div>

              {/* Request Body - Always Show */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase mb-3">Request Body</h4>
                {spec.requestBody ? (
                  <div className="bg-white border border-gray-200 rounded p-4">
                    <div className="mb-2 text-xs text-gray-600">Content-Type: <span className="font-mono text-blue-600">application/json</span></div>
                    {renderSchema(spec.requestBody.content?.['application/json']?.schema)}
                    {spec.requestBody.content?.['application/json']?.example && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Example:</div>
                        <pre className="bg-gray-900 text-green-400 rounded p-3 text-xs overflow-x-auto">
                          {JSON.stringify(spec.requestBody.content['application/json'].example, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded p-4">
                    <p className="text-sm text-gray-500 italic">No request body required</p>
                  </div>
                )}
              </div>

              {/* Responses */}
              {spec.responses && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase mb-3">Responses</h4>
                  <div className="space-y-3">
                    {Object.entries(spec.responses).map(([code, response]: [string, any]) => {
                      const codeInt = parseInt(code)
                      const isSuccess = codeInt >= 200 && codeInt < 300
                      const isClientError = codeInt >= 400 && codeInt < 500
                      const isServerError = codeInt >= 500
                      
                      return (
                        <div key={code} className="bg-white border border-gray-200 rounded overflow-hidden">
                          {/* Response Code Header */}
                          <div className={`px-4 py-2 border-b flex items-center space-x-3 ${
                            isSuccess ? 'bg-green-50 border-green-200' :
                            isClientError ? 'bg-yellow-50 border-yellow-200' :
                            isServerError ? 'bg-red-50 border-red-200' :
                            'bg-gray-50'
                          }`}>
                            <span className={`px-2 py-1 rounded font-bold text-sm ${
                              isSuccess ? 'bg-green-100 text-green-800' :
                              isClientError ? 'bg-yellow-100 text-yellow-800' :
                              isServerError ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {code}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{response.description}</span>
                          </div>

                          {/* Response Body */}
                          {response.content?.['application/json']?.schema && (
                            <div className="p-4">
                              <div className="mb-2 text-xs text-gray-600">Content-Type: <span className="font-mono text-blue-600">application/json</span></div>
                              {renderSchema(response.content['application/json'].schema)}
                              {response.content['application/json'].example && (
                                <div className="mt-3">
                                  <div className="text-xs font-semibold text-gray-700 mb-1">Example:</div>
                                  <pre className="bg-gray-900 text-green-400 rounded p-3 text-xs overflow-x-auto">
                                    {JSON.stringify(response.content['application/json'].example, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Security */}
              {spec.security && spec.security.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase mb-3">Security</h4>
                  <div className="flex flex-wrap gap-2">
                    {spec.security.map((sec: any, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        🔒 {Object.keys(sec)[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* API Info Header */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{openapi_spec.info?.title || 'API Specification'}</h2>
            <p className="text-sm text-gray-600 mt-1">Version: {openapi_spec.info?.version || '1.0.0'}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              {apiData.endpoints_count || 0} Endpoints
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              OpenAPI 3.0
            </span>
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-full text-xs font-medium transition-colors flex items-center space-x-1"
                title="Delete API Specification"
              >
                <span>🗑️</span>
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
        {openapi_spec.info?.description && (
          <p className="text-sm text-gray-700">{openapi_spec.info.description}</p>
        )}
        {openapi_spec.servers && openapi_spec.servers.length > 0 && (
          <div className="mt-3">
            <span className="text-xs font-medium text-gray-600">Base URL: </span>
            <a href={openapi_spec.servers[0].url} className="text-xs font-mono text-primary-600 hover:underline">
              {openapi_spec.servers[0].url}
            </a>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: YAML/JSON Spec */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">OpenAPI Specification</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('yaml')}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  activeTab === 'yaml' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                YAML
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  activeTab === 'json' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 rounded p-4 text-xs overflow-x-auto max-h-[600px] overflow-y-auto">
              {activeTab === 'yaml' ? openapi_yaml : JSON.stringify(openapi_spec, null, 2)}
            </pre>
            <div className="absolute top-2 right-2 flex space-x-2">
              <button
                onClick={() => copyToClipboard(activeTab === 'yaml' ? openapi_yaml : JSON.stringify(openapi_spec, null, 2), activeTab.toUpperCase())}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                title="Copy to clipboard"
              >
                {copiedYAML ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => downloadFile(
                  activeTab === 'yaml' ? openapi_yaml : JSON.stringify(openapi_spec, null, 2),
                  `openapi.${activeTab}`
                )}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              💡 <strong>Tip:</strong> Copy this specification and paste it into{' '}
              <a href="https://editor.swagger.io" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                Swagger Editor
              </a>{' '}
              to visualize and test your API.
            </p>
          </div>
        </div>

        {/* Right: API Endpoints */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">API Endpoints</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {openapi_spec.paths && Object.keys(openapi_spec.paths).length > 0 ? (
              Object.entries(openapi_spec.paths).map(([path, methods]: [string, any]) =>
                Object.entries(methods).map(([method, spec]: [string, any]) =>
                  renderEndpoint(path, method, spec)
                )
              )
            ) : (
              <p className="text-gray-500 text-sm">No endpoints found</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {summary && (
        <div className="card bg-gray-50 border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📊 API Summary</h3>
          <div className="prose prose-sm max-w-none">
            <div 
              className="text-gray-700"
              dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete API Specification?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this API specification? This action cannot be undone.
              You will need to re-upload and extract your Excel file if you want to restore it.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  if (onDelete) {
                    onDelete()
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SwaggerViewer
