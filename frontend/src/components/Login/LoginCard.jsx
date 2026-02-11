import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../context/AuthContext'
import './LoginCard.css'

// SVGs from the user's design
const LogoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 7C4 6.06812 4 5.60218 4.15224 5.23463C4.35523 4.74458 4.74458 4.35523 5.23463 4.15224C5.60218 4 6.06812 4 7 4H17C17.9319 4 18.3978 4 18.7654 4.15224C19.2554 4.35523 19.6448 4.74458 19.8478 5.23463C20 5.60218 20 6.06812 20 7M4 7V17C4 17.9319 4 18.3978 4.15224 18.7654C4.35523 19.2554 4.74458 19.6448 5.23463 19.8478C5.60218 20 6.06812 20 7 20H17C17.9319 20 18.3978 20 18.7654 19.8478C19.2554 19.6448 19.6448 19.2554 19.8478 18.7654C20 18.3978 20 17.9319 20 17V7M4 7H20M16 11H12M12 11H8M12 11V15M12 15H16M12 15H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const SecurityIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M9 11L12 14L22 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const AnalyticsIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const SupportIcon = () => (
    <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 6V12L16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const GoogleIcon = () => (
    <svg className="google-icon" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
)

const AlertIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
)

function LoginCard() {
    const [studentId, setStudentId] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { loginWithCredentials, loginWithGoogle, error, clearError, loading } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!studentId.trim() || !password) return

        setIsSubmitting(true)
        clearError()

        await loginWithCredentials(studentId.trim(), password)
        setIsSubmitting(false)
    }

    const googleLogin = useGoogleLogin({
        onSuccess: async (response) => {
            try {
                // In a real app we might fetch user info here, but we just pass the token
                await loginWithGoogle(response.access_token)
            } catch (err) {
                console.error('Google login error:', err)
            }
        },
        onError: (error) => {
            console.error('Google Login Failed:', error)
        }
    })

    return (
        <div className="login-container">
            {/* Left Panel - Branding */}
            <div className="branding-panel">
                <div className="brand-content">
                    <div className="logo-container">
                        <div className="logo">
                            <LogoIcon />
                        </div>
                        <div className="brand-name">Student Data Mining</div>
                    </div>

                    <h1>Transform academic data into actionable insights</h1>
                    <p>Empowering institutions with intelligent analytics and comprehensive reporting tools.</p>

                    <div className="features">
                        <div className="feature">
                            <div className="feature-icon">
                                <SecurityIcon />
                            </div>
                            <div className="feature-content">
                                <h3>Enterprise Security</h3>
                                <p>Bank-level encryption and compliance</p>
                            </div>
                        </div>

                        <div className="feature">
                            <div className="feature-icon">
                                <AnalyticsIcon />
                            </div>
                            <div className="feature-content">
                                <h3>Real-time Analytics</h3>
                                <p>Instant insights from your data</p>
                            </div>
                        </div>

                        <div className="feature">
                            <div className="feature-icon">
                                <SupportIcon />
                            </div>
                            <div className="feature-content">
                                <h3>24/7 Support</h3>
                                <p>Dedicated assistance when you need it</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="form-panel">
                <div className="form-header">
                    <h2>Welcome back</h2>
                    <p>Please enter your credentials to access your account</p>
                </div>

                {error && (
                    <div className="error-alert">
                        <AlertIcon />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    className="google-btn"
                    onClick={() => googleLogin()}
                    disabled={loading || isSubmitting}
                >
                    <GoogleIcon />
                    Continue with Google
                </button>

                <div className="divider">or</div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="studentId">Student ID or Email</label>
                        <input
                            type="text"
                            id="studentId"
                            placeholder="student@university.edu"
                            required
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                placeholder="Enter your password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <div className="forgot-password">
                            <a href="#forgot" onClick={(e) => e.preventDefault()}>Forgot password?</a>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={isSubmitting || loading}
                    >
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="form-footer">
                    Need help? <a href="#support" onClick={(e) => e.preventDefault()}>Contact Support</a>
                </div>
            </div>
        </div>
    )
}

export default LoginCard
