import { Link, useLocation } from 'react-router-dom'
import { Home, FolderOpen, CheckCircle } from 'lucide-react'
import PhaseNavigator from '../phase/PhaseNavigator'

const Sidebar = () => {
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path
  
  // Only show phases when inside a specific project (viewing project or phase pages)
  // Show phases on: /projects/5, /projects/5/phase1, etc.
  // Don't show on: /, /projects (list), /approvals
  const isInProject = location.pathname.startsWith('/projects/') && location.pathname !== '/projects'
  
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/projects', icon: FolderOpen, label: 'Projects' },
    { path: '/approvals', icon: CheckCircle, label: 'Approvals' },
  ]
  
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      
      {isInProject && (
        <div className="border-t border-gray-200 mt-4">
          <PhaseNavigator />
        </div>
      )}
    </aside>
  )
}

export default Sidebar

