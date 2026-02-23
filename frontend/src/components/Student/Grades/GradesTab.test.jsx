import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import GradesTab from './GradesTab';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../../../context/AuthContext';

// Import our MSW server we just built
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

// In test environment built by setup.js, fetch is mocked as vi.fn(). 
// MSW requires native fetch to intercept, so we reinstate it globally here.
import { fetch as crossFetch, Response as crossResponse, Request as crossRequest, Headers as crossHeaders } from 'cross-fetch';

describe('GradesTab MSW Integration Test', () => {
    beforeAll(() => {
        // Remove setup.js's broken mocks so cross-fetch takes over cleanly
        delete global.fetch;
        delete global.Response;
        delete global.Request;
        delete global.Headers;

        // Restore real fetch so MSW can intercept
        global.fetch = crossFetch;
        global.Response = crossResponse;
        global.Request = crossRequest;
        global.Headers = crossHeaders;

        // Add analytics mock for GPATimeline so it doesn't throw warnings
        server.use(
            http.get('*/api/analytics.php', () => {
                return HttpResponse.json([
                    { semester: 1, gpa: 3.5 }
                ]);
            })
        );

        server.listen({ onUnhandledRequest: 'warn' });
    });

    afterEach(() => {
        server.resetHandlers();
        vi.restoreAllMocks();
    });

    afterAll(() => {
        server.close();
    });

    const mockUser = {
        id: 10,
        role: 'student',
        current_semester: 1
    };

    const renderWithContext = (ui) => {
        // Mock the useAuth hook directly so we avoid rendering the entire complex AuthProvider
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: mockUser,
            token: 'fake-test-jwt'
        });

        return render(
            <MemoryRouter>
                {ui}
            </MemoryRouter>
        );
    };

    it('fetches and displays student grades from mock API', async () => {
        // Ensure localStorage has a fake token so apiClient doesn't throw 401 locally
        localStorage.setItem('token', 'fake-test-jwt');

        renderWithContext(<GradesTab selectedSemester={1} />);

        // Loading skeleton should be visible initially
        expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

        // Wait for the specific data from MSW handler's Case 3 to be rendered
        await waitFor(() => {
            expect(screen.getByText('Software Testing')).toBeInTheDocument();
        });

        // The mock returns data that counts as 1 Enrolled / 1 Passed based on marks
        expect(screen.getByText('1')).toBeInTheDocument(); // 1 Enrolled subject

        // Expand the subject card
        const subjectCard = screen.getByText('Software Testing');
        fireEvent.click(subjectCard);

        // Verify the grade component breakdown is shown from the mock
        await waitFor(() => {
            const midtermElements = screen.getAllByText('Midterm');
            expect(midtermElements.length).toBeGreaterThan(0);
        });

        localStorage.removeItem('token');
    });

    it('handles API errors gracefully', async () => {
        // Change the handler to return an error explicitly for this test
        server.use(
            http.get('*/api/grades.php', () => {
                return HttpResponse.json({ error: 'Failed to access database' }, { status: 500 });
            })
        );

        renderWithContext(<GradesTab selectedSemester={1} />);

        await waitFor(() => {
            // GradesTab component shows "Failed to Load" when an error string is set
            expect(screen.getByText('Failed to Load')).toBeInTheDocument();
        });
    });
});
