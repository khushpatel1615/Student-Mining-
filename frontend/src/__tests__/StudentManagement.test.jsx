import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StudentManagement from '../components/StudentManagement/StudentManagement';
import { MemoryRouter } from 'react-router-dom';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        token: 'mock-token',
        user: { role: 'admin', name: 'Test Admin' },
        loading: false,
    }),
}));

// Mock API config
vi.mock('../config', () => ({
    API_BASE: 'http://localhost/api',
}));

describe('Student Management Feature', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
        vi.clearAllMocks();
    });

    const mockStudents = [
        { id: 1, full_name: 'John Doe', email: 'john@example.com', student_id: 'S001', role: 'student', is_active: 1, program_code: 'BCA' },
        { id: 2, full_name: 'Jane Smith', email: 'jane@example.com', student_id: 'S002', role: 'student', is_active: 1, program_code: 'MCA' },
    ];

    test('READ: Loads students list on mount', async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes('/students.php')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, data: mockStudents, pagination: { total: 2, totalPages: 1 } }),
                });
            }
            if (url.includes('/programs.php')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, data: [] }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        render(
            <MemoryRouter>
                <StudentManagement />
            </MemoryRouter>
        );

        expect(screen.getByText(/Student Management/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });

        // Verify fetch was called for students with correct auth header
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/students.php'),
            expect.objectContaining({
                headers: expect.objectContaining({ 'Authorization': 'Bearer mock-token' })
            })
        );
    });

    test('CREATE: Adds new student successfully', async () => {
        // Initial fetch
        global.fetch.mockImplementation((url, options) => {
            if (url.includes('/students.php') && (!options || options.method !== 'POST')) { // GET
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, data: [], pagination: { total: 0 } }),
                });
            }
            if (url.includes('/programs.php')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, data: [] }),
                });
            }
            if (options && options.method === 'POST') { // POST (create)
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, message: 'User created' }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        render(
            <MemoryRouter>
                <StudentManagement />
            </MemoryRouter>
        );

        // Open Modal
        fireEvent.click(screen.getByText(/Add Student/i));

        // Fill form using correct placeholders found in component
        fireEvent.change(screen.getByPlaceholderText(/John Doe/i), { target: { value: 'New User' } });
        fireEvent.change(screen.getByPlaceholderText(/john\.doe@university\.edu/i), { target: { value: 'new@example.com' } });
        // Student ID field
        const idInput = screen.getByPlaceholderText(/ST-2024-001/i);
        if (idInput) fireEvent.change(idInput, { target: { value: 'S999' } });

        // Submit - Fire submit on the form directly since button text might be ambiguous
        const form = screen.getByPlaceholderText(/John Doe/i).closest('form');
        fireEvent.submit(form);

        // Wait for modal to close or success message
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/students.php'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('new@example.com')
                })
            );
        });
    });

    test('DELETE: Removes student', async () => {
        global.fetch.mockImplementation((url, options) => {
            if (url.includes('/students.php') && !url.includes('id=') && (!options || options.method !== 'DELETE')) { // GET list
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, data: [mockStudents[0]], pagination: { total: 1 } }),
                });
            }
            if (url.includes('/programs.php')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, data: [] }),
                });
            }
            // DELETE request
            if (options && options.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, message: 'Deleted' }),
                });
            }
            return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
        });

        render(
            <MemoryRouter>
                <StudentManagement />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

        // Find delete button
        const deleteButtons = screen.getAllByTitle(/Delete student/i);
        fireEvent.click(deleteButtons[0]);

        // Confirm delete in modal
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Deactivate/i })).toBeInTheDocument();
        });

        const confirmBtn = screen.getByRole('button', { name: /Deactivate/i });
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/students.php?id=1'),
                expect.objectContaining({ method: 'DELETE' })
            );
        });
    });

    test('SEARCH: Filters students', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: mockStudents, pagination: { total: 2 } }),
        });

        render(
            <MemoryRouter>
                <StudentManagement />
            </MemoryRouter>
        );

        // Wait for loading
        await waitFor(() => {
            expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/Search by name, email, or student ID.../i);
        fireEvent.change(searchInput, { target: { value: 'John' } });

        // Expect debounced call
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('search=John'),
                expect.any(Object)
            );
        }, { timeout: 2000 });
    });
});
