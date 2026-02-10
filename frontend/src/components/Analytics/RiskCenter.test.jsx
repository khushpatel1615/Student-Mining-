 
import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import RiskCenter from './RiskCenter';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        token: 'mock-token',
        user: { role: 'admin' },
        loading: false,
    }),
}));

// Mock API Config
vi.mock('../../config', () => ({
    API_BASE: 'http://localhost/api',
}));

describe('RiskCenter Component', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
        vi.clearAllMocks();
    });

    const mockStudents = [
        {
            id: 1,
            full_name: 'John Doe',
            email: 'john@example.com',
            student_id: 'S001',
            risk_score: 85,
            attendance_score: 60,
            grade_avg: 55,
            engagement_score: 30,
            risk_factors: ['Low Attendance'],
            avatar_url: null
        },
    ];

    const mockStats = {
        risk_distribution: {
            'At Risk': 5,
            'Safe': 100,
            'Star': 20
        }
    };

    test('displays risk data correctly', async () => {
        // Mock responses for list and stats
        global.fetch.mockImplementation((url) => {
            if (url.includes('action=list')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, data: mockStudents }),
                });
            }
            if (url.includes('action=stats')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, data: mockStats }),
                });
            }
            return Promise.reject(new Error(`Unknown URL: ${url}`));
        });

        render(
            <BrowserRouter>
                <RiskCenter />
            </BrowserRouter>
        );

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/Loading student data/i)).not.toBeInTheDocument();
        });

        // Check for student data
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument(); // Risk score

        // Check for stats
        expect(screen.getByText('5')).toBeInTheDocument(); // At Risk count
    });

    test('filters students when filter pill is clicked', async () => {
        // Mock responses for list and stats
        global.fetch.mockImplementation((url) => {
            if (url.includes('action=list')) {
                // If filtering logic is server side based on filter param
                if (url.includes('filter=star')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true, data: [] }), // Empty stars
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, data: mockStudents }),
                });
            }
            if (url.includes('action=stats')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, data: mockStats }),
                });
            }
            return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
        });

        render(
            <BrowserRouter>
                <RiskCenter />
            </BrowserRouter>
        );

        await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

        // Click Star filter (pill button)
        // Check regex carefully as content includes count: "Stars (20)"
        const starFilterBtn = screen.getByText(/Stars/i);
        fireEvent.click(starFilterBtn);

        // Wait for fetch with new filter
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('filter=star'),
                expect.any(Object)
            );
        });
    });

    test('handles recompute (refresh) action', async () => {
        // Mock responses
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: mockStudents }),
        });

        render(
            <BrowserRouter>
                <RiskCenter />
            </BrowserRouter>
        );

        const refreshBtn = screen.getByText(/Refresh Data/i);
        fireEvent.click(refreshBtn);

        // Should show "Analyzing..."
        expect(screen.getByText(/Analyzing.../i)).toBeInTheDocument();

        // Should call compute_features
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('compute_features.php'),
                expect.objectContaining({ headers: expect.any(Object) })
            );
        });
    });
});
