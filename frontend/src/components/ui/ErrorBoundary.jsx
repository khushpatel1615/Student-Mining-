import React from 'react';

/**
 * Error Boundary component to catch unhandled React errors
 * and display a user-friendly fallback UI instead of a blank screen.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        // Log to your error reporting service in production
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught:', error, errorInfo);
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '2rem',
                    fontFamily: "'Outfit', system-ui, sans-serif",
                    background: '#f8fafc',
                    color: '#0f172a',
                }}>
                    <div style={{
                        maxWidth: '480px',
                        textAlign: 'center',
                        background: '#ffffff',
                        borderRadius: '16px',
                        padding: '2.5rem',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        border: '1px solid #e2e8f0',
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            fontSize: '1.75rem',
                        }}>
                            ⚠️
                        </div>
                        <h1 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            marginBottom: '0.75rem',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}>
                            Something went wrong
                        </h1>
                        <p style={{
                            color: '#475569',
                            marginBottom: '1.5rem',
                            lineHeight: '1.6',
                        }}>
                            An unexpected error occurred. Please try reloading the page.
                        </p>
                        {import.meta.env.DEV && this.state.error && (
                            <details style={{
                                textAlign: 'left',
                                background: '#fef2f2',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1.5rem',
                                fontSize: '0.8rem',
                                color: '#991b1b',
                                maxHeight: '200px',
                                overflow: 'auto',
                            }}>
                                <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                                    Error Details (dev only)
                                </summary>
                                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#6366f1',
                                    color: '#fff',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                }}
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#fff',
                                    color: '#475569',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                }}
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
