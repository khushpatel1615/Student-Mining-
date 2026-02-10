import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeacherManagement from '../components/TeacherManagement/TeacherManagement';
import { MemoryRouter } from 'react-router-dom';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        token: 'mock-token',
        user: { role: 'admin' },
        loading: false,
    }),
}));

// Mock API config
vi.mock('../config', () => ({
    API_BASE: 'http://localhost/api',
}));

describe('Teacher Management Feature', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
        vi.clearAllMocks();
    });

    const mockTeachers = [
        { id: 1, full_name: 'Dr. Smith', email: 'smith@college.edu', assigned_subjects: [] },
    ];

    test('READ: Loads teachers list', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: mockTeachers }),
        });
        // Mock subjects fetch too
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: [] }),
        });

        render(<TeacherManagement />);

        await waitFor(() => {
            expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
        });
    });

    test('CREATE: Adds new teacher', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: [] }),
        });

        render(<TeacherManagement />);

        // Wait for removal of loading state
        await waitFor(() => {
            expect(screen.queryByText(/Loading teachers/i)).not.toBeInTheDocument();
        });

        // Open Modal
        // Use robust selector as requested - handle multiple buttons (header + empty state)
        const addBtns = screen.getAllByRole('button', { name: /add new teacher/i });
        fireEvent.click(addBtns[0]);

        // Fill form
        fireEvent.change(screen.getByPlaceholderText(/John Smith/i), { target: { value: 'New Teacher' } });
        fireEvent.change(screen.getByPlaceholderText(/teacher@college.edu/i), { target: { value: 'new@college.edu' } });

        // Mock create response
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, message: 'Teacher created' }),
        });

        // Submit
        const submitBtn = screen.getByText('Create Teacher'); // Button text
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/teachers.php'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('new@college.edu')
                })
            );
        });
    });
});
