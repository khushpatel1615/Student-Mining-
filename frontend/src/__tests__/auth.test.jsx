import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginCard from '../components/Login/LoginCard';
import { AuthProvider } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';

// Mock config to avoid import.meta issues
vi.mock('../config', () => ({
    API_BASE: 'http://localhost/api',
}));

// Mock dependencies
vi.mock('@react-oauth/google', () => ({
    useGoogleLogin: () => vi.fn(),
    GoogleOAuthProvider: ({ children }) => <div>{children}</div>,
}));

// Mock AuthContext context values for component tests
const mockLoginWithCredentials = vi.fn();
const mockLoginWithGoogle = vi.fn();

vi.mock('../context/AuthContext', async () => {
    const originalModule = await vi.importActual('../context/AuthContext');
    return {
        ...originalModule,
        useAuth: () => ({
            loginWithCredentials: mockLoginWithCredentials,
            loginWithGoogle: mockLoginWithGoogle,
            error: null,
            loading: false,
            clearError: vi.fn(),
        }),
    };
});

vi.mock('../context/ThemeContext', () => ({
    useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
    ThemeProvider: ({ children }) => <div>{children}</div>,
}));

describe('Authentication Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders login form correctly', () => {
        render(
            <MemoryRouter>
                <ThemeProvider>
                    <LoginCard />
                </ThemeProvider>
            </MemoryRouter>
        );

        expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter your ID or email/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    test('validates empty inputs', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider>
                    <LoginCard />
                </ThemeProvider>
            </MemoryRouter>
        );

        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        // Wait for disabled state (initial)
        await waitFor(() => {
            expect(submitButton).toBeDisabled();
        });

        // Fill in one field
        fireEvent.change(screen.getByPlaceholderText(/Enter your ID or email/i), {
            target: { value: 'test@example.com' }
        });

        await waitFor(() => {
            expect(submitButton).toBeDisabled();
        });

        // Fill both fields
        fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
            target: { value: 'password123' }
        });

        await waitFor(() => {
            expect(submitButton).toBeEnabled();
        });
    });

    test('calls loginWithCredentials on valid submission', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider>
                    <LoginCard />
                </ThemeProvider>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/Enter your ID or email/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: 'password123' } });

        const submitButton = screen.getByRole('button', { name: /Sign In/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockLoginWithCredentials).toHaveBeenCalledWith('testuser', 'password123');
        });
    });

    test('toggles password visibility', () => {
        render(
            <MemoryRouter>
                <ThemeProvider>
                    <LoginCard />
                </ThemeProvider>
            </MemoryRouter>
        );

        const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
        expect(passwordInput).toHaveAttribute('type', 'password');

        const toggleButton = screen.getByLabelText(/Show password/i);
        fireEvent.click(toggleButton);

        expect(passwordInput).toHaveAttribute('type', 'text');

        fireEvent.click(screen.getByLabelText(/Hide password/i));
        expect(passwordInput).toHaveAttribute('type', 'password');
    });
});
