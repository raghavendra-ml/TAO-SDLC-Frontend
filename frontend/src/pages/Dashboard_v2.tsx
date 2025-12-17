import React, { useEffect, useState } from 'react'
import { getProjects, getJiraStats, getProjectPhases } from '../services/api'
import { useProjectStore } from '../store/projectStore'

const Dashboard = () => {
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [jiraError, setJiraError] = useState<string | null>(null)
  const { projects: storeProjects, setProjects } = useProjectStore()
  const projects = storeProjects || []

  useEffect(() => {
    console.log('📥 [Dashboard] Component mounted, loading projects...')
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoadingProjects(true)
    setProjectsError(null)
    try {
      console.log('📥 [Dashboard] Calling API...')
      const res = await getProjects()
      console.log('✅ [Dashboard] Projects loaded:', res.data)
      setProjects(res.data)
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error'
      console.error('❌ [Dashboard] Error:', errorMsg)
      setProjectsError(`Failed to load projects: ${errorMsg}`)
    } finally {
      setLoadingProjects(false)
    }
  }

  // Get JIRA stats
  useEffect(() => {
    const getStats = async () => {
      try {
        console.log('📥 [Dashboard] Getting JIRA stats...')
        const res = await getJiraStats({ url: '', email: '', api_token: '', project_key: '' })
        console.log('✅ [Dashboard] JIRA stats:', res.data)
      } catch (error: any) {
        console.warn('⚠️ [Dashboard] JIRA error:', error.response?.status)
        setJiraError('JIRA not configured')
      }
    }
    getStats()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      width: '100%',
      padding: '2rem',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
            High-level status overview
          </p>
        </div>

        {/* Status Badge */}
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 9999
        }}>
          ✓ DASHBOARD ACTIVE
        </div>

        {/* Diagnostic Info */}
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#f0f9ff',
          border: '2px solid #0ea5e9',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>
            ✓ Component Rendering
          </p>
          <p style={{ fontSize: '12px', color: '#0c4a6e', margin: '0.25rem 0' }}>
            API URL: {import.meta.env.VITE_API_URL || '(using /api proxy)'}
          </p>
          <p style={{ fontSize: '12px', color: '#0c4a6e', margin: '0.25rem 0' }}>
            Token: {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}
          </p>
          <p style={{ fontSize: '12px', color: '#0c4a6e', margin: '0.25rem 0' }}>
            Projects: {projects.length} loaded
          </p>
        </div>

        {/* Projects Error */}
        {projectsError && (
          <div style={{
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '2px solid #fca5a5',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#991b1b', margin: '0 0 0.5rem 0' }}>
              ⚠️ Projects Error
            </p>
            <p style={{ fontSize: '12px', color: '#b91c1c', margin: '0' }}>
              {projectsError}
            </p>
            <button
              onClick={loadProjects}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* JIRA Error */}
        {jiraError && (
          <div style={{
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#fef3c7',
            border: '2px solid #fcd34d',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#92400e', margin: '0' }}>
              ℹ️ JIRA: {jiraError}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loadingProjects && (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
              ⏳ Loading projects...
            </p>
          </div>
        )}

        {/* Projects List */}
        {!loadingProjects && projects.length > 0 && (
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 1rem 0' }}>
              Projects ({projects.length})
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {projects.map((p: any) => (
                <div
                  key={p.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0' }}>
                    {p.name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                    {p.description || 'No description'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Projects */}
        {!loadingProjects && projects.length === 0 && !projectsError && (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
              No projects found. Create one to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
