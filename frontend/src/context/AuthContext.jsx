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

    const logout = useCallback(() => {
        setUser(null)
        setToken(null)
        setError(null)
        authService.logout();
        navigate('/')
    }, [navigate])

    // Keep ref in sync
    logoutRef.current = logout

    // Set up global 401 handler
    useEffect(() => {
        apiClient.setUnauthorizedHandler(() => {
            logoutRef.current?.();
        });
    }, []);

    // On mount, check if we have a token and verify it
    useEffect(() => {
        const initAuth = async () => {
            if (apiClient.token) {
                const { data, error: verifyError } = await authService.verifyToken();
                if (data && data.success) {
                    setUser(data.user);
                    setToken(apiClient.token);
                } else {
                    // Only forcefully logout if it's a 401 error, don't logout on network errors
                    if (verifyError && verifyError.includes('401')) {
                        logoutRef.current?.();
                    } else if (data?.error && String(data.error).includes('401')) {
                        logoutRef.current?.();
                    }
                }
            }
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
