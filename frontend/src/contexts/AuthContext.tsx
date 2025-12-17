import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
import { login as apiLogin, signup as apiSignup, demoLogin as apiDemoLogin } from '../services/api'
import { useNavigate } from 'react-router-dom'

interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: string
  created_at: string
}

interface SignupData {
  username: string
  email: string
  full_name: string
  password: string
  role?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  demoLogin: () => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load token and user from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setToken(storedToken)
          setUser(userData)
          // Set default axios header
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
          console.log('✅ [AuthContext] Loaded user from localStorage')
        } catch (parseError) {
          console.error('❌ [AuthContext] Failed to parse stored user:', parseError)
          localStorage.removeItem('user')
          localStorage.removeItem('token')
        }
      } else {
        console.log('⚠️ [AuthContext] No stored token/user found')
      }
    } catch (storageError) {
      console.error('❌ [AuthContext] localStorage error:', storageError)
    } finally {
      setLoading(false)
      console.log('✅ [AuthContext] Auth initialization complete')
    }
  }, [])

  const login = async (username: string, password: string) => {
    const response = await apiLogin(username, password)
    const { access_token, user: userData } = response.data

    // Store in state and localStorage
    setToken(access_token)
    setUser(userData)
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))

    // Set default axios header
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
  }

  const signup = async (data: SignupData) => {
    const response = await apiSignup(data)
    const { access_token, user: userData } = response.data

    // Store in state and localStorage
    setToken(access_token)
    setUser(userData)
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))

    // Set default axios header
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
  }

  const demoLogin = async () => {
    const response = await apiDemoLogin()
    const { access_token, user: userData } = response.data

    // Store in state and localStorage
    setToken(access_token)
    setUser(userData)
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))

    // Set default axios header
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    demoLogin,
    logout,
    isAuthenticated: !!token && !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Protected Route Component
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect to login if not authenticated
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render children (navigation will handle redirect)
  if (!isAuthenticated) {
    return null
  }

  // Render protected content
  return <>{children}</>
}
