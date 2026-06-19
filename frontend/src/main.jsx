import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { useAuthStore } from './store/authStore'
import './i18n'          // initialise i18next before React renders
import './index.css'

// Start the Supabase auth listener before React renders.
// This ensures INITIAL_SESSION fires and restores any persisted session.
useAuthStore.getState().init()

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#17171e', color: '#f4f4f5',
              border: '1px solid #2a2a38', borderRadius: '10px', fontSize: '14px',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
