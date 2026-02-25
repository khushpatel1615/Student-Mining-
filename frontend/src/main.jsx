import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'

import App from './App.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './styles/design-system.css'
import './index.css'

// Google Client ID from environment variables (set via .env.local)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                    <ThemeProvider>
                        <AuthProvider>
                            <App />
                        </AuthProvider>
                    </ThemeProvider>
                </GoogleOAuthProvider>
            </BrowserRouter>
        </ErrorBoundary>
    </React.StrictMode>,
)

// Register Service Worker for PWA (production only)
if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(() => { /* SW registered */ })
                .catch(() => { /* SW registration failed */ })
        })
    } else {
        // In dev, ensure any previously-registered SW is removed to avoid stale assets.
        navigator.serviceWorker.getRegistrations()
            .then(registrations => Promise.all(registrations.map(r => r.unregister())))
            .catch(() => { })

        if ('caches' in window) {
            window.caches.keys()
                .then(keys => Promise.all(keys.map(key => window.caches.delete(key))))
                .catch(() => { })
        }
    }
}
