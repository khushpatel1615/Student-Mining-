import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../utils/apiClient'
import * as authService from '../services/authService'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(apiClient.token)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    // Use ref for logout to avoid stale closures in the 401 handler
    const logoutRef = useRef(null)
    // Guard: don't let the global 401 handler fire during the startup auth-check
    const isInitializingRef = useRef(true)

    const logout = useCallback(() => {
        setUser(null)
        setToken(null)
        setError(null)
        // Reset the debounce timer so back-to-back logouts work
        apiClient._lastUnauthorizedAt = 0
        authService.logout();
        navigate('/')
    }, [navigate])

    // Keep ref in sync
    logoutRef.current = logout

    // Set up global 401 handler — skips during init to let initAuth handle it
    useEffect(() => {
        apiClient.setUnauthorizedHandler(() => {
            // Don't fire during the initial token verification
            if (isInitializingRef.current) return;
            logoutRef.current?.();
        });
        // Cleanup on unmount
        return () => {
            apiClient.setUnauthorizedHandler(null);
        };
    }, []);

    // On mount, check if we have a token and verify it with the backend
    useEffect(() => {
        const initAuth = async () => {
            isInitializingRef.current = true;
            if (apiClient.token) {
                const { data, error: verifyError, status } = await authService.verifyToken();
                if (data && data.success) {
                    setUser(data.user);
                    setToken(apiClient.token);
                } else {
                    // Determine if this is a real auth failure or a transient network error
                    const isAuthError = status === 401 || status === 403 ||
                        (verifyError && (
                            verifyError.toLowerCase().includes('401') ||
                            verifyError.toLowerCase().includes('unauthorized') ||
                            verifyError.toLowerCase().includes('token') ||
                            verifyError.toLowerCase().includes('expired')
                        ));

                    if (isAuthError) {
                        // Silently clear stale token — do NOT navigate, just reset state
                        // The ProtectedRoute will handle the redirect to login
                        authService.logout();
                        setUser(null);
                        setToken(null);
                    }
                    // If it's a network error / 500 / etc., keep the user logged in
                    // so a page refresh during a short outage doesn't kick them out
                }
            }
            isInitializingRef.current = false;
            setLoading(false);
        };
        initAuth();
    }, [])


    // Login with Student ID and Password
    const loginWithCredentials = async (studentId, password) => {
        setLoading(true)
        setError(null)

        const { data, error: loginError } = await authService.login(studentId, password);

        if (data && data.success) {
            setToken(data.token)
            setUser(data.user)
            redirectByRole(data.user.role)
            setLoading(false)
            return { success: true }
        } else {
            setError(loginError || (data && data.error) || 'Login failed')
            setLoading(false)
            return { success: false, error: loginError || (data && data.error) }
        }
    }

    // Login with Google OAuth
    const loginWithGoogle = async (credential) => {
        setLoading(true)
        setError(null)

        const { data, error: authError } = await authService.loginWithGoogle(credential);

        if (data && data.success) {
            setToken(data.token)
            setUser(data.user)
            redirectByRole(data.user.role)
            setLoading(false)
            return { success: true }
        } else {
            setError(authError || (data && data.error) || 'Google authentication failed')
            setLoading(false)
            return { success: false, error: authError || (data && data.error) }
        }
    }

    const redirectByRole = (role) => {
        const dashboardMap = {
            admin: '/admin/dashboard',
            teacher: '/teacher/dashboard',
            student: '/student/dashboard'
        }
        navigate(dashboardMap[role] || '/student/dashboard')
    }

    // Set password for users who signed in via Google
    const setPassword = async (newPassword, currentPassword = null) => {
        const { data, error: pwdError } = await authService.setPassword(newPassword, currentPassword);

        if (data && data.success) {
            setUser(prev => ({ ...prev, hasPassword: true }))
            return { success: true, message: data.message }
        } else {
            return { success: false, error: pwdError || (data && data.error) }
        }
    }

    const clearError = () => setError(null)

    const value = {
        user,
        token,
        loading,
        error,
        isAuthenticated: !!user,
        loginWithCredentials,
        loginWithGoogle,
        setPassword,
        logout,
        clearError
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export default AuthContext
