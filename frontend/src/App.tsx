import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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

function App() {
  return (
    <Router>
      <AuthProvider>
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
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />
          
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
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App

