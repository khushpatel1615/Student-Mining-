import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { useAuth } from '../context/AuthContext';

// Mock dependencies
vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
    AuthProvider: ({ children }) => <div>{children}</div>,
}));

// Mock components to simplify integration tests (avoid rendering deep trees)
vi.mock('../pages/LoginPage', () => ({ default: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('../pages/StudentDashboard', () => ({ default: () => <div data-testid="student-dashboard">Student Dashboard</div> }));
vi.mock('../pages/AdminDashboard', () => ({ default: () => <div data-testid="admin-dashboard">Admin Dashboard</div> }));
vi.mock('../pages/SubjectDetailPage', () => ({ default: () => <div data-testid="subject-detail-page">Subject Detail Page</div> }));
vi.mock('../pages/StudentProfilePage', () => ({ default: () => <div data-testid="student-profile-page">Student Profile Page</div> }));
vi.mock('react-hot-toast', () => ({
    Toaster: () => null,
}));

describe('App Routing & Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('Redirects to Login when unauthenticated', async () => {
        useAuth.mockReturnValue({
            user: null,
            isAuthenticated: false,
            loading: false,
        });

        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
    });

    test('Redirects Student to Student Dashboard', async () => {
        useAuth.mockReturnValue({
            user: { role: 'student', name: 'Test Student' },
            isAuthenticated: true,
            loading: false,
        });

        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
        });
    });

    test('Redirects Admin to Admin Dashboard', async () => {
        useAuth.mockReturnValue({
            user: { role: 'admin', name: 'Test Admin' },
            isAuthenticated: true,
            loading: false,
        });

        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        });
    });

    test('Protected Route: Student cannot access Admin Dashboard', async () => {
        useAuth.mockReturnValue({
            user: { role: 'student', name: 'Test Student' },
            isAuthenticated: true,
            loading: false,
        });

        render(
            <MemoryRouter initialEntries={['/admin/dashboard']}>
                <App />
            </MemoryRouter>
        );

        // Should redirect to student dashboard (as per App logic)
        await waitFor(() => {
            expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
    });
});
