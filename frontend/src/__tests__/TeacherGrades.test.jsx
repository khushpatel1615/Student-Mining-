import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeacherGrades from '../components/Teacher/Grades/TeacherGrades';
import apiClient from '../utils/apiClient';
import * as AuthContext from '../context/AuthContext';

// Mock Lucide icons to avoid render issues in tests
vi.mock('lucide-react', () => ({
    BookOpen: () => <div data-testid="icon-book" />,
    Save: () => <div data-testid="icon-save" />,
    Download: () => <div data-testid="icon-download" />,
    Users: () => <div data-testid="icon-users" />,
    AlertTriangle: () => <div data-testid="icon-alert" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    ChevronDown: () => <div data-testid="icon-chevron" />,
    GraduationCap: () => <div data-testid="icon-grad" />,
    BarChart3: () => <div data-testid="icon-chart" />,
    TrendingUp: () => <div data-testid="icon-trend" />,
    RefreshCw: () => <div data-testid="icon-refresh" />,
    X: () => <div data-testid="icon-x" />,
}));

vi.mock('../utils/apiClient', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
    },
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

describe('TeacherGrades Component', () => {
    const mockSubjects = [
        { id: 1, name: 'Computer Science', code: 'CS101' },
    ];

    const mockStudents = [
        { id: 1, user_id: 1, full_name: 'John Doe', student_id: 'S1001', enrollment_id: 10 },
    ];

    const mockGradesData = {
        success: true,
        data: {
            criteria: [
                { id: 1, component_name: 'Final Exam', weight_percentage: 100, max_marks: 100 }
            ],
            enrollments: [
                { id: 10, user_id: 1, grades: [{ criteria_id: 1, marks_obtained: 85, grade_id: 5 }] }
            ]
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        AuthContext.useAuth.mockReturnValue({ token: 'mock-token' });
        apiClient.get.mockImplementation((url, params) => {
            if (url === '/teachers.php' && params.action === 'my_subjects') {
                return Promise.resolve({ success: true, data: mockSubjects });
            }
            if (url === '/teachers.php' && params.action === 'subject_students') {
                return Promise.resolve({ success: true, data: mockStudents });
            }
            if (url === '/grades.php') {
                return Promise.resolve(mockGradesData);
            }
            return Promise.resolve({ success: false });
        });
    });

    test('renders component and fetches subjects on mount', async () => {
        render(<TeacherGrades />);

        await waitFor(() => {
            expect(screen.getByText('Grade Management')).toBeDefined();
            expect(apiClient.get).toHaveBeenCalledWith('/teachers.php', { action: 'my_subjects' });
        });

        // Subject dropdown should show CS101
        expect(screen.getByText(/CS101/)).toBeDefined();
    });

    test('fetches and displays student list and grades when subject is selected', async () => {
        render(<TeacherGrades />);

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeDefined();
            expect(screen.getByText('#S1001')).toBeDefined();
        });

        // Check if grade component header is rendered
        expect(screen.getByText('Final Exam')).toBeDefined();

        // Grade value 85 should be in the input
        const gradeInput = screen.getByPlaceholderText('—');
        expect(gradeInput.value).toBe('85');
    });

    test('updates grade via API call on blur', async () => {
        apiClient.put.mockResolvedValue({ success: true });

        render(<TeacherGrades />);

        await waitFor(() => screen.getByPlaceholderText('—'));

        const gradeInput = screen.getByPlaceholderText('—');
        fireEvent.change(gradeInput, { target: { value: '90' } });
        fireEvent.blur(gradeInput);

        expect(apiClient.put).toHaveBeenCalledWith('/grades.php', expect.objectContaining({
            grades: [expect.objectContaining({
                marks_obtained: 90,
                criteria_id: 1,
                enrollment_id: 10
            })]
        }));
    });

    test('calculates and displays class average correctly', async () => {
        render(<TeacherGrades />);

        await waitFor(() => {
            // Avg calculation: (85/100)*100 = 85.0%
            expect(screen.getByText(/Avg 85.0%/)).toBeDefined();
        });
    });
});
