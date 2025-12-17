import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext'
import Layout from './components/common/Layout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ProjectPage from './pages/ProjectPage'
import ProjectsPage from './pages/ProjectsPage'
import Phase1Page from './pages/Phase1Page'
import Phase2Page from './pages/Phase2Page'
import Phase3Page from './pages/Phase3Page'
import Phase4Page from './pages/Phase4Page'
import Phase5Page from './pages/Phase5Page'
import Phase6Page from './pages/Phase6Page'
import Phase7Page from './pages/Phase7Page'
import ApprovalCenter from './pages/ApprovalCenter'
import SettingsPage from './pages/SettingsPage'
import DiagnosticsPage from './pages/DiagnosticsPage'

function AppContent() {
  // Diagnostic logging for production issues
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    console.log('🔵 [App] Initialized')
    console.log(`  - API URL: ${apiUrl || '(using /api proxy)'}`)
    console.log(`  - Hostname: ${window.location.hostname}`)
    console.log(`  - Environment: ${isDev ? 'Development' : 'Production'}`)
    console.log(`  - localStorage available: ${!!window.localStorage}`)
  }, [])

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId" element={
          <ProtectedRoute>
            <Layout>
              <ProjectPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute>
            <Layout>
              <ProjectsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/phase1" element={
          <ProtectedRoute>
            <Layout>
              <Phase1Page />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/phase2" element={
          <ProtectedRoute>
            <Layout>
              <Phase2Page />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/phase3" element={
          <ProtectedRoute>
            <Layout>
              <Phase3Page />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/phase4" element={
          <ProtectedRoute>
            <Layout>
              <Phase4Page />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/phase5" element={
          <ProtectedRoute>
            <Layout>
              <Phase5Page />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/phase6" element={
          <ProtectedRoute>
            <Layout>
              <Phase6Page />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/phase7" element={
          <ProtectedRoute>
            <Layout>
              <Phase7Page />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/approvals" element={
          <ProtectedRoute>
            <Layout>
              <ApprovalCenter />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App

