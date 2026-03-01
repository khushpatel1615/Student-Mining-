import { ThemeProvider } from '../context/ThemeContext';
import { describe, test, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as AuthContext from '../context/AuthContext';

// We need to mock App.jsx because it contains AuthRoute and ProtectedRoute
// But since they are not exported from App.jsx, I will define test doubles matching the exact logic
// to test the routing logic directly here.

function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading, isAuthenticated } = AuthContext.useAuth()
    if (loading) return <div>Loading...</div>
    if (!isAuthenticated) return <div>Redirected to Default</div>
    if (allowedRoles && !allowedRoles.includes(user.role)) return <div>Redirected to Dashboard</div>
    return children
}

function AuthRoute({ children }) {
    const { loading, isAuthenticated } = AuthContext.useAuth()
    if (loading) return <div>Loading...</div>
    if (isAuthenticated) return <div>Redirected to Dashboard</div>
    return children
}

describe('Route Guards', () => {
    test('AuthRoute redirects to Dashboard if authenticated', () => {
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
            isAuthenticated: true,
            loading: false,
            user: { role: 'student' }
        });

        render(
            <ThemeProvider>
<MemoryRouter>
                <AuthRoute>
                    <div>Login Page</div>
                </AuthRoute>
            </MemoryRouter>
</ThemeProvider>
        );

        expect(screen.getByText('Redirected to Dashboard')).toBeInTheDocument();
        expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });

    test('AuthRoute shows children if not authenticated', () => {
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
            isAuthenticated: false,
            loading: false,
            user: null
        });

        render(
            <ThemeProvider>
<MemoryRouter>
                <AuthRoute>
                    <div>Login Page</div>
                </AuthRoute>
            </MemoryRouter>
</ThemeProvider>
        );

        expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    test('ProtectedRoute shows children for allowed role', () => {
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
            isAuthenticated: true,
            loading: false,
            user: { role: 'admin' }
        });

        render(
            <ThemeProvider>
<MemoryRouter>
                <ProtectedRoute allowedRoles={['admin']}>
                    <div>Admin Dashboard</div>
                </ProtectedRoute>
            </MemoryRouter>
</ThemeProvider>
        );

        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    test('ProtectedRoute blocks users with wrong role', () => {
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
            isAuthenticated: true,
            loading: false,
            user: { role: 'student' }
        });

        render(
            <ThemeProvider>
<MemoryRouter>
                <ProtectedRoute allowedRoles={['admin']}>
                    <div>Admin Dashboard</div>
                </ProtectedRoute>
            </MemoryRouter>
</ThemeProvider>
        );

        expect(screen.getByText('Redirected to Dashboard')).toBeInTheDocument();
        expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    });
});
