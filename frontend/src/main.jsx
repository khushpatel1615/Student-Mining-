import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './styles/design-system.css'
import './index.css'

// Google Client ID from Google Cloud Console (override via VITE_GOOGLE_CLIENT_ID)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
    || '558182958130-dd2vsg1k4vrgheuua9oe1h0534586ps5.apps.googleusercontent.com'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <ThemeProvider>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </ThemeProvider>
            </GoogleOAuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
)

// Register Service Worker for PWA (production only)
if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration.scope)
                })
                .catch(error => {
                    console.log('SW registration failed:', error)
                })
        })
    } else {
        // In dev, ensure any previously-registered SW is removed to avoid stale assets.
        navigator.serviceWorker.getRegistrations()
            .then(registrations => Promise.all(registrations.map(r => r.unregister())))
            .catch(() => { })

        if ('caches' in window) {
            caches.keys()
                .then(keys => Promise.all(keys.map(key => caches.delete(key))))
                .catch(() => { })
        }
    }
}
