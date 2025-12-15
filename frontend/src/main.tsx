import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global error handler for any unhandled errors
window.addEventListener('error', (event) => {
  console.error('🔴 [Global] Uncaught error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 [Global] Unhandled promise rejection:', event.reason)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

