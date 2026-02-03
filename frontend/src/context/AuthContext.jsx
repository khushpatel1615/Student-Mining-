import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext()

import { API_BASE } from '../config'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(() => localStorage.getItem('auth_token'))
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    // Verify token on mount
    useEffect(() => {
        if (token) {
            verifyToken()
        } else {
            setLoading(false)
        }
    }, [])

    const verifyToken = async () => {
        try {
            const response = await fetch(`${API_BASE}/verify-token.php`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            const data = await response.json()

            if (data.success) {
                setUser(data.user)
            } else {
                // Token invalid, clear it
                logout()
            }
        } catch (err) {
            console.error('Token verification failed:', err)
            logout()
        } finally {
            setLoading(false)
        }
    }

    // Login with Student ID and Password
    const loginWithCredentials = async (studentId, password) => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE}/login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ student_id: studentId, password })
            })

            const data = await response.json()

            if (data.success) {
                setToken(data.token)
                setUser(data.user)
                localStorage.setItem('auth_token', data.token)

                // Redirect based on role
                redirectByRole(data.user.role)
                return { success: true }
            } else {
                setError(data.error)
                return { success: false, error: data.error }
            }
        } catch (err) {
            const errorMsg = 'Connection failed. Please check if the server is running.'
            setError(errorMsg)
            return { success: false, error: errorMsg }
        } finally {
            setLoading(false)
        }
    }

    // Login with Google OAuth
    const loginWithGoogle = async (credential) => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE}/google-auth.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ credential })
            })

            const data = await response.json()

            if (data.success) {
                setToken(data.token)
                setUser(data.user)
                localStorage.setItem('auth_token', data.token)

                // Redirect based on role
                redirectByRole(data.user.role)
                return { success: true }
            } else {
                setError(data.error)
                return { success: false, error: data.error }
            }
        } catch (err) {
            const errorMsg = 'Google authentication failed. Please try again.'
            setError(errorMsg)
            return { success: false, error: errorMsg }
        } finally {
            setLoading(false)
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
        if (!token) {
            return { success: false, error: 'Not authenticated' }
        }

        try {
            const response = await fetch(`${API_BASE}/set-password.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    new_password: newPassword,
                    current_password: currentPassword
                })
            })

            const data = await response.json()

            if (data.success) {
                // Update user state to reflect they now have a password
                setUser(prev => ({ ...prev, hasPassword: true }))
                return { success: true, message: data.message }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            return { success: false, error: 'Failed to set password. Please try again.' }
        }
    }

    const logout = () => {
        setUser(null)
        setToken(null)
        setError(null)
        localStorage.removeItem('auth_token')
        navigate('/')
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

