import React, { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import AIChatSidebar from '../AICopilot/AIChatSidebar'

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 mr-96">
          {children}
        </main>
        <AIChatSidebar />
      </div>
    </div>
  )
}

export default Layout

