import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import StudentDashboard from './pages/StudentDashboard'
import SubjectDetailPage from './pages/SubjectDetailPage'
import AdminDashboard from './pages/AdminDashboard'
import './App.css'

// Protected Route Component
function ProtectedRoute({ children, allowedRole }) {
    const { user, loading, isAuthenticated } = useAuth()

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    // Not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/" replace />
    }

    // Role check
    if (allowedRole && user.role !== allowedRole) {
        // Redirect to their own dashboard
        return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />
    }

    return children
}

// Auth Route - redirects logged in users to their dashboard
function AuthRoute({ children }) {
    const { user, loading, isAuthenticated } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    if (isAuthenticated) {
        return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />
    }

    return children
}

function App() {
    return (
        <Routes>
            {/* Public Route - Login */}
            <Route
                path="/"
                element={
                    <AuthRoute>
                        <LoginPage />
                    </AuthRoute>
                }
            />

            {/* Student Routes */}
            <Route
                path="/student/dashboard"
                element={
                    <ProtectedRoute allowedRole="student">
                        <StudentDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/subject/:subjectId"
                element={
                    <ProtectedRoute allowedRole="student">
                        <SubjectDetailPage />
                    </ProtectedRoute>
                }
            />

            {/* Admin Routes */}
            <Route
                path="/admin/dashboard"
                element={
                    <ProtectedRoute allowedRole="admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
