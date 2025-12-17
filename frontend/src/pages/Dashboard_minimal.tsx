import React from 'react'

const Dashboard = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#ffffff', 
      width: '100%', 
      padding: '2rem',
      display: 'block',
      overflow: 'auto'
    }}>
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px', 
        backgroundColor: '#10b981', 
        color: 'white', 
        padding: '10px 20px', 
        fontSize: '16px', 
        fontWeight: 'bold', 
        zIndex: 9999,
        borderRadius: '4px'
      }}>
        ✓ DASHBOARD WORKS
      </div>
      
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '20px' }}>
        Dashboard
      </h1>
      
      <div style={{ 
        backgroundColor: '#f0f9ff', 
        border: '2px solid #0ea5e9', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px'
      }}>
        <p style={{ color: '#0c4a6e', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
          ✓ Component is rendering!
        </p>
        <p style={{ color: '#0c4a6e', fontSize: '12px', marginBottom: '5px' }}>
          API URL: {import.meta.env.VITE_API_URL || '(using /api proxy)'}
        </p>
        <p style={{ color: '#0c4a6e', fontSize: '12px', marginBottom: '5px' }}>
          Token: {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}
        </p>
        <p style={{ color: '#0c4a6e', fontSize: '12px' }}>
          Timestamp: {new Date().toLocaleTimeString()}
        </p>
      </div>
      
      <div style={{ 
        backgroundColor: '#fef3c7', 
        border: '2px solid #f59e0b', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px'
      }}>
        <p style={{ color: '#92400e', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
          ✓ Frontend is working!
        </p>
        <p style={{ color: '#92400e', fontSize: '12px' }}>
          Open console (F12) to see detailed logs.
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#f3e8ff', 
        border: '2px solid #a78bfa', 
        padding: '15px', 
        borderRadius: '8px'
      }}>
        <p style={{ color: '#5b21b6', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
          Status
        </p>
        <p style={{ color: '#5b21b6', fontSize: '12px' }}>
          Host: {window.location.hostname}
        </p>
        <p style={{ color: '#5b21b6', fontSize: '12px' }}>
          Environment: {import.meta.env.DEV ? 'Development' : 'Production'}
        </p>
      </div>
    </div>
  )
}

export default Dashboard
