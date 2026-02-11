import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient, { ApiError } from '../utils/apiClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null) // In-memory only (removed localStorage)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    // Set up global 401 handler
    useEffect(() => {
        apiClient.setUnauthorizedHandler(() => {
            console.warn('Unauthorized - logging out');
            logout();
        });
    }, []);

    // On mount, check if we need to restore session
    // NOTE: With in-memory storage, users must log in each session
    // Future: Implement HttpOnly cookie auth or refresh token flow
    useEffect(() => {
        setLoading(false);
    }, [])

    const verifyToken = async (authToken) => {
        try {
            apiClient.setToken(authToken);
            const data = await apiClient.get('/verify-token.php');

            if (data.success) {
                setUser(data.user);
                setToken(authToken);
                return { success: true };
            } else {
                logout();
                return { success: false };
            }
        } catch (err) {
            console.error('Token verification failed:', err);
            logout();
            return { success: false };
        }
    }

    // Login with Student ID and Password
    const loginWithCredentials = async (studentId, password) => {
        setLoading(true)
        setError(null)

        try {
            const data = await apiClient.post('/login.php', {
                student_id: studentId,
                password: password
            });

            if (data.success) {
                setToken(data.token)
                setUser(data.user)
                apiClient.setToken(data.token);

                // Redirect based on role
                redirectByRole(data.user.role)
                return { success: true }
            } else {
                setError(data.error)
                return { success: false, error: data.error }
            }
        } catch (err) {
            const errorMsg = err instanceof ApiError
                ? err.message
                : 'Connection failed. Please check if the server is running.';
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
            const data = await apiClient.post('/google-auth.php', { credential });

            if (data.success) {
                setToken(data.token)
                setUser(data.user)
                apiClient.setToken(data.token);

                // Redirect based on role
                redirectByRole(data.user.role)
                return { success: true }
            } else {
                setError(data.error)
                return { success: false, error: data.error }
            }
        } catch (err) {
            const errorMsg = err instanceof ApiError
                ? err.message
                : 'Google authentication failed. Please try again.';
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
            const data = await apiClient.post('/set-password.php', {
                new_password: newPassword,
                current_password: currentPassword
            });

            if (data.success) {
                // Update user state to reflect they now have a password
                setUser(prev => ({ ...prev, hasPassword: true }))
                return { success: true, message: data.message }
            } else {
                return { success: false, error: data.error }
            }
        } catch (err) {
            const errorMsg = err instanceof ApiError
                ? err.message
                : 'Failed to set password. Please try again.';
            return { success: false, error: errorMsg }
        }
    }

    const logout = () => {
        setUser(null)
        setToken(null)
        setError(null)
        apiClient.clearToken();
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
