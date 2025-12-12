import { Bell, User, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'
import toast from 'react-hot-toast'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">TAO SDLC</h1>
            <p className="text-xs text-gray-500">AI-Augmented Development</p>
          </div>
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link to="/approvals" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Link>
          
          <div className="relative flex items-center space-x-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500">{user?.role || 'Role'}</p>
            </div>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center hover:bg-primary-200 transition-colors"
            >
              <User className="w-5 h-5 text-primary-600" />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowDropdown(false)}
                ></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

